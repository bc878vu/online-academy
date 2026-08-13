import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  GraduationCap,
  Laptop,
  PlayCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Users,
  X,
} from "lucide-react";
import { auth, db } from "../firebase";
import "./home-animations.css";

const DEFAULT_SLIDES = [
  {
    eyebrow: "LEARN WITHOUT LIMITS",
    title: "Learn new skills.",
    highlight: "Build your future.",
    description:
      "Explore structured courses, build practical knowledge and track your progress with a simple learning experience designed for students.",
    cta: "Explore Courses",
    link: "/courses",
  },
  {
    eyebrow: "LEARN AT YOUR PACE",
    title: "Study smarter.",
    highlight: "Grow with confidence.",
    description:
      "Watch lessons, use learning resources and keep moving forward from any device, whenever you are ready.",
    cta: "Start Learning",
    link: "/courses",
  },
  {
    eyebrow: "YOUR LEARNING JOURNEY",
    title: "Learn. Practice.",
    highlight: "Achieve more.",
    description:
      "Choose a course, complete lessons and build real progress through an organized online learning platform.",
    cta: "Browse Courses",
    link: "/courses",
  },
];

const FEATURES = [
  [
    BookOpen,
    "Quality Courses",
    "Structured courses with lessons, resources, quizzes and practical learning material.",
  ],
  [
    Laptop,
    "Learn Anywhere",
    "Access your learning materials from your phone, tablet or computer whenever you need them.",
  ],
  [
    BarChart3,
    "Track Progress",
    "Monitor your learning journey, completed lessons and achievements from your dashboard.",
  ],
];

const STEPS = [
  [
    "01",
    Users,
    "Create an Account",
    "Set up your profile and access your personal learning area.",
  ],
  [
    "02",
    BookOpen,
    "Choose a Course",
    "Explore available courses and select what you want to learn.",
  ],
  [
    "03",
    PlayCircle,
    "Start Learning",
    "Complete lessons, follow your progress and keep improving your skills.",
  ],
];

const BENEFITS = [
  [
    ShieldCheck,
    "Secure Learning",
    "Your account and learning experience are protected with secure authentication.",
  ],
  [
    Clock3,
    "Learn Anytime",
    "Study whenever it suits you with flexible access to your learning platform.",
  ],
  [
    Target,
    "Focused Progress",
    "Stay organized and keep your attention on the skills you want to build.",
  ],
];

function getTimestampValue(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

// Firestore course documents can contain arrays/objects (for example,
// `lessons` is commonly an array of lesson objects). Never pass those
// values directly into JSX text nodes because React will throw error #31.
function toSafeText(value, fallback = "") {
  if (value == null) return fallback;

  if (typeof value === "string") {
    const text = value.trim();
    return text || fallback;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    const text = value
      .map((item) => toSafeText(item))
      .filter(Boolean)
      .join(", ");
    return text || fallback;
  }

  if (typeof value === "object") {
    const candidate =
      value.label ??
      value.name ??
      value.title ??
      value.text ??
      value.value ??
      value.displayName;

    return candidate != null
      ? toSafeText(candidate, fallback)
      : fallback;
  }

  return fallback;
}

function isVisibleCourse(course) {
  // Courses.jsx uses `published !== false` as its visibility rule.
  // Home uses the same rule so both pages stay consistent.
  return course?.published !== false;
}

function getCourseTitle(course) {
  return toSafeText(
    course?.title ?? course?.name,
    "Untitled Course"
  );
}

function getCourseImage(course) {
  return toSafeText(
    course?.imageUrl ?? course?.thumbnail ?? course?.image,
    ""
  );
}

function getCourseCategory(course) {
  return toSafeText(course?.category, "Online Course");
}

function getCourseDescription(course) {
  return toSafeText(
    course?.description,
    "Start learning with this structured online course."
  );
}

function getCourseLevel(course) {
  return toSafeText(course?.level, "Start Learning");
}

function getCourseDuration(course) {
  const value = course?.duration;

  if (typeof value === "number" || typeof value === "string") {
    return toSafeText(value);
  }

  if (value && typeof value === "object") {
    return toSafeText(
      value.label ??
        value.text ??
        value.value ??
        value.duration ??
        value.hours ??
        value.minutes,
      ""
    );
  }

  return "";
}

function getLessonCount(course) {
  const lessons = course?.lessons;

  if (Array.isArray(lessons)) return lessons.length;

  if (typeof lessons === "number" && Number.isFinite(lessons)) {
    return lessons;
  }

  if (typeof lessons === "string" && lessons.trim()) {
    const numeric = Number(lessons);
    return Number.isFinite(numeric) ? numeric : null;
  }

  if (lessons && typeof lessons === "object") {
    const count = Number(
      lessons.count ??
        lessons.total ??
        lessons.length ??
        lessons.lessonCount
    );

    if (Number.isFinite(count) && count >= 0) return count;
  }

  const fallback = Number(course?.lessonCount);
  return Number.isFinite(fallback) && fallback >= 0 ? fallback : null;
}

function formatPrice(course) {
  const isPaid = course?.isPaid === true;
  const rawPrice = course?.price;
  const price =
    typeof rawPrice === "number"
      ? rawPrice
      : Number(toSafeText(rawPrice, "0"));

  if (!isPaid || !Number.isFinite(price) || price <= 0) return "Free";
  return `Rs. ${price.toLocaleString()}`;
}

function Home() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [slide, setSlide] = useState(0);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  // ======================================================
  // AUTH
  // ======================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  // ======================================================
  // COURSES
  // ======================================================
  // IMPORTANT:
  // Courses.jsx loads the `courses` collection and considers a
  // course published unless `published === false`.
  // Home now follows exactly the same rule.
  // ======================================================

  useEffect(() => {
    let cancelled = false;

    const loadCourses = async () => {
      setLoading(true);
      setError("");

      try {
        const coursesRef = collection(db, "courses");

        // Home intentionally reads the collection without an orderBy query.
        // This avoids two common Firestore problems: documents missing
        // `createdAt` being excluded by orderBy, and a required composite
        // index preventing the homepage from rendering. We sort safely in
        // memory afterwards, which is ideal for the small homepage preview.
        const snapshot = await getDocs(coursesRef);

        if (cancelled) return;

        const courseList = snapshot.docs
          .map((document) => ({
            id: document.id,
            ...document.data(),
          }))
          .filter(isVisibleCourse)
          .sort(
            (a, b) =>
              getTimestampValue(b.createdAt) -
              getTimestampValue(a.createdAt)
          );

        const uniqueCourses = Array.from(
          new Map(
            courseList.map((course) => [course.id, course])
          ).values()
        );

        setCourses(uniqueCourses);
      } catch (err) {
        console.error("Home courses loading error:", err);

        if (cancelled) return;

        setCourses([]);

        if (err?.code === "permission-denied") {
          setError(
            "Firebase permission denied. Please check your Firestore security rules."
          );
        } else if (err?.code === "unavailable") {
          setError(
            "Firebase is temporarily unavailable. Please check your internet connection."
          );
        } else {
          setError(
            err?.message ||
              "Unable to load courses right now. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCourses();

    return () => {
      cancelled = true;
    };
  }, []);

  // ======================================================
  // DYNAMIC DATA
  // ======================================================

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        courses
          .map((course) => getCourseCategory(course))
          .filter(Boolean)
      )
    );
  }, [courses]);

  const searchResults = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return courses.slice(0, 6);

    return courses
      .filter((course) => {
        const searchable = [
          getCourseTitle(course),
          getCourseCategory(course),
          getCourseDescription(course),
          toSafeText(course.instructor),
          getCourseLevel(course),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(term);
      })
      .slice(0, 6);
  }, [courses, search]);

  const slides = useMemo(() => {
    if (!courses.length) return DEFAULT_SLIDES;

    const featuredSlides = courses.slice(0, 2).map((course) => ({
      eyebrow: getCourseCategory(course),
      title: getCourseTitle(course),
      highlight: "Learn at your pace.",
      description: getCourseDescription(course),
      cta: "View Course",
      link: `/courses/${course.id}`,
    }));

    return [DEFAULT_SLIDES[0], ...featuredSlides];
  }, [courses]);

  const featuredCourses = useMemo(() => {
    return courses.slice(0, 6);
  }, [courses]);

  const activeSlide = slides[slide] || DEFAULT_SLIDES[0];

  const stats = [
    [BookOpen, loading ? "—" : courses.length, "Published Courses"],
    [Users, categories.length || "—", "Learning Areas"],
    [PlayCircle, "24/7", "Learning Access"],
    [Award, "100%", "Learn at Your Pace"],
  ];

  // ======================================================
  // AUTO SLIDER
  // ======================================================

  useEffect(() => {
    if (slides.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setSlide((current) => (current + 1) % slides.length);
    }, 5500);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    setSlide((current) =>
      Math.min(current, Math.max(0, slides.length - 1))
    );
  }, [slides.length]);

  const scrollToCourses = () => {
    document
      .getElementById("courses")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const clearSearch = () => {
    setSearch("");
    setSearchOpen(false);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-900">
      {/* ==================================================
          HERO
      ================================================== */}

      <section className="oa-hero relative overflow-hidden bg-[#061633] text-white">
        <div className="oa-grid pointer-events-none absolute inset-0" />
        <div className="oa-orb oa-orb-one" />
        <div className="oa-orb oa-orb-two" />

        <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-14 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24 lg:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_.98fr] lg:gap-16">
            <div className="oa-fade-up max-w-2xl">
              <div className="oa-glass-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold tracking-[.18em] text-blue-200 sm:text-sm">
                <Sparkles size={16} />
                {activeSlide.eyebrow}
              </div>

              <div key={slide} className="oa-slide-enter">
                <h1 className="mt-6 text-4xl font-black leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
                  {activeSlide.title}
                  <span className="mt-1 block bg-gradient-to-r from-blue-300 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
                    {activeSlide.highlight}
                  </span>
                </h1>

                <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                  {activeSlide.description}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    to={activeSlide.link}
                    className="oa-button-primary group inline-flex items-center gap-2 rounded-2xl px-5 py-3.5 font-bold sm:px-6"
                  >
                    {activeSlide.cta}
                    <ArrowRight
                      size={18}
                      className="transition group-hover:translate-x-1"
                    />
                  </Link>

                  <Link
                    to={user ? "/dashboard" : "/register"}
                    className="oa-button-secondary inline-flex items-center gap-2 rounded-2xl px-5 py-3.5 font-bold sm:px-6"
                  >
                    {user ? "Go to Dashboard" : "Create Account"}
                    <ArrowRight size={18} />
                  </Link>
                </div>

                <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300">
                  {["Structured Learning", "Learn at Your Pace", "Progress Tracking"].map(
                    (item) => (
                      <span key={item} className="flex items-center gap-2">
                        <CheckCircle2
                          size={16}
                          className="text-blue-300"
                        />
                        {item}
                      </span>
                    )
                  )}
                </div>
              </div>

              <div className="mt-9 flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Previous slide"
                  className="oa-icon-button"
                  onClick={() =>
                    setSlide(
                      (slide - 1 + slides.length) % slides.length
                    )
                  }
                >
                  <ArrowLeft size={17} />
                </button>

                <div className="flex gap-2">
                  {slides.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      aria-label={`Go to slide ${index + 1}`}
                      onClick={() => setSlide(index)}
                      className={`h-1.5 rounded-full transition-all ${
                        index === slide
                          ? "w-9 bg-blue-400"
                          : "w-2 bg-white/30"
                      }`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  aria-label="Next slide"
                  className="oa-icon-button"
                  onClick={() =>
                    setSlide((slide + 1) % slides.length)
                  }
                >
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>

            {/* HERO PREVIEW */}
            <div className="oa-fade-in relative mx-auto w-full max-w-xl">
              <div className="oa-hero-frame rounded-[2rem] border border-white/10 bg-white/[.07] p-3 shadow-2xl backdrop-blur-sm sm:p-4">
                <div className="rounded-[1.5rem] bg-gradient-to-br from-white to-slate-100 p-4 text-slate-900 sm:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                        <GraduationCap size={23} />
                      </div>
                      <div>
                        <p className="font-extrabold">Online Academy</p>
                        <p className="text-xs text-slate-500">
                          Student Learning
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                      Active
                    </span>
                  </div>

                  <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                    <div className="flex justify-between">
                      <span className="text-sm font-bold text-slate-700">
                        Your Progress
                      </span>
                      <span className="text-sm font-black text-blue-600">
                        75%
                      </span>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="oa-progress-bar h-full w-3/4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-500" />
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-white p-4 shadow-sm">
                        <BookOpen size={19} className="text-blue-600" />
                        <p className="mt-2 font-extrabold">Courses</p>
                        <p className="text-xs text-slate-500">
                          Keep learning
                        </p>
                      </div>

                      <div className="rounded-xl bg-white p-4 shadow-sm">
                        <Award size={19} className="text-indigo-600" />
                        <p className="mt-2 font-extrabold">Skills</p>
                        <p className="text-xs text-slate-500">
                          Keep improving
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="oa-floating-card rounded-2xl border border-white/10 bg-white/[.08] p-4">
                    <PlayCircle size={22} className="text-blue-300" />
                    <p className="mt-2 font-bold">Video Lessons</p>
                    <p className="text-xs text-slate-400">
                      Learn anytime
                    </p>
                  </div>

                  <div className="oa-floating-card rounded-2xl border border-white/10 bg-white/[.08] p-4">
                    <BarChart3 size={22} className="text-indigo-300" />
                    <p className="mt-2 font-bold">Track Progress</p>
                    <p className="text-xs text-slate-400">
                      Keep going
                    </p>
                  </div>
                </div>
              </div>

              <div className="oa-badge-float absolute -left-2 top-12 hidden rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-xs shadow-xl backdrop-blur-md sm:block">
                <div className="flex items-center gap-2">
                  <Star size={16} className="text-amber-300" />
                  Learn smarter
                </div>
              </div>
            </div>
          </div>

          {/* ==================================================
              SEARCH
          ================================================== */}

          <div className="relative z-20 mx-auto mt-12 max-w-4xl">
            <div className="oa-search-wrap flex items-center gap-2 rounded-2xl bg-white p-2 shadow-2xl sm:gap-3">
              <Search
                size={22}
                className="ml-3 shrink-0 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => setSearchOpen(false), 160);
                }}
                placeholder="Search for courses, skills or topics..."
                className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm font-medium text-slate-800 outline-none sm:text-base"
              />

              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={clearSearch}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              )}

              <button
                type="button"
                onClick={scrollToCourses}
                className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 sm:px-5"
              >
                Search
              </button>
            </div>

            {searchOpen && search.trim() && (
              <div className="absolute left-0 right-0 mt-2 overflow-hidden rounded-2xl bg-white p-2 text-slate-900 shadow-2xl">
                {searchResults.length ? (
                  searchResults.slice(0, 4).map((course) => {
                    const image = getCourseImage(course);

                    return (
                      <Link
                        key={course.id}
                        to={`/courses/${course.id}`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-blue-50"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-blue-50">
                          {image ? (
                            <img
                              src={image}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <BookOpen
                              size={18}
                              className="text-blue-600"
                            />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">
                            {getCourseTitle(course)}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {getCourseCategory(course)}
                          </p>
                        </div>

                        <ChevronRight
                          size={17}
                          className="ml-auto shrink-0 text-slate-400"
                        />
                      </Link>
                    );
                  })
                ) : (
                  <div className="p-5 text-center">
                    <Search
                      size={22}
                      className="mx-auto text-slate-300"
                    />
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      No matching courses found.
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Try another course title, category or topic.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ==================================================
            STATS
        ================================================== */}

        <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <div className="oa-stats-card grid grid-cols-2 overflow-hidden rounded-2xl bg-white shadow-2xl sm:grid-cols-4">
            {stats.map(([Icon, value, label], index) => (
              <div
                key={label}
                className={`p-5 text-center sm:p-6 ${
                  index > 0 ? "border-l border-slate-200" : ""
                } ${index > 1 ? "border-t sm:border-t-0" : ""}`}
              >
                <Icon
                  className="mx-auto text-blue-600"
                  size={20}
                />
                <p className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
                  {value}
                </p>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================
          COURSES
      ================================================== */}

      <section
        id="courses"
        className="scroll-mt-20 bg-slate-50 px-5 py-20 sm:px-6 sm:py-24 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black tracking-[.2em] text-blue-600 sm:text-sm">
                AVAILABLE COURSES
              </p>
              <h2 className="mt-2 text-3xl font-black sm:text-4xl">
                Start learning today
              </h2>
              <p className="mt-3 text-slate-600">
                Explore the latest published courses from Online Academy.
              </p>
            </div>

            <Link
              to="/courses"
              className="inline-flex items-center gap-2 font-bold text-blue-600 transition hover:text-blue-700"
            >
              View all courses
              <ArrowRight size={18} />
            </Link>
          </div>

          {loading ? (
            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="oa-skeleton h-48" />
                  <div className="space-y-4 p-6">
                    <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                    <div className="h-6 w-3/4 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200" />
                    <div className="h-11 w-full animate-pulse rounded-xl bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="mt-10 rounded-3xl border border-red-200 bg-white px-6 py-14 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                <AlertCircle
                  size={30}
                  className="text-red-500"
                />
              </div>
              <h3 className="mt-5 text-xl font-bold text-slate-900">
                Courses could not be loaded
              </h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                {error}
              </p>
              <Link
                to="/courses"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700"
              >
                Open Courses Page
                <ArrowRight size={17} />
              </Link>
            </div>
          ) : featuredCourses.length ? (
            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {featuredCourses.map((course) => {
                const image = getCourseImage(course);
                const title = getCourseTitle(course);
                const description = getCourseDescription(course);
                const duration = getCourseDuration(course);
                const lessonCount = getLessonCount(course);

                return (
                  <Link
                    key={course.id}
                    to={`/courses/${course.id}`}
                    className="oa-course-card group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200"
                  >
                    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
                      {image ? (
                        <img
                          src={image}
                          alt={title}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <BookOpen
                            size={58}
                            className="text-white/90"
                          />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />

                      <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-blue-700 shadow-sm">
                        {getCourseCategory(course)}
                      </div>

                      <div className="absolute bottom-4 right-4 rounded-full bg-slate-950/70 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
                        {formatPrice(course)}
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col p-5 sm:p-6">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-600">
                        <GraduationCap size={15} />
                        {getCourseLevel(course)}
                      </div>

                      <h3 className="mt-3 line-clamp-2 text-xl font-extrabold leading-tight text-slate-900">
                        {title}
                      </h3>

                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                        {description}
                      </p>

                      <div className="mt-auto flex flex-wrap gap-3 border-t border-slate-100 pt-5 text-xs font-medium text-slate-500">
                        {duration && (
                          <span className="flex items-center gap-1.5">
                            <Clock3 size={15} />
                            {duration}
                          </span>
                        )}
                        {lessonCount != null && (
                          <span className="flex items-center gap-1.5">
                            <BookOpen size={15} />
                            {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}
                          </span>
                        )}
                        {!duration && lessonCount == null && (
                          <span className="flex items-center gap-1.5">
                            <PlayCircle size={15} />
                            Start learning
                          </span>
                        )}
                      </div>

                      <span className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition group-hover:bg-blue-700">
                        View Course
                        <ArrowRight size={18} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-10 rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100">
                <BookOpen
                  size={38}
                  className="text-slate-400"
                />
              </div>
              <h3 className="mt-6 text-2xl font-bold text-slate-900">
                No published courses yet
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-slate-500">
                Published courses will appear here automatically when they are added.
              </p>
              <Link
                to="/courses"
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-700 transition hover:border-blue-200 hover:text-blue-600"
              >
                Browse Courses
                <ArrowRight size={17} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ==================================================
          FEATURES
      ================================================== */}

      <section className="bg-white px-5 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-black tracking-[.2em] text-blue-600 sm:text-sm">
              WHY ONLINE ACADEMY
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Everything you need to learn
            </h2>
            <p className="mt-4 text-lg leading-7 text-slate-600">
              A simple and organized learning experience designed to help students learn effectively.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {FEATURES.map(([Icon, title, description]) => (
              <div
                key={title}
                className="oa-feature-card rounded-2xl border border-slate-200 bg-slate-50 p-7 transition"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                  <Icon size={25} className="text-blue-600" />
                </div>
                <h3 className="mt-6 text-xl font-bold text-slate-900">
                  {title}
                </h3>
                <p className="mt-3 leading-7 text-slate-600">
                  {description}
                </p>
                <Link
                  to="/courses"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-600"
                >
                  Explore
                  <ArrowRight size={16} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================
          LEARNING AREAS
      ================================================== */}

      <section className="bg-slate-50 px-5 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-black tracking-[.2em] text-blue-600 sm:text-sm">
                EXPLORE LEARNING
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                Learn what matters to you
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Explore the categories currently represented in your published courses.
              </p>
            </div>

            <Link
              to="/courses"
              className="inline-flex w-fit items-center gap-2 font-bold text-blue-600"
            >
              View all courses
              <ArrowRight size={18} />
            </Link>
          </div>

          {categories.length ? (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {categories.slice(0, 6).map((category) => {
                const count = courses.filter(
                  (course) => getCourseCategory(course) === category
                ).length;

                return (
                  <Link
                    key={category}
                    to="/courses"
                    className="oa-category-card rounded-2xl border border-slate-200 bg-white p-7 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                        <GraduationCap
                          size={25}
                          className="text-blue-600"
                        />
                      </div>
                      <ArrowRight
                        size={20}
                        className="text-slate-300"
                      />
                    </div>
                    <h3 className="mt-6 text-xl font-bold text-slate-900">
                      {category}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      {count} {count === 1 ? "course" : "courses"} available
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              Learning areas will appear automatically as courses are published.
            </div>
          )}
        </div>
      </section>

      {/* ==================================================
          HOW IT WORKS
      ================================================== */}

      <section className="bg-slate-950 px-5 py-20 text-white sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-black tracking-[.2em] text-blue-400 sm:text-sm">
              HOW IT WORKS
            </p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Start learning in three simple steps
            </h2>
            <p className="mt-4 text-lg leading-7 text-slate-400">
              Getting started with Online Academy is simple.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {STEPS.map(([number, Icon, title, description]) => (
              <div
                key={number}
                className="oa-step-card rounded-2xl border border-slate-800 bg-slate-900 p-7"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10">
                    <Icon size={25} className="text-blue-400" />
                  </div>
                  <span className="text-4xl font-black text-slate-800">
                    {number}
                  </span>
                </div>
                <h3 className="mt-7 text-xl font-bold">{title}</h3>
                <p className="mt-3 leading-7 text-slate-400">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================
          BENEFITS
      ================================================== */}

      <section className="bg-white px-5 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-black tracking-[.2em] text-blue-600 sm:text-sm">
              BUILT FOR STUDENTS
            </p>
            <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              A better way to learn online
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Everything is organized to make your learning experience simple and productive.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {BENEFITS.map(([Icon, title, description]) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-7"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                  <Icon size={25} className="text-blue-600" />
                </div>
                <h3 className="mt-5 text-xl font-bold text-slate-900">
                  {title}
                </h3>
                <p className="mt-3 leading-7 text-slate-600">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================
          CTA
      ================================================== */}

      <section className="px-5 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="oa-cta mx-auto max-w-5xl overflow-hidden rounded-3xl px-7 py-12 text-center text-white shadow-xl sm:px-12 sm:py-16">
          <div className="relative z-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <GraduationCap size={30} />
            </div>

            <h2 className="mt-6 text-3xl font-black sm:text-4xl">
              {user ? "Continue your learning journey" : "Ready to start learning?"}
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-lg leading-7 text-blue-100">
              {user
                ? "Go to your dashboard and continue learning from where you left off."
                : "Create your free account today and begin your learning journey with Online Academy."}
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {!authLoading && !user && (
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-bold text-blue-600 transition hover:bg-blue-50"
                >
                  Create Free Account
                  <ArrowRight size={18} />
                </Link>
              )}

              {!authLoading && user && (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-bold text-blue-600 transition hover:bg-blue-50"
                >
                  Open Dashboard
                  <ArrowRight size={18} />
                </Link>
              )}

              <Link
                to="/courses"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 font-bold text-white transition hover:bg-white/10"
              >
                Browse Courses
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;
