import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  Loader2,
  Lock,
  Pause,
  Play,
  PlayCircle,
  RotateCcw,
  RotateCw,
  Search,
  ShieldCheck,
  Star,
  Users,
  Volume2,
  VolumeX,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  serverTimestamp,
  where,
} from "firebase/firestore";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  auth,
  db,
} from "../firebase";

// ======================================================
// CONFIG
// ======================================================

const COURSE_CACHE_PREFIX = "online_academy_course_";
const COURSE_CACHE_TIME = 5 * 60 * 1000;

const WATCH_REQUIREMENT = 25;
const PROGRESS_SAVE_INTERVAL = 5000;

const getCourseCacheKey = (courseId) =>
  `${COURSE_CACHE_PREFIX}${courseId}`;

function getCachedCourse(courseId) {
  try {
    if (!courseId) return null;

    const cached = sessionStorage.getItem(
      getCourseCacheKey(courseId)
    );

    if (!cached) return null;

    const parsed = JSON.parse(cached);

    if (
      !parsed ||
      !parsed.timestamp ||
      !parsed.course
    ) {
      sessionStorage.removeItem(
        getCourseCacheKey(courseId)
      );
      return null;
    }

    if (
      Date.now() - parsed.timestamp >
      COURSE_CACHE_TIME
    ) {
      sessionStorage.removeItem(
        getCourseCacheKey(courseId)
      );
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
      JSON.stringify({
        timestamp: Date.now(),
        course,
      })
    );
  } catch {
    // Cache is optional.
  }
}

// ======================================================
// NORMALIZE LESSONS
// ======================================================

function normalizeLessons(course) {
  if (Array.isArray(course?.lessons)) {
    return course.lessons
      .map((lesson, index) => ({
        id:
          lesson?.id ||
          `lesson_${index + 1}`,
        title:
          lesson?.title ||
          `Lesson ${index + 1}`,
        videoUrl:
          lesson?.videoUrl ||
          lesson?.url ||
          "",
        videoType:
          lesson?.videoType ||
          "link",
        captionsUrl:
          lesson?.captionsUrl ||
          "",
        duration:
          lesson?.duration ||
          "",
        requiredWatchPercent:
          WATCH_REQUIREMENT,
        order:
          Number(lesson?.order) ||
          index + 1,
      }))
      .sort((a, b) => a.order - b.order);
  }

  return [];
}

// ======================================================
// COURSE DETAILS
// ======================================================

function CourseDetails() {
  const { courseId } = useParams();

  const [course, setCourse] = useState(() =>
    courseId ? getCachedCourse(courseId) : null
  );

  const [loading, setLoading] = useState(
    () => !getCachedCourse(courseId)
  );

  const [error, setError] = useState("");

  const [user, setUser] = useState(undefined);

  const [selectedLessonIndex, setSelectedLessonIndex] =
    useState(0);

  const [progressMap, setProgressMap] = useState({});

  const [playerError, setPlayerError] = useState("");

  // ------------------------------------------------------
  // Auth
  // ------------------------------------------------------

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser || null);
      }
    );

    return unsubscribe;
  }, []);

  // ------------------------------------------------------
  // Load course
  // ------------------------------------------------------

  const loadCourse = useCallback(async () => {
    if (!courseId) {
      setCourse(null);
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

      const snapshot = await getDoc(
        doc(db, "courses", courseId)
      );

      if (!snapshot.exists()) {
        setCourse(null);
        setError(
          "The course you are looking for does not exist."
        );
        return;
      }

      const courseData = {
        id: snapshot.id,
        ...snapshot.data(),
      };

      setCourse(courseData);
      saveCourseCache(courseId, courseData);
    } catch (err) {
      console.error("Error loading course:", err);

      if (err?.code === "permission-denied") {
        setError(
          "You do not have permission to view this course."
        );
      } else if (err?.code === "unavailable") {
        setError(
          "Firebase is temporarily unavailable. Please check your internet connection."
        );
      } else {
        setError(
          err?.message ||
            "Unable to load this course right now."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  // ------------------------------------------------------
  // Lessons
  // ------------------------------------------------------

  const lessons = useMemo(
    () => normalizeLessons(course),
    [course]
  );

  const selectedLesson =
    lessons[selectedLessonIndex] || null;

  // ------------------------------------------------------
  // Load saved progress
  // ------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const loadProgress = async () => {
      if (!user || !courseId || lessons.length === 0) {
        setProgressMap({});
        return;
      }

      try {
        const progressQuery = query(
          collection(db, "lessonProgress"),
          where("userId", "==", user.uid),
          where("courseId", "==", courseId)
        );

        const snapshot = await getDocs(progressQuery);

        if (cancelled) return;

        const next = {};

        snapshot.docs.forEach((item) => {
          const data = item.data();

          if (data.lessonId) {
            next[data.lessonId] = {
              watchedSeconds:
                Number(data.watchedSeconds) || 0,
              duration:
                Number(data.duration) || 0,
              percent:
                Number(data.percent) || 0,
              completed25:
                data.completed25 === true,
              attendance:
                data.attendance || "absent",
            };
          }
        });

        setProgressMap(next);
      } catch (err) {
        console.error(
          "Progress loading error:",
          err
        );
      }
    };

    loadProgress();

    return () => {
      cancelled = true;
    };
  }, [user, courseId, lessons.length]);

  // ------------------------------------------------------
  // Price
  // ------------------------------------------------------

  const priceInfo = useMemo(() => {
    const price = Number(course?.price || 0);
    const oldPrice = Number(course?.oldPrice || 0);

    const isFree =
      course?.isPaid === false ||
      price === 0;

    const discount =
      !isFree && oldPrice > price
        ? Math.round(
            ((oldPrice - price) / oldPrice) * 100
          )
        : null;

    return {
      price,
      oldPrice,
      isFree,
      discount,
    };
  }, [course]);

  const formatPrice = (value) => {
    if (
      value === undefined ||
      value === null ||
      Number(value) === 0
    ) {
      return "Free";
    }

    return `Rs. ${Number(value).toLocaleString()}`;
  };

  // ------------------------------------------------------
  // Course values
  // ------------------------------------------------------

  const title =
    course?.title ||
    "Untitled Course";

  const description =
    course?.description ||
    "Course description will be available soon.";

  const longDescription =
    course?.longDescription ||
    description;

  const category =
    course?.category ||
    "Online Course";

  const level =
    course?.level ||
    "All Levels";

  const duration =
    course?.duration ||
    "Self-paced";

  const students =
    Number(course?.students || 0);

  const language =
    course?.language ||
    "English";

  const instructor =
    course?.instructor ||
    "";

  const rating =
    course?.rating ||
    null;

  const certificate =
    course?.certificate !== false;

  const thumbnail =
    course?.thumbnail ||
    course?.imageUrl ||
    course?.image ||
    "";

  const {
    isFree,
    discount,
  } = priceInfo;

  const learningPoints = useMemo(
    () => [
      "Learn through structured lessons",
      "Watch lessons with advanced video controls",
      "Track your learning progress",
      "Reach 25% watch time for attendance",
      "Practice important concepts",
      "Complete the course at your own pace",
    ],
    []
  );

  // ------------------------------------------------------
  // Lesson progress helpers
  // ------------------------------------------------------

  const totalCompletedLessons = useMemo(
    () =>
      lessons.filter(
        (lesson) =>
          progressMap[lesson.id]?.completed25
      ).length,
    [lessons, progressMap]
  );

  const courseProgress =
    lessons.length > 0
      ? Math.round(
          (totalCompletedLessons / lessons.length) *
            100
        )
      : 0;

  const selectedProgress =
    selectedLesson
      ? progressMap[selectedLesson.id]
      : null;

  const handleProgressSaved = useCallback(
    (lessonId, data) => {
      setProgressMap((previous) => ({
        ...previous,
        [lessonId]: {
          ...previous[lessonId],
          ...data,
        },
      }));
    },
    []
  );

  // ------------------------------------------------------
  // Loading
  // ------------------------------------------------------

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-72px)] bg-slate-50">
        <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-7xl items-center justify-center px-4 py-12">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
              <Loader2
                size={30}
                className="animate-spin text-blue-600"
              />
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-900">
              Loading course...
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Please wait while we load the course.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ------------------------------------------------------
  // Error
  // ------------------------------------------------------

  if (error || !course) {
    return (
      <main className="min-h-[calc(100vh-72px)] bg-slate-50">
        <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-3xl items-center justify-center px-4 py-12 sm:px-6">
          <div className="w-full rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200 sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
              <AlertCircle
                size={30}
                className="text-red-600"
              />
            </div>

            <h1 className="mt-6 text-2xl font-bold text-slate-900 sm:text-3xl">
              Course Not Found
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600 sm:text-base">
              {error ||
                "The requested course could not be found."}
            </p>

            <button
              type="button"
              onClick={loadCourse}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={17} />
              Try Again
            </button>

            <Link
              to="/courses"
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              <ArrowLeft size={18} />
              Back to Courses
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-slate-50">
      {/* ==================================================
          HERO
      ================================================== */}

      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white"
          >
            <ArrowLeft size={17} />
            Back to Courses
          </Link>

          <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full bg-blue-500/10 px-4 py-2 text-xs font-bold text-blue-400 ring-1 ring-blue-500/20 sm:text-sm">
                {category}
              </span>

              <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                {title}
              </h1>

              <p className="mt-5 text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                {description}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm sm:gap-5">
                {rating && (
                  <div className="flex items-center gap-2">
                    <Star
                      size={18}
                      className="fill-amber-400 text-amber-400"
                    />
                    <span className="font-bold text-white">
                      {rating}
                    </span>
                    <span className="text-slate-400">
                      Course Rating
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-slate-400">
                  <Users size={17} />
                  {students.toLocaleString()} students
                </div>
              </div>

              {instructor && (
                <p className="mt-5 text-sm text-slate-400">
                  Created by{" "}
                  <span className="font-semibold text-white">
                    {instructor}
                  </span>
                </p>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl">
              <div className="relative h-48 overflow-hidden bg-gradient-to-br from-blue-600 to-slate-900 sm:h-52">
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt={title}
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <GraduationCap
                      size={68}
                      className="text-white"
                    />
                  </div>
                )}
              </div>

              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`text-3xl font-extrabold ${
                      isFree
                        ? "text-emerald-600"
                        : "text-slate-900"
                    }`}
                  >
                    {isFree
                      ? "Free"
                      : formatPrice(course.price)}
                  </span>

                  {!isFree && discount && (
                    <>
                      <span className="text-sm text-slate-400 line-through">
                        {formatPrice(course.oldPrice)}
                      </span>

                      <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-600">
                        {discount}% OFF
                      </span>
                    </>
                  )}
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  {isFree
                    ? "Free enrollment"
                    : "One-time payment"}
                </p>

                <div className="mt-6 space-y-3 border-t border-slate-100 pt-6">
                  <InfoRow
                    icon={PlayCircle}
                    text={`${lessons.length} Lessons`}
                  />

                  <InfoRow
                    icon={Clock3}
                    text={duration}
                  />

                  <InfoRow
                    icon={Award}
                    text={
                      certificate
                        ? "Certificate Included"
                        : "No Certificate"
                    }
                  />

                  <InfoRow
                    icon={GraduationCap}
                    text={level}
                  />

                  <InfoRow
                    icon={CheckCircle2}
                    text={`${WATCH_REQUIREMENT}% watch required for attendance`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          MAIN
      ================================================== */

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-7">
            {/* ==================================================
                VIDEO PLAYER
            ================================================== */}

            <VideoLessonPlayer
              user={user}
              courseId={courseId}
              courseTitle={title}
              lessons={lessons}
              selectedLesson={selectedLesson}
              selectedLessonIndex={selectedLessonIndex}
              setSelectedLessonIndex={
                setSelectedLessonIndex
              }
              progress={selectedProgress}
              onProgressSaved={handleProgressSaved}
              playerError={playerError}
              setPlayerError={setPlayerError}
            />

            {/* ==================================================
                ABOUT
            ================================================== */

            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
              <h2 className="text-2xl font-bold text-slate-900">
                About This Course
              </h2>

              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
                {longDescription}
              </p>
            </section>

            {/* ==================================================
                CURRICULUM
            ================================================== */

            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Course Curriculum
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {lessons.length} lessons
                  </p>
                </div>

                <BookOpen
                  size={25}
                  className="shrink-0 text-blue-600"
                />
              </div>

              {lessons.length > 0 ? (
                <div className="mt-6 space-y-2">
                  {lessons.map((lesson, index) => {
                    const lessonProgress =
                      progressMap[lesson.id];

                    const isCompleted =
                      lessonProgress?.completed25 === true;

                    const isSelected =
                      index === selectedLessonIndex;

                    return (
                      <button
                        type="button"
                        key={lesson.id}
                        onClick={() =>
                          setSelectedLessonIndex(index)
                        }
                        className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition sm:gap-4 sm:p-4 ${
                          isSelected
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/50"
                        }`}
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                            isCompleted
                              ? "bg-emerald-100 text-emerald-700"
                              : isSelected
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 size={19} />
                          ) : (
                            index + 1
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-800 sm:text-base">
                            {lesson.title}
                          </p>

                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                            {lesson.duration && (
                              <span>
                                {lesson.duration}
                              </span>
                            )}

                            <span>
                              {isCompleted
                                ? "Attendance Present"
                                : `${WATCH_REQUIREMENT}% watch required`}
                            </span>
                          </div>
                        </div>

                        {isCompleted ? (
                          <CheckCircle2
                            size={19}
                            className="shrink-0 text-emerald-600"
                          />
                        ) : (
                          <PlayCircle
                            size={19}
                            className="shrink-0 text-blue-500"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center">
                  <BookOpen
                    size={28}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Course lessons will appear here after the
                    instructor adds them.
                  </p>
                </div>
              )}
            </section>

            {/* ==================================================
                WHAT YOU LEARN
            ================================================== */

            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
              <h2 className="text-2xl font-bold text-slate-900">
                What You Will Learn
              </h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {learningPoints.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle2
                      size={19}
                      className="mt-0.5 shrink-0 text-emerald-600"
                    />

                    <span className="text-sm leading-6 text-slate-600">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ==================================================
              SIDEBAR
          ================================================== */

          <aside className="space-y-6">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-900">
                  Your Progress
                </h3>

                <span className="font-extrabold text-blue-600">
                  {courseProgress}%
                </span>
              </div>

              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-500"
                  style={{
                    width: `${courseProgress}%`,
                  }}
                />
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                {totalCompletedLessons} of{" "}
                {lessons.length} lessons have reached the{" "}
                {WATCH_REQUIREMENT}% attendance threshold.
              </p>

              {!user && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                  <strong>Login required:</strong> Sign in
                  before watching if you want your progress and
                  attendance saved.
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <h3 className="text-lg font-bold text-slate-900">
                Course Information
              </h3>

              <div className="mt-5 divide-y divide-slate-100">
                <InfoValue
                  label="Level"
                  value={level}
                />

                <InfoValue
                  label="Duration"
                  value={duration}
                />

                <InfoValue
                  label="Lessons"
                  value={lessons.length}
                />

                <InfoValue
                  label="Language"
                  value={language}
                />

                <InfoValue
                  label="Access"
                  value={isFree ? "Free" : "Paid"}
                />

                <InfoValue
                  label="Attendance"
                  value={`${WATCH_REQUIREMENT}% watch`}
                  valueClass="text-blue-600"
                />

                <InfoValue
                  label="Certificate"
                  value={
                    certificate
                      ? "Included"
                      : "Not Included"
                  }
                  valueClass={
                    certificate
                      ? "text-emerald-600"
                      : "text-slate-900"
                  }
                />
              </div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:p-6">
              <div className="flex gap-3">
                <ShieldCheck
                  size={23}
                  className="mt-0.5 shrink-0 text-blue-600"
                />

                <div>
                  <h3 className="font-bold text-slate-900">
                    Attendance Rule
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Watching at least {WATCH_REQUIREMENT}% of a
                    lesson marks that lesson as Present for the
                    logged-in student.
                  </p>
                </div>
              </div>
            </div>

            <Link
              to="/courses"
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft size={17} />
              Browse More Courses
            </Link>
          </aside>
        </div>
      </section>

      {/* ==================================================
          FINAL CTA
      ================================================== */

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 sm:py-16">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
            <GraduationCap
              size={30}
              className="text-blue-600"
            />
          </div>

          <h2 className="mt-6 text-2xl font-bold text-slate-900 sm:text-3xl">
            Keep learning and build your skills
          </h2>

          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            Select a lesson above and continue from your saved
            progress.
          </p>

          <Link
            to="/courses"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white hover:bg-blue-700"
          >
            Browse Courses
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}

// ======================================================
// VIDEO PLAYER
// ======================================================

// ======================================================
// VIDEO SOURCE HELPERS
// ======================================================

function getVideoSourceInfo(rawUrl, rawType = "") {
  const url = String(rawUrl || "").trim();
  const type = String(rawType || "").toLowerCase();

  if (!url) {
    return { type: "none", url: "", videoId: "" };
  }

  try {
    const parsed = new URL(url);

    const host = parsed.hostname
      .toLowerCase()
      .replace(/^www\./, "")
      .replace(/^m\./, "");

    const isYouTubeHost =
      host === "youtube.com" ||
      host === "youtu.be" ||
      host === "youtube-nocookie.com";

    if (isYouTubeHost) {
      let videoId = "";

      if (host === "youtu.be") {
        videoId = parsed.pathname.split("/").filter(Boolean)[0] || "";
      } else {
        const pathParts = parsed.pathname.split("/").filter(Boolean);

        if (pathParts[0] === "watch") {
          videoId = parsed.searchParams.get("v") || "";
        } else if (
          pathParts[0] === "shorts" ||
          pathParts[0] === "embed" ||
          pathParts[0] === "live"
        ) {
          videoId = pathParts[1] || "";
        }
      }

      if (videoId) {
        return {
          type: "youtube",
          url,
          videoId,
          embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`,
        };
      }
    }

    if (
      type === "youtube" ||
      type === "youtube_link" ||
      type === "youtube-link"
    ) {
      const videoId =
        parsed.searchParams.get("v") ||
        parsed.pathname.split("/").filter(Boolean).pop() ||
        "";

      if (videoId) {
        return {
          type: "youtube",
          url,
          videoId,
          embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`,
        };
      }
    }

    const extensionMatch = parsed.pathname.match(
      /\.(mp4|webm|ogg|m4v|mov)(?:$|\?)/i
    );

    if (
      extensionMatch ||
      type === "upload" ||
      type === "uploaded" ||
      type === "file" ||
      type === "video"
    ) {
      return {
        type: "html5",
        url,
        videoId: "",
        embedUrl: "",
      };
    }

    return {
      type: "html5",
      url,
      videoId: "",
      embedUrl: "",
    };
  } catch {
    return {
      type: "invalid",
      url,
      videoId: "",
      embedUrl: "",
    };
  }
}

let youtubeApiPromise = null;

function loadYouTubeIframeAPI() {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("YouTube player is only available in a browser.")
    );
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }

  youtubeApiPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );

    const previousReady = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      try {
        if (typeof previousReady === "function") {
          previousReady();
        }
      } catch {
        // Another application callback should not prevent our player.
      }

      if (window.YT?.Player) {
        resolve(window.YT);
      } else {
        reject(
          new Error("YouTube API loaded but the player is unavailable.")
        );
      }
    };

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () =>
        reject(new Error("Unable to load the YouTube player."));
      document.head.appendChild(script);
    } else if (window.YT?.Player) {
      resolve(window.YT);
    }
  }).catch((error) => {
    youtubeApiPromise = null;
    throw error;
  });

  return youtubeApiPromise;
}

// ======================================================
// VIDEO PLAYER
// ======================================================

function VideoLessonPlayer({
  user,
  courseId,
  courseTitle,
  lessons,
  selectedLesson,
  selectedLessonIndex,
  setSelectedLessonIndex,
  progress,
  onProgressSaved,
  playerError,
  setPlayerError,
}) {
  const videoRef = useRef(null);
  const youtubeContainerRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const youtubeIntervalRef = useRef(null);
  const lastSavedAtRef = useRef(0);

  const maxWatchedRef = useRef(
    Number(progress?.watchedSeconds) || 0
  );

  const currentTimeRef = useRef(
    Number(progress?.watchedSeconds) || 0
  );

  const durationRef = useRef(
    Number(progress?.duration) || 0
  );

  const [isPlaying, setIsPlaying] = useState(false);

  const [duration, setDuration] = useState(
    Number(progress?.duration) || 0
  );

  const [currentTime, setCurrentTime] = useState(
    Number(progress?.watchedSeconds) || 0
  );

  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [muted, setMuted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSpeed, setShowSpeed] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [localError, setLocalError] = useState("");
  const [youtubeLoading, setYoutubeLoading] = useState(false);

  // Refs keep asynchronous YouTube callbacks connected to the latest
  // progress/volume state without forcing the player to be recreated.
  const saveProgressRef = useRef(null);
  const volumeRef = useRef(volume);
  const youtubeReadyRef = useRef(false);

  const sourceInfo = useMemo(
    () =>
      getVideoSourceInfo(
        selectedLesson?.videoUrl,
        selectedLesson?.videoType
      ),
    [selectedLesson?.videoUrl, selectedLesson?.videoType]
  );

  const sourceUrl = sourceInfo.url;

  const watchedSeconds = Math.max(
    Number(currentTime) || 0,
    Number(maxWatchedRef.current) || 0
  );

  const watchPercent =
    duration > 0
      ? Math.min(
          100,
          Math.round((watchedSeconds / duration) * 100)
        )
      : 0;

  const attendanceReached =
    watchPercent >= WATCH_REQUIREMENT;

  const hasVideo = Boolean(sourceUrl);

  const stopYouTubePolling = useCallback(() => {
    if (youtubeIntervalRef.current) {
      window.clearInterval(youtubeIntervalRef.current);
      youtubeIntervalRef.current = null;
    }
  }, []);

  const destroyYouTubePlayer = useCallback(() => {
    stopYouTubePolling();
    youtubeReadyRef.current = false;

    const player = youtubePlayerRef.current;
    youtubePlayerRef.current = null;

    if (!player) return;

    try {
      const iframe = player.getIframe?.();

      // YouTube can throw postMessage warnings if destroy() is called after
      // React has already detached the iframe from the DOM.
      if (!iframe || iframe.isConnected !== false) {
        player.destroy?.();
      }
    } catch {
      // The player may already be detached/destroyed during navigation.
    }
  }, [stopYouTubePolling]);

  // ------------------------------------------------------
  // Save progress
  // ------------------------------------------------------

  const saveProgress = useCallback(
    async ({
      force = false,
      current,
      videoDuration,
    } = {}) => {
      if (!user || !courseId || !selectedLesson?.id) {
        return;
      }

      const fallbackCurrent =
        Number.isFinite(Number(current))
          ? Number(current)
          : Number(currentTimeRef.current) || 0;

      const fallbackDuration =
        Number.isFinite(Number(videoDuration)) &&
        Number(videoDuration) > 0
          ? Number(videoDuration)
          : Number(durationRef.current) || 0;

      if (
        !fallbackDuration ||
        !Number.isFinite(fallbackDuration)
      ) {
        return;
      }

      const safeCurrent = Math.max(
        0,
        Math.min(fallbackCurrent, fallbackDuration)
      );

      maxWatchedRef.current = Math.max(
        maxWatchedRef.current,
        safeCurrent
      );

      const safeWatched = Math.min(
        maxWatchedRef.current,
        fallbackDuration
      );

      const percent = Math.min(
        100,
        Math.round((safeWatched / fallbackDuration) * 100)
      );

      const completed25 =
        percent >= WATCH_REQUIREMENT;

      const now = Date.now();

      if (
        !force &&
        now - lastSavedAtRef.current < PROGRESS_SAVE_INTERVAL
      ) {
        return;
      }

      lastSavedAtRef.current = now;
      setSaving(true);

      try {
        const progressId =
          `${user.uid}_${courseId}_${selectedLesson.id}`;

        const progressRef = doc(
          db,
          "lessonProgress",
          progressId
        );

        await setDoc(
          progressRef,
          {
            userId: user.uid,
            courseId,
            courseTitle,
            lessonId: selectedLesson.id,
            lessonTitle: selectedLesson.title,
            watchedSeconds: safeWatched,
            duration: fallbackDuration,
            percent,
            requiredWatchPercent: WATCH_REQUIREMENT,
            completed25,
            attendance: completed25 ? "present" : "absent",
            lastWatchedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        onProgressSaved(selectedLesson.id, {
          watchedSeconds: safeWatched,
          duration: fallbackDuration,
          percent,
          completed25,
          attendance: completed25 ? "present" : "absent",
        });

        setLocalError("");
      } catch (err) {
        console.error("Progress save error:", err);

        setLocalError(
          "Progress could not be saved. Please check your connection."
        );
      } finally {
        setSaving(false);
      }
    },
    [
      user,
      courseId,
      courseTitle,
      selectedLesson,
      onProgressSaved,
    ]
  );

  useEffect(() => {
    saveProgressRef.current = saveProgress;
  }, [saveProgress]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    if (playerError) {
      setLocalError(playerError);
    }
  }, [playerError]);

  // ------------------------------------------------------
  // Reset player when lesson/source changes
  // ------------------------------------------------------

  useEffect(() => {
    const initialSeconds =
      Number(progress?.watchedSeconds) || 0;

    const initialDuration =
      Number(progress?.duration) || 0;

    maxWatchedRef.current = initialSeconds;
    currentTimeRef.current = initialSeconds;
    durationRef.current = initialDuration;

    setCurrentTime(initialSeconds);
    setDuration(initialDuration);
    setIsPlaying(false);
    setPlaybackRate(1);
    setPlayerError("");
    setLocalError("");
    setYoutubeLoading(sourceInfo.type === "youtube");
    lastSavedAtRef.current = 0;

    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.currentTime = initialSeconds;
        videoRef.current.playbackRate = 1;
      } catch {
        // The video element may be changing sources.
      }
    }

  }, [
    selectedLesson?.id,
    sourceInfo.type,
    sourceInfo.url,
    setPlayerError,
  ]);

  // ------------------------------------------------------
  // Apply progress loaded after the course page mounted
  // ------------------------------------------------------

  useEffect(() => {
    if (
      !selectedLesson?.id ||
      isPlaying ||
      !progress
    ) {
      return;
    }

    const savedSeconds =
      Number(progress.watchedSeconds) || 0;

    const savedDuration =
      Number(progress.duration) || 0;

    // Do not reset the player from the same progress update
    // that this component just wrote to Firestore.
    if (
      savedSeconds <= Number(currentTimeRef.current) &&
      savedDuration <= Number(durationRef.current)
    ) {
      return;
    }

    maxWatchedRef.current = Math.max(
      maxWatchedRef.current,
      savedSeconds
    );

    if (savedDuration > 0) {
      setDuration(savedDuration);
      durationRef.current = savedDuration;
    }

    setCurrentTime(savedSeconds);
    currentTimeRef.current = savedSeconds;

    if (sourceInfo.type === "youtube") {
      const player = youtubePlayerRef.current;

      if (player) {
        try {
          player.seekTo(savedSeconds, true);
        } catch {
          // Player may not be ready yet.
        }
      }
    } else if (videoRef.current) {
      try {
        videoRef.current.currentTime = savedSeconds;
      } catch {
        // Browser may reject a seek before metadata is ready.
      }
    }
  }, [
    progress?.watchedSeconds,
    progress?.duration,
    selectedLesson?.id,
    sourceInfo.type,
    isPlaying,
  ]);

  // ------------------------------------------------------
  // Initialize YouTube
  // ------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    // Always clean up the previous YouTube instance when the source changes.
    // This effect intentionally does NOT depend on saveProgress or volume.
    // Those values are read from refs so Firestore progress updates cannot
    // recreate the iframe while the user is watching.
    if (
      sourceInfo.type !== "youtube" ||
      !sourceInfo.videoId
    ) {
      destroyYouTubePlayer();
      setYoutubeLoading(false);
      return () => {
        cancelled = true;
        destroyYouTubePlayer();
      };
    }

    const initialize = async () => {
      try {
        setYoutubeLoading(true);
        setLocalError("");
        youtubeReadyRef.current = false;

        const YT = await loadYouTubeIframeAPI();

        if (cancelled || !youtubeContainerRef.current) {
          return;
        }

        // If an older player somehow survived, destroy it before creating
        // the new instance. Never manually wipe the container with
        // innerHTML because doing so can detach a live YouTube iframe.
        destroyYouTubePlayer();

        const container = youtubeContainerRef.current;
        const playerElement = document.createElement("div");
        playerElement.className = "h-full w-full";
        container.replaceChildren(playerElement);

        const player = new YT.Player(playerElement, {
          width: "100%",
          height: "100%",
          videoId: sourceInfo.videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;

              youtubePlayerRef.current = event.target;
              youtubeReadyRef.current = true;

              const videoDuration =
                Number(event.target.getDuration()) || 0;

              setDuration(videoDuration);
              durationRef.current = videoDuration;

              const saved =
                Number(progress?.watchedSeconds) || 0;

              const resumeAt = Math.min(
                saved,
                Math.max(0, videoDuration - 0.5)
              );

              maxWatchedRef.current = resumeAt;
              currentTimeRef.current = resumeAt;

              if (resumeAt > 0) {
                try {
                  event.target.seekTo(resumeAt, true);
                } catch {
                  // Ignore seek errors during initialization.
                }

                setCurrentTime(resumeAt);
              }

              try {
                event.target.setVolume(
                  Math.round(volumeRef.current * 100)
                );
              } catch {
                // Ignore initial volume errors.
              }

              setYoutubeLoading(false);
            },

            onStateChange: (event) => {
              if (cancelled || !youtubeReadyRef.current) return;

              const state = event.data;

              if (state === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                setLocalError("");

                stopYouTubePolling();
                youtubeIntervalRef.current = window.setInterval(() => {
                  const currentPlayer = youtubePlayerRef.current;

                  if (
                    cancelled ||
                    !currentPlayer ||
                    !youtubeReadyRef.current
                  ) {
                    return;
                  }

                  try {
                    const time =
                      Number(currentPlayer.getCurrentTime()) || 0;
                    const videoDuration =
                      Number(currentPlayer.getDuration()) || 0;

                    setCurrentTime(time);
                    currentTimeRef.current = time;

                    if (videoDuration > 0) {
                      setDuration(videoDuration);
                      durationRef.current = videoDuration;
                      maxWatchedRef.current = Math.max(
                        maxWatchedRef.current,
                        time
                      );

                      saveProgressRef.current?.({
                        current: time,
                        videoDuration,
                      });
                    }
                  } catch {
                    // Player can disappear during navigation.
                  }
                }, 1000);
              } else if (state === window.YT.PlayerState.PAUSED) {
                setIsPlaying(false);
                stopYouTubePolling();

                try {
                  const time =
                    Number(event.target.getCurrentTime()) || 0;
                  const videoDuration =
                    Number(event.target.getDuration()) || 0;

                  if (videoDuration > 0) {
                    setCurrentTime(time);
                    currentTimeRef.current = time;
                    durationRef.current = videoDuration;

                    saveProgressRef.current?.({
                      force: true,
                      current: time,
                      videoDuration,
                    });
                  }
                } catch {
                  // Ignore player cleanup race conditions.
                }
              } else if (state === window.YT.PlayerState.ENDED) {
                setIsPlaying(false);
                stopYouTubePolling();

                try {
                  const videoDuration =
                    Number(event.target.getDuration()) || 0;

                  if (videoDuration > 0) {
                    maxWatchedRef.current = videoDuration;
                    setCurrentTime(videoDuration);
                    currentTimeRef.current = videoDuration;
                    durationRef.current = videoDuration;

                    saveProgressRef.current?.({
                      force: true,
                      current: videoDuration,
                      videoDuration,
                    });
                  }
                } catch {
                  // Ignore player cleanup race conditions.
                }
              }
            },

            onError: (event) => {
              if (cancelled) return;

              console.error("YouTube player error:", event?.data);
              setIsPlaying(false);
              stopYouTubePolling();
              setYoutubeLoading(false);
              youtubeReadyRef.current = false;

              setLocalError(
                "YouTube could not play this video. Make sure the video is public and embedding is allowed."
              );
            },
          },
        });

        if (!cancelled) {
          youtubePlayerRef.current = player;
        } else {
          try {
            player.destroy?.();
          } catch {
            // Ignore late initialization cleanup.
          }
        }
      } catch (err) {
        console.error("YouTube initialization error:", err);

        if (!cancelled) {
          setYoutubeLoading(false);
          youtubeReadyRef.current = false;
          setLocalError(
            "Unable to load the YouTube player. Please check your internet connection."
          );
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
      stopYouTubePolling();
      destroyYouTubePlayer();
    };
  }, [
    sourceInfo.type,
    sourceInfo.videoId,
    destroyYouTubePlayer,
    stopYouTubePolling,
  ]);

  // ------------------------------------------------------
  // Cleanup/save on lesson/page change
  // ------------------------------------------------------

  useEffect(() => {
    return () => {
      stopYouTubePolling();

      const player =
        youtubePlayerRef.current;

      if (
        player &&
        typeof player.getCurrentTime === "function" &&
        typeof player.getDuration === "function"
      ) {
        try {
          const current =
            Number(player.getCurrentTime()) || 0;

          const videoDuration =
            Number(player.getDuration()) || 0;

          if (videoDuration > 0) {
            saveProgressRef.current?.({
              force: true,
              current,
              videoDuration,
            });
          }
        } catch {
          // Ignore unload cleanup errors.
        }
      }

      const video = videoRef.current;

      if (
        video &&
        user &&
        selectedLesson?.id &&
        video.duration
      ) {
        saveProgressRef.current?.({
          force: true,
          current: video.currentTime,
          videoDuration: video.duration,
        });
      }
    };
  }, [
    selectedLesson?.id,
    user,
    stopYouTubePolling,
  ]);

  // ------------------------------------------------------
  // HTML5 video events
  // ------------------------------------------------------

  const handleLoadedMetadata = () => {
    const video = videoRef.current;

    if (!video) return;

    const videoDuration =
      Number(video.duration) || 0;

    if (!Number.isFinite(videoDuration)) {
      return;
    }

    setDuration(videoDuration);
    durationRef.current = videoDuration;

    const saved =
      Number(progress?.watchedSeconds) || 0;

    const resumeAt = Math.min(
      saved,
      Math.max(0, videoDuration - 0.5)
    );

    maxWatchedRef.current = saved;

    if (resumeAt > 0) {
      try {
        video.currentTime = resumeAt;
      } catch {
        // Browser may reject an early seek.
      }

      setCurrentTime(resumeAt);
      currentTimeRef.current = resumeAt;
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;

    if (!video) return;

    const time = video.currentTime || 0;

    setCurrentTime(time);
    currentTimeRef.current = time;

    maxWatchedRef.current = Math.max(
      maxWatchedRef.current,
      time
    );

    saveProgressRef.current?.({
      current: time,
      videoDuration: video.duration,
    });
  };

  const handlePause = () => {
    setIsPlaying(false);

    const video = videoRef.current;

    if (video?.duration) {
      saveProgressRef.current?.({
        force: true,
        current: video.currentTime,
        videoDuration: video.duration,
      });
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setLocalError("");
  };

  const handleEnded = () => {
    setIsPlaying(false);

    const video = videoRef.current;

    if (video?.duration) {
      maxWatchedRef.current = Math.max(
        maxWatchedRef.current,
        video.duration
      );

      saveProgressRef.current?.({
        force: true,
        current: video.duration,
        videoDuration: video.duration,
      });
    }
  };

  const handleVideoError = () => {
    setIsPlaying(false);
    setLocalError(
      "This video could not be loaded. If this is YouTube, use a YouTube watch/shorts URL. If it is a file, make sure the direct MP4/WebM URL is publicly accessible."
    );
  };

  // ------------------------------------------------------
  // Unified controls
  // ------------------------------------------------------

  const togglePlay = async () => {
    if (!hasVideo) return;

    if (sourceInfo.type === "youtube") {
      const player = youtubePlayerRef.current;

      if (!player) {
        setLocalError(
          "The YouTube player is still loading. Please try again."
        );
        return;
      }

      try {
        const state = player.getPlayerState?.();

        if (
          state ===
          window.YT?.PlayerState?.PLAYING
        ) {
          player.pauseVideo();
        } else {
          player.playVideo();
        }
      } catch (err) {
        console.error(
          "YouTube play error:",
          err
        );

        setLocalError(
          "The YouTube video could not be played. Check whether embedding is allowed."
        );
      }

      return;
    }

    const video = videoRef.current;

    if (!video) return;

    try {
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }
    } catch (err) {
      console.error(
        "Video play error:",
        err
      );

      setLocalError(
        "The video could not be played. Check the video URL."
      );
    }
  };

  const seekTo = (seconds) => {
    const nextTime = Math.max(
      0,
      Math.min(
        Number(duration) || 0,
        Number(seconds) || 0
      )
    );

    if (sourceInfo.type === "youtube") {
      const player = youtubePlayerRef.current;

      if (!player) return;

      try {
        player.seekTo(nextTime, true);
        setCurrentTime(nextTime);
        currentTimeRef.current = nextTime;
      } catch {
        setLocalError(
          "Unable to seek in this YouTube video."
        );
      }

      return;
    }

    const video = videoRef.current;

    if (!video) return;

    video.currentTime = nextTime;
    currentTimeRef.current = nextTime;
  };

  const seekBy = (seconds) => {
    seekTo(
      (Number(currentTime) || 0) + seconds
    );
  };

  const handleSeek = (event) => {
    if (!duration) return;

    const value = Number(event.target.value);

    seekTo((value / 100) * duration);
  };

  const changeSpeed = (speed) => {
    if (sourceInfo.type === "youtube") {
      const player = youtubePlayerRef.current;

      try {
        player?.setPlaybackRate?.(speed);
      } catch {
        setLocalError(
          "This YouTube video does not support that playback speed."
        );
      }
    } else {
      const video = videoRef.current;

      if (video) {
        video.playbackRate = speed;
      }
    }

    setPlaybackRate(speed);
    setShowSpeed(false);
  };

  const changeVolume = (value) => {
    const next = Math.max(
      0,
      Math.min(1, Number(value))
    );

    setVolume(next);
    setMuted(next === 0);

    if (sourceInfo.type === "youtube") {
      const player = youtubePlayerRef.current;

      try {
        if (player) {
          player.setVolume(
            Math.round(next * 100)
          );

          if (next > 0) {
            player.unMute();
          } else {
            player.mute();
          }
        }
      } catch {
        // Ignore volume API errors.
      }

      return;
    }

    const video = videoRef.current;

    if (video) {
      video.volume = next;
      video.muted = next === 0;
    }
  };

  const toggleMute = () => {
    if (sourceInfo.type === "youtube") {
      const player = youtubePlayerRef.current;

      if (!player) return;

      try {
        if (muted) {
          player.unMute();

          if (volume === 0) {
            player.setVolume(100);
            setVolume(1);
          }
        } else {
          player.mute();
        }

        setMuted(!muted);
      } catch {
        // Ignore player state errors.
      }

      return;
    }

    const video = videoRef.current;

    if (!video) return;

    const nextMuted = !video.muted;

    video.muted = nextMuted;
    setMuted(nextMuted);
  };

  const formatTime = (value) => {
    const total = Math.max(
      0,
      Math.floor(Number(value) || 0)
    );

    const hours = Math.floor(
      total / 3600
    );

    const minutes = Math.floor(
      (total % 3600) / 60
    );

    const seconds = total % 60;

    if (hours > 0) {
      return `${hours}:${String(
        minutes
      ).padStart(2, "0")}:${String(
        seconds
      ).padStart(2, "0")}`;
    }

    return `${minutes}:${String(
      seconds
    ).padStart(2, "0")}`;
  };

  const goPrevious = () => {
    if (selectedLessonIndex <= 0) return;

    saveProgressRef.current?.({ force: true });

    setSelectedLessonIndex(
      selectedLessonIndex - 1
    );
  };

  const goNext = () => {
    if (
      selectedLessonIndex >=
      lessons.length - 1
    ) {
      return;
    }

    if (!attendanceReached) {
      setLocalError(
        `Watch at least ${WATCH_REQUIREMENT}% of this lesson before moving to the next lesson.`
      );
      return;
    }

    saveProgressRef.current?.({ force: true });

    setSelectedLessonIndex(
      selectedLessonIndex + 1
    );
  };

  if (!selectedLesson) {
    return (
      <section className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200 sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <PlayCircle
            size={30}
            className="text-slate-400"
          />
        </div>

        <h2 className="mt-5 text-xl font-bold text-slate-900">
          No lessons available
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          The instructor has not added video lessons yet.
        </p>
      </section>
    );
  }

  const playerTitle =
    sourceInfo.type === "youtube"
      ? "YouTube video"
      : sourceInfo.type === "html5"
      ? "Video file"
      : "Video";

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      {/* PLAYER HEADER */}

      <div className="border-b border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
              Lesson {selectedLessonIndex + 1} of{" "}
              {lessons.length}
            </p>

            <h2 className="mt-1 truncate text-lg font-extrabold text-slate-900 sm:text-xl">
              {selectedLesson.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {attendanceReached ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                <CheckCircle2 size={15} />
                Present
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                <Clock3 size={15} />
                {WATCH_REQUIREMENT}% required
              </span>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>
              Watch progress: {watchPercent}%
            </span>

            <span>
              {formatTime(currentTime)} /{" "}
              {formatTime(duration)}
            </span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                attendanceReached
                  ? "bg-emerald-500"
                  : "bg-blue-600"
              }`}
              style={{
                width: `${watchPercent}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* VIDEO */}

      <div className="relative aspect-video bg-black">
        {sourceInfo.type === "youtube" ? (
          <div
            ref={youtubeContainerRef}
            className="h-full w-full"
            aria-label={playerTitle}
          />
        ) : sourceInfo.type === "html5" ? (
          <video
            ref={videoRef}
            src={sourceUrl}
            preload="metadata"
            playsInline
            className="h-full w-full object-contain"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={handlePlay}
            onPause={handlePause}
            onEnded={handleEnded}
            onError={handleVideoError}
            controls={false}
          >
            {selectedLesson.captionsUrl && (
              <track
                kind="captions"
                src={selectedLesson.captionsUrl}
                srcLang="en"
                label="Captions"
                default
              />
            )}
          </video>
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-5 text-center text-white">
            <FileVideoIcon />

            <h3 className="mt-4 text-lg font-bold">
              Video not available
            </h3>

            <p className="mt-2 max-w-md text-sm text-slate-400">
              This lesson does not have a valid video URL yet.
              Add a YouTube link such as youtube.com/watch?v=...
              or a direct MP4/WebM file URL.
            </p>
          </div>
        )}

        {youtubeLoading && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/40">
            <div className="flex items-center gap-2 rounded-xl bg-slate-900/90 px-4 py-3 text-sm font-semibold text-white shadow-xl">
              <Loader2
                size={18}
                className="animate-spin"
              />
              Loading video...
            </div>
          </div>
        )}

        {localError && (
          <div className="absolute left-3 right-3 top-3 z-20 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-lg sm:left-5 sm:right-5 sm:top-5">
            {localError}
          </div>
        )}
      </div>

      {/* CONTROLS */}

      {hasVideo &&
        (sourceInfo.type === "youtube" ||
          sourceInfo.type === "html5") && (
          <div className="border-t border-slate-200 bg-slate-950 p-3 text-white sm:p-4">
            <div className="mb-3">
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={
                  duration > 0
                    ? Math.min(
                        100,
                        (currentTime / duration) * 100
                      )
                    : 0
                }
                onChange={handleSeek}
                disabled={!duration}
                className="h-1.5 w-full cursor-pointer accent-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Video progress"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                disabled={
                  sourceInfo.type === "youtube" &&
                  (!youtubePlayerRef.current ||
                    youtubeLoading)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={
                  isPlaying ? "Pause" : "Play"
                }
              >
                {isPlaying ? (
                  <Pause size={18} />
                ) : (
                  <Play size={18} />
                )}
              </button>

              <button
                type="button"
                onClick={() => seekBy(-10)}
                disabled={!duration}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Back 10 seconds"
                title="Back 10 seconds"
              >
                <RotateCcw size={18} />
              </button>

              <button
                type="button"
                onClick={() => seekBy(10)}
                disabled={!duration}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Forward 10 seconds"
                title="Forward 10 seconds"
              >
                <RotateCw size={18} />
              </button>

              <div className="ml-1 text-xs font-semibold text-slate-300 sm:text-sm">
                {formatTime(currentTime)} /{" "}
                {formatTime(duration)}
              </div>

              <div className="ml-auto flex items-center gap-1">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setShowVolume(
                        (previous) => !previous
                      )
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20"
                    aria-label="Volume"
                  >
                    {muted || volume === 0 ? (
                      <VolumeX size={18} />
                    ) : (
                      <Volume2 size={18} />
                    )}
                  </button>

                  {showVolume && (
                    <div className="absolute bottom-12 right-0 z-30 rounded-xl bg-slate-900 p-3 shadow-xl ring-1 ring-white/10">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(event) =>
                          changeVolume(
                            event.target.value
                          )
                        }
                        className="w-28 accent-blue-500"
                        aria-label="Volume"
                      />

                      <button
                        type="button"
                        onClick={toggleMute}
                        className="mt-2 w-full rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold hover:bg-white/20"
                      >
                        {muted ? "Unmute" : "Mute"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setShowSpeed(
                        (previous) => !previous
                      )
                    }
                    className="flex h-10 items-center gap-1 rounded-xl bg-white/10 px-3 text-xs font-bold hover:bg-white/20 sm:text-sm"
                    aria-label="Playback speed"
                  >
                    {playbackRate}x
                    <ChevronDown size={14} />
                  </button>

                  {showSpeed && (
                    <div className="absolute bottom-12 right-0 z-30 min-w-28 overflow-hidden rounded-xl bg-slate-900 shadow-xl ring-1 ring-white/10">
                      {[
                        0.5,
                        0.75,
                        1,
                        1.25,
                        1.5,
                        1.75,
                        2,
                      ].map((speed) => (
                        <button
                          type="button"
                          key={speed}
                          onClick={() =>
                            changeSpeed(speed)
                          }
                          className={`block w-full px-4 py-2 text-left text-sm font-semibold hover:bg-white/10 ${
                            playbackRate === speed
                              ? "bg-blue-600"
                              : ""
                          }`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      {sourceInfo.type === "youtube" && (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
          YouTube video • Use the controls above to play, seek,
          change volume, and playback speed.
        </div>
      )}

      {/* ATTENDANCE MESSAGE */}

      <div className="border-t border-slate-200 p-4 sm:p-5">
        {attendanceReached ? (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2
              size={21}
              className="mt-0.5 shrink-0 text-emerald-600"
            />

            <div>
              <p className="font-bold text-emerald-800">
                Attendance marked Present
              </p>

              <p className="mt-1 text-xs leading-5 text-emerald-700">
                You watched at least {WATCH_REQUIREMENT}%
                of this lesson.
                {saving &&
                  " Saving your latest progress..."}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <Lock
              size={20}
              className="mt-0.5 shrink-0 text-blue-600"
            />

            <div>
              <p className="font-bold text-blue-900">
                Watch {WATCH_REQUIREMENT}% for attendance
              </p>

              <p className="mt-1 text-xs leading-5 text-blue-700">
                Current progress: {watchPercent}%. The lesson
                must reach {WATCH_REQUIREMENT}% before it is
                counted as Present.
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={goPrevious}
            disabled={selectedLessonIndex === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={18} />
            Previous Lesson
          </button>

          <button
            type="button"
            onClick={goNext}
            disabled={
              selectedLessonIndex === lessons.length - 1 ||
              !attendanceReached
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            title={
              !attendanceReached
                ? `Watch ${WATCH_REQUIREMENT}% first`
                : "Next lesson"
            }
          >
            Next Lesson
            <ChevronRight size={18} />
          </button>
        </div>

        {!user && (
          <p className="mt-4 text-center text-xs font-medium text-slate-400">
            Login is required to save progress and attendance.
          </p>
        )}
      </div>
    </section>
  );
}

// ======================================================
// SMALL COMPONENTS
// ======================================================

const FileVideoIcon = () => (
  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
    <PlayCircle size={34} />
  </div>
);

const InfoRow = memo(function InfoRow({
  icon: Icon,
  text,
}) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-600">
      <Icon
        size={17}
        className="shrink-0 text-blue-600"
      />

      <span>{text}</span>
    </div>
  );
});

const InfoValue = memo(function InfoValue({
  label,
  value,
  valueClass = "text-slate-900",
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span
        className={`text-right text-sm font-semibold ${valueClass}`}
      >
        {value}
      </span>
    </div>
  );
});

export default memo(CourseDetails);
