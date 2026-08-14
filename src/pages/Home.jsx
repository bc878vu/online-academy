import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getCountFromServer, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import {
  ArrowLeft, ArrowRight, Award, BarChart3, BookOpen, CheckCircle2, ChevronRight,
  Clock3, GraduationCap, Laptop, PlayCircle, Search, ShieldCheck, Sparkles,
  Target, Users, X,
} from "lucide-react";
import { auth, db } from "../firebase";
import "./home-animations.css";

const DEFAULT_SLIDES = [
  {
    eyebrow: "LEARN WITHOUT LIMITS",
    title: "Learn new skills.",
    highlight: "Build your future.",
    description: "Explore structured courses, practical lessons and progress tracking in one focused learning experience.",
    cta: "Explore Courses",
    link: "/courses",
  },
  {
    eyebrow: "LEARN AT YOUR PACE",
    title: "Study smarter.",
    highlight: "Grow with confidence.",
    description: "Learn from any device, continue from where you stopped and build knowledge one lesson at a time.",
    cta: "Start Learning",
    link: "/courses",
  },
  {
    eyebrow: "YOUR LEARNING JOURNEY",
    title: "Learn. Practice.",
    highlight: "Achieve more.",
    description: "Choose a course, complete lessons and turn consistent learning into measurable progress.",
    cta: "Browse Courses",
    link: "/courses",
  },
];

const FEATURES = [
  [BookOpen, "Quality Courses", "Structured courses with lessons, resources, quizzes and practical learning material.", "01"],
  [Laptop, "Learn Anywhere", "Access your learning materials from phone, tablet or computer whenever you need them.", "02"],
  [BarChart3, "Track Progress", "Monitor completed lessons, learning activity and achievements from your dashboard.", "03"],
];

const STEPS = [
  ["01", Users, "Create an Account", "Set up your profile and enter your personal learning area."],
  ["02", BookOpen, "Choose a Course", "Explore published courses and select what you want to learn."],
  ["03", PlayCircle, "Start Learning", "Complete lessons, follow your progress and keep improving."],
];

const CACHE_KEY = "online_academy_home_courses_v3";
const CACHE_TTL = 2 * 60 * 1000;
const FEATURED_LIMIT = 6;

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

function toSafeText(value, fallback = "") {
  if (value == null) return fallback;
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => toSafeText(item)).filter(Boolean).join(", ") || fallback;
  if (typeof value === "object") {
    const candidate = value.label ?? value.name ?? value.title ?? value.text ?? value.value ?? value.displayName;
    return candidate != null ? toSafeText(candidate, fallback) : fallback;
  }
  return fallback;
}

function getCourseTitle(course) { return toSafeText(course?.title ?? course?.name, "Untitled Course"); }
function getCourseImage(course) { return toSafeText(course?.imageUrl ?? course?.thumbnail ?? course?.image, ""); }
function getCourseCategory(course) { return toSafeText(course?.category, "Online Course"); }
function getCourseDescription(course) { return toSafeText(course?.description, "Start learning with this structured online course."); }
function getCourseLevel(course) { return toSafeText(course?.level, "Start Learning"); }

function readCachedCourses() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || !Array.isArray(parsed.courses)) return null;
    if (Date.now() - parsed.timestamp > CACHE_TTL) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCachedCourses(courses, totalCount) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), courses, totalCount }));
  } catch {
    // Optional performance cache.
  }
}

function CourseImage({ course, className = "" }) {
  const image = getCourseImage(course);
  if (image) {
    return <img src={image} alt={getCourseTitle(course)} loading="lazy" decoding="async" className={className} />;
  }
  return <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 ${className}`}><BookOpen size={54} strokeWidth={1.6} className="text-white/90" /></div>;
}

function Home() {
  const [user, setUser] = useState(null);
  const cached = useMemo(() => readCachedCourses(), []);
  const [courses, setCourses] = useState(cached?.courses || []);
  const [totalCourses, setTotalCourses] = useState(cached?.totalCount ?? null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState("");
  const [slide, setSlide] = useState(0);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [heroPaused, setHeroPaused] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // Load the landing-page catalogue once. The previous implementation depended on
  // totalCourses, which could trigger another Firestore read after every count update.
  useEffect(() => {
    let mounted = true;

    const loadCourses = async () => {
      setError("");
      try {
        const featuredQuery = query(
          collection(db, "courses"),
          where("published", "==", true),
          orderBy("createdAt", "desc"),
          limit(FEATURED_LIMIT)
        );
        const countQuery = query(collection(db, "courses"), where("published", "==", true));
        const [featuredSnap, countSnap] = await Promise.all([getDocs(featuredQuery), getCountFromServer(countQuery)]);
        if (!mounted) return;

        const list = featuredSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((course) => course.published === true)
          .sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt));
        const count = Number(countSnap.data().count) || list.length;

        setCourses(list);
        setTotalCourses(count);
        setLoading(false);
        saveCachedCourses(list, count);
      } catch (e) {
        console.error("Home courses:", e);
        if (!mounted) return;
        if (e?.code === "failed-precondition" || e?.code === "invalid-argument") {
          try {
            const fallbackQuery = query(collection(db, "courses"), where("published", "==", true), limit(FEATURED_LIMIT));
            const fallbackSnap = await getDocs(fallbackQuery);
            if (!mounted) return;
            const list = fallbackSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((course) => course.published === true);
            setCourses(list);
            setTotalCourses((previous) => previous ?? list.length);
            saveCachedCourses(list, totalCourses ?? list.length);
            setLoading(false);
            return;
          } catch (fallbackError) {
            console.error("Home fallback courses:", fallbackError);
          }
        }
        setError(e?.code === "permission-denied" ? "Firebase permission denied. Please check your Firestore security rules." : "Unable to load courses right now. Please try again.");
        setLoading(false);
      }
    };

    loadCourses();
    return () => { mounted = false; };
  }, []);

  const categories = useMemo(() => [...new Set(courses.map(getCourseCategory).filter(Boolean))], [courses]);

  const results = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return [];
    return courses.filter((course) => [
      getCourseTitle(course), getCourseCategory(course), getCourseDescription(course),
      toSafeText(course.instructor), getCourseLevel(course),
    ].some((item) => item.toLowerCase().includes(value)));
  }, [courses, search]);

  const slides = useMemo(() => {
    if (!courses.length) return DEFAULT_SLIDES;
    return [
      DEFAULT_SLIDES[0],
      ...courses.slice(0, 2).map((course) => ({
        eyebrow: getCourseCategory(course),
        title: getCourseTitle(course),
        highlight: "Learn at your pace.",
        description: getCourseDescription(course),
        cta: "View Course",
        link: user ? `/courses/${course.id}` : "/login",
      })),
    ];
  }, [courses, user]);

  useEffect(() => {
    if (heroPaused || slides.length <= 1) return undefined;
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % slides.length), 6000);
    return () => window.clearInterval(timer);
  }, [heroPaused, slides.length]);

  useEffect(() => {
    setSlide((current) => Math.min(current, Math.max(0, slides.length - 1)));
  }, [slides.length]);

  const active = slides[slide] || DEFAULT_SLIDES[0];
  const stats = [
    [BookOpen, loading ? "—" : totalCourses ?? courses.length, "Published Courses"],
    [Users, categories.length || "—", "Learning Areas"],
    [PlayCircle, "24/7", "Learning Access"],
    [Award, "100%", "Learn at Your Pace"],
  ];

  const closeSearch = () => setSearchOpen(false);

  return (
    <main className="min-h-screen overflow-x-clip bg-white text-slate-900">
      <section
        className="oa-hero relative overflow-hidden text-white"
        onMouseEnter={() => setHeroPaused(true)}
        onMouseLeave={() => setHeroPaused(false)}
        onFocus={() => setHeroPaused(true)}
        onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setHeroPaused(false); }}
      >
        <div className="oa-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="oa-orb oa-orb-one" aria-hidden="true" />
        <div className="oa-orb oa-orb-two" aria-hidden="true" />
        <div className="oa-hero-noise pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative mx-auto max-w-[1440px] px-5 pb-12 pt-10 sm:px-7 sm:pb-16 sm:pt-14 lg:px-10 lg:pb-20 lg:pt-20 xl:px-12">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.04fr)_minmax(420px,.96fr)] lg:gap-16 xl:gap-20">
            <div className="oa-fade-up max-w-3xl">
              <div className="oa-glass-pill inline-flex max-w-full items-center gap-2 rounded-full px-3.5 py-2 text-[10px] font-black tracking-[.18em] text-blue-100 sm:px-4 sm:text-xs">
                <Sparkles size={15} />
                <span className="truncate">{active.eyebrow}</span>
                {!heroPaused && <span className="oa-live-dot ml-1 h-1.5 w-1.5 rounded-full bg-cyan-300" aria-label="Auto play active" />}
              </div>

              <div className="mt-5 min-h-[330px] sm:min-h-[315px] lg:min-h-[370px]" aria-live="polite">
                <div className="oa-slide-content">
                  <h1 className="max-w-4xl text-[clamp(2.65rem,7vw,5.9rem)] font-black leading-[.98] tracking-[-.045em]">
                    {active.title}
                    <span className="mt-2 block bg-gradient-to-r from-blue-200 via-cyan-300 to-indigo-300 bg-clip-text pb-2 text-transparent">{active.highlight}</span>
                  </h1>
                  <p className="mt-6 max-w-2xl text-[15px] leading-7 text-slate-300 sm:text-lg sm:leading-8">{active.description}</p>
                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <Link to={active.link} className="oa-button-primary group inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 font-bold sm:px-6">
                      {active.cta}<ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                    <Link to={user ? "/dashboard" : "/register"} className="oa-button-secondary inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 font-bold sm:px-6">
                      {user ? "Go to Dashboard" : "Create Account"}<ArrowRight size={18} />
                    </Link>
                  </div>
                  <div className="mt-7 grid max-w-2xl grid-cols-1 gap-2 text-xs text-slate-300 sm:grid-cols-3 sm:gap-4 sm:text-sm">
                    {["Structured Learning", "Learn at Your Pace", "Progress Tracking"].map((item) => <span key={item} className="inline-flex items-center gap-2"><CheckCircle2 size={14} className="text-cyan-300" />{item}</span>)}
                  </div>
                </div>
              </div>
            </div>

            <div className="oa-dashboard-mockup relative mx-auto w-full max-w-[610px] lg:max-w-none">
              <div className="oa-float oa-float-one hidden sm:flex"><Sparkles size={13} /> Learn smarter</div>
              <div className="oa-hero-card rounded-[1.8rem] border border-white/15 bg-white/[.08] p-2.5 shadow-2xl backdrop-blur-xl sm:rounded-[2.1rem] sm:p-3">
                <div className="rounded-[1.35rem] bg-white p-4 text-slate-900 shadow-2xl sm:rounded-[1.65rem] sm:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0"><p className="truncate text-base font-black sm:text-lg">Online Academy</p><p className="text-xs text-slate-400">Smart learning workspace</p></div>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-600 sm:px-3 sm:text-xs">ACTIVE</span>
                  </div>
                  <div className="mt-6 rounded-2xl bg-slate-50 p-4 sm:mt-7 sm:p-5">
                    <div className="flex items-center justify-between text-xs font-bold sm:text-sm"><span>Your Progress</span><span className="text-blue-600">75%</span></div>
                    <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-slate-200"><div className="oa-progress-bar h-full w-3/4 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" /></div>
                    <div className="mt-3 flex justify-between text-[10px] text-slate-400"><span>Keep going</span><span>Great progress</span></div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5">
                    {[[BookOpen, "Courses", "Keep learning"], [Award, "Skills", "Keep improving"]].map(([Icon, title, text]) => <div key={title} className="oa-mini-card rounded-2xl border border-slate-100 p-3.5 sm:p-4"><Icon size={18} className="text-blue-600" /><p className="mt-2.5 text-sm font-black sm:mt-3 sm:text-base">{title}</p><p className="mt-1 text-[10px] text-slate-400 sm:text-xs">{text}</p></div>)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 p-1.5 sm:gap-3 sm:p-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[.08] p-3.5 sm:p-5"><PlayCircle size={18} /><p className="mt-2 text-sm font-black sm:mt-3 sm:text-base">Video Lessons</p><p className="mt-1 text-[10px] text-blue-100/60 sm:text-xs">Learn anytime</p></div>
                  <div className="rounded-2xl border border-white/10 bg-white/[.08] p-3.5 sm:p-5"><BarChart3 size={18} /><p className="mt-2 text-sm font-black sm:mt-3 sm:text-base">Track Progress</p><p className="mt-1 text-[10px] text-blue-100/60 sm:text-xs">Keep moving</p></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-7 flex items-center justify-between gap-4 sm:mt-10">
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Previous slide" onClick={() => setSlide((slide - 1 + slides.length) % slides.length)} className="oa-icon-button"><ArrowLeft size={16} /></button>
              <div className="flex items-center gap-1.5" role="tablist" aria-label="Hero slides">
                {slides.map((item, index) => <button key={`${item.title}-${index}`} type="button" role="tab" aria-selected={index === slide} aria-label={`Slide ${index + 1}`} onClick={() => setSlide(index)} className={`oa-slide-dot ${index === slide ? "is-active" : ""}`} />)}
              </div>
              <button type="button" aria-label="Next slide" onClick={() => setSlide((slide + 1) % slides.length)} className="oa-icon-button"><ArrowRight size={16} /></button>
            </div>
            <span className="hidden text-[11px] font-bold tracking-wide text-slate-400 sm:block">{heroPaused ? "Paused" : "Auto play"}</span>
          </div>
        </div>

        <div className="oa-stats-card relative mx-auto grid max-w-[1440px] grid-cols-2 overflow-hidden rounded-t-[1.4rem] bg-white text-slate-900 shadow-[0_-12px_45px_rgba(0,0,0,.08)] sm:grid-cols-4 sm:rounded-t-[1.7rem]">
          {stats.map(([Icon, value, label], index) => <div key={label} className={`flex min-h-[82px] items-center justify-center gap-2.5 border-slate-100 p-3 text-center sm:min-h-[96px] sm:gap-3 sm:p-4 ${index < 2 ? "border-b" : "border-b-0"} ${index % 2 === 0 ? "border-r" : ""} sm:border-b-0 sm:border-r sm:last:border-r-0`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:h-10 sm:w-10"><Icon size={18} /></span><div><p className="text-lg font-black sm:text-2xl">{value}</p><p className="text-[9px] font-semibold text-slate-400 sm:text-xs">{label}</p></div></div>)}
        </div>
      </section>

      <section className="relative bg-slate-50 px-5 py-7 sm:px-7 sm:py-9 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="oa-search-wrap relative rounded-2xl bg-white p-1.5 ring-1 ring-slate-200 sm:rounded-3xl sm:p-2">
            <div className="flex min-h-12 items-center gap-2 sm:min-h-14 sm:gap-3">
              <Search size={20} className="ml-3 shrink-0 text-slate-400 sm:ml-4" />
              <input value={search} onFocus={() => setSearchOpen(true)} onChange={(event) => { setSearch(event.target.value); setSearchOpen(true); }} onKeyDown={(event) => { if (event.key === "Escape") { setSearch(""); closeSearch(); } }} placeholder="Search courses, skills or topics..." className="min-w-0 flex-1 bg-transparent px-1 text-sm font-medium outline-none placeholder:text-slate-400 sm:text-base" aria-label="Search courses" />
              {search && <button type="button" aria-label="Clear search" onClick={() => { setSearch(""); closeSearch(); }} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={17} /></button>}
              <button type="button" onClick={() => setSearchOpen(true)} className="hidden rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 sm:block">Search</button>
            </div>
            {searchOpen && search.trim() && <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-slate-100 bg-white p-2 text-slate-900 shadow-2xl">
              {results.length ? results.slice(0, 5).map((course) => <Link key={course.id} to={user ? `/courses/${course.id}` : "/login"} onClick={closeSearch} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-blue-50"><div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-blue-50"><CourseImage course={course} className="h-full w-full object-cover" /></div><div className="min-w-0"><p className="truncate text-sm font-black">{getCourseTitle(course)}</p><p className="truncate text-xs text-slate-500">{getCourseCategory(course)}</p></div><ChevronRight size={17} className="ml-auto shrink-0 text-slate-400" /></Link>) : <p className="p-5 text-center text-sm text-slate-500">No matching courses found.</p>}
            </div>}
          </div>
        </div>
      </section>

      <section id="courses" className="scroll-mt-20 bg-slate-50 px-5 pb-20 pt-8 sm:px-7 sm:pb-24 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div><p className="oa-kicker">AVAILABLE COURSES</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Start learning today</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Explore the latest published courses from Online Academy.</p></div>
            <Link to="/courses" className="group inline-flex items-center gap-2 self-start font-black text-blue-600 md:self-auto">View all courses<ArrowRight size={18} className="transition-transform group-hover:translate-x-1" /></Link>
          </div>

          {loading ? <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="oa-skeleton h-[380px] rounded-[1.7rem]" />)}</div>
            : error ? <div className="mt-10 rounded-[1.7rem] border border-red-100 bg-white px-6 py-16 text-center shadow-sm"><ShieldCheck size={32} className="mx-auto text-red-500" /><h3 className="mt-4 text-xl font-black">Courses could not be loaded</h3><p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">{error}</p><Link to="/courses" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white">Open Courses Page<ArrowRight size={16} /></Link></div>
            : courses.length ? <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{courses.map((course, index) => <Link key={course.id} to={user ? `/courses/${course.id}` : "/login"} className="oa-course-card group rounded-[1.7rem] bg-white shadow-sm ring-1 ring-slate-200/80">
              <div className="relative h-48 overflow-hidden bg-slate-100 sm:h-52"><CourseImage course={course} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />{getCourseCategory(course) && <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-black text-blue-700 shadow-sm sm:text-xs">{getCourseCategory(course)}</span>}<span className="absolute bottom-4 right-4 rounded-full border border-white/20 bg-slate-950/55 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">Featured {String(index + 1).padStart(2, "0")}</span></div>
              <div className="p-5 sm:p-6"><div className="flex items-center gap-2 text-xs font-bold text-slate-500"><PlayCircle size={15} className="text-blue-600" /> Published course</div><h3 className="mt-3 line-clamp-2 text-xl font-black tracking-tight">{getCourseTitle(course)}</h3><p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{getCourseDescription(course)}</p><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4"><span className="text-sm font-black text-blue-600">{user ? "View course" : "Login to view"}</span><span className="oa-arrow-circle flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600"><ArrowRight size={16} /></span></div></div>
            </Link>)}</div>
            : <div className="mt-10 rounded-[1.7rem] border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><BookOpen size={32} className="mx-auto text-slate-400" /><h3 className="mt-4 text-xl font-black">No published courses yet</h3><p className="mt-2 text-slate-500">Published courses will appear here automatically when they are added.</p></div>}
        </div>
      </section>

      <section className="relative overflow-hidden bg-white px-5 py-20 sm:px-7 lg:px-10 lg:py-24">
        <div className="oa-section-glow pointer-events-none absolute left-1/2 top-0 h-80 w-[680px] -translate-x-1/2 rounded-full bg-blue-100/60 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center"><p className="oa-kicker">WHY ONLINE ACADEMY</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Everything you need to learn</h2><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">A focused learning experience designed to keep courses simple, accessible and progress-driven.</p></div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">{FEATURES.map(([Icon, title, description, number]) => <article key={title} className="oa-feature-card rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><div className="flex items-start justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Icon size={22} /></span><span className="text-xs font-black tracking-widest text-slate-300">{number}</span></div><h3 className="mt-6 text-xl font-black">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-500">{description}</p><div className="mt-5 h-px w-12 bg-blue-600/30" /></article>)}</div>
        </div>
      </section>

      <section className="bg-slate-50 px-5 py-20 sm:px-7 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center"><p className="oa-kicker">HOW IT WORKS</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Start learning in three steps</h2><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">A simple flow from account creation to your first lesson.</p></div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">{STEPS.map(([number, Icon, title, description]) => <article key={number} className="oa-step-card relative rounded-[1.7rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><div className="flex items-center justify-between"><span className="text-sm font-black tracking-wider text-blue-600">{number}</span><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Icon size={22} /></span></div><h3 className="mt-7 text-xl font-black">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-500">{description}</p></article>)}</div>
        </div>
      </section>

      <section className="bg-white px-5 py-20 sm:px-7 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center"><p className="oa-kicker">BROWSE TOP CATEGORIES</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Explore by category</h2><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">Learning areas are generated automatically from your published courses.</p></div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">{categories.length ? categories.map((category, index) => <Link key={category} to="/courses" className="oa-category-card group rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><div className="flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">{index % 2 ? <BarChart3 size={22} /> : <GraduationCap size={22} />}</span><ChevronRight size={20} className="text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-blue-600" /></div><h3 className="mt-6 text-xl font-black">{category}</h3><p className="mt-2 text-sm leading-6 text-slate-500">Explore published courses in this learning area.</p></Link>) : <div className="md:col-span-2 rounded-[1.6rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">Categories will appear here as courses are published.</div>}</div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-7 lg:px-10 lg:pb-24">
        <div className="oa-cta relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] px-6 py-12 text-center text-white shadow-2xl shadow-blue-900/15 sm:px-10 sm:py-16 lg:rounded-[2.4rem] lg:py-20">
          <div className="oa-cta-grid pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative mx-auto max-w-3xl"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur"><GraduationCap size={27} /></span><p className="mt-5 text-xs font-black tracking-[.2em] text-blue-100">KEEP MOVING FORWARD</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Continue your learning journey</h2><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-blue-100/80 sm:text-base">Open your dashboard to continue from where you left off, or browse the catalogue and find your next course.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link to="/dashboard" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 font-black text-blue-700 shadow-xl transition hover:-translate-y-0.5">Open Dashboard<ArrowRight size={18} /></Link><Link to="/courses" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 font-black text-white transition hover:bg-white/10">Browse Courses<ArrowRight size={18} /></Link></div></div>
        </div>
      </section>
    </main>
  );
}

export default Home;
