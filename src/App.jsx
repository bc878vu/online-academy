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
  User,
  X,
  FileText,
  Award,
  ChevronRight,
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

function PageLoader({ text = "Loading..." }) {
  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
          <GraduationCap size={28} className="text-blue-600" />
        </div>
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
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20">
          <GraduationCap size={32} className="text-white" />
        </div>
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
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const handleLogout = async () => {
    try {
      setMobileOpen(false);
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

  const navItems = [
    { to: "/", label: "Home", icon: HomeIcon },
    { to: "/courses", label: "Courses", icon: BookOpen },
    { to: "/certificate", label: "Certificate", icon: Award },
    { to: "/verify-certificate", label: "Verify", icon: ShieldCheck },
    { to: "/terms", label: "Terms", icon: FileText },
  ];

  const desktopItem = (active) =>
    `group relative inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all duration-200 ${
      active
        ? "bg-blue-50 text-blue-700 shadow-sm"
        : "text-slate-600 hover:bg-slate-50 hover:text-blue-700"
    }`;

  const mobileItem = (active) =>
    `flex min-h-[50px] items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-bold transition-all ${
      active
        ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100"
        : "text-slate-700 hover:bg-slate-50"
    }`;

  return (
    <>
      <header className="sticky top-0 z-[100] border-b border-slate-200/80 bg-white/90 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-2xl">
        <div className="mx-auto max-w-[1440px] px-3 sm:px-5 lg:px-7 xl:px-8">
          <nav className="flex min-h-[70px] items-center justify-between gap-3 lg:min-h-[76px]">
            <Link
              to="/"
              aria-label="Online Academy home"
              className="group flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3"
            >
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[15px] bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 shadow-lg shadow-blue-600/25 ring-1 ring-blue-500/20 transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-xl group-hover:shadow-blue-600/30 sm:h-12 sm:w-12">
                <div className="absolute -right-3 -top-3 h-8 w-8 rounded-full bg-white/20 blur-sm" />
                <span className="relative text-[13px] font-black tracking-tight text-white sm:text-sm">OA</span>
              </div>
              <div className="min-w-0">
                <div className="truncate text-[16px] font-black leading-tight tracking-[-0.02em] text-slate-900 sm:text-[18px]">Online Academy</div>
                <div className="mt-0.5 truncate text-[10px] font-semibold tracking-wide text-slate-400 sm:text-[11px]">Learn. Grow. Succeed.</div>
              </div>
            </Link>

            <div className="hidden items-center gap-1 xl:flex">
              <div className="flex items-center rounded-2xl border border-slate-200/80 bg-slate-50/70 p-1">
                {navItems.map(({ to, label, icon: Icon }) => (
                  <Link key={to} to={to} className={desktopItem(isActive(to))}>
                    <Icon size={15} strokeWidth={2.2} />
                    <span>{label}</span>
                    {to === "/" && isActive(to) ? <span className="absolute bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-blue-600" /> : null}
                  </Link>
                ))}
              </div>

              {user ? (
                <div className="ml-2 flex items-center gap-1.5">
                  <Link
                    to="/dashboard"
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-extrabold transition-all ${
                      isActive("/dashboard")
                        ? "bg-blue-700 text-white shadow-lg shadow-blue-600/20"
                        : "bg-blue-600 text-white shadow-md shadow-blue-600/20 hover:-translate-y-0.5 hover:bg-blue-700"
                    }`}
                  >
                    <LayoutDashboard size={16} /> Dashboard
                  </Link>
                  <Link
                    to="/profile"
                    title="My Profile"
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border text-xs font-black transition-all ${
                      isActive("/profile")
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                  >
                    {initials}
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      title="Admin Panel"
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
                    >
                      <ShieldCheck size={17} />
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    title="Logout"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100"
                  >
                    <LogOut size={17} />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="ml-2 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-[13px] font-extrabold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700"
                >
                  Login <ChevronRight size={16} />
                </Link>
              )}
            </div>

            <button
              type="button"
              aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((value) => !value)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 xl:hidden"
            >
              {mobileOpen ? <X size={24} strokeWidth={2.2} /> : <Menu size={24} strokeWidth={2.2} />}
            </button>
          </nav>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-[90] bg-slate-950/25 backdrop-blur-[2px] xl:hidden" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute left-3 right-3 top-[82px] max-h-[calc(100vh-96px)] overflow-y-auto rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.22)] sm:left-5 sm:right-5"
            onClick={(event) => event.stopPropagation()}
          >
            {user && (
              <div className="mb-2 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 p-3 ring-1 ring-blue-100">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-sm font-black text-white shadow-md shadow-blue-600/20">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-slate-900">{displayName}</p>
                  <p className="truncate text-xs text-slate-500">{user.email || "Online Academy Student"}</p>
                </div>
                <Link
                  to="/profile"
                  className="rounded-lg bg-white px-2.5 py-2 text-xs font-bold text-blue-700 shadow-sm ring-1 ring-blue-100"
                >
                  Profile
                </Link>
              </div>
            )}

            <div className="grid gap-1">
              {navItems.map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to} className={mobileItem(isActive(to))}>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${isActive(to) ? "bg-white text-blue-600 shadow-sm" : "bg-slate-50 text-slate-500"}`}>
                    <Icon size={19} />
                  </span>
                  <span className="flex-1">{label === "Verify" ? "Verify Certificate" : label}</span>
                  <ChevronRight size={17} className="text-slate-300" />
                </Link>
              ))}

              {user && (
                <>
                  <Link to="/dashboard" className={mobileItem(isActive("/dashboard"))}>
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${isActive("/dashboard") ? "bg-white text-blue-600 shadow-sm" : "bg-slate-50 text-slate-500"}`}><LayoutDashboard size={19} /></span>
                    <span className="flex-1">Dashboard</span>
                    <ChevronRight size={17} className="text-slate-300" />
                  </Link>
                  {isAdmin && (
                    <>
                      <Link to="/admin" className={mobileItem(isActive("/admin"))}>
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-500"><ShieldCheck size={19} /></span>
                        <span className="flex-1">Admin Panel</span>
                        <ChevronRight size={17} className="text-slate-300" />
                      </Link>
                      <Link to="/admin/assessments" className={mobileItem(isActive("/admin/assessments"))}>
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-500"><FileText size={19} /></span>
                        <span className="flex-1">Assessments</span>
                        <ChevronRight size={17} className="text-slate-300" />
                      </Link>
                    </>
                  )}
                  <div className="my-2 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex min-h-[50px] w-full items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-bold text-red-600 transition hover:bg-red-50"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50"><LogOut size={19} /></span>
                    Logout
                  </button>
                </>
              )}

              {!user && (
                <>
                  <div className="my-2 border-t border-slate-100" />
                  <Link to="/login" className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-[15px] font-extrabold text-white shadow-lg shadow-blue-600/20">
                    Login to Online Academy <ChevronRight size={18} />
                  </Link>
                </>
              )}
            </div>
          </div>
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
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-xs font-black text-white">OA</div>
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
