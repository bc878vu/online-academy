import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Clock3, CreditCard, LockKeyhole, LogIn, PlayCircle, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";

const ADMIN_UID = "CDwCqUitlaSHEVeWQufCb0lXzMx1";
const PREVIEW_SECONDS = 15;

function isPaidCourse(course) { const price = Number(course?.price || 0); return course?.isPaid === true || price > 0; }

function PreviewPlayer({ lesson }) {
  const [ended, setEnded] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const videoUrl = String(lesson?.videoUrl || "").trim();
  const youtubeId = useMemo(() => { try { const url = new URL(videoUrl); const host = url.hostname.replace(/^www\./, ""); if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || ""; if (["youtube.com", "youtube-nocookie.com"].includes(host)) { const parts = url.pathname.split("/").filter(Boolean); if (parts[0] === "watch") return url.searchParams.get("v") || ""; if (["embed", "shorts", "live"].includes(parts[0])) return parts[1] || ""; } } catch {} return ""; }, [videoUrl]);
  if (!videoUrl) return <div className="flex aspect-video items-center justify-center bg-slate-950 text-sm font-bold text-slate-400">Preview unavailable</div>;
  if (youtubeId) return <div className="relative aspect-video overflow-hidden bg-black"><iframe title="Course preview" className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${youtubeId}?enablejsapi=1&playsinline=1&controls=1&rel=0&start=0&end=${PREVIEW_SECONDS}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" /><div className="pointer-events-none absolute left-3 top-3 rounded-full bg-slate-950/80 px-3 py-1.5 text-xs font-black text-white backdrop-blur">15-second preview</div></div>;
  return <div className="relative aspect-video overflow-hidden bg-black"><video src={videoUrl} controls={!ended} playsInline preload="metadata" className="h-full w-full object-contain" onTimeUpdate={(event) => { const value = Math.min(PREVIEW_SECONDS, event.currentTarget.currentTime || 0); setSeconds(value); if (event.currentTarget.currentTime >= PREVIEW_SECONDS) { event.currentTarget.pause(); event.currentTarget.currentTime = PREVIEW_SECONDS; setEnded(true); } }} /><div className="pointer-events-none absolute left-3 top-3 rounded-full bg-slate-950/80 px-3 py-1.5 text-xs font-black text-white backdrop-blur">Preview {Math.floor(seconds)}s / {PREVIEW_SECONDS}s</div>{ended && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/65 p-6 text-center backdrop-blur-sm"><div><LockKeyhole className="mx-auto text-blue-300" size={34} /><p className="mt-3 font-black text-white">Preview finished</p><p className="mt-1 text-xs font-semibold text-slate-300">Purchase the course to continue watching.</p></div></div>}</div>;
}

function LockedCourse({ course, user }) {
  const firstLesson = Array.isArray(course?.lessons) ? [...course.lessons].sort((a, b) => (Number(a?.order) || 0) - (Number(b?.order) || 0))[0] : null;
  const price = Number(course?.price || 0);
  const oldPrice = Number(course?.oldPrice || 0);
  return <main className="min-h-[calc(100vh-76px)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-900/5"><div className="grid lg:grid-cols-[1.05fr_.95fr]"><div className="bg-slate-950 p-5 sm:p-7 lg:p-9"><div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl"><PreviewPlayer lesson={firstLesson} /></div><div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-black"><span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-3 py-1.5 text-blue-300 ring-1 ring-blue-400/20"><PlayCircle size={14} /> Free preview</span><span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-slate-300"><Clock3 size={14} /> First lesson preview only</span></div></div><div className="p-6 sm:p-8 lg:p-10"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.15em] text-blue-600"><LockKeyhole size={16} /> Paid course</div><h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{course?.title || "Course"}</h1><p className="mt-4 leading-7 text-slate-600">{course?.description || "Purchase this course to unlock all lessons and learning features."}</p><div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-4"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wider text-blue-700">Course access</p><p className="mt-1 text-sm font-semibold text-slate-600">Full course unlock after verified payment.</p></div><div className="text-right"><p className="text-2xl font-black text-blue-700">Rs. {price.toLocaleString()}</p>{oldPrice > price && <p className="text-xs font-bold text-slate-400 line-through">Rs. {oldPrice.toLocaleString()}</p>}</div></div></div><div className="mt-6 space-y-3">{["All course lessons unlocked", "Progress & attendance tracking", "Assessments and completion features", "Certificate eligibility when requirements are met"].map((item) => <div key={item} className="flex items-center gap-3 text-sm font-bold text-slate-700"><CheckCircle2 size={18} className="shrink-0 text-emerald-500" />{item}</div>)}</div>{user ? <Link to={`/checkout?courseId=${encodeURIComponent(course.id)}`} className="mt-8 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700"><CreditCard size={19} /> Purchase & Unlock Full Course <ArrowRight size={18} /></Link> : <Link to={`/login?redirect=${encodeURIComponent(`/courses/${course.id}`)}`} className="mt-8 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"><LogIn size={19} /> Login to Purchase</Link>}<div className="mt-5 grid gap-3 text-xs font-bold text-slate-500 sm:grid-cols-2"><div className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-600" /> Verified payment required</div><div className="flex items-center gap-2"><LockKeyhole size={16} className="text-blue-600" /> Full lessons locked</div></div><p className="mt-5 text-center text-[11px] leading-5 text-slate-400">A paid course cannot be opened fully until a successful order is recorded as <strong>paid</strong>.</p></div></div></div></main>;
}

export default function PaidCourseGate({ courseId, children }) {
  const [user, setUser] = useState(undefined), [course, setCourse] = useState(null), [hasPaid, setHasPaid] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState("");
  useEffect(() => onAuthStateChanged(auth, (currentUser) => setUser(currentUser)), []);
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!courseId) { setError("Course not found."); setLoading(false); return; }
      setLoading(true); setError("");
      try {
        const courseSnap = await getDoc(doc(db, "courses", courseId));
        if (!courseSnap.exists()) throw new Error("Course not found.");
        const courseData = { id: courseSnap.id, ...courseSnap.data() };
        if (!active) return;
        setCourse(courseData);
        if (!isPaidCourse(courseData) || user?.uid === ADMIN_UID) { setHasPaid(true); return; }
        if (!user) { setHasPaid(false); return; }
        const orderSnap = await getDocs(query(collection(db, "orders"), where("userId", "==", user.uid)));
        const paidForCourse = orderSnap.docs.some((item) => { const order = item.data() || {}; return order.courseId === courseId && order.status === "paid"; });
        if (active) setHasPaid(paidForCourse);
      } catch (e) {
        console.error("Course access check error:", e);
        if (active) { setHasPaid(false); setError(e?.code === "permission-denied" ? "Course access could not be verified. Please refresh or contact support." : e?.message || "Unable to verify course access."); }
      } finally { if (active) setLoading(false); }
    };
    load();
    return () => { active = false; };
  }, [courseId, user]);
  if (loading || user === undefined) return <div className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-slate-50"><div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" /></div>;
  if (!course) return <div className="mx-auto max-w-xl px-4 py-16 text-center"><p className="font-bold text-red-600">{error || "Course not found."}</p><Link to="/courses" className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">Back to Courses</Link></div>;
  if (hasPaid) return children;
  return <LockedCourse course={course} user={user} />;
}
