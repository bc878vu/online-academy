import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { ArrowRight, Award, BarChart3, BookOpen, CheckCircle2, Clock3, GraduationCap, Laptop, PlayCircle, ShieldCheck, Sparkles, Star, Target, Users } from "lucide-react";
import { auth, db } from "../firebase";

const COURSE_COLLECTION = "courses";

const benefits = [
  [BookOpen, "Structured Courses", "Organized lessons and learning resources in one simple place."],
  [BarChart3, "Progress Tracking", "See completed lessons and continue your learning journey."],
  [Laptop, "Learn Anywhere", "Use your phone, tablet or computer whenever it suits you."],
  [ShieldCheck, "Secure Learning", "Your account and learning progress stay connected to your profile."],
];

const fallbackCourses = [
  { id: "preview-1", title: "Explore Our Courses", description: "Choose a structured course and start learning at your own pace.", category: "Featured Learning", level: "All Levels", duration: "Self-paced" },
  { id: "preview-2", title: "Build Practical Skills", description: "Learn with organized lessons, resources and progress tracking.", category: "Skill Development", level: "All Levels", duration: "Flexible" },
  { id: "preview-3", title: "Track Your Progress", description: "Continue from where you stopped and complete your learning goals.", category: "Learning Journey", level: "All Levels", duration: "Anytime" },
];

function Home() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const isLoggedIn = Boolean(auth.currentUser);

  useEffect(() => {
    let mounted = true;
    getDocs(collection(db, COURSE_COLLECTION))
      .then((snap) => {
        if (!mounted) return;
        setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((c) => c.published !== false));
      })
      .catch((err) => console.error("Home courses:", err))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const featured = useMemo(() => courses.length ? courses.slice(0, 3) : fallbackCourses, [courses]);
  const lessons = useMemo(() => courses.reduce((n, c) => n + (Array.isArray(c.lessons) ? c.lessons.length : 0), 0), [courses]);
  const areas = useMemo(() => new Set(courses.map((c) => c.category).filter(Boolean)).size, [courses]);

  const statItems = [
    [BookOpen, courses.length || "—", "Available Courses"],
    [PlayCircle, lessons || "—", "Lessons"],
    [Target, areas || "—", "Learning Areas"],
    [Clock3, "24/7", "Learning Access"],
  ];

  return (
    <main className="overflow-hidden bg-slate-50 text-slate-900">
      <section className="relative isolate overflow-hidden bg-[#06152f] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(37,99,235,.28),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(245,194,72,.13),transparent_28%),linear-gradient(135deg,#06152f,#0a2551_55%,#071a39)]" />
        <div className="absolute -right-32 top-10 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -left-40 bottom-0 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-14 sm:px-6 lg:px-8 lg:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[.18em] text-blue-200 backdrop-blur"><Sparkles size={15}/> Learn • Grow • Succeed</div>
              <h1 className="mt-7 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">Learn new skills.<span className="mt-2 block bg-gradient-to-r from-blue-300 via-blue-400 to-amber-300 bg-clip-text text-transparent">Build your future.</span></h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">A modern learning platform for structured courses, practical knowledge and measurable progress — available whenever you are ready to learn.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/courses" className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold shadow-xl shadow-blue-950/40 transition hover:-translate-y-0.5 hover:bg-blue-500">Explore Courses<ArrowRight size={17} className="transition-transform group-hover:translate-x-1"/></Link>
                <Link to={isLoggedIn ? "/dashboard" : "/register"} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-bold backdrop-blur transition hover:bg-white/10">{isLoggedIn ? "Go to Dashboard" : "Create Account"}<ArrowRight size={17}/></Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300">
                {["Self-paced learning", "Progress tracking", "Mobile friendly"].map((x) => <span key={x} className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-300"/>{x}</span>)}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:justify-self-end">
              <div className="rounded-[2rem] border border-white/15 bg-white/[.07] p-3 shadow-2xl backdrop-blur-xl sm:p-4">
                <div className="overflow-hidden rounded-[1.45rem] bg-white text-slate-900 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><GraduationCap size={24}/></div><div><p className="font-extrabold">Online Academy</p><p className="text-xs text-slate-500">Student learning portal</p></div></div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">ACTIVE</span>
                  </div>
                  <div className="p-5 sm:p-6">
                    <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-slate-50 p-5 ring-1 ring-blue-100">
                      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">Your learning journey</p><h2 className="mt-2 text-xl font-black sm:text-2xl">Learn at your own pace</h2><p className="mt-2 text-sm leading-6 text-slate-600">Choose a course, complete lessons and build your skills step by step.</p></div><div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-white text-amber-500 shadow-sm sm:flex"><Award size={25}/></div></div>
                      <div className="mt-5 h-2 overflow-hidden rounded-full bg-blue-100"><div className="h-full w-3/4 rounded-full bg-gradient-to-r from-blue-600 to-blue-400"/></div>
                      <div className="mt-2 flex justify-between text-xs font-semibold text-slate-500"><span>Learning progress</span><span className="text-blue-700">75%</span></div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      {[[BookOpen, courses.length || "—", "Courses"],[PlayCircle, lessons || "—", "Lessons"],[Target, areas || "—", "Areas"]].map(([Icon,value,label]) => <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4"><Icon size={19} className="text-blue-700"/><p className="mt-2 text-lg font-black">{loading ? "…" : value}</p><p className="text-[11px] text-slate-500">{label}</p></div>)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 -mt-7 px-5 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:grid-cols-4">
          {statItems.map(([Icon,value,label],i) => <div key={label} className={`flex items-center gap-3 px-4 py-5 sm:justify-center sm:px-6 ${i > 1 ? "border-t sm:border-t-0" : ""} ${i % 2 ? "border-l" : ""} sm:border-l ${i === 0 ? "sm:border-l-0" : ""}`}><div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 sm:flex"><Icon size={19}/></div><div><p className="text-xl font-black">{loading ? "…" : value}</p><p className="text-[11px] font-semibold text-slate-500 sm:text-xs">{label}</p></div></div>)}
        </div>
      </section>

      <section className="px-5 pb-6 pt-20 sm:px-6 lg:px-8 lg:pt-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-end"><div><p className="text-xs font-black uppercase tracking-[.2em] text-blue-700">Why Online Academy</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Everything you need to learn, in one place.</h2></div><p className="max-w-2xl text-base leading-7 text-slate-600 lg:justify-self-end">Simple navigation, focused course content and progress tools keep your learning experience organized instead of overwhelming.</p></div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{benefits.map(([Icon,title,text]) => <div key={title} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white"><Icon size={21}/></div><h3 className="mt-5 font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>)}</div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-[.2em] text-blue-700">Featured learning</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Start with a course that fits you.</h2><p className="mt-3 text-slate-600">Browse the latest available courses and continue learning from any device.</p></div><Link to="/courses" className="inline-flex w-fit items-center gap-2 text-sm font-extrabold text-blue-700">View all courses<ArrowRight size={17}/></Link></div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {featured.map((course,index) => <Link key={course.id} to={course.id.startsWith("preview-") ? "/courses" : `/courses/${course.id}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">
              <div className="relative flex h-40 items-end overflow-hidden bg-gradient-to-br from-[#0b3b8f] via-blue-700 to-slate-900 p-5">{course.imageUrl ? <img src={course.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105"/> : <><div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-300/20 blur-2xl"/><div className="absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-amber-300/15 blur-2xl"/></>}<div className="relative flex w-full items-center justify-between"><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">{course.category || "Learning"}</span><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white"><GraduationCap size={20}/></span></div></div>
              <div className="p-5"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-blue-700">{course.level || "All Levels"}</span><span className="flex items-center gap-1 text-xs text-slate-500"><Clock3 size={13}/>{course.duration || "Self-paced"}</span></div><h3 className="mt-3 line-clamp-1 text-xl font-black">{course.title || `Course ${index + 1}`}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{course.description || "Explore this course and begin your learning journey."}</p><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-extrabold text-blue-700"><span>View course</span><ArrowRight size={17} className="transition-transform group-hover:translate-x-1"/></div></div>
            </Link>)}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-black uppercase tracking-[.2em] text-blue-700">Simple process</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">Your learning journey in three steps.</h2></div><div className="mt-12 grid gap-5 md:grid-cols-3">
          [["01",Users,"Create your account","Set up your profile and access your personal learning area."],["02",BookOpen,"Choose a course","Explore available courses and select what you want to learn."],["03",PlayCircle,"Learn & track","Complete lessons, follow your progress and keep improving."]].map(([n,Icon,title,text]) => <div key={n} className="rounded-2xl border border-slate-200 bg-slate-50 p-6"><span className="text-4xl font-black text-blue-100">{n}</span><div className="mt-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-white"><Icon size={20}/></div><h3 className="mt-5 text-lg font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>)}
        </div></div>
      </section>

      <section className="px-5 py-16 sm:px-6 lg:px-8 lg:py-20"><div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#071b3a] px-6 py-12 text-white shadow-2xl sm:px-10 lg:px-14"><div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"/><div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl"/><div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center"><div className="max-w-2xl"><div className="flex items-center gap-2 text-sm font-bold text-amber-200"><Star size={16} fill="currentColor"/> Keep moving forward</div><h2 className="mt-3 text-3xl font-black sm:text-4xl">Ready to start learning?</h2><p className="mt-3 leading-7 text-slate-300">Explore the academy, choose your course and build your next skill with a clear learning path.</p></div><Link to={isLoggedIn ? "/dashboard" : "/courses"} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-black text-[#0b3b8f] shadow-xl transition hover:-translate-y-0.5 hover:bg-blue-50">{isLoggedIn ? "Open Dashboard" : "Explore Courses"}<ArrowRight size={17}/></Link></div></div></section>
    </main>
  );
}

export default Home;
