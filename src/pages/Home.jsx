


import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  ArrowLeft, ArrowRight, Award, BarChart3, BookOpen, CheckCircle2,
  ChevronRight, Clock3, GraduationCap, Laptop, PlayCircle, Search,
  ShieldCheck, Sparkles, Star, Target, Users, X,
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

const BENEFITS = [
  [ShieldCheck, "Secure Learning", "Your account and learning experience are protected with secure authentication."],
  [Clock3, "Learn Anytime", "Study whenever it suits you with 24/7 access to your learning platform."],
  [Target, "Focused Progress", "Stay organized and keep your attention on the skills you want to build."],
];

function Home() {
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const q = query(collection(db, "courses"), where("isPublished", "==", true));
        const snap = await getDocs(q);
        if (!mounted) return;
        setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      } catch (e) {
        console.error("Home courses:", e);
        if (mounted) setCourses([]);
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const categories = useMemo(() => [...new Set(courses.map(c => c.category).filter(Boolean))], [courses]);
  const results = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return courses.slice(0, 6);
    return courses.filter(c => [c.title,c.category,c.description,c.instructor].filter(Boolean).some(v => String(v).toLowerCase().includes(s))).slice(0,6);
  }, [courses, search]);

  const slides = useMemo(() => {
    if (!courses.length) return DEFAULT_SLIDES;
    return [DEFAULT_SLIDES[0], ...courses.slice(0,2).map(c => ({
      eyebrow: c.category || "FEATURED COURSE",
      title: c.title || "Start learning today.",
      highlight: "Learn at your pace.",
      description: c.description || "Explore this published course and continue your learning journey with Online Academy.",
      cta: "View Course", link: `/course/${c.id}`,
    }))];
  }, [courses]);

  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % slides.length), 5500);
    return () => clearInterval(t);
  }, [slides.length]);
  useEffect(() => setSlide(s => Math.min(s, slides.length - 1)), [slides.length]);

  const active = slides[slide] || DEFAULT_SLIDES[0];
  const stats = [
    [BookOpen, loading ? "—" : `${courses.length}+`, "Published Courses"],
    [Users, categories.length ? categories.length : "—", "Learning Areas"],
    [PlayCircle, "24/7", "Learning Access"],
    [Award, "100%", "Learn at Your Pace"],
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-900">
      <section className="oa-hero relative overflow-hidden bg-[#061633] text-white">
        <div className="oa-grid absolute inset-0" /><div className="oa-orb oa-orb-one" /><div className="oa-orb oa-orb-two" />
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
                <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300">{["Structured Learning","Learn at Your Pace","Progress Tracking"].map(x => <span key={x} className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-300"/>{x}</span>)}</div>
              </div>
              <div className="mt-9 flex items-center gap-3"><button className="oa-icon-button" onClick={() => setSlide((slide-1+slides.length)%slides.length)}><ArrowLeft size={17}/></button><div className="flex gap-2">{slides.map((_,i)=><button key={i} onClick={()=>setSlide(i)} aria-label={`Slide ${i+1}`} className={`h-1.5 rounded-full transition-all ${i===slide?"w-9 bg-blue-400":"w-2 bg-white/30"}`}/>)}</div><button className="oa-icon-button" onClick={() => setSlide((slide+1)%slides.length)}><ArrowRight size={17}/></button></div>
            </div>

            <div className="oa-fade-in relative mx-auto w-full max-w-xl">
              <div className="oa-hero-frame rounded-[2rem] border border-white/10 bg-white/[.07] p-3 shadow-2xl backdrop-blur-sm sm:p-4">
                <div className="rounded-[1.5rem] bg-gradient-to-br from-white to-slate-100 p-4 text-slate-900 sm:p-5">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white"><GraduationCap size={23}/></div><div><p className="font-extrabold">Online Academy</p><p className="text-xs text-slate-500">Student Learning</p></div></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">Active</span></div>
                  <div className="mt-6 rounded-2xl bg-slate-50 p-4"><div className="flex justify-between"><span className="text-sm font-bold text-slate-700">Your Progress</span><span className="text-sm font-black text-blue-600">75%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="oa-progress-bar h-full w-3/4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-500"/></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-white p-4 shadow-sm"><BookOpen size={19} className="text-blue-600"/><p className="mt-2 font-extrabold">Courses</p><p className="text-xs text-slate-500">Keep learning</p></div><div className="rounded-xl bg-white p-4 shadow-sm"><Award size={19} className="text-indigo-600"/><p className="mt-2 font-extrabold">Skills</p><p className="text-xs text-slate-500">Keep improving</p></div></div></div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3"><div className="oa-floating-card rounded-2xl border border-white/10 bg-white/[.08] p-4"><PlayCircle size={22} className="text-blue-300"/><p className="mt-2 font-bold">Video Lessons</p><p className="text-xs text-slate-400">Learn anytime</p></div><div className="oa-floating-card rounded-2xl border border-white/10 bg-white/[.08] p-4"><BarChart3 size={22} className="text-indigo-300"/><p className="mt-2 font-bold">Track Progress</p><p className="text-xs text-slate-400">Keep going</p></div></div>
              </div>
              <div className="oa-badge-float absolute -left-2 top-12 hidden rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-xs shadow-xl backdrop-blur-md sm:block"><div className="flex items-center gap-2"><Star size={16} className="text-amber-300"/>Learn smarter</div></div>
            </div>
          </div>

          <div className="relative z-10 mx-auto mt-12 max-w-4xl">
            <div className="oa-search-wrap flex items-center gap-3 rounded-2xl bg-white p-2 shadow-2xl"><Search size={22} className="ml-3 text-slate-400"/><input value={search} onChange={e=>{setSearch(e.target.value);setSearchOpen(true)}} onFocus={()=>setSearchOpen(true)} placeholder="Search for courses, skills or topics..." className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm font-medium text-slate-800 outline-none sm:text-base"/>{search&&<button onClick={()=>setSearch("")} className="rounded-xl p-2 text-slate-400"><X size={18}/></button>}<button onClick={()=>document.getElementById("courses")?.scrollIntoView({behavior:"smooth"})} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">Search</button></div>
            {searchOpen && search.trim() && <div className="mt-2 overflow-hidden rounded-2xl bg-white p-2 text-slate-900 shadow-2xl">{results.length ? results.slice(0,4).map(c=><Link key={c.id} to={`/course/${c.id}`} onClick={()=>setSearchOpen(false)} className="flex items-center gap-3 rounded-xl p-3 hover:bg-blue-50"><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-blue-50">{c.thumbnail?<img src={c.thumbnail} alt="" className="h-full w-full object-cover"/>:<BookOpen size={18} className="text-blue-600"/>}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{c.title||"Untitled Course"}</p><p className="truncate text-xs text-slate-500">{c.category||"Online Course"}</p></div><ChevronRight size={17} className="ml-auto text-slate-400"/></Link>):<p className="p-5 text-center text-sm text-slate-500">No matching courses found.</p>}</div>}
          </div>
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-6 lg:px-8"><div className="oa-stats-card grid grid-cols-2 overflow-hidden rounded-2xl bg-white shadow-2xl sm:grid-cols-4">{stats.map(([Icon,value,label],i)=><div key={label} className={`p-5 text-center sm:p-6 ${i>0?"border-l border-slate-200":""} ${i>1?"border-t sm:border-t-0":""}`}><Icon className="mx-auto text-blue-600" size={20}/><p className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">{value}</p><p className="mt-1 text-xs text-slate-500 sm:text-sm">{label}</p></div>)}</div></div>
      </section>

      <section id="courses" className="scroll-mt-20 bg-slate-50 px-5 py-20 sm:px-6 sm:py-24 lg:px-8"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-black tracking-[.2em] text-blue-600 sm:text-sm">AVAILABLE COURSES</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">Start learning today</h2><p className="mt-3 text-slate-600">Explore the latest published courses from Online Academy.</p></div><Link to="/courses" className="inline-flex items-center gap-2 font-bold text-blue-600">View all courses<ArrowRight size={18}/></Link></div>{loading?<div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">{[1,2,3].map(x=><div key={x} className="oa-skeleton h-80 rounded-3xl"/>)}</div>:courses.length?<div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">{courses.slice(0,6).map(c=><Link key={c.id} to={`/course/${c.id}`} className="oa-course-card group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200"><div className="relative h-48 overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-800">{c.thumbnail?<img src={c.thumbnail} alt={c.title||"Course"} className="h-full w-full object-cover transition duration-700 group-hover:scale-110"/>:<div className="flex h-full items-center justify-center"><BookOpen size={58} className="text-white/90"/></div>}<div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent"/>{c.category&&<span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-blue-700">{c.category}</span>}</div><div className="p-6"><div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><PlayCircle size={15} className="text-blue-600"/>Published course</div><h3 className="mt-3 line-clamp-2 text-xl font-black">{c.title||"Untitled Course"}</h3><p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{c.description||"Explore this course and start building useful skills."}</p><div className="mt-5 flex items-center justify-between"><span className="text-sm font-bold text-blue-600">View course</span><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"><ArrowRight size={16}/></span></div></div></Link>)}</div>:<div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><BookOpen size={30} className="mx-auto text-slate-400"/><h3 className="mt-4 text-xl font-black">No published courses yet</h3><p className="mt-2 text-slate-500">Published courses will appear here automatically when they are added.</p></div>}</div></section>

      <section className="bg-white px-5 py-20 sm:px-6 sm:py-24 lg:px-8"><div className="mx-auto max-w-7xl"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-black tracking-[.2em] text-blue-600 sm:text-sm">WHY ONLINE ACADEMY</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">Everything you need to learn</h2><p className="mt-4 text-lg leading-7 text-slate-600">A simple and organized learning experience designed to help students learn effectively.</p></div><div className="mt-12 grid gap-6 md:grid-cols-3">{FEATURES.map(([Icon,title,desc],i)=><div key={title} className="oa-feature-card rounded-3xl border border-slate-200 bg-white p-7 shadow-sm" style={{animationDelay:`${i*120}ms`}}><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Icon size={27}/></div><h3 className="mt-6 text-xl font-black">{title}</h3><p className="mt-3 leading-7 text-slate-600">{desc}</p><div className="mt-5 flex items-center gap-2 text-sm font-bold text-blue-600">Explore<ArrowRight size={16}/></div></div>)}</div></div></section>

      <section className="bg-slate-50 px-5 py-20 sm:px-6 sm:py-24 lg:px-8"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-black tracking-[.2em] text-blue-600 sm:text-sm">BROWSE TOP CATEGORIES</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">Explore by category</h2><p className="mt-3 text-slate-600">Categories are generated from your published course data.</p></div><Link to="/courses" className="inline-flex items-center gap-2 font-bold text-blue-600">View all courses<ArrowRight size={18}/></Link></div>{categories.length?<div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{categories.slice(0,6).map((cat,i)=>{const icons=[Laptop,BarChart3,GraduationCap,BookOpen,Target,Award];const Icon=icons[i%icons.length];return <Link key={cat} to="/courses" className="oa-category-card group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Icon size={23}/></div><ChevronRight size={19} className="text-slate-300 group-hover:translate-x-1 group-hover:text-blue-600"/></div><h3 className="mt-6 text-lg font-black">{cat}</h3><p className="mt-2 text-sm leading-6 text-slate-500">Explore published courses in this learning area.</p></Link>})}</div>:<div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><GraduationCap size={34} className="mx-auto text-slate-400"/><h3 className="mt-4 text-lg font-black">Categories will appear here soon</h3><p className="mt-2 text-slate-500">Publish courses to populate this section automatically.</p></div>}</div></section>

      <section className="relative overflow-hidden bg-[#061633] px-5 py-20 text-white sm:px-6 sm:py-24 lg:px-8"><div className="oa-grid absolute inset-0"/><div className="relative mx-auto max-w-7xl"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-black tracking-[.2em] text-blue-300 sm:text-sm">HOW IT WORKS</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">Start learning in three simple steps</h2><p className="mt-4 text-lg text-slate-400">Getting started with Online Academy is simple.</p></div><div className="mt-12 grid gap-5 md:grid-cols-3">{STEPS.map(([num,Icon,title,desc],i)=><div key={num} className="oa-step-card rounded-3xl border border-white/10 bg-white/[.05] p-7" style={{animationDelay:`${i*150}ms`}}><div className="flex items-center justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300"><Icon size={24}/></div><span className="text-5xl font-black text-white/[.06]">{num}</span></div><h3 className="mt-7 text-xl font-black">{title}</h3><p className="mt-3 leading-7 text-slate-400">{desc}</p></div>)}</div></div></section>

      <section className="bg-white px-5 py-20 sm:px-6 sm:py-24 lg:px-8"><div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">{BENEFITS.map(([Icon,title,desc])=><div key={title} className="rounded-3xl bg-slate-50 p-7 ring-1 ring-slate-200"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm"><Icon size={24}/></div><h3 className="mt-5 text-xl font-black">{title}</h3><p className="mt-3 leading-7 text-slate-600">{desc}</p></div>)}</div></section>

      <section className="px-5 pb-20 sm:px-6 sm:pb-24 lg:px-8"><div className="oa-cta relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] px-7 py-12 text-white shadow-2xl sm:px-12 sm:py-16"><div className="relative text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15"><GraduationCap size={29}/></div><h2 className="mt-6 text-3xl font-black sm:text-4xl">{user?"Continue your learning journey":"Ready to start your learning journey?"}</h2><p className="mx-auto mt-4 max-w-2xl text-lg leading-7 text-blue-100">{user?"Open your dashboard and continue learning from where you left off.":"Explore the academy, choose a course and keep building the skills that matter to you."}</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link to={user?"/dashboard":"/register"} className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-black text-blue-700 hover:bg-blue-50">{user?"Open Dashboard":"Create Free Account"}<ArrowRight size={18}/></Link><Link to="/courses" className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 font-black text-white hover:bg-white/10">Browse Courses</Link></div></div></div></section>
    </main>
  );
}

export default Home;
