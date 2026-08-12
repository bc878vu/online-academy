import {
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import {
  GraduationCap,
  LogOut,
  Menu,
  X,
  Home as HomeIcon,
  BookOpen,
  LayoutDashboard,
  User,
  ShieldCheck,
} from "lucide-react";

import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import { auth } from "./firebase";


// ======================================================
// LAZY LOADED PAGES
// ======================================================
//
// Important:
// Pages ab initial bundle mein load nahi hongi.
// User jis page par jayega, sirf us page ka JS load hoga.
//

const Home = lazy(
  () => import("./pages/Home")
);

const Courses = lazy(
  () => import("./pages/Courses")
);

const Login = lazy(
  () => import("./pages/Login")
);

const Register = lazy(
  () => import("./pages/Register")
);

const ForgotPassword = lazy(
  () => import("./pages/ForgotPassword")
);

const Dashboard = lazy(
  () => import("./pages/Dashboard")
);

const Profile = lazy(
  () => import("./pages/Profile")
);

const AdminCourses = lazy(
  () => import("./pages/AdminCourses")
);

const AdminLogin = lazy(
  () => import("./pages/AdminLogin")
);


// ======================================================
// ADMIN CONFIGURATION
// ======================================================

const ADMIN_EMAIL =
  "admin@onlineacademy.com";


// ======================================================
// PAGE LOADING
// ======================================================

function PageLoader({
  text = "Loading...",
}) {
  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-slate-50 px-4">

      <div className="text-center">

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">

          <GraduationCap
            size={28}
            className="text-blue-600"
          />

        </div>

        <div className="mx-auto mt-5 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

        <p className="mt-4 text-sm font-semibold text-slate-600">
          {text}
        </p>

      </div>

    </div>
  );
}


// ======================================================
// APP INITIAL LOADING
// ======================================================

function AppLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">

      <div className="text-center">

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20">

          <GraduationCap
            size={32}
            className="text-white"
          />

        </div>

        <div className="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

        <p className="mt-4 text-sm font-semibold text-slate-600">
          Loading Online Academy...
        </p>

      </div>

    </div>
  );
}


// ======================================================
// PROTECTED STUDENT ROUTE
// ======================================================

const ProtectedRoute = memo(
  function ProtectedRoute({
    children,
    user,
  }) {

    if (user === undefined) {
      return (
        <PageLoader
          text="Checking your account..."
        />
      );
    }

    if (!user) {
      return (
        <Navigate
          to="/login"
          replace
        />
      );
    }

    return children;
  }
);


// ======================================================
// PUBLIC AUTH ROUTE
// ======================================================
//
// Logged-in user ko Login/Register/Forgot Password
// pages par dobara nahi jane dena.
//

const PublicAuthRoute = memo(
  function PublicAuthRoute({
    children,
    user,
  }) {

    if (user === undefined) {
      return (
        <PageLoader
          text="Loading..."
        />
      );
    }

    if (user) {
      return (
        <Navigate
          to="/dashboard"
          replace
        />
      );
    }

    return children;
  }
);


// ======================================================
// ADMIN ROUTE
// ======================================================

const AdminRoute = memo(
  function AdminRoute({
    children,
    user,
    isAdmin,
    adminLoading,
  }) {

    if (
      user === undefined ||
      adminLoading
    ) {
      return (
        <PageLoader
          text="Checking admin access..."
        />
      );
    }

    if (!user) {
      return (
        <Navigate
          to="/admin-login"
          replace
        />
      );
    }

    if (!isAdmin) {
      return (
        <Navigate
          to="/admin-login"
          replace
        />
      );
    }

    return children;
  }
);


// ======================================================
// NAVBAR
// ======================================================

const Navbar = memo(
  function Navbar({
    user,
    isAdmin,
  }) {

    const location =
      useLocation();

    const [
      mobileOpen,
      setMobileOpen,
    ] = useState(false);


    // --------------------------------------------------
    // Close mobile menu after navigation
    // --------------------------------------------------

    useEffect(() => {
      setMobileOpen(false);
    }, [
      location.pathname,
    ]);


    // --------------------------------------------------
    // Active route
    // --------------------------------------------------

    const isActive = useCallback(
      (path) => {

        if (path === "/") {
          return (
            location.pathname === "/"
          );
        }

        return location.pathname.startsWith(
          path
        );
      },
      [
        location.pathname,
      ]
    );


    // --------------------------------------------------
    // Logout
    // --------------------------------------------------

    const handleLogout =
      useCallback(
        async () => {

          try {

            setMobileOpen(false);

            await signOut(auth);

          } catch (error) {

            console.error(
              "Logout error:",
              error
            );

          }

        },
        []
      );


    // --------------------------------------------------
    // Classes
    // --------------------------------------------------

    const desktopLink =
      useCallback(
        (active) =>
          `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
            active
              ? "bg-blue-50 text-blue-600"
              : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
          }`,
        []
      );


    const mobileLink =
      useCallback(
        (active) =>
          `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
            active
              ? "bg-blue-50 text-blue-600"
              : "text-slate-700 hover:bg-slate-50 hover:text-blue-600"
          }`,
        []
      );


    // --------------------------------------------------
    // Render
    // --------------------------------------------------

    return (
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl">

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <nav className="flex min-h-[72px] items-center justify-between">


            {/* ==========================================
                LOGO
            ========================================== */}

            <Link
              to="/"
              className="group flex shrink-0 items-center gap-3"
            >

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-md shadow-blue-500/20 transition-transform duration-200 group-hover:scale-105">

                <GraduationCap
                  size={25}
                  className="text-white"
                />

              </div>

              <div>

                <h1 className="text-[17px] font-extrabold leading-tight text-slate-900 sm:text-lg">
                  Online Academy
                </h1>

                <p className="text-[11px] font-medium text-slate-500 sm:text-xs">
                  Learn. Grow. Succeed.
                </p>

              </div>

            </Link>


            {/* ==========================================
                DESKTOP NAVIGATION
            ========================================== */}

            <div className="hidden items-center gap-1 md:flex">


              {/* HOME */}

              <Link
                to="/"
                className={desktopLink(
                  isActive("/")
                )}
              >

                <HomeIcon
                  size={16}
                />

                Home

              </Link>


              {/* COURSES */}

              <Link
                to="/courses"
                className={desktopLink(
                  isActive(
                    "/courses"
                  )
                )}
              >

                <BookOpen
                  size={16}
                />

                Courses

              </Link>


              {user ? (
                <>


                  {/* DASHBOARD */}

                  <Link
                    to="/dashboard"
                    className={`ml-1 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-md transition-all ${
                      isActive(
                        "/dashboard"
                      )
                        ? "bg-blue-700 text-white"
                        : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg"
                    }`}
                  >

                    <LayoutDashboard
                      size={17}
                    />

                    Dashboard

                  </Link>


                  {/* ADMIN */}

                  {isAdmin && (

                    <Link
                      to="/admin"
                      className={`ml-1 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                        isActive(
                          "/admin"
                        )
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >

                      <ShieldCheck
                        size={17}
                      />

                      Admin

                    </Link>

                  )}


                  {/* PROFILE */}

                  <Link
                    to="/profile"
                    className={desktopLink(
                      isActive(
                        "/profile"
                      )
                    )}
                  >

                    <User
                      size={16}
                    />

                    Profile

                  </Link>


                  {/* LOGOUT */}

                  <button
                    type="button"
                    onClick={
                      handleLogout
                    }
                    className="ml-2 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100"
                  >

                    <LogOut
                      size={17}
                    />

                    Logout

                  </button>

                </>

              ) : (

                /* LOGIN */

                <Link
                  to="/login"
                  className="ml-2 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 hover:shadow-lg"
                >

                  Login

                </Link>

              )}

            </div>


            {/* ==========================================
                MOBILE BUTTON
            ========================================== */}

            <button
              type="button"
              aria-label={
                mobileOpen
                  ? "Close menu"
                  : "Open menu"
              }
              aria-expanded={
                mobileOpen
              }
              onClick={() =>
                setMobileOpen(
                  (previous) =>
                    !previous
                )
              }
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-600 md:hidden"
            >

              {mobileOpen ? (
                <X size={23} />
              ) : (
                <Menu size={23} />
              )}

            </button>

          </nav>


          {/* ==========================================
              MOBILE MENU
          ========================================== */}

          {mobileOpen && (

            <div className="border-t border-slate-100 pb-4 pt-3 md:hidden">

              <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">


                {/* HOME */}

                <Link
                  to="/"
                  className={mobileLink(
                    isActive("/")
                  )}
                >

                  <HomeIcon
                    size={19}
                  />

                  Home

                </Link>


                {/* COURSES */}

                <Link
                  to="/courses"
                  className={mobileLink(
                    isActive(
                      "/courses"
                    )
                  )}
                >

                  <BookOpen
                    size={19}
                  />

                  Courses

                </Link>


                {user ? (
                  <>


                    {/* DASHBOARD */}

                    <Link
                      to="/dashboard"
                      className={mobileLink(
                        isActive(
                          "/dashboard"
                        )
                      )}
                    >

                      <LayoutDashboard
                        size={19}
                      />

                      Dashboard

                    </Link>


                    {/* ADMIN */}

                    {isAdmin && (

                      <Link
                        to="/admin"
                        className={mobileLink(
                          isActive(
                            "/admin"
                          )
                        )}
                      >

                        <ShieldCheck
                          size={19}
                        />

                        Admin Panel

                      </Link>

                    )}


                    {/* PROFILE */}

                    <Link
                      to="/profile"
                      className={mobileLink(
                        isActive(
                          "/profile"
                        )
                      )}
                    >

                      <User
                        size={19}
                      />

                      My Profile

                    </Link>


                    <div className="my-2 border-t border-slate-100" />


                    {/* LOGOUT */}

                    <button
                      type="button"
                      onClick={
                        handleLogout
                      }
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    >

                      <LogOut
                        size={19}
                      />

                      Logout

                    </button>

                  </>

                ) : (

                  <>

                    <div className="my-2 border-t border-slate-100" />

                    <Link
                      to="/login"
                      className="flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                    >

                      Login

                    </Link>

                  </>

                )}

              </div>

            </div>

          )}

        </div>

      </header>
    );
  }
);


// ======================================================
// FOOTER
// ======================================================
//
// Footer mein navigation links nahi hain.
// Is liye duplicate navbar/footer navigation nahi banegi.
//

const Footer = memo(
  function Footer() {

    const currentYear =
      useMemo(
        () =>
          new Date().getFullYear(),
        []
      );

    return (
      <footer className="border-t border-slate-200 bg-white">

        <div className="mx-auto max-w-7xl px-4 py-6 text-center sm:px-6 lg:px-8">

          <div className="flex items-center justify-center gap-2">

            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">

              <GraduationCap
                size={17}
                className="text-blue-600"
              />

            </div>

            <span className="text-sm font-bold text-slate-700">
              Online Academy
            </span>

          </div>

          <p className="mt-2 text-xs text-slate-500">
            Learn. Grow. Succeed.
          </p>

          <p className="mt-3 text-xs text-slate-400">
            © {currentYear} Online Academy. All rights reserved.
          </p>

        </div>

      </footer>
    );
  }
);


// ======================================================
// MAIN APP
// ======================================================

function App() {

  const [
    user,
    setUser,
  ] = useState(undefined);


  const [
    isAdmin,
    setIsAdmin,
  ] = useState(false);


  const [
    adminLoading,
    setAdminLoading,
  ] = useState(true);


  // ====================================================
  // SINGLE GLOBAL AUTH LISTENER
  // ====================================================

  useEffect(() => {

    let mounted = true;


    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {

          if (!mounted) {
            return;
          }


          setUser(
            currentUser
          );


          // ----------------------------------------------
          // NOT LOGGED IN
          // ----------------------------------------------

          if (!currentUser) {

            setIsAdmin(false);

            setAdminLoading(false);

            return;
          }


          // ----------------------------------------------
          // ADMIN CHECK
          // ----------------------------------------------

          const email =
            currentUser.email
              ?.trim()
              .toLowerCase();


          const admin =
            email ===
            ADMIN_EMAIL.toLowerCase();


          setIsAdmin(
            admin
          );

          setAdminLoading(
            false
          );

        }
      );


    return () => {

      mounted = false;

      unsubscribe();

    };

  }, []);


  // ====================================================
  // INITIAL APP LOADING
  // ====================================================

  if (user === undefined) {

    return (
      <AppLoading />
    );

  }


  // ====================================================
  // MAIN RENDER
  // ====================================================

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">


      {/* ==================================================
          SINGLE NAVBAR
      ================================================== */}

      <Navbar
        user={user}
        isAdmin={isAdmin}
      />


      {/* ==================================================
          CONTENT
      ================================================== */}

      <main className="min-w-0 flex-1">

        <Suspense
          fallback={
            <PageLoader
              text="Loading page..."
            />
          }
        >

          <Routes>


            {/* ==========================================
                HOME
            ========================================== */}

            <Route
              path="/"
              element={
                <Home />
              }
            />


            {/* ==========================================
                COURSES
            ========================================== */}

            <Route
              path="/courses"
              element={
                <Courses />
              }
            />


            {/* ==========================================
                STUDENT LOGIN
            ========================================== */}

            <Route
              path="/login"
              element={
                <PublicAuthRoute
                  user={user}
                >

                  <Login />

                </PublicAuthRoute>
              }
            />


            {/* ==========================================
                REGISTER
            ========================================== */}

            <Route
              path="/register"
              element={
                <PublicAuthRoute
                  user={user}
                >

                  <Register />

                </PublicAuthRoute>
              }
            />


            {/* ==========================================
                FORGOT PASSWORD
            ========================================== */}

            <Route
              path="/forgot-password"
              element={
                <PublicAuthRoute
                  user={user}
                >

                  <ForgotPassword />

                </PublicAuthRoute>
              }
            />


            {/* ==========================================
                ADMIN LOGIN
            ========================================== */}

            <Route
              path="/admin-login"
              element={
                <AdminLogin
                  user={user}
                  isAdmin={isAdmin}
                  adminLoading={
                    adminLoading
                  }
                />
              }
            />


            {/* ==========================================
                DASHBOARD
            ========================================== */}

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute
                  user={user}
                >

                  <Dashboard />

                </ProtectedRoute>
              }
            />


            {/* ==========================================
                PROFILE
            ========================================== */}

            <Route
              path="/profile"
              element={
                <ProtectedRoute
                  user={user}
                >

                  <Profile />

                </ProtectedRoute>
              }
            />


            {/* ==========================================
                ADMIN
            ========================================== */}

            <Route
              path="/admin"
              element={
                <AdminRoute
                  user={user}
                  isAdmin={isAdmin}
                  adminLoading={
                    adminLoading
                  }
                >

                  <AdminCourses />

                </AdminRoute>
              }
            />


            {/* ==========================================
                404
            ========================================== */}

            <Route
              path="*"
              element={
                <Navigate
                  to="/"
                  replace
                />
              }
            />

          </Routes>

        </Suspense>

      </main>


      {/* ==================================================
          SINGLE FOOTER
      ================================================== */}

      <Footer />

    </div>
  );
}


export default App;