import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { applyActionCode } from "firebase/auth";
import { CheckCircle2, Loader2, MailCheck, ShieldAlert } from "lucide-react";
import { auth } from "../firebase";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Verifying your email securely...");

  useEffect(() => {
    let cancelled = false;
    const code = searchParams.get("oobCode");
    const completedByFirebase = searchParams.get("verified") === "1";

    if (completedByFirebase) {
      setStatus("success");
      setMessage("Your email has been verified successfully. Your Online Academy account is now secure.");
      return undefined;
    }

    if (!code) {
      setStatus("error");
      setMessage("This verification link is incomplete. Please request a new verification email from your profile.");
      return undefined;
    }

    (async () => {
      try {
        await applyActionCode(auth, code);
        if (cancelled) return;
        if (auth.currentUser) {
          await auth.currentUser.reload();
        }
        setStatus("success");
        setMessage("Your email has been verified successfully. Your Online Academy account is now secure.");
      } catch (error) {
        if (cancelled) return;
        console.error("Email verification error:", error);
        const expired = error?.code === "auth/expired-action-code" || error?.code === "auth/invalid-action-code";
        setStatus("error");
        setMessage(expired
          ? "This verification link has expired or has already been used. Please request a fresh verification email from your profile."
          : "We could not verify this email link. Please request a fresh verification email and try again.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <main className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-slate-50 px-4 py-12 sm:px-6">
      <section className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-7 text-center shadow-xl shadow-slate-900/10 sm:p-10">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${status === "success" ? "bg-emerald-50 text-emerald-600" : status === "error" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>
          {status === "loading" ? <Loader2 size={30} className="animate-spin" /> : status === "success" ? <CheckCircle2 size={31} /> : <ShieldAlert size={31} />}
        </div>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-blue-700">
          <MailCheck size={14} /> Online Academy Security
        </div>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          {status === "success" ? "Email verified" : status === "error" ? "Verification unavailable" : "Verifying email"}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">{message}</p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to="/dashboard" className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700">
            Continue to Online Academy
          </Link>
          <Link to="/profile" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">
            Open Profile
          </Link>
        </div>
      </section>
    </main>
  );
}
