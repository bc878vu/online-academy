import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getCountFromServer, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import {
  ArrowLeft, ArrowRight, Award, BarChart3, BookOpen, ChevronRight,
  Clock3, GraduationCap, Laptop, PlayCircle, Search, ShieldCheck,
  Sparkles, Target, Users,
} from "lucide-react";
import { auth, db } from "../firebase";
import "./home-animations.css";

const DEFAULT_SLIDES = [
  { eyebrow: "LEARN WITHOUT LIMITS", title: "Learn new skills.", highlight: "Build your future.", description: "Explore structured courses, build practical knowledge and track your progress with a simple learning experience designed for students.", cta: "Explore Courses", link: "/courses" },
  { eyebrow: "LEARN AT YOUR PACE", title: "Study smarter.", highlight: "Grow with confidence.", description: "Watch lessons, use learning resources and keep moving forward from any device, whenever you are ready.", cta: "Start Learning", link: "/courses" },
  { eyebrow: "YOUR LEARNING JOURNEY", title: "Learn. Practice.", highlight: "Achieve more.", description: "Choose a course, complete lessons and build real progress through an organized online learning platform.", cta: "Browse Courses", link: "/courses" },
];

const FEATURES = [
  [BookOpen, "Quality Courses", "Structured courses with lessons, resources, quizzes and practical learning material."],
  [Laptop, "Learn Anywhere", "Access your learning materials from your phone, tablet or computer whenever you need them."],
  [BarChart3, "Track Progress", "Monitor your learning journey, completed lessons and achievements from your dashboard."],
];

const STEPS = [
  ["01", Users, "Create an Account", "Set up your profile and access your personal learning area."],
  ["02", BookOpen, "Choose a Course", "Explore available courses and select what you want to learn."],
  ["03", PlayCircle, "Start Learning", "Complete lessons, follow your progress and keep improving your skills."],
];

const CACHE_KEY = "online_academy_home_courses_v2";
const CACHE_TTL = 2 * 60 * 1000;
const FEATURED_LIMIT = 6;

function getTimestampValue(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") { const parsed = Date.parse(value); return Number.isNaN(parsed) ? 0 : parsed; }
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
    // Cache is optional.
  }
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

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    let mounted = true;

    const loadCourses = async () => {
      setError("");
      try {
        // Only the featured six courses are loaded on the landing page.
        // The full catalogue remains on /courses, which keeps this page scalable.
        const featuredQuery = query(
          collection(db, "courses"),
          where("published", "==", true),
          orderBy("createdAt", "desc"),
          limit(FEATURED_LIMIT)
        );
        const countQuery = query(collection(db, "courses"), where("published", "==", true));

        const [featuredSnap, countSnap] = await Promise.all([
          getDocs(featuredQuery),
          getCountFromServer(countQuery),
        ]);

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
        // If a legacy course set has missing createdAt values, retry without ordering.
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
  }, [totalCourses]);

  const categories = useMemo(() => [...new Set(courses.map(getCourseCategory).filter(Boolean))], [courses]);

  const results = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return courses;
    return courses.filter((c) => [getCourseTitle(c), getCourseCategory(c), getCourseDescription(c), toSafeText(c.instructor), getCourseLevel(c)].some((v) => v.toLowerCase().includes(s)));
  }, [courses, search]);

  const slides = useMemo(() => {
    if (!courses.length) return DEFAULT_SLIDES;
    return [DEFAULT_SLIDES[0], ...courses.slice(0, 2).map((c) => ({
      eyebrow: getCourseCategory(c),
      title: getCourseTitle(c),
      highlight: "Learn at your pace.",
      description: getCourseDescription(c),
      cta: "View Course",
      link: user ? `/courses/${c.id}` : "/login",
    }))];
  }, [courses, user]);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const timer = setInterval(() => setSlide((current) => (current + 1) % slides.length), 5500);
    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => setSlide((current) => Math.min(current, Math.max(0, slides.length - 1))), [slides.length]);

  const active = slides[slide] || DEFAULT_SLIDES[0];
  const stats = [
    [BookOpen, loading ? "—" : totalCourses ?? courses.length, "Published Courses"],
    [Users, categories.length || "—", "Featured Areas"],
    [PlayCircle, "24/7", "Learning Access"],
    [Award, "100%", "Learn at Your Pace"],
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-900">
      <section className="oa-hero relative overflow-hidden bg-[#061633] text-white">
        <div className="oa-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="oa-orb oa-orb-one" aria-hidden="true" /><div className="oa-orb oa-orb-two" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-14 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24 lg:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_.98fr] lg:gap-16">
            <div className="oa-fade-up max-w-2xl">
              <div className="oa-glass-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold tracking-[.18em] text-blue-200 sm:text-sm"><Sparkles size={16}/>{active.eyebrow}</div>
              <div key={slide} className="oa-slide-enter">
                <h1 className="mt-6 text-4xl font-black leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">{active.title}<span className="mt-1 block bg-gradient-to-r from-blue-300 via-sky-400 to-indigo-400 bg-clip-text text-transparent">{active.highlight}</span></h1>
                <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">{active.description}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link to={active.link} className="oa-button-primary group inline-flex items-center gap-2 rounded-2xl px-5 py-3.5 font-bold sm:px-6">{active.cta}<ArrowRight size={18} className="transition group-hover:translate-x-1"/></Link>
                  <Link to={user ? "/dashboard" : "/register"} className="oa-button-secondary inline-flex items-center gap-2 rounded-2xl px-5 py-3.5 font-bold sm:px-6">{user ? "Go to Dashboard" : "Create Account"}<ArrowRight size={18}/></Link>
                </div>
                <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300"><span>◉ Structured Learning</span><span>◉ Learn at Your Pace</span><span>◉ Progress Tracking</span></div>
              </div>
            </div>
            <div className="oa-dashboard-mockup relative mx-auto w-full max-w-xl">
              <div className="oa-float oa-float-one">✦ Learn smarter</div>
              <div className="rounded-[2rem] border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur-xl">
                <div className="rounded-[1.6rem] bg-white p-5 text-slate-900 sm:p-7">
                  <div className="flex items-center justify-between"><div><p className="font-black">Online Academy</p><p className="text-xs text-slate-400">Smart Learning</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">Active</span></div>
                  <div className="mt-7"><div className="flex justify-between text-sm font-bold"><span>Your Progress</span><span>75%</span></div><div className="mt-2 h-2 rounded-full bg-slate-200"><div className="h-full w-3/4 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"/></div></div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-slate-100 p-4 shadow-sm"><BookOpen size={18} className="text-blue-600"/><p className="mt-3 font-bold">Courses</p><p className="text-xs text-slate-400">Keep learning</p></div><div className="rounded-2xl border border-slate-100 p-4 shadow-sm"><Award size={18} className="text-blue-600"/><p className="mt-3 font-bold">Skills</p><p className="text-xs text-slate-400">Keep improving</p></div></div>
                </div>
                <div className="grid gap-3 p-2 sm:grid-cols-2"><div className="rounded-2xl bg-white/10 p-5"><PlayCircle size={18}/><p className="mt-3 font-bold">Video Lessons</p><p className="text-xs text-blue-100/60">Learn anytime</p></div><div className="rounded-2xl bg-white/10 p-5"><BarChart3 size={18}/><p className="mt-3 font-bold">Track Progress</p><p className="text-xs text-blue-100/60">Keep going</p></div></div>
              </div>
            </div>
          </div>
          <div className="mt-10 flex items-center gap-3"><button aria-label="Previous slide" onClick={() => setSlide((slide - 1 + slides.length) % slides.length)} className="rounded-full border border-white/15 bg-white/10 p-2"><ArrowLeft size={16}/></button><div className="flex gap-2">{slides.map((_, i) => <button key={i} aria-label={`Slide ${i + 1}`} onClick={() => setSlide(i)} className={`h-1.5 rounded-full transition-all ${i === slide ? "w-10 bg-blue-400" : "w-2 bg-white/30"}`}/>)}</div><button aria-label="Next slide" onClick={() => setSlide((slide + 1) % slides.length)} className="rounded-full border border-white/15 bg-white/10 p-2"><ArrowRight size={16}/></button></div>
        </div>
        <div className="mx-auto grid max-w-7xl grid-cols-2 overflow-hidden rounded-t-[1.5rem] bg-white text-slate-900 sm:grid-cols-4">
          {stats.map(([Icon, value, label]) => <div key={label} className="flex min-h-24 items-center justify-center gap-3 border-b border-slate-100 p-4 text-center sm:border-b-0 sm:border-r last:border-r-0"><Icon size={20} className="text-blue-600"/><div><p className="text-xl font-black sm:text-2xl">{value}</p><p className="text-[10px] text-slate-400 sm:text-xs">{label}</p></div></div>)}
        </div>
      </section>

      <section className="bg-slate-50 px-5 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl relative">
          <div className="relative"><div className="flex rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-slate-200"><Search size={20} className="m-3 text-slate-400"/><input value={search} onFocus={() => setSearchOpen(true)} onChange={(e) => {setSearch(e.target.value);setSearchOpen(true);}} placeholder="Search for courses, skills or topics..." className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"/><button type="button" className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white">Search</button></div>{searchOpen && search.trim() && <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl bg-white p-2 text-slate-900 shadow-2xl">{results.length ? results.slice(0,4).map((c)=><Link key={c.id} to={user ? `/courses/${c.id}` : "/login"} onClick={() => setSearchOpen(false)} className="flex items-center gap-3 rounded-xl p-3 hover:bg-blue-50"><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-blue-50">{getCourseImage(c) ? <img src={getCourseImage(c)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover"/> : <BookOpen size={18} className="text-blue-600"/>}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{getCourseTitle(c)}</p><p className="truncate text-xs text-slate-500">{getCourseCategory(c)}</p></div><ChevronRight size={17} className="ml-auto text-slate-400"/></Link>) : <p className="p-5 text-center text-sm text-slate-500">No matching courses found.</p>}</div>}</div>
        </div>
      </section>

      <section id="courses" className="scroll-mt-20 bg-slate-50 px-5 py-16 sm:px-6 sm:py-20 lg:px-8"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-black tracking-[.2em] text-blue-600 sm:text-sm">AVAILABLE COURSES</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">Start learning today</h2><p className="mt-3 text-slate-600">Explore the latest published courses from Online Academy.</p></div><Link to="/courses" className="inline-flex items-center gap-2 font-bold text-blue-600">View all courses<ArrowRight size={18}/></Link></div>{loading ? <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">{[1,2,3].map((x)=><div key={x} className="oa-skeleton h-80 rounded-3xl"/>)}</div> : error ? <div className="mt-10 rounded-3xl border border-red-100 bg-white px-6 py-16 text-center"><ShieldCheck size={30} className="mx-auto text-red-500"/><h3 className="mt-4 text-xl font-black">Courses could not be loaded</h3><p className="mt-2 text-sm text-slate-500">{error}</p><Link to="/courses" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">Open Courses Page<ArrowRight size={16}/></Link></div> : courses.length ? <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">{courses.map((c)=><Link key={c.id} to={user ? `/courses/${c.id}` : "/login"} className="oa-course-card group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200"><div className="relative h-48 overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-800">{getCourseImage(c) ? <img src={getCourseImage(c)} alt={getCourseTitle(c)} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-110"/> : <div className="flex h-full items-center justify-center"><BookOpen size={58} className="text-white/90"/></div>}<div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent"/>{getCourseCategory(c) && <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-blue-700">{getCourseCategory(c)}</span>}</div><div className="p-6"><div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><PlayCircle size={15} className="text-blue-600"/>Published course</div><h3 className="mt-3 line-clamp-2 text-xl font-black">{getCourseTitle(c)}</h3><p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{getCourseDescription(c)}</p><div className="mt-5 flex items-center justify-between"><span className="text-sm font-bold text-blue-600">{user ? "View course" : "Login to view"}</span><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"><ArrowRight size={16}/></span></div></div></Link>)}</div> : <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><BookOpen size={30} className="mx-auto text-slate-400"/><h3 className="mt-4 text-xl font-black">No published courses yet</h3><p className="mt-2 text-slate-500">Published courses will appear here automatically when they are added.</p></div>}</div></section>

      <section className="px-5 py-20 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="text-center"><p className="text-xs font-black tracking-[.2em] text-blue-600 sm:text-sm">WHY ONLINE ACADEMY</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">Everything you need to learn</h2><p className="mx-auto mt-4 max-w-2xl text-slate-500">A simple and organized learning experience designed to help students learn effectively.</p></div><div className="mt-10 grid gap-5 md:grid-cols-3">{FEATURES.map(([Icon,title,description])=><div key={title} className="oa-feature-card rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Icon size={24}/></div><h3 className="mt-6 text-xl font-black">{title}</h3><p className="mt-3 leading-7 text-slate-500">{description}</p></div>)}</div></div></section>

      <section className="bg-slate-50 px-5 py-20 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="text-center"><p className="text-xs font-black tracking-[.2em] text-blue-600 sm:text-sm">HOW IT WORKS</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">Start learning in three steps</h2></div><div className="mt-10 grid gap-5 md:grid-cols-3">{STEPS.map(([number,Icon,title,description])=><div key={number} className="relative rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200"><span className="text-sm font-black text-blue-600">{number}</span><div className="mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Icon size={24}/></div><h3 className="mt-6 text-xl font-black">{title}</h3><p className="mt-3 leading-7 text-slate-500">{description}</p></div>)}</div></div></section>

      <section className="px-5 py-20 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="text-center"><p className="text-xs font-black tracking-[.2em] text-blue-600 sm:text-sm">BROWSE TOP CATEGORIES</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">Explore by category</h2><p className="mt-3 text-slate-500">Categories are generated automatically from featured published courses.</p></div>{categories.length ? <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{categories.slice(0,6).map((cat,i)=>{const icons=[Laptop,BarChart3,GraduationCap,BookOpen,Target,Award];const Icon=icons[i%icons.length];return <Link key={cat} to="/courses" className="oa-category-card group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Icon size={23}/></div><ChevronRight size={19} className="text-slate-300 group-hover:translate-x-1 group-hover:text-blue-600"/></div><h3 className="mt-6 text-lg font-black">{cat}</h3><p className="mt-2 text-sm leading-6 text-slate-500">Explore published courses in this learning area.</p></Link>})}</div> : <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><GraduationCap size={34} className="mx-auto text-slate-400"/><h3 className="mt-4 text-lg font-black">Categories will appear here soon</h3><p className="mt-2 text-slate-500">Publish courses to populate this section automatically.</p></div>}</div></section>

      <section className="px-5 pb-20 sm:px-6 lg:px-8"><div className="oa-cta relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] px-7 py-12 text-white shadow-2xl sm:px-12 sm:py-16"><div className="relative text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15"><GraduationCap size={29}/></div><h2 className="mt-6 text-3xl font-black sm:text-4xl">{user ? "Continue your learning journey" : "Ready to start your learning journey?"}</h2><p className="mx-auto mt-4 max-w-2xl text-lg leading-7 text-blue-100">{user ? "Open your dashboard and continue learning from where you left off." : "Explore the academy, choose a course and keep building the skills that matter to you."}</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link to={user ? "/dashboard" : "/register"} className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-black text-blue-700 hover:bg-blue-50">{user ? "Open Dashboard" : "Create Free Account"}<ArrowRight size={18}/></Link><Link to="/courses" className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 font-black text-white hover:bg-white/10">Browse Courses</Link></div></div></div></section>

      <footer className="border-t border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500"><div className="mx-auto max-w-7xl"><p className="font-bold text-slate-700">Online Academy</p><p className="mt-1">Learn. Grow. Succeed.</p></div></footer>
    </main>
  );
}

export default Home;
