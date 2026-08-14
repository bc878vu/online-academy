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

function Brand({ className = "h-10 w-10" }) {
  return <img src="/favicon.svg" alt="Online Academy" className={`rounded-xl object-contain ${className}`} />;
}

function Loader({ text = "Loading..." }) {
  return <div className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-slate-50"><div className="text-center"><Brand className="mx-auto h-14 w-14" /><div className="mx-auto mt-5 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" /><p className="mt-3 text-sm font-semibold text-slate-500">{text}</p></div></div>;
}

function Protected({ user, children }) { if (user === undefined) return <Loader text="Checking your account..." />; return user ? children : <Navigate to="/login" replace />; }
function AuthOnly({ user, children }) { if (user === undefined) return <Loader />; return user ? <Navigate to="/dashboard" replace /> : children; }
function AdminOnly({ user, isAdmin, children }) { if (user === undefined) return <Loader text="Checking admin access..." />; return user && isAdmin ? children : <Navigate to="/admin-login" replace />; }
function CourseRoute() { const { courseId } = useParams(); return <LectureProgressGuard><CourseDetails /><CourseAssessments courseId={courseId} /></LectureProgressGuard>; }

function Navbar({ user, isAdmin }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const active = (path) => path === "/"
    ? location.pathname === "/"
    : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const logout = async () => {
    try { await signOut(auth); } catch (error) { console.error(error); }
  };

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Student";
  const initials = displayName.split(" ").filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "S";
  const links = [
    ["/", "Home", Home],
    ["/courses", "Courses", BookOpen],
    ["/certificate", "Certificate", Award],
    ["/verify-certificate", "Verify", ShieldCheck],
  ];

  const navLinkClass = (to) => `inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-extrabold transition-colors ${
    active(to) ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:bg-white/80 hover:text-blue-700"
  }`;

  return <>
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl">
      <div className="mx-auto w-full max-w-[1480px] px-3 sm:px-5 lg:px-8">
        <nav className="flex min-h-[68px] items-center gap-2 sm:min-h-[72px] sm:gap-3" aria-label="Primary navigation">
          <Link to="/" className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3" aria-label="Online Academy home">
            <Brand className="h-10 w-10 shrink-0 sm:h-11 sm:w-11" />
            <span className="min-w-0">
              <span className="block truncate text-[16px] font-black leading-tight text-slate-950 sm:text-lg">Online Academy</span>
              <span className="hidden text-[9px] font-bold tracking-[0.12em] text-slate-400 sm:block">LEARN. GROW. <span className="text-blue-600">SUCCEED.</span></span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 lg:flex">
            {links.map(([to, label, Icon]) => <Link key={to} to={to} className={navLinkClass(to)}>
              <Icon size={16} aria-hidden="true" />{label}
            </Link>)}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {user ? <Link to="/dashboard" className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-extrabold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 sm:h-11 sm:px-3.5">
              <LayoutDashboard size={17} aria-hidden="true" /><span className="hidden sm:inline">Dashboard</span>
            </Link> : <Link to="/login" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-sm font-extrabold text-white transition hover:bg-blue-700 sm:h-11 sm:px-4">
              Login <ChevronRight size={16} aria-hidden="true" />
            </Link>}

            {user && <Link to="/profile" className="hidden h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-600 transition hover:border-blue-200 hover:text-blue-700 lg:flex" aria-label="My profile">
              {initials}
            </Link>}

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-blue-200 hover:text-blue-700 lg:hidden sm:h-11 sm:w-11"
              aria-label={open ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={open}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </nav>
      </div>
    </header>

    {open && <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
      <button type="button" className="absolute inset-0 h-full w-full bg-slate-950/40 backdrop-blur-[2px]" aria-label="Close navigation menu" onClick={() => setOpen(false)} />
      <aside className="absolute right-0 top-0 flex h-full w-[min(380px,92vw)] flex-col bg-white shadow-2xl">
        <div className="flex min-h-[68px] shrink-0 items-center justify-between border-b border-slate-100 px-4 sm:min-h-[72px] sm:px-5">
          <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <Brand className="h-10 w-10" />
            <div><p className="font-black text-slate-950">Online Academy</p><p className="text-[10px] font-semibold tracking-wide text-slate-400">LEARN. GROW. SUCCEED.</p></div>
          </Link>
          <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 p-2 text-slate-700" aria-label="Close menu"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Navigation</p>
          <div className="space-y-1">
            {links.map(([to, label, Icon]) => <Link key={to} to={to} onClick={() => setOpen(false)} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-bold transition ${active(to) ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}>
              <Icon size={19} aria-hidden="true" />{label}
            </Link>)}
          </div>

          {user && <>
            <p className="mb-2 mt-6 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Account</p>
            <div className="space-y-1">
              <Link to="/dashboard" onClick={() => setOpen(false)} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-bold ${active("/dashboard") ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}><LayoutDashboard size={19} />Dashboard</Link>
              <Link to="/profile" onClick={() => setOpen(false)} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-bold ${active("/profile") ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}><User size={19} />My Profile</Link>
            </div>
          </>}

          {isAdmin && <>
            <p className="mb-2 mt-6 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Administration</p>
            <div className="space-y-1">
              <Link to="/admin" onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"><ShieldCheck size={19} />Admin Courses</Link>
              <Link to="/admin/commerce" onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"><CreditCard size={19} />Paid Courses</Link>
              <Link to="/admin/discounts" onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"><BadgePercent size={19} />Discounts</Link>
            </div>
          </>}
        </div>

        {user && <div className="shrink-0 border-t border-slate-100 p-4 sm:p-5">
          <button type="button" onClick={logout} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-3 font-bold text-red-600 transition hover:bg-red-100"><LogOut size={19} />Logout</button>
        </div>}
      </aside>
    </div>}
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
