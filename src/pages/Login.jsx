import { useState } from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";

import {
  GraduationCap,
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";

import { auth, googleProvider } from "../firebase";


function Login() {

  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setError("Please enter your email address and password.");
      return;
    }

    try {
      setLoading(true);

      await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      setSuccess("Login successful. Redirecting...");

      navigate("/dashboard", {
        replace: true,
      });
    } catch (error) {
      console.error("Login error:", error);

      switch (error?.code) {
        case "auth/invalid-credential":
          setError("Invalid email or password.");
          break;
        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;
        case "auth/user-disabled":
          setError("This account has been disabled. Please contact support.");
          break;
        case "auth/user-not-found":
          setError("No account was found with this email address.");
          break;
        case "auth/wrong-password":
          setError("Incorrect password.");
          break;
        case "auth/too-many-requests":
          setError("Too many login attempts. Please try again later.");
          break;
        case "auth/network-request-failed":
          setError("Network error. Please check your internet connection.");
          break;
        default:
          setError("Unable to login. Please check your details and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (loading || googleLoading) return;

    setError("");
    setSuccess("");

    try {
      setGoogleLoading(true);

      await signInWithPopup(
        auth,
        googleProvider
      );

      setSuccess("Google login successful. Redirecting...");

      navigate("/dashboard", {
        replace: true,
      });
    } catch (error) {
      if (auth.currentUser) {
        console.warn(
          "Google popup reported an error after authentication completed. Continuing.",
          error
        );

        setSuccess("Google login successful. Redirecting...");

        navigate("/dashboard", {
          replace: true,
        });

        return;
      }

      console.error("Google login error:", error);

      switch (error?.code) {
        case "auth/popup-closed-by-user":
          setError("Google login was cancelled.");
          break;
        case "auth/popup-blocked":
          setError("Your browser blocked the Google login popup. Please allow popups and try again.");
          break;
        case "auth/cancelled-popup-request":
          setError("Another Google login request is already in progress.");
          break;
        case "auth/account-exists-with-different-credential":
          setError("An account already exists with this email using another login method.");
          break;
        case "auth/unauthorized-domain":
          setError("This website domain is not authorized in Firebase Authentication.");
          break;
        case "auth/operation-not-allowed":
          setError("Google Sign-In is not enabled in Firebase Authentication.");
          break;
        case "auth/network-request-failed":
          setError("Network error. Please check your internet connection.");
          break;
        case "auth/invalid-api-key":
          setError("Firebase API key is invalid. Please check your Firebase configuration.");
          break;
        case "auth/argument-error":
          setError("Firebase Google authentication configuration error. Please restart the development server and try again.");
          break;
        default:
          setError("Google login failed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const isLoading = loading || googleLoading;

  return (
    <main className="min-h-[calc(100vh-76px)] bg-slate-50 px-5 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto flex w-full max-w-md items-center justify-center">
        <section className="w-full rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
              <GraduationCap size={32} className="text-blue-600" />
            </div>

            <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
              Welcome Back
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Sign in to continue your learning journey.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-700"
            >
              <CheckCircle size={18} className="mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3.5 font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {googleLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-sm font-bold text-blue-600">
                  G
                </span>
                Continue with Google
              </>
            )}
          </button>

          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Or continue with email
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email Address
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={isLoading}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-11 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="text-sm font-semibold text-slate-700"
                >
                  Password
                </label>

                <Link
                  to="/forgot-password"
                  className="text-sm font-semibold text-blue-600 transition hover:text-blue-700"
                >
                  Forgot Password?
                </Link>
              </div>

              <div className="relative">
                <Lock
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-11 pr-12 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                "Login"
              )}
            </button>
          </form>

          <div className="mt-7 border-t border-slate-100 pt-6 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-600"
            >
              <ArrowLeft size={16} />
              Back to Home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Login;
