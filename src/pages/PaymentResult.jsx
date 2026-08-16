import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

function providerMessage(order) {
  const code = String(order?.providerStatusCode || "");
  if (code === "97") return "Payment rejected because the customer's account/wallet has insufficient balance. No course access was granted.";
  if (code === "106") return "Payment rejected because the transaction limit was exceeded. No course access was granted.";
  if (code === "001") return "The payment is still pending with the gateway. Course access will remain locked until it is verified.";
  return order?.providerStatusMessage || "The payment was not approved, so course access remains locked.";
}

export default function PaymentResult({ failed = false }) {
  const [params] = useSearchParams();
  const orderId = params.get("orderId") || "";
  const [status, setStatus] = useState("loading");
  const [order, setOrder] = useState(null);

  useEffect(() => {
    let active = true;
    let timer = null;
    let attempts = 0;

    const load = async () => {
      if (!orderId) { setStatus("invalid"); return; }
      try {
        const snap = await getDoc(doc(db, "orders", orderId));
        if (!active) return;
        if (!snap.exists()) { setStatus("invalid"); return; }
        const data = snap.data();
        setOrder(data);
        const nextStatus = data.status || "pending";
        setStatus(nextStatus);
        const waiting = ["pending", "payment_started", "callback_received"].includes(nextStatus);
        // The PayFast callback performs the authoritative server-side gateway check.
        // Keep polling Firestore so a delayed callback unlocks the course without a refresh.
        if (waiting && attempts < 45) { attempts += 1; timer = window.setTimeout(load, 2000); }
      } catch (error) {
        console.error("Payment result error:", error);
        if (active) setStatus("error");
      }
    };

    load();
    return () => { active = false; if (timer) window.clearTimeout(timer); };
  }, [orderId]);

  const paid = status === "paid";
  const waiting = ["pending", "payment_started", "callback_received"].includes(status);
  const failedState = failed || ["failed", "cancelled", "payment_failed", "rejected"].includes(status);
  const detail = failedState ? providerMessage(order) : order?.providerStatusMessage;

  return <main className="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-16"><div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-slate-200 sm:p-12">
    {status === "loading" ? <Loader2 className="mx-auto animate-spin text-blue-600" size={42} /> : paid ? <CheckCircle2 className="mx-auto text-emerald-500" size={52} /> : failedState ? <XCircle className="mx-auto text-red-500" size={52} /> : waiting ? <Clock3 className="mx-auto text-amber-500" size={52} /> : <XCircle className="mx-auto text-slate-400" size={52} />}
    <h1 className="mt-6 text-2xl font-black text-slate-950">{paid ? "Payment confirmed" : failedState ? "Payment not approved" : waiting ? "Confirming your payment..." : "Payment status unavailable"}</h1>
    <p className="mt-3 text-sm leading-6 text-slate-600">{paid ? `Your payment for ${order?.courseTitle || "the course"} is confirmed. Full course access is now unlocked.` : failedState ? detail : waiting ? "We are checking the payment result. Your course stays locked until the server verifies the exact order amount." : "Please return to your dashboard or contact support if this continues."}</p>
    {orderId && <p className="mt-5 rounded-xl bg-slate-50 px-3 py-2 font-mono text-xs text-slate-500">Order: {orderId}</p>}
    {paid && <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">✓ Payment verified — your paid course is unlocked.</div>}
    {failedState && order?.providerStatusCode && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-black text-red-800">Gateway status: {order.providerStatusCode}</div>}
    <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center"><Link to="/courses" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">Browse Courses</Link><Link to="/dashboard" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700">Dashboard</Link></div>
  </div></main>;
}
