import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle, ArrowLeft, Award, CheckCircle2, ChevronLeft, ChevronRight,
  Clock3, Copy, FileText, GraduationCap, Loader2, Maximize, Minimize,
  Pause, PictureInPicture2, Play, PlayCircle, RefreshCw, RotateCcw,
  RotateCw, Search, Share2, ShieldCheck, Sparkles, Users, Volume2, VolumeX
} from "lucide-react";
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";

const COURSE_CACHE_PREFIX = "online_academy_course_";
const COURSE_CACHE_TIME = 10 * 60 * 1000;
const CONTROL_HIDE_DELAY = 2400;
const SAVE_EVERY_MS = 2500;

const clampPercent = (value, fallback = 25) => Math.max(0, Math.min(100, Number.isFinite(Number(value)) ? Number(value) : fallback));

function getCourseCacheKey(id) { return `${COURSE_CACHE_PREFIX}${id}`; }
function getCachedCourse(id) {
  try {
    const raw = sessionStorage.getItem(getCourseCacheKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.course && Date.now() - parsed.timestamp < COURSE_CACHE_TIME ? parsed.course : null;
  } catch { return null; }
}
function saveCourseCache(id, course) {
  try { sessionStorage.setItem(getCourseCacheKey(id), JSON.stringify({ timestamp: Date.now(), course })); } catch {}
}
function progressStorageKey(userId, courseId, lessonId) { return `online_academy_progress_${userId}_${courseId}_${lessonId}`; }
function readLocalProgress(userId, courseId, lessonId) {
  try { return JSON.parse(localStorage.getItem(progressStorageKey(userId, courseId, lessonId)) || "null"); } catch { return null; }
}
function writeLocalProgress(userId, courseId, lessonId, data) {
  try { localStorage.setItem(progressStorageKey(userId, courseId, lessonId), JSON.stringify({ ...data, localSavedAt: Date.now() })); } catch {}
}

function normalizeLessons(course) {
  const coursePercent = clampPercent(course?.attendance?.requiredWatchPercent, 25);
  return Array.isArray(course?.lessons) ? course.lessons.map((lesson, index) => ({
    id: lesson?.id || `lesson_${index + 1}`,
    title: lesson?.title || `Lesson ${index + 1}`,
    videoUrl: lesson?.videoUrl || lesson?.url || "",
    videoType: lesson?.videoType || "link",
    captionsUrl: lesson?.captionsUrl || "",
    duration: lesson?.duration || "",
    description: lesson?.description || lesson?.summary || "",
    order: Number(lesson?.order) || index + 1,
    requiredWatchPercent: clampPercent(lesson?.requiredWatchPercent, coursePercent),
    thumbnailUrl: lesson?.thumbnailUrl || lesson?.thumbnail || "",
  })).sort((a, b) => a.order - b.order) : [];
}
function isSafeUrl(value) {
  try { return ["http:", "https:", "blob:"].includes(new URL(String(value || ""), window.location.href).protocol); }
  catch { return String(value || "").startsWith("/"); }
}
function getYouTubeId(value) {
  try {
    const u = new URL(String(value || ""));
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return u.pathname.split("/").filter(Boolean)[0] || "";
    if (["youtube.com", "youtube-nocookie.com"].includes(host)) {
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "watch") return u.searchParams.get("v") || "";
      if (["embed", "shorts", "live"].includes(parts[0])) return parts[1] || "";
    }
  } catch {}
  return "";
}
function getSource(lesson) {
  const url = String(lesson?.videoUrl || "").trim();
  const videoId = getYouTubeId(url);
  if (videoId) return { type: "youtube", url, videoId };
  if (!url) return { type: "none", url: "", videoId: "" };
  return isSafeUrl(url) ? { type: "html5", url, videoId: "" } : { type: "invalid", url: "", videoId: "" };
}
function formatTime(value) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const sec = seconds % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${minutes}:${String(sec).padStart(2, "0")}`;
}
function InfoRow({ icon: Icon, label, value }) {
  return <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-0"><span className="flex items-center gap-2 text-sm text-slate-500"><Icon size={16} className="shrink-0 text-blue-600" />{label}</span><span className="max-w-[60%] truncate text-right text-sm font-bold text-slate-900">{value}</span></div>;
}

let ytApiPromise = null;
function loadYouTubeAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { try { previous?.(); } catch {} if (window.YT?.Player) resolve(window.YT); else reject(new Error("YouTube API unavailable")); };
    if (!existing) {
      const script = document.createElement("script"); script.src = "https://www.youtube.com/iframe_api"; script.async = true; script.onerror = reject; document.head.appendChild(script);
    } else if (window.YT?.Player) resolve(window.YT);
  });
  return ytApiPromise;
}

function VideoLessonPlayer({ user, courseId, lesson, initialProgress, onSaved }) {
  const source = useMemo(() => getSource(lesson), [lesson]);
  const requiredPercent = clampPercent(lesson?.requiredWatchPercent, 25);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(Number(initialProgress?.duration) || 0);
  const [currentTime, setCurrentTime] = useState(Number(initialProgress?.positionSeconds) || 0);
  const [earnedSeconds, setEarnedSeconds] = useState(Number(initialProgress?.activeWatchSeconds) || 0);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showControls, setShowControls] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncState, setSyncState] = useState("idle");
  const [error, setError] = useState("");

  const wrapRef = useRef(null), videoRef = useRef(null), ytBoxRef = useRef(null), ytPlayerRef = useRef(null);
  const hideTimerRef = useRef(null), tickRef = useRef(null), lastTickRef = useRef(null), lastSaveRef = useRef(0);
  const stateRef = useRef({ earned: Number(initialProgress?.activeWatchSeconds) || 0, duration: Number(initialProgress?.duration) || 0, current: Number(initialProgress?.positionSeconds) || 0, completed: initialProgress?.completed === true });
  const completedRef = useRef(initialProgress?.completed === true);

  const persist = useCallback(async (force = false) => {
    if (!user || !courseId || !lesson?.id) return;
    const d = Math.max(0, Number(stateRef.current.duration) || 0);
    if (!d) return;
    const now = Date.now();
    const active = Math.min(d, Math.max(0, Number(stateRef.current.earned) || 0));
    const percent = requiredPercent === 0 ? 100 : Math.min(100, Math.floor((active / d) * 100));
    const completed = completedRef.current || percent >= requiredPercent;
    completedRef.current = completed;
    stateRef.current.completed = completed;
    const payload = { userId: user.uid, courseId, lessonId: lesson.id, lessonTitle: lesson.title, duration: d, positionSeconds: Math.max(0, Number(stateRef.current.current) || 0), activeWatchSeconds: active, percent, requiredWatchPercent: requiredPercent, completed, attendance: completed ? "present" : "absent" };
    writeLocalProgress(user.uid, courseId, lesson.id, payload);
    onSaved?.(lesson.id, payload);
    if (!force && now - lastSaveRef.current < SAVE_EVERY_MS && !completed) return;
    lastSaveRef.current = now;
    setSaving(true);
    try {
      await setDoc(doc(db, "lessonProgress", `${user.uid}_${courseId}_${lesson.id}`), { ...payload, completedAt: completed ? serverTimestamp() : null, lastWatchedAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
      setSyncState("synced"); setError("");
    } catch (e) {
      console.error("Progress save error:", e); setSyncState("local");
      if (e?.code === "permission-denied") setError("Progress is saved on this device, but Firebase rules are not published yet. Publish firestore.rules to enable cross-device attendance sync.");
      else setError("Progress is saved locally. Cloud sync will retry when the connection is available.");
    } finally { setSaving(false); }
  }, [courseId, lesson, onSaved, requiredPercent, user]);

  const activity = useCallback(() => { setShowControls(true); clearTimeout(hideTimerRef.current); if (playing) hideTimerRef.current = window.setTimeout(() => setShowControls(false), CONTROL_HIDE_DELAY); }, [playing]);

  const handleSurfaceClick = useCallback(() => {
    if (!showControls) { activity(); return; }
    activity();
    if (source.type === "youtube") {
      const player = ytPlayerRef.current; if (!player) return;
      if (playing) player.pauseVideo?.(); else player.playVideo?.(); return;
    }
    const video = videoRef.current; if (!video) return;
    if (video.paused) video.play().catch(() => setError("Click the video again to start playback.")); else video.pause();
  }, [activity, playing, showControls, source.type]);

  const flushActiveTime = useCallback(() => {
    const now = Date.now();
    if (lastTickRef.current == null) { lastTickRef.current = now; return; }
    const elapsed = Math.min(1.5, Math.max(0, (now - lastTickRef.current) / 1000));
    const active = document.visibilityState === "visible" && document.hasFocus() && playing;
    if (active && elapsed > 0) { const next = Math.min(stateRef.current.duration || Infinity, stateRef.current.earned + elapsed); stateRef.current.earned = next; setEarnedSeconds(next); }
    lastTickRef.current = now;
  }, [playing]);

  useEffect(() => {
    const local = user ? readLocalProgress(user.uid, courseId, lesson?.id) : null;
    const base = initialProgress || local || {};
    stateRef.current = { earned: Number(base?.activeWatchSeconds) || 0, duration: Number(base?.duration) || 0, current: Number(base?.positionSeconds) || 0, completed: base?.completed === true };
    completedRef.current = base?.completed === true;
    setDuration(stateRef.current.duration); setCurrentTime(stateRef.current.current); setEarnedSeconds(stateRef.current.earned); setPlaying(false); setError(""); setSyncState("idle"); setShowControls(false);
  }, [courseId, initialProgress, lesson?.id, user]);

  useEffect(() => {
    const onVisibility = () => { flushActiveTime(); if (document.visibilityState !== "visible") persist(true); };
    document.addEventListener("visibilitychange", onVisibility); window.addEventListener("blur", onVisibility);
    return () => { document.removeEventListener("visibilitychange", onVisibility); window.removeEventListener("blur", onVisibility); };
  }, [flushActiveTime, persist]);

  useEffect(() => {
    clearInterval(tickRef.current); if (!playing) return undefined;
    lastTickRef.current = Date.now(); tickRef.current = window.setInterval(() => { flushActiveTime(); persist(false); }, 500); activity();
    return () => clearInterval(tickRef.current);
  }, [playing, flushActiveTime, persist, activity]);

  useEffect(() => {
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen); return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  useEffect(() => {
    if (source.type !== "youtube") { try { ytPlayerRef.current?.destroy?.(); } catch {} ytPlayerRef.current = null; return undefined; }
    let cancelled = false;
    loadYouTubeAPI().then((YT) => {
      if (cancelled || !ytBoxRef.current) return;
      try { ytPlayerRef.current?.destroy?.(); } catch {}
      ytBoxRef.current.innerHTML = "";
      const target = document.createElement("div"); target.className = "h-full w-full"; ytBoxRef.current.appendChild(target);
      const player = new YT.Player(target, {
        width: "100%", height: "100%", videoId: source.videoId,
        playerVars: { autoplay: 0, controls: 0, rel: 0, modestbranding: 1, playsinline: 1, enablejsapi: 1, fs: 0, origin: window.location.origin },
        events: {
          onReady: (event) => { if (cancelled) return; const d = Number(event.target.getDuration()) || 0; stateRef.current.duration = d; setDuration(d); const local = user ? readLocalProgress(user.uid, courseId, lesson.id) : null; const p = Number(initialProgress?.positionSeconds) || Number(local?.positionSeconds) || 0; if (p > 0 && p < d) event.target.seekTo(p, true); event.target.setVolume(volume); },
          onStateChange: (event) => { if (cancelled) return; const isPlaying = event.data === YT.PlayerState.PLAYING; setPlaying(isPlaying); if (!isPlaying) { flushActiveTime(); persist(true); } },
          onError: () => setError("This lesson video could not be loaded."),
        },
      });
      ytPlayerRef.current = player;
    }).catch(() => setError("YouTube player could not be initialized."));
    return () => { cancelled = true; try { ytPlayerRef.current?.destroy?.(); } catch {} ytPlayerRef.current = null; };
  }, [courseId, flushActiveTime, initialProgress?.positionSeconds, lesson?.id, persist, source.type, source.videoId, user?.uid, volume]);

  useEffect(() => () => { flushActiveTime(); persist(true); clearTimeout(hideTimerRef.current); clearInterval(tickRef.current); }, [flushActiveTime, persist]);

  const seekTo = useCallback((time) => { activity(); const target = Math.max(0, Math.min(duration || Infinity, Number(time) || 0)); stateRef.current.current = target; setCurrentTime(target); if (source.type === "youtube") ytPlayerRef.current?.seekTo?.(target, true); else if (videoRef.current) videoRef.current.currentTime = target; }, [activity, duration, source.type]);
  const seekBy = useCallback((seconds) => seekTo(currentTime + seconds), [currentTime, seekTo]);
  const setVolumeSafe = (value) => { const next = Number(value); setVolume(next); setMuted(next === 0); if (source.type === "youtube") ytPlayerRef.current?.setVolume?.(next); else if (videoRef.current) { videoRef.current.volume = next / 100; videoRef.current.muted = next === 0; } };
  const toggleMute = () => { const next = !muted; setMuted(next); if (source.type === "youtube") next ? ytPlayerRef.current?.mute?.() : ytPlayerRef.current?.unMute?.(); else if (videoRef.current) videoRef.current.muted = next; };
  const changeSpeed = (value) => { const next = Number(value); setSpeed(next); if (source.type === "youtube") ytPlayerRef.current?.setPlaybackRate?.(next); else if (videoRef.current) videoRef.current.playbackRate = next; activity(); };
  const toggleFullscreen = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await wrapRef.current?.requestFullscreen?.(); } catch { setError("Fullscreen is not available in this browser."); } activity(); };
  const togglePip = async () => { try { if (source.type !== "html5" || !videoRef.current || !document.pictureInPictureEnabled) throw new Error(); if (document.pictureInPictureElement) await document.exitPictureInPicture(); else await videoRef.current.requestPictureInPicture(); } catch { setError("Picture-in-picture is available for supported direct video files."); } activity(); };

  useEffect(() => {
    const key = (event) => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(event.target?.tagName)) return;
      if (event.code === "Space") { event.preventDefault(); handleSurfaceClick(); }
      if (event.key === "ArrowLeft") { event.preventDefault(); seekBy(-10); }
      if (event.key === "ArrowRight") { event.preventDefault(); seekBy(10); }
      if (event.key.toLowerCase() === "m") { event.preventDefault(); toggleMute(); }
      if (event.key.toLowerCase() === "f") { event.preventDefault(); toggleFullscreen(); }
    };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, [handleSurfaceClick, seekBy]);

  const percent = duration > 0 ? Math.min(100, Math.floor((earnedSeconds / duration) * 100)) : 0;
  const attendanceReady = completedRef.current || requiredPercent === 0 || percent >= requiredPercent;
  const thumbnail = lesson?.thumbnailUrl || (source.type === "youtube" ? `https://i.ytimg.com/vi/${source.videoId}/hqdefault.jpg` : "");

  return <section ref={wrapRef} className={`overflow-hidden bg-slate-950 shadow-2xl ${fullscreen ? "flex h-screen flex-col rounded-none" : "rounded-[24px] sm:rounded-[28px]"}`} onMouseMove={activity} onTouchStart={activity}>
    <div className={`relative w-full bg-black ${fullscreen ? "flex-1" : "aspect-video"}`}>
      {thumbnail && source.type === "html5" && <img src={thumbnail} alt="" className="pointer-events-none absolute inset-0 z-0 h-full w-full object-contain opacity-20" />}
      {source.type === "youtube" && <div ref={ytBoxRef} className="pointer-events-none absolute inset-0 z-0" />}
      {source.type === "html5" && <video ref={videoRef} src={source.url} poster={thumbnail || undefined} className="absolute inset-0 z-0 h-full w-full bg-black object-contain" playsInline preload="metadata"
        onLoadedMetadata={(event) => { const d = Number(event.currentTarget.duration) || 0; stateRef.current.duration = d; setDuration(d); const local = user ? readLocalProgress(user.uid, courseId, lesson.id) : null; const p = Number(initialProgress?.positionSeconds) || Number(local?.positionSeconds) || 0; if (p > 0 && p < d) event.currentTarget.currentTime = p; event.currentTarget.volume = volume / 100; event.currentTarget.muted = muted; }}
        onTimeUpdate={(event) => { const t = Number(event.currentTarget.currentTime) || 0; stateRef.current.current = t; setCurrentTime(t); }}
        onPlay={() => { setPlaying(true); lastTickRef.current = Date.now(); }} onPause={() => { flushActiveTime(); setPlaying(false); persist(true); }} onEnded={() => { flushActiveTime(); setPlaying(false); persist(true); }} onError={() => setError("This lesson video could not be loaded.")}>
        {lesson?.captionsUrl && isSafeUrl(lesson.captionsUrl) && <track kind="captions" src={lesson.captionsUrl} default />}
      </video>}
      {source.type === "none" && <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white"><PlayCircle size={50} className="text-slate-500" /><p className="mt-3 font-bold">No lesson video available</p></div>}
      {source.type === "invalid" && <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-white">Invalid lesson video URL.</div>}
      {source.type !== "none" && source.type !== "invalid" && <button type="button" aria-label={showControls ? (playing ? "Pause lesson" : "Play lesson") : "Show video controls"} onClick={handleSurfaceClick} onTouchStart={activity} className="absolute inset-0 z-10 cursor-pointer bg-transparent focus:outline-none" />}
      {error && <div className="absolute left-2 right-2 top-2 z-50 rounded-xl border border-red-400/30 bg-red-950/90 px-3 py-2.5 text-[11px] font-semibold leading-4 text-red-100 shadow-xl sm:left-4 sm:right-4 sm:top-4 sm:px-4 sm:py-3 sm:text-xs">{error}</div>}
      {source.type !== "none" && source.type !== "invalid" && <div className={`absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-2 pb-2 pt-14 transition-all duration-300 sm:px-4 sm:pb-4 sm:pt-20 ${showControls ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`} onClick={(event) => event.stopPropagation()} onMouseMove={(event) => { event.stopPropagation(); activity(); }} onTouchStart={(event) => { event.stopPropagation(); activity(); }}>
        <input type="range" min="0" max="100" step="0.1" value={duration ? Math.min(100, (currentTime / duration) * 100) : 0} onChange={(event) => seekTo((Number(event.target.value) / 100) * duration)} className="mb-2 h-1.5 w-full cursor-pointer accent-blue-500 sm:mb-3" aria-label="Video position" />
        <div className="flex flex-col gap-2 text-white sm:flex-row sm:items-center sm:gap-2">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <button type="button" onClick={() => handleSurfaceClick()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20" aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={17} /> : <Play size={17} />}</button>
            <button type="button" onClick={() => seekBy(-10)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20" aria-label="Back 10 seconds"><RotateCcw size={17} /></button>
            <button type="button" onClick={() => seekBy(10)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20" aria-label="Forward 10 seconds"><RotateCw size={17} /></button>
            <span className="ml-1 min-w-[72px] text-[11px] font-bold tabular-nums text-slate-200 sm:min-w-[84px] sm:text-xs">{formatTime(currentTime)} / {formatTime(duration)}</span>
            <span className="hidden rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-black text-emerald-300 md:inline-flex">Active {percent}%</span>
          </div>
          <div className="flex items-center justify-end gap-1.5 sm:ml-auto">
            <button type="button" onClick={toggleMute} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20" aria-label={muted ? "Unmute" : "Mute"}>{muted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
            <input aria-label="Volume" type="range" min="0" max="100" value={volume} onChange={(event) => setVolumeSafe(event.target.value)} className="hidden w-16 accent-blue-500 md:block lg:w-20" />
            <select value={speed} onChange={(event) => changeSpeed(event.target.value)} className="h-9 rounded-lg border border-white/10 bg-white/10 px-2 text-xs font-bold text-white outline-none"><option value="0.75" className="text-slate-900">0.75x</option><option value="1" className="text-slate-900">1x</option><option value="1.25" className="text-slate-900">1.25x</option><option value="1.5" className="text-slate-900">1.5x</option><option value="1.75" className="text-slate-900">1.75x</option><option value="2" className="text-slate-900">2x</option></select>
            {source.type === "html5" && <button type="button" onClick={togglePip} className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 md:inline-flex" aria-label="Picture in picture"><PictureInPicture2 size={17} /></button>}
            <button type="button" onClick={toggleFullscreen} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20" aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}>{fullscreen ? <Minimize size={17} /> : <Maximize size={17} />}</button>
          </div>
        </div>
      </div>}
    </div>
    <div className="flex flex-col gap-2 border-t border-white/10 px-3 py-2.5 text-[11px] sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3 sm:text-xs"><span className="flex items-center gap-2 text-slate-300"><ShieldCheck size={15} className="shrink-0 text-emerald-400" />Only active on-screen playback time counts.</span><span className={`font-black ${attendanceReady ? "text-emerald-400" : "text-blue-300"}`}>{attendanceReady ? "Present" : `${requiredPercent}% active time required`}{saving && <Loader2 size={13} className="ml-2 inline animate-spin" />}{syncState === "local" && !saving && <span className="ml-2 text-amber-300">Local</span>}</span></div>
  </section>;
}

function LessonList({ lessons, progressMap, selectedIndex, onSelect, search }) {
  const filtered = lessons.filter((lesson, index) => !search || `${lesson.title} lesson ${index + 1}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-2">{filtered.map((lesson) => { const index = lessons.findIndex((item) => item.id === lesson.id); const progress = progressMap[lesson.id]; const done = progress?.completed === true; return <button key={lesson.id} type="button" onClick={() => onSelect(index)} className={`w-full rounded-2xl border p-3 text-left transition ${index === selectedIndex ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-200"}`}><div className="flex gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${done ? "bg-emerald-100 text-emerald-700" : index === selectedIndex ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>{done ? <CheckCircle2 size={18} /> : <PlayCircle size={18} />}</span><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><span className="line-clamp-2 text-sm font-extrabold text-slate-900">{index + 1}. {lesson.title}</span>{done && <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">Present</span>}</span><span className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-slate-500"><Clock3 size={13} />{lesson.duration || "Self-paced"}{!done && progress?.percent > 0 ? ` • ${progress.percent}% active` : ""}</span></span></div></button>; })}</div>;
}

function CourseDetails() {
  const { courseId } = useParams();
  const cached = getCachedCourse(courseId);
  const [course, setCourse] = useState(cached);
  const [user, setUser] = useState(undefined), [loading, setLoading] = useState(!cached), [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0), [progressMap, setProgressMap] = useState({}), [search, setSearch] = useState("");
  const [bookmarked, setBookmarked] = useState(false), [copied, setCopied] = useState(false);
  useEffect(() => onAuthStateChanged(auth, (nextUser) => setUser(nextUser || null)), []);
  useEffect(() => { try { setBookmarked(localStorage.getItem(`online_academy_bookmark_${courseId}`) === "1"); } catch {} }, [courseId]);
  const loadCourse = useCallback(async () => { try { setLoading(true); const snap = await getDoc(doc(db, "courses", courseId)); if (!snap.exists()) throw new Error("The course does not exist."); const next = { id: snap.id, ...snap.data() }; setCourse(next); saveCourseCache(courseId, next); setError(""); } catch (e) { setError(e?.code === "permission-denied" ? "You do not have permission to view this course." : e?.message || "Unable to load this course."); } finally { setLoading(false); } }, [courseId]);
  useEffect(() => { if (!course) loadCourse(); }, [course, loadCourse]);
  const lessons = useMemo(() => normalizeLessons(course), [course]);
  const selectedLesson = lessons[selectedIndex] || null;
  useEffect(() => { if (lessons.length) setSelectedIndex((index) => Math.min(index, lessons.length - 1)); }, [lessons.length]);
  useEffect(() => {
    let cancelled = false;
    const loadProgress = async () => {
      if (!user || !courseId || !lessons.length) return;
      const localMap = {};
      lessons.forEach((lesson) => { const local = readLocalProgress(user.uid, courseId, lesson.id); if (local) localMap[lesson.id] = local; });
      try {
        const snap = await getDocs(query(collection(db, "lessonProgress"), where("userId", "==", user.uid), where("courseId", "==", courseId)));
        if (cancelled) return;
        const map = { ...localMap };
        snap.docs.forEach((entry) => { const data = entry.data(); if (data.lessonId) map[data.lessonId] = { ...map[data.lessonId], ...data, completed: data.completed === true || data.completed25 === true || map[data.lessonId]?.completed === true, percent: Math.max(Number(data.percent) || 0, Number(map[data.lessonId]?.percent) || 0), activeWatchSeconds: Math.max(Number(data.activeWatchSeconds) || 0, Number(map[data.lessonId]?.activeWatchSeconds) || 0), positionSeconds: Number(data.positionSeconds ?? data.watchedSeconds) || Number(map[data.lessonId]?.positionSeconds) || 0, duration: Number(data.duration) || Number(map[data.lessonId]?.duration) || 0 }; });
        setProgressMap(map);
      } catch (e) { console.error("Progress load error:", e); if (!cancelled) setProgressMap(localMap); }
    };
    loadProgress();
    return () => { cancelled = true; };
  }, [courseId, lessons, user]);
  const handleSaved = useCallback((id, data) => setProgressMap((previous) => ({ ...previous, [id]: { ...previous[id], ...data } })), []);
  const selectLesson = (index) => { setSelectedIndex(index); window.requestAnimationFrame(() => document.getElementById("lesson-player")?.scrollIntoView({ behavior: "smooth", block: "start" })); };
  const toggleBookmark = () => { const next = !bookmarked; setBookmarked(next); try { localStorage.setItem(`online_academy_bookmark_${courseId}`, next ? "1" : "0"); } catch {} };
  const copyLink = async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {} };
  const share = async () => { try { if (navigator.share) await navigator.share({ title: course?.title, url: window.location.href }); else await copyLink(); } catch {} };
  if (loading) return <main className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="mx-auto max-w-7xl animate-pulse space-y-6"><div className="h-36 rounded-3xl bg-slate-200 sm:h-48" /><div className="grid gap-6 lg:grid-cols-[1fr_340px]"><div className="aspect-video rounded-3xl bg-slate-200" /><div className="h-96 rounded-3xl bg-slate-200" /></div></div></main>;
  if (error || !course) return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="max-w-xl rounded-3xl border bg-white p-8 text-center shadow-sm sm:p-10"><AlertCircle className="mx-auto text-red-500" size={42}/><h1 className="mt-4 text-2xl font-black">Course unavailable</h1><p className="mt-3 text-sm text-slate-600">{error || "Course not found."}</p><button onClick={loadCourse} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"><RefreshCw size={17}/> Try again</button></div></main>;
  const completedCount = lessons.filter((lesson) => progressMap[lesson.id]?.completed).length;
  const courseProgress = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;
  const title = course.title || "Untitled Course", description = course.description || "Course description will be available soon.", level = course.level || "All Levels", duration = course.duration || "Self-paced", students = Number(course.students || 0), category = course.category || "Online Course", language = course.language || "English", instructor = course.instructor || "Online Academy";
  return <main className="min-h-screen overflow-x-clip bg-slate-50">
    <section className="bg-slate-950 text-white"><div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8"><Link to="/courses" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-300"><ArrowLeft size={16}/> Back to Courses</Link><div className="mt-5 grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-8"><div><span className="rounded-full bg-blue-500/10 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-blue-300">{category}</span><h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:mt-4 sm:text-base sm:leading-7">{description}</p><div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-400 sm:gap-5 sm:text-sm"><span className="flex items-center gap-2"><Users size={16}/> {students.toLocaleString()} students</span><span className="flex items-center gap-2"><Clock3 size={16}/> {duration}</span><span className="flex items-center gap-2"><GraduationCap size={16}/> {level}</span></div><div className="mt-5 flex flex-wrap gap-2"><button onClick={toggleBookmark} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-bold">{bookmarked ? "Saved" : "Save course"}</button><button onClick={share} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-bold"><Share2 size={16}/> Share</button><button onClick={copyLink} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-bold"><Copy size={16}/> {copied ? "Copied" : "Copy link"}</button></div></div><aside className="hidden overflow-hidden rounded-3xl bg-white text-slate-900 shadow-2xl lg:block">{course.imageUrl || course.thumbnail ? <img src={course.imageUrl || course.thumbnail} alt="" className="h-44 w-full object-cover"/> : <div className="flex h-44 items-center justify-center bg-gradient-to-br from-blue-700 to-slate-900 text-white"><GraduationCap size={54}/></div>}<div className="p-5"><InfoRow icon={PlayCircle} label="Lessons" value={lessons.length}/><InfoRow icon={Clock3} label="Duration" value={duration}/><InfoRow icon={FileText} label="Language" value={language}/><InfoRow icon={Award} label="Certificate" value={course.certificate === false ? "No" : "Included"}/></div></aside></div></div></section>
    <div className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur sm:top-[68px]"><div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6 lg:px-8"><div className="flex justify-between text-xs font-bold text-slate-500"><span>{completedCount} of {lessons.length} lessons completed</span><span className="text-blue-700">{courseProgress}%</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-blue-600 transition-all" style={{ width: `${courseProgress}%` }}/></div></div></div>
    <section className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-7 lg:px-8"><div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_350px] lg:gap-7"><div className="min-w-0 space-y-6"><section id="lesson-player" className="scroll-mt-20 sm:scroll-mt-28"><div className="mb-3 flex flex-wrap items-end justify-between gap-2 sm:mb-4 sm:gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-blue-600 sm:text-[11px]">Lesson {selectedIndex + 1} of {lessons.length || 1}</p><h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">{selectedLesson?.title || "Course lesson"}</h2></div><span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 sm:px-3 sm:text-xs"><ShieldCheck size={14} className="text-emerald-600"/> Secure progress</span></div>{selectedLesson ? <VideoLessonPlayer user={user} courseId={courseId} lesson={selectedLesson} initialProgress={progressMap[selectedLesson.id]} onSaved={handleSaved}/> : <div className="rounded-3xl border bg-white p-10 text-center">No lessons have been added yet.</div>}{selectedLesson?.description && <div className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-black">About this lesson</h3><p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">{selectedLesson.description}</p></div>}<div className="flex justify-between gap-3"><button disabled={selectedIndex === 0} onClick={() => selectLesson(selectedIndex - 1)} className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-sm font-bold disabled:opacity-40 sm:px-4 sm:py-3"><ChevronLeft size={17}/> Previous</button><button disabled={selectedIndex >= lessons.length - 1} onClick={() => selectLesson(selectedIndex + 1)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-40 sm:px-4 sm:py-3">Next lesson <ChevronRight size={17}/></button></div></section><section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-4"><Sparkles className="shrink-0 text-blue-600"/><div><h2 className="text-xl font-black sm:text-2xl">About this course</h2><p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">{course.longDescription || description}</p></div></div></section></div>
      <aside className="min-w-0 lg:sticky lg:top-[112px] lg:self-start"><div className="overflow-hidden rounded-3xl border bg-white shadow-sm"><div className="border-b p-4"><h2 className="text-lg font-black">Course curriculum</h2><p className="mt-1 text-xs font-semibold text-slate-500">{lessons.length} lessons • {completedCount} completed</p><div className="mt-4 flex items-center gap-2 rounded-xl border bg-slate-50 px-3"><Search size={16} className="text-slate-400"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search lessons..." className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"/></div></div><div className="max-h-[55vh] overflow-y-auto p-3 lg:max-h-[65vh]"><LessonList lessons={lessons} progressMap={progressMap} selectedIndex={selectedIndex} onSelect={selectLesson} search={search}/></div></div><div className="mt-4 rounded-3xl border border-blue-100 bg-blue-50 p-4 sm:mt-5 sm:p-5"><div className="flex gap-3"><ShieldCheck className="shrink-0 text-blue-600"/><div><h3 className="font-black">Attendance rule</h3><p className="mt-1 text-sm leading-6 text-slate-600">Attendance uses active on-screen playback time only. Seeking, skipping forward/backward and playback speed changes do not grant attendance time. Once Present, it stays Present.</p></div></div></div><div className="mt-4 rounded-3xl border bg-white p-5 shadow-sm sm:mt-5"><h3 className="font-black">Course details</h3><InfoRow icon={GraduationCap} label="Level" value={level}/><InfoRow icon={Clock3} label="Duration" value={duration}/><InfoRow icon={Users} label="Instructor" value={instructor}/></div></aside>
    </div></section>
  </main>;
}

export default CourseDetails;
