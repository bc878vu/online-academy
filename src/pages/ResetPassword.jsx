import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle,
  Clock3,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "../firebase";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Firebase custom email action handlers normally receive the code directly
  // as ?oobCode=. We also support a nested continueUrl so older/generated
  // action links can still reach the same reset screen.
  const actionData = useMemo(() => {
    const directCode = searchParams.get("oobCode") || "";
    const directMode = searchParams.get("mode") || "";
    const continueUrl = searchParams.get("continueUrl") || "";

    if (directCode) {
      return { oobCode: directCode, mode: directMode || "resetPassword" };
    }

    if (continueUrl) {
      try {
        const nested = new URL(continueUrl, window.location.origin);
        return {
          oobCode: nested.searchParams.get("oobCode") || "",
          mode: nested.searchParams.get("mode") || "resetPassword",
        };
      } catch {
        return { oobCode: "", mode: "resetPassword" };
      }
    }

    return { oobCode: "", mode: directMode };
  }, [searchParams]);

  const oobCode = actionData.oobCode;
  const actionMode = actionData.mode;

  const [checking, setChecking] = useState(true);
  const [validCode, setValidCode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    const validateCode = async () => {
      if (actionMode && actionMode !== "resetPassword") {
        if (active) {
          setError("This link is not a password reset link.");
          setChecking(false);
        }
        return;
      }

      if (!oobCode) {
        if (active) {
          setError(
            "This password reset link is missing, incomplete, or invalid. Please request a new one."
          );
          setChecking(false);
        }
        return;
      }

      try {
        const accountEmail = await verifyPasswordResetCode(auth, oobCode);
        if (!active) return;
        setEmail(accountEmail || "");
        setValidCode(true);
      } catch (firebaseError) {
        console.error("Password reset code validation error:", firebaseError);
        if (!active) return;

        switch (firebaseError?.code) {
          case "auth/expired-action-code":
            setError(
              "This password reset link has expired. Please request a new reset link."
            );
            break;
          case "auth/invalid-action-code":
            setError(
              "This reset link is invalid or has already been used. Please request a new one."
            );
            break;
          case "auth/user-disabled":
            setError("This account has been disabled. Please contact support.");
            break;
          case "auth/user-not-found":
            setError("This account no longer exists. Please contact support.");
            break;
          default:
            setError(
              "We could not verify this reset link. Please request a new one."
            );
        }
      } finally {
        if (active) setChecking(false);
      }
    };

    validateCode();
    return () => {
      active = false;
    };
  }, [actionMode, oobCode]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!validCode || !oobCode) {
      setError("This reset link is no longer valid. Please request a new one.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError("Password must contain at least one uppercase letter.");
      return;
    }

    if (!/[a-z]/.test(password)) {
      setError("Password must contain at least one lowercase letter.");
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError("Password must contain at least one number.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // Firebase consumes the action code here. A successful confirmation
      // invalidates this reset code, so the same email link cannot be reused.
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
      setValidCode(false);
      setPassword("");
      setConfirmPassword("");
    } catch (firebaseError) {
      console.error("Password update error:", firebaseError);

      switch (firebaseError?.code) {
        case "auth/expired-action-code":
          setError(
            "This password reset link has expired. Please request a new one."
          );
          setValidCode(false);
          break;
        case "auth/invalid-action-code":
          setError(
            "This reset link is invalid or has already been used. Please request a new one."
          );
          setValidCode(false);
          break;
        case "auth/weak-password":
          setError("Please choose a stronger password.");
          break;
        case "auth/user-disabled":
          setError("This account has been disabled. Please contact support.");
          break;
        default:
          setError("Unable to update the password right now. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-76px)] bg-slate-50 px-5 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto flex w-full max-w-md items-center justify-center">
        <section className="w-full rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-600"
          >
            <ArrowLeft size={17} />
            Back to Login
          </Link>

          {checking ? (
            <div className="py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Loader2 size={27} className="animate-spin" />
              </div>
              <h1 className="mt-5 text-2xl font-bold text-slate-900">
                Checking Reset Link
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Please wait while we verify your secure password reset link.
              </p>
            </div>
          ) : success ? (
            <div className="py-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle size={34} />
              </div>
              <h1 className="mt-5 text-2xl font-bold text-slate-900">
                Password Updated
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Your password has been changed successfully. The reset link is
                now invalid and cannot be used again. You can sign in with your
                new password.
              </p>
              <button
                type="button"
                onClick={() => navigate("/login", { replace: true })}
                className="mt-7 w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white shadow-md shadow-blue-600/15 transition hover:bg-blue-700"
              >
                Go to Login
              </button>
            </div>
          ) : (
            <>
              <div className="mt-8">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <KeyRound size={25} />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  Create New Password
                </h1>
                <p className="mt-3 leading-6 text-slate-600">
                  Set a new password for your Online Academy account.
                </p>
                {email && (
                  <p className="mt-2 truncate text-sm font-semibold text-slate-700">
                    {email}
                  </p>
                )}
              </div>

              {error && (
                <div
                  role="alert"
                  className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
                >
                  <ShieldAlert size={18} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {validCode && (
                <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                  <div>
                    <label
                      htmlFor="new-password"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      New Password
                    </label>
                    <div className="relative">
                      <KeyRound
                        size={18}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        id="new-password"
                        name="new-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        minLength={8}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter new password"
                        disabled={loading}
                        className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-12 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Use 8+ characters with uppercase, lowercase, and a number.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="confirm-password"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <KeyRound
                        size={18}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        id="confirm-password"
                        name="confirm-password"
                        type={showConfirm ? "text" : "password"}
                        autoComplete="new-password"
                        minLength={8}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Confirm new password"
                        disabled={loading}
                        className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-12 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((value) => !value)}
                        aria-label={showConfirm ? "Hide confirmation password" : "Show confirmation password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700"
                      >
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-semibold text-white shadow-md shadow-blue-600/15 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={19} className="animate-spin" />
                        Updating Password...
                      </>
                    ) : (
                      "Set New Password"
                    )}
                  </button>
                </form>
              )}

              {!validCode && (
                <Link
                  to="/forgot-password"
                  className="mt-7 flex w-full items-center justify-center rounded-xl bg-blue-600 py-3.5 font-semibold text-white shadow-md shadow-blue-600/15 transition hover:bg-blue-700"
                >
                  Request New Reset Link
                </Link>
              )}

              <div className="mt-6 flex items-start gap-2 rounded-xl bg-slate-50 px-3.5 py-3 text-xs leading-5 text-slate-500 ring-1 ring-slate-100">
                <Clock3 size={15} className="mt-0.5 shrink-0 text-slate-400" />
                <span>
                  This is a Firebase one-time password reset code. Firebase
                  invalidates it when it expires or after a successful reset.
                </span>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-3 text-xs leading-5 text-blue-700">
                <ShieldCheck size={15} className="mt-0.5 shrink-0" />
                <span>
                  For your security, never share a reset link with anyone.
                </span>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

export default ResetPassword;
