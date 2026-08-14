import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle, ArrowLeft, Award, CheckCircle2, ChevronLeft, ChevronRight,
  Clock3, Copy, FileText, GraduationCap, Loader2, Maximize, Minimize,
  Pause, PictureInPicture2, Play, PlayCircle, RefreshCw, RotateCcw,
  RotateCw, Search, Share2, ShieldCheck, Sparkles, Star, Users, Volume2, VolumeX
} from "lucide-react";
import {
  collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";

const COURSE_CACHE_PREFIX = "online_academy_course_";
const COURSE_CACHE_TIME = 10 * 60 * 1000;
const CONTROL_HIDE_DELAY = 2400;
const SAVE_EVERY_MS = 2000;

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
function normalizeLessons(course) {
  return Array.isArray(course?.lessons) ? course.lessons.map((lesson, index) => ({
    id: lesson?.id || `lesson_${index + 1}`,
    title: lesson?.title || `Lesson ${index + 1}`,
    videoUrl: lesson?.videoUrl || lesson?.url || "",
    videoType: lesson?.videoType || "link",
    captionsUrl: lesson?.captionsUrl || "",
    duration: lesson?.duration || "",
    description: lesson?.description || lesson?.summary || "",
    order: Number(lesson?.order) || index + 1,
    requiredWatchPercent: Math.max(0, Math.min(100, Number(lesson?.requiredWatchPercent ?? course?.attendance?.requiredWatchPercent ?? 25))),
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
      const p = u.pathname.split("/").filter(Boolean);
      if (p[0] === "watch") return u.searchParams.get("v") || "";
      if (["embed", "shorts", "live"].includes(p[0])) return p[1] || "";
    }
  } catch {}
  return "";
}
function getSource(lesson) {
  const url = String(lesson?.videoUrl || "").trim();
  const youtubeId = getYouTubeId(url);
  if (youtubeId) return { type: "youtube", url, videoId: youtubeId };
  if (!url) return { type: "none", url: "", videoId: "" };
  return isSafeUrl(url) ? { type: "html5", url, videoId: "" } : { type: "invalid", url: "", videoId: "" };
}
function formatTime(value) {
  const s = Math.max(0, Math.floor(Number(value) || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}
function InfoRow({ icon: Icon, label, value }) {
  return <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-0"><span className="flex items-center gap-2 text-sm text-slate-500"><Icon size={16} className="text-blue-600" />{label}</span><span className="max-w-[60%] truncate text-right text-sm font-bold text-slate-900">{value}</span></div>;
}

let ytApiPromise = null;
function loadYouTubeAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { try { previous?.(); } catch {} ; window.YT?.Player ? resolve(window.YT) : reject(new Error("YouTube API unavailable")); };
    if (!existing) {
      const script = document.createElement("script"); script.src = "https://www.youtube.com/iframe_api"; script.async = true; script.onerror = reject; document.head.appendChild(script);
    } else if (window.YT?.Player) resolve(window.YT);
  });
  return ytApiPromise;
}

function VideoLessonPlayer({ user, courseId, lesson, initialProgress, onSaved }) {
  const source = useMemo(() => getSource(lesson), [lesson]);
  const requiredPercent = Math.max(0, Math.min(100, Number(lesson?.requiredWatchPercent ?? 25)));
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
    if (!force && now - lastSaveRef.current < SAVE_EVERY_MS && !completed) return;
    lastSaveRef.current = now;
    completedRef.current = completed;
    stateRef.current.completed = completed;
    setSaving(true);
    try {
      await setDoc(doc(db, "lessonProgress", `${user.uid}_${courseId}_${lesson.id}`), {
        userId: user.uid, courseId, lessonId: lesson.id, lessonTitle: lesson.title,
        duration: d, positionSeconds: Math.max(0, Number(stateRef.current.current) || 0),
        activeWatchSeconds: active, percent, requiredWatchPercent: requiredPercent,
        completed, completedAt: completed ? serverTimestamp() : null,
        attendance: completed ? "present" : "absent", lastWatchedAt: serverTimestamp(), updatedAt: serverTimestamp()
      }, { merge: true });
      onSaved?.(lesson.id, { duration: d, positionSeconds: stateRef.current.current, activeWatchSeconds: active, percent, requiredWatchPercent: requiredPercent, completed, attendance: completed ? "present" : "absent" });
    } catch (e) {
      console.error("Progress save error:", e);
      setError(e?.code === "permission-denied" ? "Attendance save is blocked by Firebase rules. Publish the lessonProgress rule for signed-in users." : "Progress could not be saved. Check your connection.");
    } finally { setSaving(false); }
  }, [courseId, lesson, onSaved, requiredPercent, user]);

  const activity = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimerRef.current);
    if (playing) hideTimerRef.current = window.setTimeout(() => setShowControls(false), CONTROL_HIDE_DELAY);
  }, [playing]);

  const flushActiveTime = useCallback(() => {
    const now = Date.now();
    if (lastTickRef.current == null) { lastTickRef.current = now; return; }
    const elapsed = Math.min(1.5, Math.max(0, (now - lastTickRef.current) / 1000));
    const active = document.visibilityState === "visible" && document.hasFocus() && playing;
    if (active && elapsed > 0) {
      const next = Math.min(stateRef.current.duration || Infinity, stateRef.current.earned + elapsed);
      stateRef.current.earned = next; setEarnedSeconds(next);
    }
    lastTickRef.current = now;
  }, [playing]);

  useEffect(() => {
    stateRef.current = { earned: Number(initialProgress?.activeWatchSeconds) || 0, duration: Number(initialProgress?.duration) || 0, current: Number(initialProgress?.positionSeconds) || 0, completed: initialProgress?.completed === true };
    completedRef.current = initialProgress?.completed === true;
    setDuration(stateRef.current.duration); setCurrentTime(stateRef.current.current); setEarnedSeconds(stateRef.current.earned); setPlaying(false); setError(""); setShowControls(false);
  }, [lesson?.id]);

  useEffect(() => {
    const onVisibility = () => { flushActiveTime(); if (document.visibilityState !== "visible") persist(true); };
    document.addEventListener("visibilitychange", onVisibility); window.addEventListener("blur", onVisibility); window.addEventListener("focus", onVisibility);
    return () => { document.removeEventListener("visibilitychange", onVisibility); window.removeEventListener("blur", onVisibility); window.removeEventListener("focus", onVisibility); };
  }, [flushActiveTime, persist]);

  useEffect(() => {
    clearInterval(tickRef.current);
    if (!playing) return undefined;
    lastTickRef.current = Date.now();
    tickRef.current = window.setInterval(() => { flushActiveTime(); persist(false); }, 500);
    activity();
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
          onReady: (e) => { if (cancelled) return; const d = Number(e.target.getDuration()) || 0; stateRef.current.duration = d; setDuration(d); const p = Number(initialProgress?.positionSeconds) || 0; if (p > 0 && p < d) e.target.seekTo(p, true); e.target.setVolume(volume); },
          onStateChange: (e) => { if (cancelled) return; const isPlaying = e.data === YT.PlayerState.PLAYING; setPlaying(isPlaying); if (!isPlaying) { flushActiveTime(); persist(true); } },
          onError: () => setError("This lesson video could not be loaded.")
        }
      });
      ytPlayerRef.current = player;
    }).catch(() => setError("YouTube player could not be initialized."));
    return () => { cancelled = true; try { ytPlayerRef.current?.destroy?.(); } catch {} ytPlayerRef.current = null; };
  }, [source.type, source.videoId]);

  useEffect(() => () => { flushActiveTime(); persist(true); clearTimeout(hideTimerRef.current); clearInterval(tickRef.current); }, [flushActiveTime, persist]);

  const togglePlay = async () => {
    activity();
    if (source.type === "youtube") { const p = ytPlayerRef.current; if (!p) return; playing ? p.pauseVideo?.() : p.playVideo?.(); return; }
    const v = videoRef.current; if (!v) return;
    try { if (v.paused) await v.play(); else v.pause(); } catch { setError("The browser blocked playback. Click the video again to start it."); }
  };
  const seekTo = (time) => {
    activity(); const target = Math.max(0, Math.min(duration || Infinity, time)); stateRef.current.current = target; setCurrentTime(target);
    if (source.type === "youtube") ytPlayerRef.current?.seekTo?.(target, true); else if (videoRef.current) videoRef.current.currentTime = target;
  };
  const seekBy = (seconds) => seekTo(currentTime + seconds);
  const setVolumeSafe = (value) => { const v = Number(value); setVolume(v); setMuted(v === 0); if (source.type === "youtube") ytPlayerRef.current?.setVolume?.(v); else if (videoRef.current) { videoRef.current.volume = v / 100; videoRef.current.muted = v === 0; } };
  const toggleMute = () => { const next = !muted; setMuted(next); if (source.type === "youtube") next ? ytPlayerRef.current?.mute?.() : ytPlayerRef.current?.unMute?.(); else if (videoRef.current) videoRef.current.muted = next; };
  const changeSpeed = (value) => { const next = Number(value); setSpeed(next); if (source.type === "youtube") ytPlayerRef.current?.setPlaybackRate?.(next); else if (videoRef.current) videoRef.current.playbackRate = next; activity(); };
  const toggleFullscreen = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await wrapRef.current?.requestFullscreen?.(); } catch { setError("Fullscreen is not available in this browser."); } activity(); };
  const togglePip = async () => { try { if (source.type !== "html5" || !videoRef.current || !document.pictureInPictureEnabled) throw new Error(); if (document.pictureInPictureElement) await document.exitPictureInPicture(); else await videoRef.current.requestPictureInPicture(); } catch { setError("Picture-in-picture is available for supported direct video files."); } activity(); };

  useEffect(() => {
    const key = (e) => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target?.tagName)) return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); seekBy(-10); }
      if (e.key === "ArrowRight") { e.preventDefault(); seekBy(10); }
      if (e.key.toLowerCase() === "m") { e.preventDefault(); toggleMute(); }
      if (e.key.toLowerCase() === "f") { e.preventDefault(); toggleFullscreen(); }
    };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  });

  const percent = duration > 0 ? Math.min(100, Math.floor((earnedSeconds / duration) * 100)) : 0;
  const attendanceReady = completedRef.current || requiredPercent === 0 || percent >= requiredPercent;
  const thumbnail = lesson?.thumbnailUrl || (source.type === "youtube" ? `https://i.ytimg.com/vi/${source.videoId}/hqdefault.jpg` : "");

  return <section ref={wrapRef} className={`overflow-hidden bg-slate-950 shadow-2xl ${fullscreen ? "flex h-screen flex-col rounded-none" : "rounded-[28px]"}`} onMouseMove={activity} onTouchStart={activity}>
    <div className="relative aspect-video w-full bg-black">
      {thumbnail && source.type === "html5" && <img src={thumbnail} alt="" className="pointer-events-none absolute inset-0 z-0 h-full w-full object-contain opacity-20" />}
      {source.type === "youtube" && <div ref={ytBoxRef} className="absolute inset-0 z-0" />}
      {source.type === "html5" && <video ref={videoRef} src={source.url} poster={thumbnail || undefined} className="absolute inset-0 z-0 h-full w-full bg-black object-contain" playsInline preload="metadata"
        onLoadedMetadata={(e) => { const d = Number(e.currentTarget.duration) || 0; stateRef.current.duration = d; setDuration(d); const p = Number(initialProgress?.positionSeconds) || 0; if (p > 0 && p < d) e.currentTarget.currentTime = p; e.currentTarget.volume = volume / 100; e.currentTarget.muted = muted; }}
        onTimeUpdate={(e) => { const t = Number(e.currentTarget.currentTime) || 0; stateRef.current.current = t; setCurrentTime(t); }}
        onPlay={() => { setPlaying(true); lastTickRef.current = Date.now(); }} onPause={() => { flushActiveTime(); setPlaying(false); persist(true); }}
        onEnded={() => { flushActiveTime(); setPlaying(false); persist(true); }} onError={() => setError("This lesson video could not be loaded.")}>
        {lesson?.captionsUrl && isSafeUrl(lesson.captionsUrl) && <track kind="captions" src={lesson.captionsUrl} default />}
      </video>}
      {source.type === "none" && <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white"><PlayCircle size={50} className="text-slate-500" /><p className="mt-3 font-bold">No lesson video available</p></div>}
      {source.type === "invalid" && <div className="absolute inset-0 flex items-center justify-center text-white">Invalid lesson video URL.</div>}
      {source.type !== "none" && source.type !== "invalid" && <button type="button" aria-label={playing ? "Pause lesson" : "Play lesson"} onClick={togglePlay} className="absolute inset-0 z-10 cursor-pointer bg-transparent focus:outline-none" />}
      {error && <div className="absolute left-3 right-3 top-3 z-40 rounded-xl border border-red-400/30 bg-red-950/90 px-4 py-3 text-xs font-semibold text-red-100 shadow-xl sm:left-5 sm:right-5">{error}</div>}
      {source.type !== "none" && source.type !== "invalid" && <div className={`absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/95 via-black/55 to-transparent px-3 pb-3 pt-16 transition duration-300 sm:px-5 sm:pb-5 ${showControls ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`} onClick={(e) => e.stopPropagation()} onMouseMove={(e) => { e.stopPropagation(); activity(); }} onTouchStart={(e) => { e.stopPropagation(); activity(); }}>
        <input type="range" min="0" max="100" step="0.1" value={duration ? (currentTime / duration) * 100 : 0} onChange={(e) => seekTo((Number(e.target.value) / 100) * duration)} className="mb-3 h-1.5 w-full cursor-pointer accent-blue-500" aria-label="Video position" />
        <div className="flex items-center gap-2 text-white">
          <button type="button" onClick={togglePlay} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20" aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={17} /> : <Play size={17} />}</button>
          <button type="button" onClick={() => seekBy(-10)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20" aria-label="Back 10 seconds"><RotateCcw size={17} /></button>
          <button type="button" onClick={() => seekBy(10)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20" aria-label="Forward 10 seconds"><RotateCw size={17} /></button>
          <span className="min-w-[84px] text-xs font-bold tabular-nums text-slate-200">{formatTime(currentTime)} / {formatTime(duration)}</span>
          <span className="hidden rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-black text-emerald-300 sm:inline-flex">Active {percent}%</span>
          <div className="ml-auto flex items-center gap-1.5">
            <button type="button" onClick={toggleMute} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20" aria-label={muted ? "Unmute" : "Mute"}>{muted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
            <input aria-label="Volume" type="range" min="0" max="100" value={volume} onChange={(e) => setVolumeSafe(e.target.value)} className="hidden w-20 accent-blue-500 sm:block" />
            <select value={speed} onChange={(e) => changeSpeed(e.target.value)} className="h-9 rounded-lg border border-white/10 bg-white/10 px-2 text-xs font-bold text-white outline-none"><option value="0.75" className="text-slate-900">0.75x</option><option value="1" className="text-slate-900">1x</option><option value="1.25" className="text-slate-900">1.25x</option><option value="1.5" className="text-slate-900">1.5x</option><option value="1.75" className="text-slate-900">1.75x</option><option value="2" className="text-slate-900">2x</option></select>
            {source.type === "html5" && <button type="button" onClick={togglePip} className="hidden h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 sm:inline-flex" aria-label="Picture in picture"><PictureInPicture2 size={17} /></button>}
            <button type="button" onClick={toggleFullscreen} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20" aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}>{fullscreen ? <Minimize size={17} /> : <Maximize size={17} />}</button>
          </div>
        </div>
      </div>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-xs"><span className="flex items-center gap-2 text-slate-300"><ShieldCheck size={15} className="text-emerald-400" />Only active on-screen playback time counts.</span><span className={`font-black ${attendanceReady ? "text-emerald-400" : "text-blue-300"}`}>{attendanceReady ? "Present" : `${requiredPercent}% active time required`}{saving && <Loader2 size={13} className="ml-2 inline animate-spin" />}</span></div>
  </section>;
}

function LessonList({ lessons, progressMap, selectedIndex, onSelect, search }) {
  const filtered = lessons.filter((l, i) => !search || `${l.title} lesson ${i + 1}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-2">{filtered.map((lesson) => { const i = lessons.findIndex(x => x.id === lesson.id), p = progressMap[lesson.id], done = p?.completed === true; return <button key={lesson.id} type="button" onClick={() => onSelect(i)} className={`w-full rounded-2xl border p-3 text-left transition ${i === selectedIndex ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-200"}`}><div className="flex gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${done ? "bg-emerald-100 text-emerald-700" : i === selectedIndex ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>{done ? <CheckCircle2 size={18} /> : <PlayCircle size={18} />}</span><span className="min-w-0 flex-1"><span className="flex justify-between gap-2"><span className="line-clamp-2 text-sm font-extrabold text-slate-900">{i + 1}. {lesson.title}</span>{done && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">Present</span>}</span><span className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-slate-500"><Clock3 size={13} />{lesson.duration || "Self-paced"}{!done && p?.percent > 0 ? ` • ${p.percent}% active` : ""}</span></span></div></button>; })}</div>;
}

function CourseDetails() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(() => getCachedCourse(courseId));
  const [user, setUser] = useState(undefined), [loading, setLoading] = useState(() => !getCachedCourse(courseId)), [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0), [progressMap, setProgressMap] = useState({}), [search, setSearch] = useState("");
  const [bookmarked, setBookmarked] = useState(false), [copied, setCopied] = useState(false);
  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u || null)), []);
  useEffect(() => { try { setBookmarked(localStorage.getItem(`online_academy_bookmark_${courseId}`) === "1"); } catch {} }, [courseId]);
  const loadCourse = useCallback(async () => { try { setLoading(true); const snap = await getDoc(doc(db, "courses", courseId)); if (!snap.exists()) throw new Error("The course does not exist."); const next = { id: snap.id, ...snap.data() }; setCourse(next); saveCourseCache(courseId, next); setError(""); } catch (e) { setError(e?.code === "permission-denied" ? "You do not have permission to view this course." : e?.message || "Unable to load this course."); } finally { setLoading(false); } }, [courseId]);
  useEffect(() => { if (!course) loadCourse(); }, [course, loadCourse]);
  const lessons = useMemo(() => normalizeLessons(course), [course]);
  const selectedLesson = lessons[selectedIndex] || null;
  useEffect(() => { if (lessons.length) setSelectedIndex(i => Math.min(i, lessons.length - 1)); }, [lessons.length]);
  useEffect(() => { let cancelled = false; const run = async () => { if (!user || !courseId || !lessons.length) return; try { const snap = await getDocs(query(collection(db, "lessonProgress"), where("userId", "==", user.uid), where("courseId", "==", courseId))); if (cancelled) return; const map = {}; snap.docs.forEach(d => { const x = d.data(); if (x.lessonId) map[x.lessonId] = { ...x, completed: x.completed === true || x.completed25 === true, percent: Number(x.percent) || 0, activeWatchSeconds: Number(x.activeWatchSeconds) || 0, positionSeconds: Number(x.positionSeconds ?? x.watchedSeconds) || 0, duration: Number(x.duration) || 0 }; }); setProgressMap(map); } catch (e) { console.error("Progress load error:", e); } }; run(); return () => { cancelled = true; }; }, [courseId, lessons.length, user]);
  const handleSaved = useCallback((id, data) => setProgressMap(prev => ({ ...prev, [id]: { ...prev[id], ...data } })), []);
  const selectLesson = (i) => { setSelectedIndex(i); window.requestAnimationFrame(() => document.getElementById("lesson-player")?.scrollIntoView({ behavior: "smooth", block: "start" })); };
  const toggleBookmark = () => { const next = !bookmarked; setBookmarked(next); try { localStorage.setItem(`online_academy_bookmark_${courseId}`, next ? "1" : "0"); } catch {} };
  const copyLink = async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {} };
  const share = async () => { try { if (navigator.share) await navigator.share({ title: course?.title, url: window.location.href }); else await copyLink(); } catch {} };
  if (loading) return <main className="min-h-screen bg-slate-50 p-8"><div className="mx-auto max-w-7xl animate-pulse space-y-6"><div className="h-48 rounded-3xl bg-slate-200" /><div className="grid gap-6 lg:grid-cols-[1fr_340px]"><div className="aspect-video rounded-3xl bg-slate-200" /><div className="h-96 rounded-3xl bg-slate-200" /></div></div></main>;
  if (error || !course) return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6"><div className="max-w-xl rounded-3xl border bg-white p-10 text-center shadow-sm"><AlertCircle className="mx-auto text-red-500" size={42}/><h1 className="mt-4 text-2xl font-black">Course unavailable</h1><p className="mt-3 text-sm text-slate-600">{error || "Course not found."}</p><button onClick={loadCourse} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"><RefreshCw size={17}/> Try again</button></div></main>;
  const completedCount = lessons.filter(l => progressMap[l.id]?.completed).length;
  const courseProgress = lessons.length ? Math.round(completedCount / lessons.length * 100) : 0;
  const title = course.title || "Untitled Course", description = course.description || "Course description will be available soon.", level = course.level || "All Levels", duration = course.duration || "Self-paced", students = Number(course.students || 0), category = course.category || "Online Course", language = course.language || "English", instructor = course.instructor || "Online Academy";
  return <main className="min-h-screen overflow-x-clip bg-slate-50">
    <section className="bg-slate-950 text-white"><div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8"><Link to="/courses" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-300"><ArrowLeft size={16}/> Back to Courses</Link><div className="mt-7 grid gap-8 lg:grid-cols-[1fr_360px]"><div><span className="rounded-full bg-blue-500/10 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-blue-300">{category}</span><h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">{title}</h1><p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">{description}</p><div className="mt-6 flex flex-wrap gap-5 text-sm text-slate-400"><span className="flex items-center gap-2"><Users size={16}/> {students.toLocaleString()} students</span><span className="flex items-center gap-2"><Clock3 size={16}/> {duration}</span><span className="flex items-center gap-2"><GraduationCap size={16}/> {level}</span></div><div className="mt-7 flex flex-wrap gap-2"><button onClick={toggleBookmark} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold">{bookmarked ? "Saved" : "Save course"}</button><button onClick={share} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold"><Share2 size={16}/> Share</button><button onClick={copyLink} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold"><Copy size={16}/> {copied ? "Copied" : "Copy link"}</button></div></div><aside className="overflow-hidden rounded-3xl bg-white text-slate-900 shadow-2xl">{course.imageUrl || course.thumbnail ? <img src={course.imageUrl || course.thumbnail} alt="" className="h-44 w-full object-cover"/> : <div className="flex h-44 items-center justify-center bg-gradient-to-br from-blue-700 to-slate-900 text-white"><GraduationCap size={54}/></div>}<div className="p-5"><InfoRow icon={PlayCircle} label="Lessons" value={lessons.length}/><InfoRow icon={Clock3} label="Duration" value={duration}/><InfoRow icon={FileText} label="Language" value={language}/><InfoRow icon={Award} label="Certificate" value={course.certificate === false ? "No" : "Included"}/></div></aside></div></div></section>
    <div className="sticky top-[68px] z-30 border-b bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 sm:px-6 lg:px-8"><div className="min-w-0 flex-1"><div className="flex justify-between text-xs font-bold text-slate-500"><span>{completedCount} of {lessons.length} lessons completed</span><span className="text-blue-700">{courseProgress}%</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-blue-600" style={{width:`${courseProgress}%`}}/></div></div></div></div>
    <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8"><div className="grid gap-7 lg:grid-cols-[1fr_350px]"><div className="space-y-7"><section id="lesson-player" className="scroll-mt-28"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[.16em] text-blue-600">Lesson {selectedIndex + 1} of {lessons.length || 1}</p><h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">{selectedLesson?.title || "Course lesson"}</h2></div><span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600"><ShieldCheck size={14} className="text-emerald-600"/> Secure progress</span></div>{selectedLesson ? <VideoLessonPlayer user={user} courseId={courseId} lesson={selectedLesson} initialProgress={progressMap[selectedLesson.id]} onSaved={handleSaved}/> : <div className="rounded-3xl border bg-white p-10 text-center">No lessons have been added yet.</div>}{selectedLesson?.description && <div className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-black">About this lesson</h3><p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">{selectedLesson.description}</p></div>}<div className="flex justify-between gap-3"><button disabled={selectedIndex === 0} onClick={() => selectLesson(selectedIndex - 1)} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-bold disabled:opacity-40"><ChevronLeft size={17}/> Previous</button><button disabled={selectedIndex >= lessons.length - 1} onClick={() => selectLesson(selectedIndex + 1)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-40">Next lesson <ChevronRight size={17}/></button></div></section><section className="rounded-3xl border bg-white p-6 shadow-sm"><div className="flex items-start gap-4"><Sparkles className="text-blue-600"/><div><h2 className="text-2xl font-black">About this course</h2><p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">{course.longDescription || description}</p></div></div></section></div>
      <aside className="lg:sticky lg:top-[112px]"><div className="overflow-hidden rounded-3xl border bg-white shadow-sm"><div className="border-b p-4"><h2 className="text-lg font-black">Course curriculum</h2><p className="mt-1 text-xs font-semibold text-slate-500">{lessons.length} lessons • {completedCount} completed</p><div className="mt-4 flex items-center gap-2 rounded-xl border bg-slate-50 px-3"><Search size={16} className="text-slate-400"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search lessons..." className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"/></div></div><div className="max-h-[65vh] overflow-y-auto p-3"><LessonList lessons={lessons} progressMap={progressMap} selectedIndex={selectedIndex} onSelect={selectLesson} search={search}/></div></div><div className="mt-5 rounded-3xl border border-blue-100 bg-blue-50 p-5"><div className="flex gap-3"><ShieldCheck className="shrink-0 text-blue-600"/><div><h3 className="font-black">Attendance rule</h3><p className="mt-1 text-sm leading-6 text-slate-600">Attendance uses active on-screen playback time only. Seeking, skipping forward/backward and playback speed changes do not grant attendance time. Once Present, it stays Present.</p></div></div></div><div className="mt-5 rounded-3xl border bg-white p-5 shadow-sm"><h3 className="font-black">Course details</h3><InfoRow icon={GraduationCap} label="Level" value={level}/><InfoRow icon={Clock3} label="Duration" value={duration}/><InfoRow icon={Users} label="Instructor" value={instructor}/></div></aside>
    </div></section>
  </main>;
}
export default memo(CourseDetails);
