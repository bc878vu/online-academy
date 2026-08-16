import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, BadgePercent, CheckCircle2, CreditCard, Loader2, LockKeyhole, ShieldCheck, XCircle } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

function money(value) { return `Rs. ${Number(value || 0).toLocaleString("en-PK")}`; }
const PAYMENT_METHOD = { id: "payfast", name: "PayFast Secure Checkout", type: "gateway", description: "Real-time payment through the secure gateway. Your bank/wallet/card balance is checked by the payment provider.", enabled: true, configured: true };

export default function Checkout() {
  const [searchParams] = useSearchParams(); const navigate = useNavigate(); const courseId = searchParams.get("courseId") || "";
  const [user, setUser] = useState(undefined); const [course, setCourse] = useState(null); const [selectedMethod] = useState("payfast"); const [loading, setLoading] = useState(true); const [couponCode, setCouponCode] = useState(""); const [order, setOrder] = useState(null); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!courseId) { setMessage("Course information is missing."); setLoading(false); return; }
      try {
        const courseSnap = await getDoc(doc(db, "courses", courseId));
        if (!active) return;
        if (!courseSnap.exists()) { setMessage("Course not found."); return; }
        setCourse({ id: courseSnap.id, ...courseSnap.data() });
      } catch (error) { console.error("Checkout course error:", error); setMessage("Unable to load this course right now."); }
      finally { if (active) setLoading(false); }
    };
    load(); return () => { active = false; };
  }, [courseId]);

  const price = Number(course?.price || 0); const oldPrice = Number(course?.oldPrice || 0); const isPaid = course?.isPaid === true || price > 0; const salePercent = oldPrice > price && price > 0 ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0; const selected = PAYMENT_METHOD;

  const startPayment = async () => {
    if (!user) { navigate(`/login?redirect=${encodeURIComponent(`/checkout?courseId=${courseId}`)}`); return; }
    if (!course || !isPaid || price <= 0) { setMessage("This course does not require payment."); return; }
    setBusy(true); setMessage("");
    try {
      const idToken = await user.getIdToken();
      const orderResponse = await fetch("/api/create-order", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` }, body: JSON.stringify({ courseId, couponCode, paymentMethod: "payfast" }) });
      const orderData = await orderResponse.json(); if (!orderResponse.ok) throw new Error(orderData.error || "Unable to create order"); setOrder(orderData);
      if (Number(orderData.finalAmount) <= 0) throw new Error("A paid course must be completed through the real payment gateway.");

      const paymentResponse = await fetch("/api/payfast-start", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` }, body: JSON.stringify({ orderId: orderData.orderId }) });
      const paymentData = await paymentResponse.json(); if (!paymentResponse.ok) throw new Error(paymentData.error || "Unable to start payment");
      const form = document.createElement("form"); form.method = "POST"; form.action = paymentData.action; form.style.display = "none";
      for (const [key, value] of Object.entries(paymentData.fields || {})) { const input = document.createElement("input"); input.type = "hidden"; input.name = key; input.value = value == null ? "" : String(value); form.appendChild(input); }
      document.body.appendChild(form); form.submit();
    } catch (error) { console.error("Checkout error:", error); setMessage(error?.message || "Unable to start payment. Please try again."); }
    finally { setBusy(false); }
  };

  const summary = useMemo(() => order || { originalAmount: price, discountAmount: 0, finalAmount: price }, [order, price]);
  if (loading || user === undefined) return <main className="min-h-[calc(100vh-72px)] bg-slate-50 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={32} /></main>;
  if (!course || !isPaid) return <main className="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-16"><div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-slate-200"><XCircle className="mx-auto text-red-500" size={44} /><h1 className="mt-5 text-2xl font-black text-slate-900">Checkout unavailable</h1><p className="mt-3 text-slate-600">{message || "This course is free or unavailable."}</p><Link to={`/courses/${courseId}`} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"><ArrowLeft size={18} /> Back to Course</Link></div></main>;

  return <main className="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl">
    <Link to={`/courses/${courseId}`} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600"><ArrowLeft size={17} /> Back to Course</Link>
    <div className="mt-7 grid gap-7 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl">{course.imageUrl && <img src={course.imageUrl} alt={course.title || "Course"} className="h-56 w-full object-cover opacity-90 sm:h-72" />}<div className="p-6 sm:p-8"><span className="inline-flex rounded-full bg-blue-500/15 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-blue-300 ring-1 ring-blue-400/20">Secure Checkout</span><h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">{course.title || "Online Course"}</h1><p className="mt-4 leading-7 text-slate-300">{course.description || "Complete your purchase to unlock the course."}</p><div className="mt-7 grid gap-3 sm:grid-cols-2">{["Structured lessons", "Progress tracking", "Course completion", "Certificate eligibility"].map((item) => <div key={item} className="flex items-center gap-2 rounded-xl bg-white/5 p-3 text-sm font-semibold text-slate-200"><CheckCircle2 size={17} className="text-emerald-400" /> {item}</div>)}</div></div></section>
      <section className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200 sm:p-8"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><CreditCard size={22} /></div><div><h2 className="text-xl font-black text-slate-900">Order Summary</h2><p className="text-xs font-semibold text-slate-400">Secure PKR payment</p></div></div>
        <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex justify-between gap-4 text-sm"><span className="text-slate-500">Course price</span><span className="font-bold text-slate-900">{money(summary.originalAmount)}</span></div>{oldPrice > price && <div className="mt-2 flex justify-between gap-4 text-sm"><span className="text-slate-500">Sale saving</span><span className="font-bold text-emerald-600">-{money(oldPrice - price)}</span></div>}<div className="my-4 border-t border-slate-200" /><div className="flex justify-between gap-4"><span className="font-black text-slate-900">Payable</span><span className="text-2xl font-black text-blue-600">{money(summary.finalAmount)}</span></div></div>
        <label className="mt-6 block text-sm font-black text-slate-800">Discount Code</label><div className="mt-2 flex gap-2"><div className="relative flex-1"><input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="Enter coupon" className="w-full rounded-xl border border-slate-200 bg-white py-3 px-3 text-sm font-bold uppercase outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" /></div><span className="flex items-center gap-1 rounded-xl bg-blue-50 px-3 text-xs font-black text-blue-700"><BadgePercent size={15} /> Apply</span></div>
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-blue-600" size={20} /><div><p className="text-sm font-black text-slate-900">Real payment verification</p><p className="mt-1 text-xs leading-5 text-slate-600">You will be redirected to PayFast. The actual bank/wallet/card transaction is processed there. If the customer's account has insufficient balance, the gateway rejects the payment and the course stays locked.</p></div></div></div>
        {salePercent > 0 && <p className="mt-3 text-xs font-bold text-emerald-600">Course sale: {salePercent}% off</p>}{message && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-sm font-semibold text-amber-800">{message}</div>}
        <button type="button" onClick={startPayment} disabled={busy || !selected.configured} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{busy ? <Loader2 size={19} className="animate-spin" /> : <CreditCard size={19} />}{busy ? "Opening secure payment..." : `Pay ${money(summary.finalAmount)} securely`}</button>
        {!selected.configured && <p className="mt-3 text-center text-xs font-bold text-amber-700">Payment gateway is not configured yet. Add the PayFast merchant credentials in Vercel before accepting real payments.</p>}
        <div className="mt-5 grid gap-3 text-xs font-semibold text-slate-500 sm:grid-cols-2"><div className="flex items-center gap-2"><LockKeyhole size={16} className="text-emerald-600" /> Server-side order validation</div><div className="flex items-center gap-2"><ShieldCheck size={16} className="text-blue-600" /> Gateway-verified payment</div></div><p className="mt-5 text-center text-[11px] leading-5 text-slate-400">Course access is granted only after the server confirms a successful PayFast transaction for the exact order amount.</p>
      </section>
    </div>
  </div></main>;
}
