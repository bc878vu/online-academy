import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, Loader2, Mail, ShieldCheck } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return setError("Please enter your email address.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return setError("Please enter a valid email address.");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail, { url: `${window.location.origin}/reset-password`, handleCodeInApp: true });
      setSuccess("Password reset email sent. Check your inbox and spam/junk folder, then open the reset link to create a new password.");
      setEmail("");
    } catch (firebaseError) {
      console.error("Password reset error:", firebaseError);
      const messages = {
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/user-not-found": "No account was found with this email address.",
        "auth/too-many-requests": "Too many reset requests. Please wait a little and try again.",
        "auth/network-request-failed": "Network error. Please check your internet connection and try again.",
        "auth/operation-not-allowed": "Email/password authentication is not enabled in Firebase Authentication.",
        "auth/unauthorized-continue-uri": "The password reset website URL is not authorized in Firebase Authentication."
      };
      setError(messages[firebaseError?.code] || "Unable to send the reset email right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-76px)] bg-slate-50 px-5 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto flex w-full max-w-md items-center justify-center">
        <section className="w-full rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600"><ArrowLeft size={17} /> Back to Login</Link>
          <div className="mt-8"><div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><ShieldCheck size={25} /></div><h1 className="text-3xl font-bold tracking-tight text-slate-900">Forgot Password?</h1><p className="mt-3 leading-6 text-slate-600">Enter your account email and we'll send you a secure password reset link.</p></div>
          {error && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">{error}</div>}
          {success && <div role="status" className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-700"><CheckCircle size={19} className="mt-0.5 shrink-0" /><span>{success}</span></div>}
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div><label htmlFor="forgot-email" className="mb-2 block text-sm font-semibold text-slate-700">Email Address</label><div className="relative"><Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input id="forgot-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" disabled={loading} className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50" required /></div></div>
            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{loading ? <><Loader2 size={19} className="animate-spin" /> Sending Reset Link...</> : "Send Reset Link"}</button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-600">Remember your password? <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">Login</Link></p>
        </section>
      </div>
    </main>
  );
}
export default ForgotPassword;
