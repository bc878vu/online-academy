import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  GraduationCap,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from "firebase/auth";

import { auth } from "../firebase";

function Register() {
  const navigate = useNavigate();

  // ==========================================
  // FORM STATES
  // ==========================================

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ==========================================
  // UI STATES
  // ==========================================

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==========================================
  // EMAIL / PASSWORD REGISTRATION
  // ==========================================

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    // ------------------------------------------
    // CLEAN INPUTS
    // ------------------------------------------

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    // ------------------------------------------
    // BASIC VALIDATION
    // ------------------------------------------

    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }

    if (cleanName.length < 2) {
      setError("Full name must contain at least 2 characters.");
      return;
    }

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please create a password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (!confirmPassword) {
      setError("Please confirm your password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // ==========================================
    // CREATE FIREBASE ACCOUNT
    // ==========================================

    try {
      setLoading(true);

      // Create account
      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

      // Get newly created user
      const user = userCredential.user;

      // Save user's full name in Firebase Auth profile
      await updateProfile(user, {
        displayName: cleanName,
      });

      setSuccess(
        "Account created successfully. Redirecting..."
      );

      // Redirect after successful registration
      setTimeout(() => {
        navigate("/");
      }, 800);

    } catch (error) {
      console.error("Registration error:", error);

      switch (error.code) {
        case "auth/email-already-in-use":
          setError(
            "An account already exists with this email address."
          );
          break;

        case "auth/invalid-email":
          setError(
            "Please enter a valid email address."
          );
          break;

        case "auth/weak-password":
          setError(
            "Your password is too weak. Please choose a stronger password."
          );
          break;

        case "auth/network-request-failed":
          setError(
            "Network error. Please check your internet connection."
          );
          break;

        case "auth/operation-not-allowed":
          setError(
            "Email/password registration is not enabled in Firebase."
          );
          break;

        default:
          setError(
            "Unable to create your account. Please try again."
          );
      }

    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // GOOGLE REGISTRATION / LOGIN
  // ==========================================

  const handleGoogleSignup = async () => {
    setError("");
    setSuccess("");

    try {
      setGoogleLoading(true);

      const provider = new GoogleAuthProvider();

      // Always show Google account chooser
      provider.setCustomParameters({
        prompt: "select_account",
      });

      // Google authentication
      await signInWithPopup(
        auth,
        provider
      );

      setSuccess(
        "Google account connected successfully. Redirecting..."
      );

      setTimeout(() => {
        navigate("/");
      }, 800);

    } catch (error) {
      console.error("Google signup error:", error);

      switch (error.code) {
        case "auth/popup-closed-by-user":
          setError(
            "Google sign-in was cancelled."
          );
          break;

        case "auth/popup-blocked":
          setError(
            "Your browser blocked the Google sign-in popup. Please allow popups for this website."
          );
          break;

        case "auth/cancelled-popup-request":
          setError(
            "Another Google sign-in request is already in progress."
          );
          break;

        case "auth/account-exists-with-different-credential":
          setError(
            "An account already exists with this email using another sign-in method."
          );
          break;

        case "auth/network-request-failed":
          setError(
            "Network error. Please check your internet connection."
          );
          break;

        case "auth/unauthorized-domain":
          setError(
            "This website domain is not authorized in Firebase Authentication."
          );
          break;

        case "auth/operation-not-allowed":
          setError(
            "Google sign-in is not enabled in Firebase Authentication."
          );
          break;

        default:
          setError(
            "Google signup failed. Please try again."
          );
      }

    } finally {
      setGoogleLoading(false);
    }
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="min-h-[calc(100vh-81px)] bg-slate-50 px-4 py-10 sm:px-6">

      <div className="mx-auto flex w-full max-w-md items-center justify-center">

        <div className="w-full">

          {/* =====================================
              REGISTER CARD
          ====================================== */}

          <div className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/60 ring-1 ring-slate-200 sm:p-8">

            {/* =====================================
                HEADER
            ====================================== */}

            <div className="mb-7 text-center">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">

                <GraduationCap
                  size={34}
                  strokeWidth={2}
                  className="text-blue-600"
                />

              </div>

              <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
                Create Account
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Join Online Academy and start your learning journey.
              </p>

            </div>

            {/* =====================================
                ERROR MESSAGE
            ====================================== */}

            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">

                <AlertCircle
                  size={19}
                  className="mt-0.5 shrink-0 text-red-600"
                />

                <p className="text-sm font-medium leading-5 text-red-700">
                  {error}
                </p>

              </div>
            )}

            {/* =====================================
                SUCCESS MESSAGE
            ====================================== */}

            {success && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">

                <CheckCircle2
                  size={19}
                  className="mt-0.5 shrink-0 text-green-600"
                />

                <p className="text-sm font-medium leading-5 text-green-700">
                  {success}
                </p>

              </div>
            )}

            {/* =====================================
                GOOGLE SIGNUP
            ====================================== */}

            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={loading || googleLoading}
              className="group flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3.5 font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >

              {googleLoading ? (
                <>
                  <Loader2
                    size={20}
                    className="animate-spin text-blue-600"
                  />

                  <span>
                    Connecting to Google...
                  </span>
                </>
              ) : (
                <>
                  {/* Google Logo */}

                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fill="#4285F4"
                      d="M21.35 12.27c0-.77-.07-1.51-.22-2.23H12v4.22h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.38Z"
                    />

                    <path
                      fill="#34A853"
                      d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.29v2.53A9.75 9.75 0 0 0 12 21.75Z"
                    />

                    <path
                      fill="#FBBC05"
                      d="M6.53 13.83a5.86 5.86 0 0 1 0-3.66V7.64H3.29a9.75 9.75 0 0 0 0 8.72l3.24-2.53Z"
                    />

                    <path
                      fill="#EA4335"
                      d="M12 6.14c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.83 3.22 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.71 5.39l3.24 2.53C7.3 7.86 9.46 6.14 12 6.14Z"
                    />
                  </svg>

                  <span>
                    Continue with Google
                  </span>
                </>
              )}

            </button>

            {/* =====================================
                DIVIDER
            ====================================== */}

            <div className="my-6 flex items-center gap-4">

              <div className="h-px flex-1 bg-slate-200" />

              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Or register with email
              </span>

              <div className="h-px flex-1 bg-slate-200" />

            </div>

            {/* =====================================
                REGISTRATION FORM
            ====================================== */}

            <form
              onSubmit={handleRegister}
              className="space-y-5"
            >

              {/* =====================================
                  FULL NAME
              ====================================== */}

              <div>

                <label
                  htmlFor="fullName"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Full Name
                </label>

                <div className="relative">

                  <User
                    size={19}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      setError("");
                    }}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    disabled={loading || googleLoading}
                    className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />

                </div>

              </div>

              {/* =====================================
                  EMAIL
              ====================================== */}

              <div>

                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email Address
                </label>

                <div className="relative">

                  <Mail
                    size={19}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={loading || googleLoading}
                    className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />

                </div>

              </div>

              {/* =====================================
                  PASSWORD
              ====================================== */}

              <div>

                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Password
                </label>

                <div className="relative">

                  <Lock
                    size={19}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="password"
                    name="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    disabled={loading || googleLoading}
                    className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (prev) => !prev
                      )
                    }
                    disabled={loading || googleLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >

                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}

                  </button>

                </div>

                <p className="mt-2 text-xs text-slate-400">
                  Use at least 6 characters.
                </p>

              </div>

              {/* =====================================
                  CONFIRM PASSWORD
              ====================================== */}

              <div>

                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Confirm Password
                </label>

                <div className="relative">

                  <Lock
                    size={19}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(
                        e.target.value
                      );
                      setError("");
                    }}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    disabled={loading || googleLoading}
                    className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (prev) => !prev
                      )
                    }
                    disabled={loading || googleLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed"
                    aria-label={
                      showConfirmPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >

                    {showConfirmPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}

                  </button>

                </div>

              </div>

              {/* =====================================
                  CREATE ACCOUNT BUTTON
              ====================================== */}

              <button
                type="submit"
                disabled={
                  loading ||
                  googleLoading
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/20 transition-all duration-200 hover:bg-blue-700 hover:shadow-blue-600/30 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {loading ? (
                  <>
                    <Loader2
                      size={20}
                      className="animate-spin"
                    />

                    <span>
                      Creating Account...
                    </span>
                  </>
                ) : (
                  "Create Account"
                )}

              </button>

            </form>

            {/* =====================================
                LOGIN LINK
            ====================================== */}

            <div className="mt-7 border-t border-slate-100 pt-6 text-center">

              <p className="text-sm text-slate-500">

                Already have an account?{" "}

                <Link
                  to="/login"
                  className="font-semibold text-blue-600 transition hover:text-blue-700"
                >
                  Login
                </Link>

              </p>

            </div>

          </div>

          {/* =====================================
              SECURITY NOTE
          ====================================== */}

          <p className="mt-5 text-center text-xs leading-5 text-slate-400">
            Your account information is securely protected by Firebase Authentication.
          </p>

        </div>

      </div>

    </div>
  );
}

export default Register;