import { lazy, memo, Suspense, useEffect, useState } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import {
  BookOpen,
  GraduationCap,
  Home as HomeIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  X,
  FileText,
  Award,
  ChevronRight,
  User,
} from "lucide-react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";

const Home = lazy(() => import("./pages/Home"));
const Courses = lazy(() => import("./pages/Courses"));
const CourseDetails = lazy(() => import("./pages/CourseDetails"));
const CourseAssessments = lazy(() => import("./pages/CourseAssessments"));
const LectureProgressGuard = lazy(() => import("./pages/LectureProgressGuard"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const AdminCourses = lazy(() => import("./pages/AdminCourses"));
const AdminAssessments = lazy(() => import("./pages/AdminAssessments"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const TermsPolicy = lazy(() => import("./pages/TermsPolicy"));
const Certificate = lazy(() => import("./pages/Certificate"));
const VerifyCertificate = lazy(() => import("./pages/VerifyCertificate"));

const ADMIN_EMAIL = "admin@onlineacademy.com";

function BrandMark({ className = "" }) {
  return (
    <img
      src="/favicon.svg"
      alt="Online Academy"
      className={`object-contain ${className}`}
      draggable="false"
    />
  );
}

function PageLoader({ text = "Loading..." }) {
  return (
    <div className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <BrandMark className="mx-auto h-14 w-14 rounded-2xl shadow-lg shadow-blue-600/15" />
        <div className="mx-auto mt-5 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        <p className="mt-4 text-sm font-semibold text-slate-600">{text}</p>
      </div>
    </div>
  );
}

function AppLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <BrandMark className="mx-auto h-16 w-16 rounded-[20px] shadow-xl shadow-blue-600/20" />
        <div className="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        <p className="mt-4 text-sm font-semibold text-slate-600">Loading Online Academy...</p>
      </div>
    </div>
  );
}

const ProtectedRoute = memo(function ProtectedRoute({ children, user }) {
  if (user === undefined) return <PageLoader text="Checking your account..." />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
});

const PublicAuthRoute = memo(function PublicAuthRoute({ children, user }) {
  if (user === undefined) return <PageLoader text="Loading..." />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
});

const AdminRoute = memo(function AdminRoute({ children, user, isAdmin, adminLoading }) {
  if (user === undefined || adminLoading) return <PageLoader text="Checking admin access..." />;
  if (!user || !isAdmin) return <Navigate to="/admin-login" replace />;
  return children;
});

function CourseRoute() {
  const { courseId } = useParams();

  return (
    <LectureProgressGuard>
      <CourseDetails />
      <CourseAssessments courseId={courseId} />
    </LectureProgressGuard>
  );
}

const Navbar = memo(function Navbar({ user, isAdmin }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const isActive = (path) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleLogout = async () => {
    try {
      setMenuOpen(false);
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Student";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "S";

  const primaryItems = [
    { to: "/", label: "Home", icon: HomeIcon },
    { to: "/courses", label: "Courses", icon: BookOpen },
    { to: "/certificate", label: "Certificate", icon: Award },
    { to: "/verify-certificate", label: "Verify Certificate", icon: ShieldCheck },
  ];

  const navLink = (active) =>
    `group relative inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 text-[13px] font-extrabold transition-all duration-200 ${
      active
        ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100"
        : "text-slate-600 hover:bg-slate-50 hover:text-blue-700"
    }`;

  const menuLink = (active) =>
    `flex min-h-[54px] w-full items-center gap-3 rounded-2xl px-3.5 text-[15px] font-extrabold transition-all ${
      active
        ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
        : "text-slate-700 hover:bg-slate-50"
    }`;

  return (
    <>
      <header className="sticky top-0 z-[100] border-b border-slate-200/80 bg-white/95 shadow-[0_8px_32px_rgba(15,23,42,0.07)] backdrop-blur-2xl">
        <div className="mx-auto max-w-[1480px] px-3 sm:px-5 lg:px-7 xl:px-8">
          <nav className="flex min-h-[72px] items-center gap-3 lg:min-h-[78px]" aria-label="Primary navigation">
            <Link
              to="/"
              aria-label="Online Academy home"
              className="group flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3 lg:flex-none"
            >
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-white shadow-[0_8px_24px_rgba(37,99,235,0.18)] ring-1 ring-slate-200/80 transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_28px_rgba(37,99,235,0.22)] sm:h-12 sm:w-12">
                <BrandMark className="h-full w-full rounded-[15px]" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[16px] font-black leading-tight tracking-[-0.025em] text-slate-950 sm:text-[18px] lg:text-[19px]">
                  Online Academy
                </span>
                <span className="mt-0.5 block truncate text-[9px] font-bold tracking-[0.08em] text-slate-400 sm:text-[10px]">
                  LEARN. GROW. <span className="text-blue-600">SUCCEED.</span>
                </span>
              </span>
            </Link>

            <div className="hidden flex-1 items-center justify-center lg:flex">
              <div className="flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-slate-50/75 p-1 shadow-inner shadow-white">
                {primaryItems.map(({ to, label, icon: Icon }) => (
                  <Link key={to} to={to} className={navLink(isActive(to))}>
                    <Icon size={16} strokeWidth={2.15} />
                    <span className="whitespace-nowrap">{label}</span>
                    {isActive(to) && (
                      <span className="absolute inset-x-3 -bottom-1 h-0.5 rounded-full bg-blue-600" />
                    )}
                  </Link>
                ))}
              </div>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
              {user ? (
                <Link
                  to="/dashboard"
                  aria-label="Open dashboard"
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3.5 text-[13px] font-extrabold transition-all sm:px-4 ${
                    isActive("/dashboard")
                      ? "bg-blue-700 text-white shadow-lg shadow-blue-600/25"
                      : "bg-blue-600 text-white shadow-md shadow-blue-600/20 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg"
                  }`}
                >
                  <LayoutDashboard size={17} />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-[13px] font-extrabold text-white shadow-md shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700 sm:px-5"
                >
                  Login
                  <ChevronRight size={16} />
                </Link>
              )}

              {user && (
                <Link
                  to="/profile"
                  aria-label="My profile"
                  title={displayName}
                  className={`hidden h-11 w-11 items-center justify-center rounded-xl border text-xs font-black transition-all lg:flex ${
                    isActive("/profile")
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  {initials}
                </Link>
              )}

              <button
                type="button"
                aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((value) => !value)}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-white shadow-sm transition-all duration-200 ${
                  menuOpen
                    ? "border-blue-200 bg-blue-50 text-blue-700 shadow-md"
                    : "border-slate-200 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:shadow-md"
                }`}
              >
                {menuOpen ? <X size={23} strokeWidth={2.15} /> : <Menu size={23} strokeWidth={2.15} />}
              </button>
            </div>
          </nav>

          <div className="flex gap-1 overflow-x-auto pb-2 lg:hidden" style={{ scrollbarWidth: "none" }}>
            {primaryItems.slice(0, 3).map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[12px] font-extrabold transition-all ${
                  isActive(to)
                    ? "border-blue-100 bg-blue-50 text-blue-700 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-100 hover:text-blue-700"
                }`}
              >
                <Icon size={14} /> {label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-[90] bg-slate-950/30 backdrop-blur-[3px]"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        >
          <aside
            className="absolute right-0 top-0 flex h-full w-full max-w-[410px] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-[-24px_0_70px_rgba(15,23,42,0.20)] sm:w-[390px]"
            onClick={(event) => event.stopPropagation()}
            aria-label="More navigation"
          >
            <div className="flex min-h-[78px] items-center justify-between border-b border-slate-100 px-4 sm:px-5">
              <Link to="/" className="flex min-w-0 items-center gap-3" onClick={() => setMenuOpen(false)}>
                <BrandMark className="h-11 w-11 rounded-xl shadow-md shadow-blue-600/15" />
                <div className="min-w-0">
                  <p className="truncate text-[17px] font-black text-slate-950">Online Academy</p>
                  <p className="text-[10px] font-bold tracking-[0.08em] text-slate-400">LEARN. GROW. SUCCEED.</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                <X size={21} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4">
              {user && (
                <div className="mb-3 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-3.5 ring-1 ring-blue-100">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-sm font-black text-white shadow-lg shadow-blue-600/20">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-slate-950">{displayName}</p>
                    <p className="truncate text-xs text-slate-500">{user.email || "Online Academy Student"}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl bg-white px-3 py-2 text-xs font-extrabold text-blue-700 shadow-sm ring-1 ring-blue-100 transition hover:bg-blue-50"
                  >
                    Profile
                  </Link>
                </div>
              )}

              <div className="space-y-1">
                {primaryItems.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className={menuLink(isActive(to))}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isActive(to) ? "bg-white text-blue-600 shadow-sm" : "bg-slate-50 text-slate-500"}`}>
                      <Icon size={19} strokeWidth={2.1} />
                    </span>
                    <span className="flex-1">{label}</span>
                    <ChevronRight size={17} className="text-slate-300" />
                  </Link>
                ))}

                {user && (
                  <Link
                    to="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className={menuLink(isActive("/dashboard"))}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isActive("/dashboard") ? "bg-white text-blue-600 shadow-sm" : "bg-slate-50 text-slate-500"}`}>
                      <LayoutDashboard size={19} strokeWidth={2.1} />
                    </span>
                    <span className="flex-1">Dashboard</span>
                    <ChevronRight size={17} className="text-slate-300" />
                  </Link>
                )}

                {user && (
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className={menuLink(isActive("/profile"))}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isActive("/profile") ? "bg-white text-blue-600 shadow-sm" : "bg-slate-50 text-slate-500"}`}>
                      <User size={19} strokeWidth={2.1} />
                    </span>
                    <span className="flex-1">My Profile</span>
                    <ChevronRight size={17} className="text-slate-300" />
                  </Link>
                )}

                <Link
                  to="/terms"
                  onClick={() => setMenuOpen(false)}
                  className={menuLink(isActive("/terms"))}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isActive("/terms") ? "bg-white text-blue-600 shadow-sm" : "bg-slate-50 text-slate-500"}`}>
                    <FileText size={19} strokeWidth={2.1} />
                  </span>
                  <span className="flex-1">Terms & Policy</span>
                  <ChevronRight size={17} className="text-slate-300" />
                </Link>

                {isAdmin && (
                  <>
                    <Link
                      to="/admin"
                      onClick={() => setMenuOpen(false)}
                      className={menuLink(isActive("/admin"))}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                        <ShieldCheck size={19} strokeWidth={2.1} />
                      </span>
                      <span className="flex-1">Admin Panel</span>
                      <ChevronRight size={17} className="text-slate-300" />
                    </Link>
                    <Link
                      to="/admin/assessments"
                      onClick={() => setMenuOpen(false)}
                      className={menuLink(isActive("/admin/assessments"))}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                        <FileText size={19} strokeWidth={2.1} />
                      </span>
                      <span className="flex-1">Assessments</span>
                      <ChevronRight size={17} className="text-slate-300" />
                    </Link>
                  </>
                )}
              </div>

              {!user ? (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5"
                  >
                    Login to Online Academy <ChevronRight size={18} />
                  </Link>
                </div>
              ) : (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex min-h-[54px] w-full items-center gap-3 rounded-2xl px-3.5 text-[15px] font-extrabold text-red-600 transition hover:bg-red-50"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
                      <LogOut size={19} />
                    </span>
                    <span className="flex-1 text-left">Logout</span>
                    <ChevronRight size={17} className="text-red-200" />
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Online Academy</p>
              <p className="mt-1 text-xs text-slate-400">Learn. Grow. Succeed.</p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
});

const Footer = memo(function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <BrandMark className="h-9 w-9 rounded-xl shadow-sm" />
              <span className="font-extrabold text-slate-800">Online Academy</span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">Learn through structured courses, track your progress, and earn certificates through Online Academy.</p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Quick Links</h3>
            <div className="mt-3 grid gap-2 text-sm">
              <Link to="/courses" className="text-slate-500 hover:text-blue-600">Courses</Link>
              <Link to="/dashboard" className="text-slate-500 hover:text-blue-600">Dashboard</Link>
              <Link to="/certificate" className="text-slate-500 hover:text-blue-600">Certificate</Link>
              <Link to="/verify-certificate" className="text-slate-500 hover:text-blue-600">Verify Certificate</Link>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Policies</h3>
            <Link to="/terms" className="mt-3 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600"><FileText size={16} /> Terms & Policy</Link>
          </div>
        </div>
        <div className="mt-8 border-t border-slate-100 pt-5 text-center text-xs text-slate-400">© {year} Online Academy. All rights reserved.</div>
      </div>
    </footer>
  );
});

function App() {
  const [user, setUser] = useState(undefined);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!mounted) return;
      setUser(currentUser);
      if (!currentUser) {
        setIsAdmin(false);
        setAdminLoading(false);
        return;
      }
      const email = currentUser.email?.trim().toLowerCase();
      setIsAdmin(email === ADMIN_EMAIL.toLowerCase());
      setAdminLoading(false);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  if (user === undefined) return <AppLoading />;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar user={user} isAdmin={isAdmin} />
      <main className="min-w-0 flex-1">
        <Suspense fallback={<PageLoader text="Loading page..." />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/courses" element={<Courses user={user} />} />
            <Route path="/courses/:courseId" element={<CourseRoute />} />
            <Route path="/certificate" element={<Certificate />} />
            <Route path="/verify-certificate" element={<VerifyCertificate />} />
            <Route path="/terms" element={<TermsPolicy />} />
            <Route path="/login" element={<PublicAuthRoute user={user}><Login /></PublicAuthRoute>} />
            <Route path="/register" element={<PublicAuthRoute user={user}><Register /></PublicAuthRoute>} />
            <Route path="/forgot-password" element={<PublicAuthRoute user={user}><ForgotPassword /></PublicAuthRoute>} />
            <Route path="/admin-login" element={<AdminLogin user={user} isAdmin={isAdmin} adminLoading={adminLoading} />} />
            <Route path="/dashboard" element={<ProtectedRoute user={user}><Dashboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute user={user}><Profile /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute user={user} isAdmin={isAdmin} adminLoading={adminLoading}><AdminCourses /></AdminRoute>} />
            <Route path="/admin/assessments" element={<AdminRoute user={user} isAdmin={isAdmin} adminLoading={adminLoading}><AdminAssessments /></AdminRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

export default App;
