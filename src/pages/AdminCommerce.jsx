import { useCallback, useEffect, useState } from "react";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { ArrowRight, BadgePercent, CheckCircle2, CreditCard, RefreshCw, Save, UserCog, Users } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { db } from "../firebase";
import AdminPromotionsPanel from "../components/AdminPromotionsPanel";
import AdminUsers from "./AdminUsers";

export default function AdminCommerce() {
  const [searchParams] = useSearchParams();
  if (searchParams.get("view") === "users") return <AdminUsers />;

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "courses"));
      setCourses(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    } catch (error) {
      console.error("Commerce courses error:", error);
      setMessage("Unable to load courses.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = (id, patch) => setCourses((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));

  const save = async (course) => {
    setSavingId(course.id); setMessage("");
    try {
      const price = Math.max(0, Number(course.price || 0));
      const oldPrice = Math.max(0, Number(course.oldPrice || 0));
      await updateDoc(doc(db, "courses", course.id), { isPaid: Boolean(course.isPaid), price, oldPrice, updatedAt: new Date() });
      setMessage(`Pricing saved for ${course.title || course.id}.`);
    } catch (error) {
      console.error("Pricing save error:", error);
      setMessage("Unable to save pricing. Make sure you are signed in as admin.");
    } finally { setSavingId(null); }
  };

  return (
    <main className="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <Link to="/admin/commerce" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white shadow-sm"><CreditCard size={16} /> Commerce</Link>
          <Link to="/admin/commerce?view=users" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50 hover:text-blue-700"><Users size={16} /> User Management</Link>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-black uppercase tracking-wider text-blue-600">Commerce</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Paid Courses</h1><p className="mt-2 text-sm text-slate-500">Set course prices and sale prices. Checkout validates the final price on the server.</p></div><div className="flex flex-wrap gap-2"><Link to="/admin/commerce?view=users" className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700"><UserCog size={17} /> Manage Users <ArrowRight size={16} /></Link><button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"><RefreshCw size={17} /> Refresh</button><Link to="/admin/discounts" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white"><BadgePercent size={17} /> Discounts <ArrowRight size={16} /></Link></div></div>
        {message && <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-800">{message}</div>}
        {loading ? <div className="mt-8 rounded-3xl bg-white p-12 text-center"><RefreshCw className="mx-auto animate-spin text-blue-600" /></div> : <div className="mt-8 grid gap-5 lg:grid-cols-2">{courses.map((course) => <article key={course.id} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"><div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><CreditCard /></div><div className="min-w-0 flex-1"><h2 className="truncate text-lg font-black text-slate-900">{course.title || "Untitled Course"}</h2><p className="mt-1 text-xs text-slate-400">ID: {course.id}</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${course.isPaid || Number(course.price) > 0 ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>{course.isPaid || Number(course.price) > 0 ? "Paid" : "Free"}</span></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-slate-700">Current Price (PKR)<input type="number" min="0" value={course.price ?? 0} onChange={(e) => update(course.id, { price: e.target.value, isPaid: Number(e.target.value) > 0 })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-bold outline-none focus:border-blue-500" /></label><label className="text-sm font-bold text-slate-700">Original Price (PKR)<input type="number" min="0" value={course.oldPrice ?? 0} onChange={(e) => update(course.id, { oldPrice: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-bold outline-none focus:border-blue-500" /></label></div><label className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={Boolean(course.isPaid || Number(course.price) > 0)} onChange={(e) => update(course.id, { isPaid: e.target.checked })} /> Require payment before course access</label><button disabled={savingId === course.id} onClick={() => save(course)} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-60"><Save size={17} /> {savingId === course.id ? "Saving..." : "Save Pricing"}</button></article>)}</div>}
        {!loading && courses.length === 0 && <div className="mt-8 rounded-3xl bg-white p-12 text-center text-slate-500">No courses found.</div>}
        <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 shrink-0 text-amber-600" /><p><strong>Payment security:</strong> students never submit a price from the browser as the source of truth. The checkout API reads the course price from Firestore and recalculates the discount on the server before creating an order.</p></div></div>
        <AdminPromotionsPanel />
      </div>
    </main>
  );
}
