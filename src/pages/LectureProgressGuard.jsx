import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
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

const WATCH_REQUIREMENT = 25;
const SAVE_EVERY_MS = 2000;
const ACTIVE_TICK_MS = 1000;

function getCourseIdFromPath() {
  const match = window.location.pathname.match(/^\/courses\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function getLessonIndexFromDom() {
  const nodes = Array.from(document.querySelectorAll("p,span,h2,h3,div"));
  const node = nodes.find((el) => /Lesson\s+\d+\s+of\s+\d+/i.test(el.textContent || ""));
  if (!node) return null;
  const match = (node.textContent || "").match(/Lesson\s+(\d+)\s+of\s+(\d+)/i);
  return match ? Number(match[1]) - 1 : null;
}

function getActiveVideo() {
  const video = document.querySelector("video");
  if (video) return { type: "html5", player: video };

  const iframe = document.querySelector(
    'iframe[src*="youtube.com"], iframe[src*="youtube-nocookie.com"]'
  );

  if (iframe && window.YT?.get && iframe.id) {
    try {
      const player = window.YT.get(iframe.id);
      if (player) return { type: "youtube", player };
    } catch {
      // Player may not be registered yet.
    }
  }

  return null;
}

function isScreenActive() {
  return document.visibilityState === "visible" && document.hasFocus();
}

export default function LectureProgressGuard({ children }) {
  const location = useLocation();
  const [user, setUser] = useState(undefined);

  const courseRef = useRef(null);
  const lessonsRef = useRef([]);
  const recordsRef = useRef({});
  const lastLessonIdRef = useRef("");
  const earnedRef = useRef(0);
  const durationRef = useRef(0);
  const lastMediaTimeRef = useRef(null);
  const lastTickRef = useRef(0);
  const lastSaveRef = useRef(0);
  const saveInFlightRef = useRef(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
    });
  }, []);

  useEffect(() => {
    const courseId = getCourseIdFromPath();
    if (!courseId || !user) return undefined;

    let cancelled = false;

    const loadData = async () => {
      try {
        const [courseSnap, progressSnap] = await Promise.all([
          getDoc(doc(db, "courses", courseId)),
          getDocs(
            query(
              collection(db, "lessonProgress"),
              where("userId", "==", user.uid),
              where("courseId", "==", courseId)
            )
          ),
        ]);

        if (cancelled) return;

        courseRef.current = courseSnap.exists()
          ? { id: courseSnap.id, ...courseSnap.data() }
          : null;

        lessonsRef.current = Array.isArray(courseRef.current?.lessons)
          ? courseRef.current.lessons
          : [];

        const map = {};
        progressSnap.docs.forEach((item) => {
          const data = item.data();
          if (data.lessonId) map[data.lessonId] = data;
        });

        recordsRef.current = map;
      } catch (error) {
        console.error("Lecture guard load error:", error);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    const courseId = getCourseIdFromPath();
    if (!courseId) return undefined;

    const tick = async () => {
      const lessonIndex = getLessonIndexFromDom();
      const lesson =
        lessonIndex == null ? null : lessonsRef.current[lessonIndex];
      const media = getActiveVideo();

      if (!lesson || !media) return;

      if (lesson.id !== lastLessonIdRef.current) {
        lastLessonIdRef.current = lesson.id;

        const record = recordsRef.current[lesson.id] || {};

        earnedRef.current = Math.max(
          0,
          Number(record.watchedSeconds) || 0
        );

        durationRef.current = Math.max(
          0,
          Number(record.duration) || 0
        );

        lastMediaTimeRef.current = null;
        lastTickRef.current = Date.now();
        lastSaveRef.current = 0;
      }

      let mediaTime = 0;
      let duration = durationRef.current;
      let playing = false;

      try {
        if (media.type === "html5") {
          mediaTime = Number(media.player.currentTime) || 0;
          duration = Number(media.player.duration) || duration;
          playing = !media.player.paused && !media.player.ended;
        } else {
          mediaTime = Number(media.player.getCurrentTime?.()) || 0;
          duration = Number(media.player.getDuration?.()) || duration;
          const state = media.player.getPlayerState?.();
          playing = state === window.YT?.PlayerState?.PLAYING;
        }
      } catch {
        return;
      }

      durationRef.current = duration;

      const now = Date.now();
      const elapsed = lastTickRef.current
        ? Math.min(
            2,
            Math.max(0, (now - lastTickRef.current) / 1000)
          )
        : 0;

      // Seeking, jumping, or switching position never grants watch time.
      // Only real wall-clock time while the video is actively playing counts.
      const jumped =
        lastMediaTimeRef.current != null &&
        Math.abs(mediaTime - lastMediaTimeRef.current) > 2.5;

      const active = isScreenActive() && playing && !jumped;

      if (active) {
        earnedRef.current = Math.min(
          duration || Infinity,
          earnedRef.current + elapsed
        );
      }

      lastTickRef.current = now;
      lastMediaTimeRef.current = mediaTime;

      const percent =
        duration > 0
          ? Math.min(
              100,
              Math.round((earnedRef.current / duration) * 100)
            )
          : 0;

      const completed25 = percent >= WATCH_REQUIREMENT;
      const shouldSave =
        now - lastSaveRef.current >= SAVE_EVERY_MS || completed25;

      if (
        shouldSave &&
        !saveInFlightRef.current &&
        duration > 0
      ) {
        saveInFlightRef.current = true;
        lastSaveRef.current = now;

        const progressId =
          `${user.uid}_${courseId}_${lesson.id}`;

        try {
          await setDoc(
            doc(db, "lessonProgress", progressId),
            {
              userId: user.uid,
              courseId,
              courseTitle: courseRef.current?.title || "",
              lessonId: lesson.id,
              lessonTitle: lesson.title || "",
              watchedSeconds: earnedRef.current,
              duration,
              percent,
              requiredWatchPercent: WATCH_REQUIREMENT,
              completed25,
              attendance: completed25 ? "present" : "absent",
              lastWatchedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          recordsRef.current[lesson.id] = {
            ...recordsRef.current[lesson.id],
            watchedSeconds: earnedRef.current,
            duration,
            percent,
            completed25,
            attendance: completed25 ? "present" : "absent",
          };
        } catch (error) {
          console.error("Lecture guard save error:", error);
        } finally {
          saveInFlightRef.current = false;
        }
      }

      // The original player remains intact; this only enforces the verified
      // attendance threshold on the existing Next Lesson control.
      const nextButton = Array.from(
        document.querySelectorAll("button")
      ).find((button) =>
        (button.textContent || "").trim().includes("Next Lesson")
      );

      if (nextButton) {
        const lastLesson =
          lessonIndex >= lessonsRef.current.length - 1;

        nextButton.disabled = lastLesson || !completed25;
        nextButton.title = completed25
          ? "Next lesson"
          : `Watch ${WATCH_REQUIREMENT}% first`;
      }
    };

    const interval = window.setInterval(tick, ACTIVE_TICK_MS);
    tick();

    const activityEvents = ["visibilitychange"];
    activityEvents.forEach((event) =>
      document.addEventListener(event, tick)
    );

    window.addEventListener("focus", tick);
    window.addEventListener("blur", tick);

    return () => {
      window.clearInterval(interval);
      activityEvents.forEach((event) =>
        document.removeEventListener(event, tick)
      );
      window.removeEventListener("focus", tick);
      window.removeEventListener("blur", tick);
    };
  }, [user]);

  // Public course pages stay visible to everyone, but opening a lesson/course
  // is a student action. Keep the public catalogue accessible and send a
  // logged-out visitor to the normal Login page instead of allowing the
  // protected lecture screen to render without an authenticated user.
  if (user === undefined) return children;

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return children;
}
