import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowDownAZ, ArrowRight, BadgePercent, BookOpen, Clock3, GraduationCap, Heart, RefreshCw, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import CourseThumbnail from "../components/CourseThumbnail";

const CACHE_KEY = "online_academy_courses_v2";
const CACHE_TTL = 10 * 60 * 1000;
function money(value) { return `Rs. ${Number(value || 0).toLocaleString()}`; }
function safeArray(value) { return Array.isArray(value) ? value : []; }
function readCache() { try { const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); return cached?.courses && Array.isArray(cached.courses) ? cached.courses : []; } catch { return []; } }
function writeCache(courses) { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), courses })); } catch {} }

function CourseCard({ course, user, favorite, onToggleFavorite }) {
  const title = course.title || course.name || "Untitled Course";
  const price = Number(course.price || 0);
  const oldPrice = Number(course.oldPrice || 0);
  const paid = course.isPaid === true || price > 0;
  const discount = oldPrice > price && price > 0 ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
  return <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
    <div className="relative aspect-video w-full overflow-hidden bg-slate-950"><CourseThumbnail course={course} />{paid && <span className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-blue-700 shadow-sm">{money(price)}</span>}{discount > 0 && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-black text-white"><BadgePercent size={14} />{discount}% OFF</span>}<button type="button" onClick={() => onToggleFavorite(course.id)} className={`absolute bottom-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition ${favorite ? "border-red-200 bg-white text-red-500" : "border-white/40 bg-slate-950/60 text-white hover:bg-white hover:text-red-500"}`} aria-label={favorite ? `Remove ${title} from wishlist` : `Add ${title} to wishlist`} aria-pressed={favorite} title={favorite ? "Remove from wishlist" : "Add to wishlist"}><Heart size={18} fill={favorite ? "currentColor" : "none"} /></button></div>
    <div className="flex flex-1 flex-col p-5 sm:p-6"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-blue-600"><GraduationCap size={15} />{course.category || "Online Course"}</div><h2 className="mt-3 line-clamp-2 text-xl font-black leading-tight text-slate-900">{title}</h2><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{course.description || "Start learning with this structured online course."}</p>{(course.duration || course.level) && <div className="mt-5 flex flex-wrap gap-4 border-t border-slate-100 pt-5 text-sm text-slate-500">{course.duration && <span className="flex items-center gap-1.5"><Clock3 size={16} />{course.duration}</span>}{course.level && <span>{course.level}</span>}</div>}<div className="mt-auto grid gap-2 pt-6 sm:grid-cols-2"><Link to={user ? `/courses/${course.id}` : "/login"} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:border-blue-200 hover:text-blue-700">View Course <ArrowRight size={17} /></Link>{paid ? <Link to={user ? `/checkout?courseId=${encodeURIComponent(course.id)}` : "/login"} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-black text-white shadow-md shadow-blue-600/20">Buy Now <Sparkles size={16} /></Link> : <span className="inline-flex items-center justify-center rounded-xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">Free Course</span>}</div></div>
  </article>;
}

export default function Courses({ user }) {
  const favoritesKey = `online_academy_favorites_v1_${user?.uid || "guest"}`;
  const cachedCourses = useState(readCache)[0];
  const [courses, setCourses] = useState(cachedCourses);
  const [loading, setLoading] = useState(!cachedCourses.length);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("all");
  const [level, setLevel] = useState("all");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("newest");
  const [showFavorites, setShowFavorites] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState(() => { try { return JSON.parse(localStorage.getItem(favoritesKey) || "[]"); } catch { return []; } });

  useEffect(() => { try { localStorage.setItem(favoritesKey, JSON.stringify(favoriteIds)); } catch {} }, [favoriteIds, favoritesKey]);

  const loadCourses = useCallback(async ({ background = false } = {}) => {
    try {
      if (background || courses.length) setRefreshing(true); else setLoading(true);
      setError("");
      const snapshot = await getDocs(query(collection(db, "courses"), where("published", "==", true)));
      const next = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      setCourses(next); writeCache(next);
    } catch (err) {
      console.error("Courses loading error:", err);
      if (!courses.length) setError(err?.message || "Unable to load courses.");
    } finally { setLoading(false); setRefreshing(false); }
  }, [courses.length]);

  useEffect(() => {
    const cachedAt = (() => { try { return Number(JSON.parse(localStorage.getItem(CACHE_KEY) || "null")?.timestamp || 0); } catch { return 0; } })();
    loadCourses({ background: Boolean(courses.length) });
    if (cachedAt && Date.now() - cachedAt < CACHE_TTL) return undefined;
    return undefined;
  }, []);

  const categories = useMemo(() => [...new Set(safeArray(courses).map((course) => String(course.category || "Online Course").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [courses]);
  const levels = useMemo(() => [...new Set(safeArray(courses).map((course) => String(course.level || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [courses]);
  const toggleFavorite = useCallback((courseId) => setFavoriteIds((current) => current.includes(courseId) ? current.filter((id) => id !== courseId) : [...current, courseId]), []);
  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const result = safeArray(courses).filter((course) => {
      const matchesSearch = !term || [course.title, course.description, course.category, course.level].some((v) => String(v || "").toLowerCase().includes(term));
      const matchesCategory = category === "all" || String(course.category || "Online Course") === category;
      const matchesLevel = level === "all" || String(course.level || "") === level;
      const price = Number(course.price || 0); const paid = course.isPaid === true || price > 0;
      const matchesType = type === "all" || (type === "free" && !paid) || (type === "paid" && paid);
      const matchesFavorites = !showFavorites || favoriteIds.includes(course.id);
      return matchesSearch && matchesCategory && matchesLevel && matchesType && matchesFavorites;
    });
    return result.sort((a, b) => {
      if (sort === "title") return String(a.title || "").localeCompare(String(b.title || ""));
      if (sort === "price-low") return Number(a.price || 0) - Number(b.price || 0);
      if (sort === "price-high") return Number(b.price || 0) - Number(a.price || 0);
      if (sort === "popular") return Number(b.studentsCount || b.enrolledCount || 0) - Number(a.studentsCount || a.enrolledCount || 0);
      const dateA = typeof a.createdAt?.toMillis === "function" ? a.createdAt.toMillis() : Date.parse(a.createdAt || "") || 0;
      const dateB = typeof b.createdAt?.toMillis === "function" ? b.createdAt.toMillis() : Date.parse(b.createdAt || "") || 0;
      return dateB - dateA;
    });
  }, [category, courses, favoriteIds, level, searchTerm, showFavorites, sort, type]);
  const resetFilters = () => { setSearchTerm(""); setCategory("all"); setLevel("all"); setType("all"); setSort("newest"); setShowFavorites(false); };

  if (loading) return <main className="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-12"><div className="mx-auto max-w-7xl"><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map((i) => <div key={i} className="h-96 animate-pulse rounded-3xl bg-white ring-1 ring-slate-200" />)}</div></div></main>;
  if (error) return <main className="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-16"><div className="mx-auto max-w-2xl rounded-3xl bg-white p-10 text-center shadow-sm"><AlertCircle className="mx-auto text-red-500" size={38} /><h1 className="mt-5 text-xl font-black">Unable to load courses</h1><p className="mt-2 text-sm text-slate-500">{error}</p><button onClick={() => loadCourses()} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"><RefreshCw size={17} />Try Again</button></div></main>;
  const filtersActive = Boolean(searchTerm || category !== "all" || level !== "all" || type !== "all" || showFavorites || sort !== "newest");
  return <main className="min-h-[calc(100vh-72px)] bg-slate-50"><section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-black uppercase tracking-wider text-blue-600">Explore Courses</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Learn new skills. Build your future.</h1><p className="mt-3 max-w-2xl text-slate-600">Choose free courses or securely purchase premium courses with discounts.</p></div><div className="relative w-full lg:w-80"><Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search courses..." aria-label="Search courses" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" /></div></div>
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-end"><div className="flex items-center gap-2 text-sm font-black text-slate-800"><SlidersHorizontal size={18} className="text-blue-600" /> Filters</div><label className="flex-1 text-xs font-black uppercase tracking-wide text-slate-400">Category<select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold normal-case tracking-normal text-slate-700 outline-none focus:border-blue-500"><option value="all">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="flex-1 text-xs font-black uppercase tracking-wide text-slate-400">Level<select value={level} onChange={(e) => setLevel(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold normal-case tracking-normal text-slate-700 outline-none focus:border-blue-500"><option value="all">All levels</option>{levels.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="flex-1 text-xs font-black uppercase tracking-wide text-slate-400">Type<select value={type} onChange={(e) => setType(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold normal-case tracking-normal text-slate-700 outline-none focus:border-blue-500"><option value="all">Free & Paid</option><option value="free">Free only</option><option value="paid">Paid only</option></select></label><label className="flex-1 text-xs font-black uppercase tracking-wide text-slate-400">Sort<select value={sort} onChange={(e) => setSort(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold normal-case tracking-normal text-slate-700 outline-none focus:border-blue-500"><option value="newest">Newest</option><option value="popular">Most popular</option><option value="title">Title A–Z</option><option value="price-low">Price: Low to high</option><option value="price-high">Price: High to low</option></select></label><button type="button" onClick={() => setShowFavorites((value) => !value)} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-black transition ${showFavorites ? "border-red-200 bg-red-50 text-red-600" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-red-200 hover:text-red-600"}`} aria-pressed={showFavorites}><Heart size={17} fill={showFavorites ? "currentColor" : "none"} /> Wishlist ({favoriteIds.length})</button>{filtersActive && <button type="button" onClick={resetFilters} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-500 hover:bg-slate-50"><X size={16} /> Clear</button>}</div></div>
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500"><span>{filtered.length} {filtered.length === 1 ? "course" : "courses"}</span><span className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 font-bold ring-1 ring-slate-200"><ArrowDownAZ size={15} className="text-blue-600" /> Secure PKR checkout</span>{refreshing && <span className="text-xs font-bold text-blue-600">Updating…</span>}</div>
    <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((course) => <CourseCard key={course.id} course={course} user={user} favorite={favoriteIds.includes(course.id)} onToggleFavorite={toggleFavorite} />)}</div>
    {filtered.length === 0 && <div className="mt-6 rounded-3xl bg-white p-14 text-center ring-1 ring-slate-200"><BookOpen className="mx-auto text-slate-300" size={42} /><h2 className="mt-4 font-black text-slate-900">No matching courses</h2><p className="mt-2 text-sm text-slate-500">Try another search or clear the filters to see all available courses.</p><button type="button" onClick={resetFilters} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"><RefreshCw size={17} /> Show all courses</button></div>}
  </section></main>;
}
