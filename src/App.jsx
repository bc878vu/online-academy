import { lazy, Suspense, useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { Award, BadgePercent, BookOpen, ChevronRight, CreditCard, Home, LayoutDashboard, LogOut, Menu, ShieldCheck, User, X } from "lucide-react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";

const HomePage = lazy(() => import("./pages/Home"));
const Courses = lazy(() => import("./pages/Courses"));
const CourseDetails = lazy(() => import("./pages/CourseDetails"));
const CourseAssessments = lazy(() => import("./pages/CourseAssessments"));
const LectureProgressGuard = lazy(() => import("./pages/LectureProgressGuard"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const AdminCourses = lazy(() => import("./pages/AdminCourses"));
const AdminAssessments = lazy(() => import("./pages/AdminAssessments"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const TermsPolicy = lazy(() => import("./pages/TermsPolicy"));
const Certificate = lazy(() => import("./pages/Certificate"));
const VerifyCertificate = lazy(() => import("./pages/VerifyCertificate"));
const Checkout = lazy(() => import("./pages/Checkout"));
const PaymentResult = lazy(() => import("./pages/PaymentResult"));
const AdminCommerce = lazy(() => import("./pages/AdminCommerce"));
const AdminDiscounts = lazy(() => import("./pages/AdminDiscounts"));

const ADMIN_EMAIL = "admin@onlineacademy.com";

function Brand({ className = "h-10 w-10" }) { return <img src="/favicon.svg" alt="Online Academy" className={`rounded-xl object-contain ${className}`} />; }
function Loader({ text = "Loading..." }) { return <div className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-slate-50"><div className="text-center"><Brand className="mx-auto h-14 w-14" /><div className="mx-auto mt-5 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" /><p className="mt-3 text-sm font-semibold text-slate-500">{text}</p></div></div>; }
function Protected({ user, children }) { if (user === undefined) return <Loader text="Checking your account..." />; return user ? children : <Navigate to="/login" replace />; }
function AuthOnly({ user, children }) { if (user === undefined) return <Loader />; return user ? <Navigate to="/dashboard" replace /> : children; }
function AdminOnly({ user, isAdmin, children }) { if (user === undefined) return <Loader text="Checking admin access..." />; return user && isAdmin ? children : <Navigate to="/admin-login" replace />; }
function CourseRoute() { const { courseId } = useParams(); return <LectureProgressGuard><CourseDetails /><CourseAssessments courseId={courseId} /></LectureProgressGuard>; }

function Navbar({ user, isAdmin }) {
  const location = useLocation(); const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [location.pathname]);
  const active = (path) => path === "/" ? location.pathname === "/" : location.pathname === path || location.pathname.startsWith(`${path}/`);
  const logout = async () => { try { await signOut(auth); } catch (error) { console.error(error); } };
  const displayName = user?.displayName || user?.email?.split("@")[0] || "Student";
  const initials = displayName.split(" ").filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "S";
  const links = [["/", "Home", Home], ["/courses", "Courses", BookOpen], ["/certificate", "Certificate", Award], ["/verify-certificate", "Verify", ShieldCheck]];
  return <>
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl"><div className="mx-auto max-w-[1480px] px-3 sm:px-5 lg:px-8"><nav className="flex min-h-[72px] items-center gap-3"><Link to="/" className="flex min-w-0 flex-1 items-center gap-3"><Brand className="h-11 w-11" /><span><span className="block text-[17px] font-black text-slate-950 sm:text-lg">Online Academy</span><span className="hidden text-[9px] font-bold tracking-[0.12em] text-slate-400 sm:block">LEARN. GROW. <span className="text-blue-600">SUCCEED.</span></span></span></Link><div className="hidden items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 lg:flex">{links.map(([to, label, Icon]) => <Link key={to} to={to} className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-extrabold ${active(to) ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-blue-700"}`}><Icon size={16} />{label}</Link>)}</div><div className="ml-auto flex items-center gap-2">{user ? <Link to="/dashboard" className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-3.5 text-sm font-extrabold text-white shadow-md shadow-blue-600/20"><LayoutDashboard size={17} /><span className="hidden sm:inline">Dashboard</span></Link> : <Link to="/login" className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white">Login <ChevronRight size={16} /></Link>}{user && <Link to="/profile" className="hidden h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-xs font-black text-slate-600 lg:flex">{initials}</Link>}<button onClick={() => setOpen((v) => !v)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 lg:hidden" aria-label="Menu">{open ? <X /> : <Menu />}</button></div></nav><div className="flex gap-1 overflow-x-auto pb-2 lg:hidden">{links.slice(0, 3).map(([to, label, Icon]) => <Link key={to} to={to} className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold ${active(to) ? "border-blue-100 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}><Icon size={14} />{label}</Link>)}</div></div></header>
    {open && <div className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden" onClick={() => setOpen(false)}><aside className="absolute right-0 top-0 h-full w-[min(390px,100%)] bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between border-b border-slate-100 pb-4"><div className="flex items-center gap-3"><Brand /><div><p className="font-black">Online Academy</p><p className="text-[10px] text-slate-400">LEARN. GROW. SUCCEED.</p></div></div><button onClick={() => setOpen(false)} className="rounded-xl border p-2"><X size={20} /></button></div><div className="mt-4 space-y-1">{links.map(([to, label, Icon]) => <Link key={to} to={to} className="flex min-h-12 items-center gap-3 rounded-xl px-3 font-bold text-slate-700 hover:bg-slate-50"><Icon size={19} />{label}</Link>)}{user && <><Link to="/dashboard" className="flex min-h-12 items-center gap-3 rounded-xl px-3 font-bold text-slate-700"><LayoutDashboard size={19} />Dashboard</Link><Link to="/profile" className="flex min-h-12 items-center gap-3 rounded-xl px-3 font-bold text-slate-700"><User size={19} />My Profile</Link></>}{isAdmin && <><Link to="/admin" className="flex min-h-12 items-center gap-3 rounded-xl px-3 font-bold text-slate-700"><ShieldCheck size={19} />Admin Courses</Link><Link to="/admin/commerce" className="flex min-h-12 items-center gap-3 rounded-xl px-3 font-bold text-slate-700"><CreditCard size={19} />Paid Courses</Link><Link to="/admin/discounts" className="flex min-h-12 items-center gap-3 rounded-xl px-3 font-bold text-slate-700"><BadgePercent size={19} />Discounts</Link></>}{user && <button onClick={logout} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 font-bold text-red-600"><LogOut size={19} />Logout</button>}</div></aside></div>}
  </>;
}
function Footer() { return <footer className="border-t border-slate-200 bg-white"><div className="mx-auto max-w-7xl px-4 py-7 text-center text-xs text-slate-400">© {new Date().getFullYear()} Online Academy. All rights reserved.</div></footer>; }

export default function App() {
  const [user, setUser] = useState(undefined); const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => onAuthStateChanged(auth, (currentUser) => { setUser(currentUser); setIsAdmin(currentUser?.email?.trim().toLowerCase() === ADMIN_EMAIL); }), []);
  if (user === undefined) return <Loader text="Loading Online Academy..." />;
  return <div className="flex min-h-screen flex-col bg-slate-50"><Navbar user={user} isAdmin={isAdmin} /><main className="min-w-0 flex-1"><Suspense fallback={<Loader text="Loading page..." />}><Routes>
    <Route path="/" element={<HomePage />} /><Route path="/courses" element={<Courses user={user} />} /><Route path="/courses/:courseId" element={<CourseRoute />} />
    <Route path="/checkout" element={<Protected user={user}><Checkout /></Protected>} />
    <Route path="/payment/success" element={<Protected user={user}><PaymentResult /></Protected>} />
    <Route path="/payment/failed" element={<Protected user={user}><PaymentResult failed /></Protected>} />
    <Route path="/certificate" element={<Certificate />} /><Route path="/verify-certificate" element={<VerifyCertificate />} /><Route path="/terms" element={<TermsPolicy />} />
    <Route path="/login" element={<AuthOnly user={user}><Login /></AuthOnly>} /><Route path="/register" element={<AuthOnly user={user}><Register /></AuthOnly>} /><Route path="/forgot-password" element={<AuthOnly user={user}><ForgotPassword /></AuthOnly>} /><Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/admin-login" element={<AdminLogin user={user} isAdmin={isAdmin} adminLoading={false} />} /><Route path="/dashboard" element={<Protected user={user}><Dashboard /></Protected>} /><Route path="/profile" element={<Protected user={user}><Profile /></Protected>} />
    <Route path="/admin" element={<AdminOnly user={user} isAdmin={isAdmin}><AdminCourses /></AdminOnly>} /><Route path="/admin/assessments" element={<AdminOnly user={user} isAdmin={isAdmin}><AdminAssessments /></AdminOnly>} /><Route path="/admin/commerce" element={<AdminOnly user={user} isAdmin={isAdmin}><AdminCommerce /></AdminOnly>} /><Route path="/admin/discounts" element={<AdminOnly user={user} isAdmin={isAdmin}><AdminDiscounts /></AdminOnly>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense></main><Footer /></div>;
}
