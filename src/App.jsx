import { lazy, Suspense, useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import {
  Award, BadgePercent, BookOpen, ChevronDown, ChevronRight, CreditCard, FileText,
  Home, LayoutDashboard, LogIn, LogOut, Menu, MoreHorizontal, ShieldCheck,
  User, UserPlus, X
} from "lucide-react";
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
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => { setOpen(false); setMoreOpen(false); }, [location.pathname]);
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

  const mainLinks = [
    ["/", "Home", Home],
    ["/courses", "Courses", BookOpen],
    ["/certificate", "Certificate", Award],
    ["/verify-certificate", "Verify", ShieldCheck],
    ...(user ? [["/dashboard", "Dashboard", LayoutDashboard]] : []),
  ];

  const moreLinks = [
    ["/terms", "Terms & Policies", FileText],
    ...(user ? [["/profile", "My Profile", User]] : [["/login", "Login", LogIn], ["/register", "Create Account", UserPlus]]),
    ...(isAdmin ? [
      ["/admin", "Admin Courses", ShieldCheck],
      ["/admin/assessments", "Assessments", BookOpen],
      ["/admin/commerce", "Paid Courses", CreditCard],
      ["/admin/discounts", "Discounts", BadgePercent],
    ] : []),
  ];

  const navLinkClass = (to) => `group inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-[13px] font-extrabold transition-all duration-200 ${
    active(to)
      ? "border-blue-200 bg-blue-600 text-white shadow-md shadow-blue-600/20"
      : "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-blue-700 hover:shadow-sm"
  }`;

  const moreButtonClass = `inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-[13px] font-extrabold transition-all duration-200 ${
    moreOpen || moreLinks.some(([to]) => active(to))
      ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
      : "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-blue-700 hover:shadow-sm"
  }`;

  return <>
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-2xl">
      <div className="mx-auto w-full max-w-[1480px] px-3 sm:px-5 lg:px-8">
        <nav className="flex min-h-[68px] items-center gap-2 sm:min-h-[74px] sm:gap-3" aria-label="Primary navigation">
          <Link to="/" className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3" aria-label="Online Academy home">
            <Brand className="h-10 w-10 shrink-0 sm:h-11 sm:w-11" />
            <span className="min-w-0">
              <span className="block truncate text-[16px] font-black leading-tight tracking-tight text-slate-950 sm:text-lg">Online Academy</span>
              <span className="hidden text-[9px] font-bold tracking-[0.12em] text-slate-400 sm:block">LEARN. GROW. <span className="text-blue-600">SUCCEED.</span></span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50/90 p-1 lg:flex">
            {mainLinks.map(([to, label, Icon]) => <Link key={to} to={to} className={navLinkClass(to)}>
              <Icon size={16} aria-hidden="true" />{label}
            </Link>)}
            <div className="relative">
              <button type="button" onClick={() => setMoreOpen((v) => !v)} className={moreButtonClass} aria-expanded={moreOpen} aria-haspopup="menu">
                <MoreHorizontal size={16} aria-hidden="true" />More<ChevronDown size={14} className={`transition-transform ${moreOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              {moreOpen && <>
                <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Close more menu" onClick={() => setMoreOpen(false)} />
                <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15" role="menu">
                  <div className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">More pages</div>
                  {moreLinks.map(([to, label, Icon]) => <Link key={to} to={to} role="menuitem" className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition ${active(to) ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50 hover:text-blue-700"}`}>
                    <Icon size={17} aria-hidden="true" />{label}<ChevronRight size={14} className="ml-auto opacity-40" aria-hidden="true" />
                  </Link>)}
                </div>
              </>}
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {user ? <Link to="/dashboard" className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-600 bg-blue-600 px-3 text-sm font-extrabold text-white shadow-md shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700 sm:h-11 sm:px-3.5">
              <LayoutDashboard size={17} aria-hidden="true" /><span className="hidden sm:inline">Dashboard</span>
            </Link> : <Link to="/login" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-blue-600 bg-blue-600 px-3.5 text-sm font-extrabold text-white shadow-md shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700 sm:h-11 sm:px-4">
              Login <ChevronRight size={16} aria-hidden="true" />
            </Link>}

            {user && <Link to="/profile" className="hidden h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-700 lg:flex" aria-label="My profile">
              {initials}
            </Link>}

            <button type="button" onClick={() => setOpen((v) => !v)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 lg:hidden sm:h-11 sm:w-11" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open}>
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </nav>
      </div>
    </header>

    {open && <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
      <button type="button" className="absolute inset-0 h-full w-full bg-slate-950/45 backdrop-blur-[3px]" aria-label="Close navigation menu" onClick={() => setOpen(false)} />
      <aside className="absolute right-0 top-0 flex h-full w-[min(390px,92vw)] flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex min-h-[72px] shrink-0 items-center justify-between border-b border-slate-100 px-4 sm:px-5">
          <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <Brand className="h-10 w-10" />
            <div><p className="font-black tracking-tight text-slate-950">Online Academy</p><p className="text-[10px] font-semibold tracking-wide text-slate-400">LEARN. GROW. SUCCEED.</p></div>
          </Link>
          <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 p-2 text-slate-700 shadow-sm" aria-label="Close menu"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Main navigation</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {mainLinks.map(([to, label, Icon]) => <Link key={to} to={to} onClick={() => setOpen(false)} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 text-sm font-extrabold transition ${active(to) ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-slate-50"}`}>
              <Icon size={19} aria-hidden="true" />{label}
            </Link>)}
          </div>

          <p className="mb-2 mt-6 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">More pages</p>
          <div className="space-y-2">
            {moreLinks.map(([to, label, Icon]) => <Link key={to} to={to} onClick={() => setOpen(false)} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 text-sm font-bold transition ${active(to) ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-100 bg-slate-50/60 text-slate-700 hover:border-blue-100 hover:bg-white hover:text-blue-700"}`}>
              <Icon size={19} aria-hidden="true" />{label}<ChevronRight size={15} className="ml-auto opacity-40" aria-hidden="true" />
            </Link>)}
          </div>
        </div>

        {user && <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">{initials}</div>
            <div className="min-w-0"><p className="truncate text-sm font-extrabold text-slate-900">{displayName}</p><p className="truncate text-xs text-slate-400">{user.email}</p></div>
          </div>
          <button type="button" onClick={logout} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 font-bold text-red-600 transition hover:bg-red-100"><LogOut size={19} />Logout</button>
        </div>}
      </aside>
    </div>}
  </>;
}

function Footer() {
  const year = new Date().getFullYear();
  return <footer className="mt-auto border-t border-slate-200 bg-slate-950 text-slate-300">
    <div className="mx-auto max-w-[1480px] px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
      <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr_1fr_1.15fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10">
          <div className="flex items-center gap-3"><Brand className="h-11 w-11" /><div><p className="font-black text-white">Online Academy</p><p className="text-[10px] font-bold tracking-[0.14em] text-slate-500">LEARN. GROW. SUCCEED.</p></div></div>
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">Learn practical skills through structured courses, lessons, assessments and progress tracking — all in one simple learning platform.</p>
          <Link to="/courses" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm font-extrabold text-blue-300 transition hover:bg-blue-500/20 hover:text-white">Explore Courses <ChevronRight size={16} /></Link>
        </div>

        <div><p className="mb-4 text-sm font-black uppercase tracking-[0.14em] text-white">Explore</p><div className="space-y-2.5 text-sm"><Link className="block transition hover:text-white" to="/">Home</Link><Link className="block transition hover:text-white" to="/courses">Courses</Link><Link className="block transition hover:text-white" to="/certificate">Certificates</Link><Link className="block transition hover:text-white" to="/verify-certificate">Verify Certificate</Link></div></div>
        <div><p className="mb-4 text-sm font-black uppercase tracking-[0.14em] text-white">Account</p><div className="space-y-2.5 text-sm"><Link className="block transition hover:text-white" to="/dashboard">Dashboard</Link><Link className="block transition hover:text-white" to="/profile">My Profile</Link><Link className="block transition hover:text-white" to="/login">Login</Link><Link className="block transition hover:text-white" to="/register">Create Account</Link></div></div>
        <div><p className="mb-4 text-sm font-black uppercase tracking-[0.14em] text-white">Information</p><div className="space-y-2.5 text-sm"><Link className="block transition hover:text-white" to="/terms">Terms & Policies</Link><p className="leading-6 text-slate-500">Secure learning, course access and certificate verification in one place.</p></div></div>
      </div>

      <div className="mt-9 flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© {year} Online Academy. All rights reserved.</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2"><Link to="/terms" className="transition hover:text-white">Terms</Link><Link to="/terms" className="transition hover:text-white">Privacy</Link><span>Built for modern learners</span></div>
      </div>
    </div>
  </footer>;
}

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
