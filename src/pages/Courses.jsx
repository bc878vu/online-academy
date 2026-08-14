import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, BadgePercent, BookOpen, Clock3, GraduationCap, RefreshCw, Search, Sparkles } from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

function money(value) { return `Rs. ${Number(value || 0).toLocaleString()}`; }

function getCourseImage(course) {
  if (course?.imageUrl || course?.image || course?.thumbnail) return course.imageUrl || course.image || course.thumbnail;
  const firstLessonThumbnail = Array.isArray(course?.lessons)
    ? course.lessons.find((lesson) => lesson?.thumbnailUrl || lesson?.thumbnail)?.thumbnailUrl || course.lessons.find((lesson) => lesson?.thumbnail)?.thumbnail
    : "";
  return firstLessonThumbnail || "";
}

function CourseCard({ course, user }) {
  const title = course.title || course.name || "Untitled Course";
  const image = getCourseImage(course);
  const price = Number(course.price || 0);
  const oldPrice = Number(course.oldPrice || 0);
  const paid = course.isPaid === true || price > 0;
  const discount = oldPrice > price && price > 0 ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;

  return <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-800">{image ? <img src={image} alt={title} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center"><BookOpen size={54} className="text-white/90" /></div>}{paid && <span className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-blue-700 shadow-sm">{money(price)}</span>}{discount > 0 && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-black text-white"><BadgePercent size={14} />{discount}% OFF</span>}</div>
    <div className="flex flex-1 flex-col p-5 sm:p-6"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-blue-600"><GraduationCap size={15} />{course.category || "Online Course"}</div><h2 className="mt-3 line-clamp-2 text-xl font-black leading-tight text-slate-900">{title}</h2><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{course.description || "Start learning with this structured online course."}</p>{(course.duration || course.level) && <div className="mt-5 flex flex-wrap gap-4 border-t border-slate-100 pt-5 text-sm text-slate-500">{course.duration && <span className="flex items-center gap-1.5"><Clock3 size={16} />{course.duration}</span>}{course.level && <span>{course.level}</span>}</div>}
      <div className="mt-auto grid gap-2 pt-6 sm:grid-cols-2"><Link to={user ? `/courses/${course.id}` : "/login"} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:border-blue-200 hover:text-blue-700">View Course <ArrowRight size={17} /></Link>{paid ? <Link to={user ? `/checkout?courseId=${encodeURIComponent(course.id)}` : "/login"} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-black text-white shadow-md shadow-blue-600/20">Buy Now <Sparkles size={16} /></Link> : <span className="inline-flex items-center justify-center rounded-xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">Free Course</span>}</div>
    </div>
  </article>;
}

export default function Courses({ user }) {
  const [courses, setCourses] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [searchTerm, setSearchTerm] = useState("");
  const loadCourses = useCallback(async () => { try { setLoading(true); setError(""); const snapshot = await getDocs(query(collection(db, "courses"), where("published", "==", true))); setCourses(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))); } catch (err) { console.error("Courses loading error:", err); setError(err?.message || "Unable to load courses."); } finally { setLoading(false); } }, []);
  useEffect(() => { loadCourses(); }, [loadCourses]);
  const filtered = useMemo(() => { const term = searchTerm.trim().toLowerCase(); if (!term) return courses; return courses.filter((course) => [course.title, course.description, course.category].some((v) => String(v || "").toLowerCase().includes(term))); }, [courses, searchTerm]);

  if (loading) return <main className="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-12"><div className="mx-auto max-w-7xl"><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map((i) => <div key={i} className="h-96 animate-pulse rounded-3xl bg-white ring-1 ring-slate-200" />)}</div></div></main>;
  if (error) return <main className="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-16"><div className="mx-auto max-w-2xl rounded-3xl bg-white p-10 text-center shadow-sm"><AlertCircle className="mx-auto text-red-500" size={38} /><h1 className="mt-5 text-xl font-black">Unable to load courses</h1><p className="mt-2 text-sm text-slate-500">{error}</p><button onClick={loadCourses} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"><RefreshCw size={17} />Try Again</button></div></main>;

  return <main className="min-h-[calc(100vh-72px)] bg-slate-50"><section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-black uppercase tracking-wider text-blue-600">Explore Courses</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Learn new skills. Build your future.</h1><p className="mt-3 max-w-2xl text-slate-600">Choose free courses or securely purchase premium courses with discounts.</p></div><div className="relative w-full lg:w-80"><Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search courses..." className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" /></div></div><div className="mt-8 flex items-center justify-between text-sm text-slate-500"><span>{filtered.length} {filtered.length === 1 ? "course" : "courses"}</span><span className="rounded-xl bg-white px-3 py-2 font-bold ring-1 ring-slate-200">Secure PKR checkout</span></div><div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((course) => <CourseCard key={course.id} course={course} user={user} />)}</div>{filtered.length === 0 && <div className="mt-6 rounded-3xl bg-white p-14 text-center ring-1 ring-slate-200"><BookOpen className="mx-auto text-slate-300" size={42} /><h2 className="mt-4 font-black text-slate-900">No matching courses</h2></div>}</section></main>;
}
