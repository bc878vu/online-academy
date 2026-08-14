import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  FileText,
  GraduationCap,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";

const COURSE_CACHE_PREFIX = "online_academy_course_";
const COURSE_CACHE_TIME = 10 * 60 * 1000;
const WATCH_REQUIREMENT = 25;
const PROGRESS_SAVE_INTERVAL = 5000;
const CONTROL_HIDE_DELAY = 2200;

const getCourseCacheKey = (courseId) => `${COURSE_CACHE_PREFIX}${courseId}`;

function getCachedCourse(courseId) {
  try {
    if (!courseId) return null;
    const raw = sessionStorage.getItem(getCourseCacheKey(courseId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || !parsed?.course) return null;
    if (Date.now() - parsed.timestamp > COURSE_CACHE_TIME) {
      sessionStorage.removeItem(getCourseCacheKey(courseId));
      return null;
    }
    return parsed.course;
  } catch {
    return null;
  }
}

function saveCourseCache(courseId, course) {
  try {
    sessionStorage.setItem(
      getCourseCacheKey(courseId),
      JSON.stringify({ timestamp: Date.now(), course })
    );
  } catch {
    // Optional cache.
  }
}

function normalizeLessons(course) {
  if (!Array.isArray(course?.lessons)) return [];
  return course.lessons
    .map((lesson, index) => ({
      id: lesson?.id || `lesson_${index + 1}`,
      title: lesson?.title || `Lesson ${index + 1}`,
      videoUrl: lesson?.videoUrl || lesson?.url || "",
      videoType: lesson?.videoType || "link",
      captionsUrl: lesson?.captionsUrl || "",
      duration: lesson?.duration || "",
      order: Number(lesson?.order) || index + 1,
      description: lesson?.description || lesson?.summary || "",
      resources: Array.isArray(lesson?.resources) ? lesson.resources : [],
    }))
    .sort((a, b) => a.order - b.order);
}

function isSafeMediaUrl(value) {
  try {
    const parsed = new URL(String(value || ""), window.location.href);
    return ["https:", "http:", "blob:"].includes(parsed.protocol);
  } catch {
    return String(value || "").startsWith("/");
  }
}

function getVideoSourceInfo(rawUrl, rawType = "") {
  const url = String(rawUrl || "").trim();
  const type = String(rawType || "").toLowerCase();
  if (!url) return { type: "none", url: "", videoId: "" };
  if (!isSafeMediaUrl(url)) return { type: "invalid", url: "", videoId: "" };

  try {
    const parsed = new URL(url, window.location.href);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const isYouTube = ["youtube.com", "youtu.be", "youtube-nocookie.com"].includes(host);

    if (isYouTube) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      let videoId = "";
      if (host === "youtu.be") videoId = parts[0] || "";
      else if (parts[0] === "watch") videoId = parsed.searchParams.get("v") || "";
      else if (["shorts", "embed", "live"].includes(parts[0])) videoId = parts[1] || "";
      if (videoId) return { type: "youtube", url, videoId };
    }

    if (["youtube", "youtube_link", "youtube-link"].includes(type)) {
      const videoId =
        parsed.searchParams.get("v") ||
        parsed.pathname.split("/").filter(Boolean).pop() ||
        "";
      if (videoId) return { type: "youtube", url, videoId };
    }

    return { type: "html5", url, videoId: "" };
  } catch {
    return { type: "invalid", url: "", videoId: "" };
  }
}

let youtubeApiPromise = null;

function loadYouTubeIframeAPI() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube is only available in a browser."));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    const previousReady = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      try {
        if (typeof previousReady === "function") previousReady();
      } catch {
        // Ignore an unrelated callback error.
      }
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube player API failed to initialize."));
    };

    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => reject(new Error("Unable to load the YouTube player."));
      document.head.appendChild(script);
    } else if (window.YT?.Player) {
      resolve(window.YT);
    }
  });

  return youtubeApiPromise;
}

function formatTime(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = value % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <span className="flex items-center gap-2 text-sm text-slate-500">
        <Icon size={16} className="text-blue-600" aria-hidden="true" />
        {label}
      </span>
      <span className="max-w-[60%] truncate text-right text-sm font-bold text-slate-900">{value}</span>
    </div>
  );
}

function VideoLessonPlayer({ user, courseId, selectedLesson, initialProgress, onProgressSaved }) {
  const source = useMemo(
    () => getVideoSourceInfo(selectedLesson?.videoUrl, selectedLesson?.videoType),
    [selectedLesson]
  );

  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(Number(initialProgress?.duration) || 0);
  const [currentTime, setCurrentTime] = useState(Number(initialProgress?.watchedSeconds) || 0);
  const [saving, setSaving] = useState(false);
  const [playerError, setPlayerError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showControls, setShowControls] = useState(false);

  const wrapperRef = useRef(null);
  const videoRef = useRef(null);
  const youtubeContainerRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const youtubePollRef = useRef(null);
  const hideControlsTimerRef = useRef(null);
  const lastSavedAtRef = useRef(0);
  const saveProgressRef = useRef(null);
  const volumeRef = useRef(80);
  const initialProgressRef = useRef({
    watchedSeconds: Number(initialProgress?.watchedSeconds) || 0,
    duration: Number(initialProgress?.duration) || 0,
    completed25: initialProgress?.completed25 === true,
  });
  const maxWatchedRef = useRef(Number(initialProgress?.watchedSeconds) || 0);
  const latestRef = useRef({
    currentTime: Number(initialProgress?.watchedSeconds) || 0,
    duration: Number(initialProgress?.duration) || 0,
    playing: false,
  });

  useEffect(() => {
    latestRef.current = { currentTime, duration, playing };
  }, [currentTime, duration, playing]);

  const stopYouTubePolling = useCallback(() => {
    if (youtubePollRef.current) {
      window.clearInterval(youtubePollRef.current);
      youtubePollRef.current = null;
    }
  }, []);

  const destroyYouTubePlayer = useCallback(() => {
    stopYouTubePolling();
    const player = youtubePlayerRef.current;
    youtubePlayerRef.current = null;
    try {
      player?.destroy?.();
    } catch {
      // YouTube may already have detached the iframe.
    }
  }, [stopYouTubePolling]);

  const saveProgress = useCallback(
    async (force = false, override = {}) => {
      if (!user || !courseId || !selectedLesson?.id) return;
      const safeDuration = Math.max(0, Number(override.duration ?? latestRef.current.duration) || 0);
      const safeCurrent = Math.max(0, Number(override.currentTime ?? latestRef.current.currentTime) || 0);
      if (safeDuration <= 0) return;

      // Keep the furthest verified playback position. Seeking backward never removes attendance.
      maxWatchedRef.current = Math.max(maxWatchedRef.current, safeCurrent);
      const safeWatched = Math.min(maxWatchedRef.current, safeDuration);
      const percent = Math.min(100, Math.round((safeWatched / safeDuration) * 100));
      const alreadyCompleted = initialProgressRef.current.completed25 === true;
      const completed25 = alreadyCompleted || percent >= WATCH_REQUIREMENT;
      const now = Date.now();

      if (!force && now - lastSavedAtRef.current < PROGRESS_SAVE_INTERVAL) return;
      lastSavedAtRef.current = now;
      setSaving(true);

      try {
        const progressRef = doc(db, "lessonProgress", `${user.uid}_${courseId}_${selectedLesson.id}`);
        await setDoc(
          progressRef,
          {
            userId: user.uid,
            courseId,
            lessonId: selectedLesson.id,
            lessonTitle: selectedLesson.title,
            watchedSeconds: safeWatched,
            duration: safeDuration,
            percent,
            requiredWatchPercent: WATCH_REQUIREMENT,
            completed25,
            attendance: completed25 ? "present" : "absent",
            lastWatchedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        initialProgressRef.current.completed25 = completed25;
        onProgressSaved?.(selectedLesson.id, {
          watchedSeconds: safeWatched,
          duration: safeDuration,
          percent,
          completed25,
          attendance: completed25 ? "present" : "absent",
        });
      } catch (error) {
        console.error("Progress save error:", error);
        setPlayerError("Progress could not be saved. Please check your connection.");
      } finally {
        setSaving(false);
      }
    },
    [courseId, onProgressSaved, selectedLesson, user]
  );

  useEffect(() => {
    saveProgressRef.current = saveProgress;
  }, [saveProgress]);

  const showControlsNow = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current) window.clearTimeout(hideControlsTimerRef.current);
    if (playing) {
      hideControlsTimerRef.current = window.setTimeout(() => setShowControls(false), CONTROL_HIDE_DELAY);
    }
  }, [playing]);

  useEffect(() => {
    if (!playing) setShowControls(true);
    else showControlsNow();
  }, [playing, showControlsNow]);

  useEffect(() => () => {
    if (hideControlsTimerRef.current) window.clearTimeout(hideControlsTimerRef.current);
  }, []);

  useEffect(() => {
    initialProgressRef.current = {
      watchedSeconds: Number(initialProgress?.watchedSeconds) || 0,
      duration: Number(initialProgress?.duration) || 0,
      completed25: initialProgress?.completed25 === true,
    };
    maxWatchedRef.current = initialProgressRef.current.watchedSeconds;
    setDuration(initialProgressRef.current.duration);
    setCurrentTime(initialProgressRef.current.watchedSeconds);
    setPlaying(false);
    setPlayerError("");
    setShowControls(false);
  }, [selectedLesson?.id]);

  useEffect(() => {
    if (source.type !== "youtube" || !source.videoId) {
      destroyYouTubePlayer();
      return undefined;
    }

    let cancelled = false;
    setPlayerError("");

    loadYouTubeIframeAPI()
      .then((YT) => {
        if (cancelled || !youtubeContainerRef.current) return;
        destroyYouTubePlayer();
        const target = document.createElement("div");
        target.className = "h-full w-full";
        youtubeContainerRef.current.replaceChildren(target);

        const player = new YT.Player(target, {
          width: "100%",
          height: "100%",
          videoId: source.videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1,
            iv_load_policy: 3,
            fs: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              const d = Number(event.target.getDuration()) || 0;
              setDuration(d);
              const start = Number(initialProgressRef.current.watchedSeconds) || 0;
              if (start > 0 && start < d) event.target.seekTo(start, true);
              event.target.setVolume(volumeRef.current);
            },
            onStateChange: (event) => {
              if (cancelled) return;
              const isPlaying = event.data === YT.PlayerState.PLAYING;
              setPlaying(isPlaying);
              if (isPlaying) {
                stopYouTubePolling();
                youtubePollRef.current = window.setInterval(() => {
                  const p = youtubePlayerRef.current;
                  if (!p) return;
                  const current = Number(p.getCurrentTime?.()) || 0;
                  const d = Number(p.getDuration?.()) || latestRef.current.duration;
                  setCurrentTime(current);
                  setDuration(d);
                  latestRef.current = { currentTime: current, duration: d, playing: true };
                  saveProgress(false, { currentTime: current, duration: d });
                }, 1000);
              } else {
                stopYouTubePolling();
                const p = youtubePlayerRef.current;
                const current = Number(p?.getCurrentTime?.()) || latestRef.current.currentTime;
                const d = Number(p?.getDuration?.()) || latestRef.current.duration;
                setCurrentTime(current);
                setDuration(d);
                latestRef.current = { currentTime: current, duration: d, playing: false };
                saveProgress(true, { currentTime: current, duration: d });
              }
            },
            onError: () => setPlayerError("This lesson video could not be loaded."),
          },
        });
        youtubePlayerRef.current = player;
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("YouTube player error:", error);
          setPlayerError("The video player could not be initialized.");
        }
      });

    return () => {
      cancelled = true;
      destroyYouTubePlayer();
    };
  }, [destroyYouTubePlayer, source.type, source.videoId, stopYouTubePolling]);

  useEffect(() => {
    const handleFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () => document.removeEventListener("fullscreenchange", handleFullscreen);
  }, []);

  useEffect(() => () => {
    const last = latestRef.current;
    saveProgressRef.current?.(true, { currentTime: last.currentTime, duration: last.duration });
    destroyYouTubePlayer();
  }, [destroyYouTubePlayer]);

  const togglePlay = async () => {
    showControlsNow();
    if (source.type === "youtube") {
      const player = youtubePlayerRef.current;
      if (!player) return;
      if (playing) player.pauseVideo?.();
      else player.playVideo?.();
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    try {
      if (video.paused) await video.play();
      else video.pause();
    } catch {
      setPlayerError("The browser blocked playback.");
    }
  };

  const seekBy = (seconds) => {
    showControlsNow();
    const target = Math.max(0, Math.min(duration || Infinity, currentTime + seconds));
    if (source.type === "youtube") youtubePlayerRef.current?.seekTo?.(target, true);
    else if (videoRef.current) videoRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const handleSeek = (event) => {
    showControlsNow();
    const value = Number(event.target.value);
    const target = duration > 0 ? (value / 100) * duration : 0;
    if (source.type === "youtube") youtubePlayerRef.current?.seekTo?.(target, true);
    else if (videoRef.current) videoRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const handleVolume = (value) => {
    const next = Number(value);
    volumeRef.current = next;
    setVolume(next);
    setMuted(next === 0);
    if (source.type === "youtube") youtubePlayerRef.current?.setVolume?.(next);
    else if (videoRef.current) {
      videoRef.current.volume = next / 100;
      videoRef.current.muted = next === 0;
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (source.type === "youtube") {
      if (next) youtubePlayerRef.current?.mute?.();
      else youtubePlayerRef.current?.unMute?.();
    } else if (videoRef.current) {
      videoRef.current.muted = next;
    }
  };

  const changeSpeed = (value) => {
    const next = Number(value);
    setSpeed(next);
    if (source.type === "youtube") youtubePlayerRef.current?.setPlaybackRate?.(next);
    else if (videoRef.current) videoRef.current.playbackRate = next;
    showControlsNow();
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await wrapperRef.current?.requestFullscreen?.();
    } catch {
      setPlayerError("Fullscreen is not available in this browser.");
    }
    showControlsNow();
  };

  const togglePictureInPicture = async () => {
    try {
      if (source.type !== "html5" || !videoRef.current || !document.pictureInPictureEnabled) {
        setPlayerError("Mini-player is available for supported video files.");
        return;
      }
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await videoRef.current.requestPictureInPicture();
    } catch {
      setPlayerError("Mini-player could not be started.");
    }
    showControlsNow();
  };

  const handleHtmlTimeUpdate = (event) => {
    const video = event.currentTarget;
    const next = Number(video.currentTime) || 0;
    const d = Number(video.duration) || duration;
    setCurrentTime(next);
    setDuration(d);
    latestRef.current = { currentTime: next, duration: d, playing: !video.paused };
    saveProgress(false, { currentTime: next, duration: d });
  };

  const attendanceReady = initialProgressRef.current.completed25 || (duration > 0 && Math.round((Math.max(maxWatchedRef.current, currentTime) / duration) * 100) >= WATCH_REQUIREMENT);
  const percent = duration > 0 ? Math.min(100, Math.round((Math.max(maxWatchedRef.current, currentTime) / duration) * 100)) : 0;

  const handlePlayerActivity = () => showControlsNow();
  const handleVideoClick = () => togglePlay();

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.target?.tagName === "INPUT" || event.target?.tagName === "SELECT" || event.target?.tagName === "TEXTAREA") return;
      if (event.code === "Space") {
        event.preventDefault();
        togglePlay();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        seekBy(-10);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        seekBy(10);
      } else if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        toggleFullscreen();
      } else if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        toggleMute();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <section
      ref={wrapperRef}
      className={`overflow-hidden bg-slate-950 shadow-2xl shadow-slate-950/10 ${isFullscreen ? "flex h-screen flex-col rounded-none" : "rounded-[28px]"}`}
      onMouseMove={handlePlayerActivity}
      onTouchStart={handlePlayerActivity}
    >
      <div className="relative aspect-video w-full bg-black">
        {source.type === "youtube" && <div ref={youtubeContainerRef} className="absolute inset-0" />}

        {source.type === "html5" && (
          <video
            ref={videoRef}
            src={source.url}
            className="absolute inset-0 h-full w-full bg-black object-contain"
            playsInline
            preload="metadata"
            onLoadedMetadata={(event) => {
              const d = Number(event.currentTarget.duration) || 0;
              setDuration(d);
              const start = Number(initialProgressRef.current.watchedSeconds) || 0;
              if (start > 0 && start < d) event.currentTarget.currentTime = start;
            }}
            onTimeUpdate={handleHtmlTimeUpdate}
            onPlay={() => setPlaying(true)}
            onPause={() => {
              setPlaying(false);
              saveProgress(true);
            }}
            onEnded={() => {
              setPlaying(false);
              if (videoRef.current?.duration) {
                maxWatchedRef.current = Math.max(maxWatchedRef.current, videoRef.current.duration);
                saveProgress(true, { currentTime: videoRef.current.duration, duration: videoRef.current.duration });
              }
            }}
            onError={() => setPlayerError("This lesson video could not be loaded.")}
          >
            {selectedLesson?.captionsUrl && isSafeMediaUrl(selectedLesson.captionsUrl) && (
              <track kind="captions" src={selectedLesson.captionsUrl} default />
            )}
          </video>
        )}

        {source.type === "none" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white">
            <PlayCircle size={42} className="text-slate-500" />
            <p className="mt-4 text-lg font-bold">No lesson video available</p>
            <p className="mt-1 max-w-sm text-sm text-slate-400">This lesson is published, but its video source has not been added yet.</p>
          </div>
        )}

        {source.type === "invalid" && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-white">
            <p className="text-sm text-slate-300">The lesson video link is invalid.</p>
          </div>
        )}

        {source.type !== "none" && source.type !== "invalid" && (
          <button
            type="button"
            aria-label={playing ? "Pause lesson" : "Play lesson"}
            onClick={handleVideoClick}
            onMouseMove={handlePlayerActivity}
            onTouchStart={handlePlayerActivity}
            className="absolute inset-0 z-10 cursor-pointer bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60"
          />
        )}

        {playerError && (
          <div className="absolute left-3 right-3 top-3 z-30 rounded-xl border border-red-400/30 bg-red-950/85 px-4 py-3 text-xs font-semibold text-red-100 shadow-xl sm:left-5 sm:right-5 sm:top-5">{playerError}</div>
        )}

        {source.type !== "none" && source.type !== "invalid" && (
          <div
            className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/55 to-transparent px-3 pb-3 pt-16 transition-all duration-300 sm:px-5 sm:pb-5 ${showControls ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
            onMouseMove={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-2">
              <input type="range" min="0" max="100" step="0.1" value={percent} onChange={handleSeek} className="h-1.5 w-full cursor-pointer accent-blue-500" aria-label="Video progress" />
            </div>

            <div className="flex items-center gap-2 text-white">
              <button type="button" onClick={togglePlay} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20" aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={17} /> : <Play size={17} />}</button>
              <button type="button" onClick={() => seekBy(-10)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20" aria-label="Rewind 10 seconds"><RotateCcw size={17} /></button>
              <button type="button" onClick={() => seekBy(10)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20" aria-label="Forward 10 seconds"><RotateCw size={17} /></button>
              <span className="min-w-[82px] text-xs font-bold tabular-nums text-slate-200">{formatTime(currentTime)} / {formatTime(duration)}</span>

              <div className="ml-auto flex items-center gap-1.5">
                <div className="relative hidden sm:block">
                  <button type="button" onClick={toggleMute} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20" aria-label={muted || volume === 0 ? "Unmute" : "Mute"}>{muted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
                  <input type="range" min="0" max="100" value={volume} onChange={(event) => handleVolume(event.target.value)} className="absolute bottom-10 left-1/2 w-24 -translate-x-1/2 accent-blue-500" aria-label="Volume" />
                </div>

                <select value={speed} onChange={(event) => changeSpeed(event.target.value)} className="h-9 rounded-lg border border-white/10 bg-white/10 px-2 text-xs font-bold text-white outline-none" aria-label="Playback speed">
                  {[0.75, 1, 1.25, 1.5, 1.75, 2].map((value) => <option key={value} value={value} className="text-slate-900">{value}x</option>)}
                </select>

                {source.type === "html5" && <button type="button" onClick={togglePictureInPicture} className="hidden h-9 w-9 items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20 sm:inline-flex" aria-label="Open mini-player"><PictureInPicture2 size={17} /></button>}
                <button type="button" onClick={toggleFullscreen} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20" aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>{isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-xs sm:px-5">
        <div className="flex items-center gap-2 text-slate-300"><ShieldCheck size={15} className="text-emerald-400" /><span>Active watch time counts toward attendance.</span></div>
        <div className="flex items-center gap-2 font-bold"><span className={attendanceReady ? "text-emerald-400" : "text-blue-300"}>{attendanceReady ? "Present" : `${WATCH_REQUIREMENT}% watch required`}</span>{saving && <Loader2 size={14} className="animate-spin text-slate-500" />}</div>
      </div>
    </section>
  );
}

function LessonList({ lessons, progressMap, selectedIndex, onSelect, search }) {
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return lessons;
    return lessons.filter((lesson, index) => `${lesson.title} lesson ${index + 1}`.toLowerCase().includes(term));
  }, [lessons, search]);

  return (
    <div className="space-y-2">
      {filtered.map((lesson) => {
        const originalIndex = lessons.findIndex((item) => item.id === lesson.id);
        const progress = progressMap[lesson.id];
        const selected = originalIndex === selectedIndex;
        const completed = progress?.completed25 === true;
        return (
          <button type="button" key={lesson.id} onClick={() => onSelect(originalIndex)} className={`group w-full rounded-2xl border p-3 text-left transition ${selected ? "border-blue-300 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"}`}>
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${completed ? "bg-emerald-100 text-emerald-700" : selected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>{completed ? <CheckCircle2 size={18} /> : <PlayCircle size={18} />}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2"><span className="line-clamp-2 text-sm font-extrabold leading-5 text-slate-900">{originalIndex + 1}. {lesson.title}</span>{completed && <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">Present</span>}</span>
                <span className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-slate-500"><Clock3 size={13} /> {lesson.duration || "Self-paced"}{!completed && progress?.percent > 0 && ` • ${progress.percent}% watched`}</span>
                {!completed && progress?.percent > 0 && <span className="mt-2 block h-1 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, progress.percent)}%` }} /></span>}
              </span>
            </div>
          </button>
        );
      })}
      {filtered.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No lessons match your search.</div>}
    </div>
  );
}

function CourseDetails() {
  const { courseId } = useParams();
  const cachedCourse = getCachedCourse(courseId);
  const [course, setCourse] = useState(cachedCourse);
  const [loading, setLoading] = useState(() => !cachedCourse);
  const [error, setError] = useState("");
  const [user, setUser] = useState(undefined);
  const [selectedLessonIndex, setSelectedLessonIndex] = useState(0);
  const [progressMap, setProgressMap] = useState({});
  const [lessonSearch, setLessonSearch] = useState("");
  const [mobileCurriculumOpen, setMobileCurriculumOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (currentUser) => setUser(currentUser || null)), []);

  const loadCourse = useCallback(async () => {
    if (!courseId) {
      setError("Course information is missing.");
      setLoading(false);
      return;
    }
    const cached = getCachedCourse(courseId);
    if (cached) {
      setCourse(cached);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const snapshot = await getDoc(doc(db, "courses", courseId));
      if (!snapshot.exists()) {
        setCourse(null);
        setError("The course you are looking for does not exist.");
        return;
      }
      const nextCourse = { id: snapshot.id, ...snapshot.data() };
      setCourse(nextCourse);
      saveCourseCache(courseId, nextCourse);
    } catch (err) {
      console.error("Course loading error:", err);
      setError(err?.code === "permission-denied" ? "You do not have permission to view this course." : "Unable to load this course right now.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { loadCourse(); }, [loadCourse]);

  const lessons = useMemo(() => normalizeLessons(course), [course]);
  const selectedLesson = lessons[selectedLessonIndex] || null;

  useEffect(() => {
    if (lessons.length) setSelectedLessonIndex((current) => Math.min(current, lessons.length - 1));
  }, [lessons.length]);

  useEffect(() => {
    try { setBookmarked(localStorage.getItem(`online_academy_bookmark_${courseId}`) === "1"); } catch { setBookmarked(false); }
  }, [courseId]);

  useEffect(() => {
    let cancelled = false;
    async function loadProgress() {
      if (!user || !courseId || !lessons.length) {
        setProgressMap({});
        return;
      }
      try {
        const progressQuery = query(collection(db, "lessonProgress"), where("userId", "==", user.uid), where("courseId", "==", courseId));
        const snapshot = await getDocs(progressQuery);
        if (cancelled) return;
        const next = {};
        snapshot.docs.forEach((item) => {
          const data = item.data();
          if (!data.lessonId) return;
          next[data.lessonId] = {
            watchedSeconds: Number(data.watchedSeconds) || 0,
            duration: Number(data.duration) || 0,
            percent: Number(data.percent) || 0,
            completed25: data.completed25 === true,
            attendance: data.attendance || (data.completed25 ? "present" : "absent"),
          };
        });
        setProgressMap(next);
      } catch (err) {
        console.error("Progress loading error:", err);
      }
    }
    loadProgress();
    return () => { cancelled = true; };
  }, [courseId, lessons.length, user]);

  const title = course?.title || "Untitled Course";
  const description = course?.description || "Course description will be available soon.";
  const longDescription = course?.longDescription || description;
  const category = course?.category || "Online Course";
  const level = course?.level || "All Levels";
  const duration = course?.duration || "Self-paced";
  const students = Number(course?.students || 0);
  const language = course?.language || "English";
  const instructor = course?.instructor || "Online Academy";
  const rating = course?.rating || null;
  const certificate = course?.certificate !== false;
  const thumbnail = course?.thumbnail || course?.imageUrl || course?.image || "";
  const price = Number(course?.price || 0);
  const oldPrice = Number(course?.oldPrice || 0);
  const isFree = course?.isPaid === false || price === 0;
  const discount = !isFree && oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : null;

  const totalCompletedLessons = useMemo(() => lessons.filter((lesson) => progressMap[lesson.id]?.completed25).length, [lessons, progressMap]);
  const courseProgress = lessons.length ? Math.round((totalCompletedLessons / lessons.length) * 100) : 0;
  const selectedProgress = selectedLesson ? progressMap[selectedLesson.id] : null;

  const learningPoints = [
    "Learn through structured lessons",
    "Track your verified learning progress",
    "Use modern video controls and playback speed",
    "Reach 25% active watch time for attendance",
    "Resume lessons from your saved position",
    "Complete the course at your own pace",
  ];

  const handleProgressSaved = useCallback((lessonId, data) => {
    setProgressMap((previous) => ({ ...previous, [lessonId]: { ...previous[lessonId], ...data } }));
  }, []);

  const toggleBookmark = () => {
    const next = !bookmarked;
    setBookmarked(next);
    try { localStorage.setItem(`online_academy_bookmark_${courseId}`, next ? "1" : "0"); } catch { /* optional */ }
  };

  const copyCourseLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { setCopied(false); }
  };

  const shareCourse = async () => {
    try {
      if (navigator.share) await navigator.share({ title, text: `Explore ${title} on Online Academy`, url: window.location.href });
      else await copyCourseLink();
    } catch { /* cancelled */ }
  };

  const selectLesson = (index) => {
    setSelectedLessonIndex(index);
    setMobileCurriculumOpen(false);
    window.requestAnimationFrame(() => document.getElementById("lesson-player")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  if (loading) {
    return <main className="min-h-[calc(100vh-74px)] bg-slate-50"><div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><div className="animate-pulse space-y-6"><div className="h-7 w-40 rounded-lg bg-slate-200" /><div className="h-72 rounded-3xl bg-slate-200" /><div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"><div className="aspect-video rounded-3xl bg-slate-200" /><div className="h-96 rounded-3xl bg-slate-200" /></div></div></div></main>;
  }

  if (error || !course) {
    return <main className="min-h-[calc(100vh-74px)] bg-slate-50"><div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4 py-10"><div className="w-full rounded-[28px] border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-10"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600"><AlertCircle size={30} /></div><h1 className="mt-5 text-2xl font-black text-slate-950">Course Not Found</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-slate-600">{error || "The requested course could not be found."}</p><div className="mt-7 flex flex-wrap justify-center gap-3"><button type="button" onClick={loadCourse} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 hover:bg-slate-50"><RefreshCw size={17} /> Try Again</button><Link to="/courses" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-extrabold text-white hover:bg-blue-700"><ArrowLeft size={17} /> Back to Courses</Link></div></div></div></main>;
  }

  return (
    <main className="min-h-[calc(100vh-74px)] overflow-x-clip bg-slate-50">
      <section className="relative overflow-hidden bg-slate-950 text-white"><div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(37,99,235,.22),transparent_35%),radial-gradient(circle_at_90%_0%,rgba(14,165,233,.16),transparent_30%)]" /><div className="relative mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8"><Link to="/courses" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"><ArrowLeft size={16} /> Back to Courses</Link><div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-blue-300">{category}</span>{certificate && <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300"><Award size={14} /> Certificate included</span>}</div><h1 className="mt-5 max-w-4xl text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">{title}</h1><p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">{description}</p><div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">{rating && <span className="inline-flex items-center gap-2 font-bold text-white"><Star size={17} className="fill-amber-400 text-amber-400" />{rating}</span>}<span className="inline-flex items-center gap-2 text-slate-400"><Users size={17} /> {students.toLocaleString()} students</span><span className="inline-flex items-center gap-2 text-slate-400"><Clock3 size={17} /> {duration}</span></div><div className="mt-7 flex flex-wrap gap-2"><button type="button" onClick={toggleBookmark} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-extrabold text-white hover:bg-white/10">{bookmarked ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}{bookmarked ? "Saved" : "Save course"}</button><button type="button" onClick={shareCourse} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-extrabold text-white hover:bg-white/10"><Share2 size={17} /> Share</button><button type="button" onClick={copyCourseLink} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-extrabold text-white hover:bg-white/10"><Copy size={17} /> {copied ? "Copied" : "Copy link"}</button></div></div><aside className="overflow-hidden rounded-[28px] border border-white/10 bg-white text-slate-900 shadow-2xl shadow-black/20">{thumbnail ? <img src={thumbnail} alt="" className="h-44 w-full object-cover" loading="eager" referrerPolicy="no-referrer" /> : <div className="flex h-44 items-center justify-center bg-gradient-to-br from-blue-700 to-slate-900 text-white"><GraduationCap size={54} /></div>}<div className="p-5 sm:p-6"><div className="flex items-end justify-between gap-4"><div><p className="text-3xl font-black text-emerald-600">{isFree ? "Free" : `Rs. ${price.toLocaleString()}`}</p>{!isFree && oldPrice > price && <p className="mt-1 text-sm text-slate-400 line-through">Rs. {oldPrice.toLocaleString()}</p>}</div>{discount && <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-black text-emerald-700">{discount}% OFF</span>}</div><div className="mt-5 divide-y divide-slate-100"><InfoRow icon={PlayCircle} label="Lessons" value={lessons.length} /><InfoRow icon={Clock3} label="Duration" value={duration} /><InfoRow icon={GraduationCap} label="Level" value={level} /><InfoRow icon={FileText} label="Language" value={language} /><InfoRow icon={Award} label="Certificate" value={certificate ? "Included" : "Not included"} /></div></div></aside></div></div></section>

      <div className="sticky top-[68px] z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl sm:top-[74px]"><div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 sm:px-6 lg:px-8"><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-500"><span className="truncate">{totalCompletedLessons} of {lessons.length} lessons completed</span><span className="shrink-0 text-blue-700">{courseProgress}%</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${courseProgress}%` }} /></div></div><button type="button" onClick={() => document.getElementById("lesson-player")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="hidden min-h-10 shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-3.5 text-xs font-black text-white hover:bg-blue-700 sm:inline-flex"><Play size={15} fill="currentColor" /> Continue</button></div></div>

      <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8"><div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_350px] lg:items-start"><div className="min-w-0 space-y-7"><section id="lesson-player" className="scroll-mt-28"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div className="min-w-0"><p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">Lesson {selectedLessonIndex + 1} of {lessons.length || 1}</p><h2 className="mt-1 truncate text-xl font-black text-slate-950 sm:text-2xl">{selectedLesson?.title || "Course lesson"}</h2></div><span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600"><ShieldCheck size={14} className="text-emerald-600" /> Secure progress tracking</span></div>{selectedLesson ? <VideoLessonPlayer user={user} courseId={courseId} selectedLesson={selectedLesson} initialProgress={selectedProgress} onProgressSaved={handleProgressSaved} /> : <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center"><PlayCircle className="mx-auto text-slate-300" size={48} /><p className="mt-4 font-bold text-slate-700">No lessons have been added yet.</p></div>}{selectedLesson?.description && <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-black text-slate-950">About this lesson</h3><p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">{selectedLesson.description}</p></div>}<div className="mt-5 flex items-center justify-between gap-3"><button type="button" disabled={selectedLessonIndex <= 0} onClick={() => selectLesson(selectedLessonIndex - 1)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={17} /> Previous</button><button type="button" disabled={selectedLessonIndex >= lessons.length - 1} onClick={() => selectLesson(selectedLessonIndex + 1)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">Next lesson <ChevronRight size={17} /></button></div></section><section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Sparkles size={23} /></div><div><h2 className="text-2xl font-black text-slate-950">About this course</h2><p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600 sm:text-base">{longDescription}</p></div></div></section><section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex items-center justify-between gap-4"><div><h2 className="text-2xl font-black text-slate-950">What you will learn</h2><p className="mt-1 text-sm text-slate-500">A focused learning experience built around your progress.</p></div><CheckCircle2 className="hidden text-emerald-500 sm:block" size={28} /></div><div className="mt-6 grid gap-3 sm:grid-cols-2">{learningPoints.map((point) => <div key={point} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-500" size={18} /><span className="text-sm font-semibold leading-6 text-slate-700">{point}</span></div>)}</div></section></div>

      <aside className="lg:sticky lg:top-[112px]"><div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-4 sm:p-5"><button type="button" onClick={() => setMobileCurriculumOpen((value) => !value)} className="flex w-full items-center justify-between gap-4 text-left lg:pointer-events-none"><div><h2 className="text-lg font-black text-slate-950">Course curriculum</h2><p className="mt-1 text-xs font-semibold text-slate-500">{lessons.length} lessons • {totalCompletedLessons} completed</p></div><ChevronDown className={`text-slate-400 transition lg:hidden ${mobileCurriculumOpen ? "rotate-180" : ""}`} size={20} /></button><div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3"><Search size={16} className="shrink-0 text-slate-400" /><input value={lessonSearch} onChange={(event) => setLessonSearch(event.target.value)} placeholder="Search lessons..." className="h-10 min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400" aria-label="Search lessons" /></div></div><div className={`${mobileCurriculumOpen ? "block" : "hidden"} max-h-[65vh] overflow-y-auto p-3 lg:block`}><LessonList lessons={lessons} progressMap={progressMap} selectedIndex={selectedLessonIndex} onSelect={selectLesson} search={lessonSearch} /></div></div><div className="mt-5 rounded-[28px] border border-blue-100 bg-blue-50 p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-blue-600" size={20} /><div><h3 className="font-black text-slate-900">Attendance rule</h3><p className="mt-1 text-sm leading-6 text-slate-600">Watch at least {WATCH_REQUIREMENT}% of a lesson using active playback to mark it Present. Once Present, attendance stays Present even if the lesson is replayed or seeked backward.</p></div></div></div><div className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-black text-slate-950">Course details</h3><div className="mt-2"><InfoRow icon={GraduationCap} label="Level" value={level} /><InfoRow icon={Clock3} label="Duration" value={duration} /><InfoRow icon={Users} label="Students" value={students.toLocaleString()} /><InfoRow icon={FileText} label="Language" value={language} /><InfoRow icon={Award} label="Certificate" value={certificate ? "Included" : "No"} /><InfoRow icon={Users} label="Instructor" value={instructor} /></div></div></aside></div></section>
    </main>
  );
}

export default memo(CourseDetails);
