import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function PaymentResult({ failed = false }) {
  const [params] = useSearchParams();
  const orderId = params.get("orderId") || "";
  const [status, setStatus] = useState("loading");
  const [order, setOrder] = useState(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!orderId) { setStatus("invalid"); return; }
      try {
        const snap = await getDoc(doc(db, "orders", orderId));
        if (!active) return;
        if (!snap.exists()) { setStatus("invalid"); return; }
        const data = snap.data();
        setOrder(data);
        setStatus(data.status || "pending");
      } catch (error) {
        console.error("Payment result error:", error);
        if (active) setStatus("error");
      }
    };
    load();
    return () => { active = false; };
  }, [orderId]);

  const paid = status === "paid";
  const waiting = ["pending", "payment_started", "callback_received"].includes(status);
  const failedState = failed || ["failed", "cancelled"].includes(status);

  return <main className="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-16"><div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-slate-200 sm:p-12">
    {status === "loading" ? <Loader2 className="mx-auto animate-spin text-blue-600" size={42} /> : paid ? <CheckCircle2 className="mx-auto text-emerald-500" size={52} /> : failedState ? <XCircle className="mx-auto text-red-500" size={52} /> : waiting ? <Clock3 className="mx-auto text-amber-500" size={52} /> : <XCircle className="mx-auto text-slate-400" size={52} />}
    <h1 className="mt-6 text-2xl font-black text-slate-950">{paid ? "Payment confirmed" : failedState ? "Payment not completed" : waiting ? "Payment received for verification" : "Payment status unavailable"}</h1>
    <p className="mt-3 text-sm leading-6 text-slate-600">{paid ? `Your payment for ${order?.courseTitle || "the course"} is confirmed.` : failedState ? "No course access has been granted for this unsuccessful payment." : waiting ? "Your payment gateway response is being reconciled. Course access is granted only after the transaction is verified." : "Please return to your dashboard or contact support if this continues."}</p>
    {orderId && <p className="mt-5 rounded-xl bg-slate-50 px-3 py-2 font-mono text-xs text-slate-500">Order: {orderId}</p>}
    <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center"><Link to="/courses" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">Browse Courses</Link><Link to="/dashboard" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700">Dashboard</Link></div>
  </div></main>;
}
