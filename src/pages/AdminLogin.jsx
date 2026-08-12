import { useState } from "react";
import {
  Navigate,
  useNavigate,
  Link,
} from "react-router-dom";

import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  ShieldCheck,
  Mail,
  Lock,
  Loader2,
  GraduationCap,
  Eye,
  EyeOff,
} from "lucide-react";

import { auth } from "../firebase";

// ======================================================
// ADMIN CONFIG
// ======================================================

// Firebase Authentication mein jo admin account banaya hai
const ADMIN_EMAIL = "admin@onlineacademy.com";

// ======================================================
// ADMIN LOGIN
// ======================================================

function AdminLogin({
  user,
  isAdmin = false,
  adminLoading = false,
}) {
  const navigate = useNavigate();

  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  // ====================================================
  // ALREADY LOGGED-IN ADMIN
  // ====================================================

  if (
    user &&
    !adminLoading &&
    (
      isAdmin ||
      user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
    )
  ) {
    return (
      <Navigate
        to="/admin"
        replace
      />
    );
  }

  // ====================================================
  // LOGIN
  // ====================================================

  const handleLogin = async (event) => {
    event.preventDefault();

    if (loading) return;

    setError("");

    const cleanEmail = email.trim().toLowerCase();

    // --------------------------------------------------
    // Validation
    // --------------------------------------------------

    if (!cleanEmail) {
      setError("Please enter admin email.");
      return;
    }

    if (!password) {
      setError("Please enter admin password.");
      return;
    }

    // --------------------------------------------------
    // Admin email check
    // --------------------------------------------------

    if (cleanEmail !== ADMIN_EMAIL.toLowerCase()) {
      setError(
        "This account does not have administrator access."
      );
      return;
    }

    try {
      setLoading(true);

      // =================================================
      // FIREBASE AUTHENTICATION
      // =================================================

      const credential =
        await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

      const loggedUser = credential.user;

      // =================================================
      // FINAL ADMIN EMAIL VERIFICATION
      // =================================================

      if (
        loggedUser.email?.toLowerCase() !==
        ADMIN_EMAIL.toLowerCase()
      ) {
        await signOut(auth);

        setError(
          "Access denied. This account is not an administrator."
        );

        return;
      }

      // =================================================
      // SUCCESS
      // =================================================

      navigate(
        "/admin",
        {
          replace: true,
        }
      );

    } catch (err) {
      console.error(
        "Admin login error:",
        err
      );

      // =================================================
      // FIREBASE ERROR HANDLING
      // =================================================

      switch (err?.code) {
        case "auth/invalid-credential":
          setError(
            "Invalid admin email or password."
          );
          break;

        case "auth/invalid-email":
          setError(
            "Please enter a valid email address."
          );
          break;

        case "auth/user-not-found":
          setError(
            "No admin account exists with this email."
          );
          break;

        case "auth/wrong-password":
          setError(
            "Incorrect admin password."
          );
          break;

        case "auth/too-many-requests":
          setError(
            "Too many login attempts. Please try again later."
          );
          break;

        case "auth/network-request-failed":
          setError(
            "Network error. Please check your internet connection."
          );
          break;

        case "auth/user-disabled":
          setError(
            "This admin account has been disabled."
          );
          break;

        default:
          setError(
            "Admin login failed. Please try again."
          );
      }

    } finally {
      setLoading(false);
    }
  };

  // ====================================================
  // UI
  // ====================================================

  return (
    <main className="min-h-[calc(100vh-76px)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">

      <div className="mx-auto flex min-h-[calc(100vh-140px)] w-full max-w-md items-center justify-center">

        <div className="w-full">

          {/* ==================================================
              CARD
          ================================================== */}

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">

            {/* ==================================================
                TOP ACCENT
            ================================================== */}

            <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700" />

            <div className="p-6 sm:p-8">

              {/* ==================================================
                  HEADER
              ================================================== */}

              <div className="text-center">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 shadow-lg shadow-slate-950/20">

                  <ShieldCheck
                    className="h-8 w-8 text-white"
                    strokeWidth={2}
                  />

                </div>

                <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                  Admin Login
                </h1>

                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  Sign in with your administrator account
                  to manage Online Academy.
                </p>

              </div>

              {/* ==================================================
                  ERROR
              ================================================== */}

              {error && (
                <div
                  role="alert"
                  className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
                >
                  {error}
                </div>
              )}

              {/* ==================================================
                  FORM
              ================================================== */}

              <form
                onSubmit={handleLogin}
                className="mt-7 space-y-5"
              >

                {/* ==================================================
                    EMAIL
                ================================================== */}

                <div>

                  <label
                    htmlFor="admin-email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Admin Email
                  </label>

                  <div className="relative">

                    <Mail
                      size={19}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="admin-email"
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setError("");
                      }}
                      placeholder="admin@onlineacademy.com"
                      autoComplete="email"
                      disabled={loading}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />

                  </div>

                </div>

                {/* ==================================================
                    PASSWORD
                ================================================== */}

                <div>

                  <label
                    htmlFor="admin-password"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Admin Password
                  </label>

                  <div className="relative">

                    <Lock
                      size={19}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="admin-password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setError("");
                      }}
                      placeholder="Enter admin password"
                      autoComplete="current-password"
                      disabled={loading}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((prev) => !prev)
                      }
                      disabled={loading}
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
                    >
                      {showPassword ? (
                        <EyeOff size={19} />
                      ) : (
                        <Eye size={19} />
                      )}
                    </button>

                  </div>

                </div>

                {/* ==================================================
                    LOGIN BUTTON
                ================================================== */}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {loading ? (
                    <>
                      <Loader2
                        size={20}
                        className="animate-spin"
                      />

                      Signing in...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={19} />

                      Login as Admin
                    </>
                  )}

                </button>

              </form>

              {/* ==================================================
                  BACK TO STUDENT LOGIN
              ================================================== */}

              <div className="mt-7 border-t border-slate-100 pt-6 text-center">

                <Link
                  to="/login"
                  className="inline-flex items-center text-sm font-semibold text-blue-600 transition hover:text-blue-700"
                >
                  ← Back to Student Login
                </Link>

              </div>

            </div>

          </div>

          {/* ==================================================
              BRAND
          ================================================== */}

          <div className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-slate-400">

            <GraduationCap size={18} />

            <span>
              Online Academy
            </span>

          </div>

        </div>

      </div>

    </main>
  );
}

export default AdminLogin;