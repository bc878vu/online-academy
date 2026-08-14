import { useCallback, useEffect, useState } from "react";
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { BadgePercent, CalendarDays, CheckCircle2, Edit3, Plus, RefreshCw, Save, Tag, Trash2, X } from "lucide-react";
import { db } from "../firebase";

const EMPTY = { code: "", type: "percent", value: "", maxDiscount: "", minOrder: "", startsAt: "", expiresAt: "", usageLimit: "", courseIds: "", active: true };

function toInputDate(value) {
  if (!value?.toDate) return "";
  const d = value.toDate();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toTimestamp(value) {
  return value ? Timestamp.fromDate(new Date(value)) : null;
}

export default function AdminDiscounts() {
  const [coupons, setCoupons] = useState([]);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [couponSnap, courseSnap] = await Promise.all([getDocs(collection(db, "coupons")), getDocs(collection(db, "courses"))]);
      setCoupons(couponSnap.docs.map((item) => ({ id: item.id, ...item.data() })));
      setCourses(courseSnap.docs.map((item) => ({ id: item.id, ...item.data() })));
    } catch (error) {
      console.error("Commerce load error:", error);
      setMessage("Unable to load discounts. Make sure you are signed in as admin.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setShowForm(true); setMessage(""); };
  const openEdit = (coupon) => {
    setEditing(coupon.id);
    setForm({
      code: coupon.id,
      type: coupon.type || "percent",
      value: coupon.value ?? "",
      maxDiscount: coupon.maxDiscount ?? "",
      minOrder: coupon.minOrder ?? "",
      startsAt: toInputDate(coupon.startsAt),
      expiresAt: toInputDate(coupon.expiresAt),
      usageLimit: coupon.usageLimit ?? "",
      courseIds: Array.isArray(coupon.courseIds) ? coupon.courseIds.join(", ") : "",
      active: coupon.active !== false,
    });
    setShowForm(true);
  };

  const save = async (event) => {
    event.preventDefault();
    if (saving) return;
    const code = form.code.trim().toUpperCase().replace(/\s+/g, "");
    const value = Number(form.value);
    if (!code || !/^[A-Z0-9_-]{3,32}$/.test(code)) return setMessage("Coupon code must be 3-32 characters: A-Z, 0-9, _ or -.");
    if (!Number.isFinite(value) || value <= 0) return setMessage("Discount value must be greater than zero.");
    if (form.type === "percent" && value > 100) return setMessage("Percentage discount cannot exceed 100%.");
    setSaving(true); setMessage("");
    try {
      const data = {
        code,
        type: form.type,
        value,
        maxDiscount: Number(form.maxDiscount || 0),
        minOrder: Number(form.minOrder || 0),
        startsAt: toTimestamp(form.startsAt),
        expiresAt: toTimestamp(form.expiresAt),
        usageLimit: Number(form.usageLimit || 0),
        courseIds: form.courseIds.split(",").map((v) => v.trim()).filter(Boolean),
        active: Boolean(form.active),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, "coupons", code), data, { merge: true });
      setMessage("Discount saved successfully.");
      setShowForm(false);
      await load();
    } catch (error) {
      console.error("Save coupon error:", error);
      setMessage("Unable to save discount.");
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm(`Delete coupon ${id}?`)) return;
    try { await deleteDoc(doc(db, "coupons", id)); await load(); } catch (error) { console.error(error); setMessage("Unable to delete discount."); }
  };

  return (
    <main className="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-black uppercase tracking-wider text-blue-600">Commerce</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Discounts & Coupons</h1><p className="mt-2 text-sm text-slate-500">Create secure coupon rules for paid courses.</p></div>
          <div className="flex gap-2"><button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"><RefreshCw size={17} /> Refresh</button><button onClick={openNew} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20"><Plus size={18} /> New Discount</button></div>
        </div>

        {message && <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-800">{message}</div>}

        {showForm && <form onSubmit={save} className="mt-7 rounded-3xl bg-white p-5 shadow-xl ring-1 ring-slate-200 sm:p-7">
          <div className="flex items-center justify-between"><div><h2 className="text-xl font-black text-slate-900">{editing ? "Edit Discount" : "Create Discount"}</h2><p className="mt-1 text-xs text-slate-500">All discount calculations are revalidated on the server.</p></div><button type="button" onClick={() => setShowForm(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X /></button></div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="lg:col-span-2 text-sm font-bold text-slate-700">Code<input disabled={Boolean(editing)} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="WELCOME20" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-blue-500" /></label>
            <label className="text-sm font-bold text-slate-700">Type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3"><option value="percent">Percentage</option><option value="fixed">Fixed PKR</option></select></label>
            <label className="text-sm font-bold text-slate-700">Value<input type="number" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" /></label>
            <label className="text-sm font-bold text-slate-700">Max Discount<input type="number" min="0" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} placeholder="0 = unlimited" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" /></label>
            <label className="text-sm font-bold text-slate-700">Minimum Order<input type="number" min="0" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" /></label>
            <label className="text-sm font-bold text-slate-700">Usage Limit<input type="number" min="0" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} placeholder="0 = unlimited" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" /></label>
            <label className="text-sm font-bold text-slate-700">Starts<input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" /></label>
            <label className="text-sm font-bold text-slate-700">Expires<input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" /></label>
            <label className="md:col-span-2 lg:col-span-4 text-sm font-bold text-slate-700">Course IDs <span className="font-normal text-slate-400">(comma separated; blank = all courses)</span><input value={form.courseIds} onChange={(e) => setForm({ ...form, courseIds: e.target.value })} placeholder="courseId1, courseId2" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" /></label>
            <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active discount</label>
          </div>
          <button disabled={saving} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-60"><Save size={18} /> {saving ? "Saving..." : "Save Discount"}</button>
        </form>}

        <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {loading ? <div className="rounded-3xl bg-white p-10 text-center text-slate-500 md:col-span-2 xl:col-span-3"><RefreshCw className="mx-auto animate-spin" /></div> : coupons.length === 0 ? <div className="rounded-3xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200 md:col-span-2 xl:col-span-3"><BadgePercent className="mx-auto text-slate-300" size={44} /><h2 className="mt-4 font-black text-slate-900">No discounts yet</h2><p className="mt-2 text-sm text-slate-500">Create your first coupon code.</p></div> : coupons.map((coupon) => <article key={coupon.id} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="flex items-start justify-between gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Tag /></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${coupon.active === false ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"}`}>{coupon.active === false ? "Inactive" : "Active"}</span></div><p className="mt-5 text-lg font-black tracking-wider text-slate-950">{coupon.id}</p><p className="mt-1 text-sm font-bold text-blue-600">{coupon.type === "fixed" ? `Rs. ${Number(coupon.value).toLocaleString()} OFF` : `${coupon.value}% OFF`}</p><div className="mt-4 space-y-2 text-xs text-slate-500"><p>Minimum: Rs. {Number(coupon.minOrder || 0).toLocaleString()}</p><p>Usage limit: {Number(coupon.usageLimit || 0) || "Unlimited"}</p><p>Courses: {Array.isArray(coupon.courseIds) && coupon.courseIds.length ? `${coupon.courseIds.length} selected` : "All courses"}</p></div><div className="mt-5 flex gap-2"><button onClick={() => openEdit(coupon)} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700"><Edit3 size={16} /> Edit</button><button onClick={() => remove(coupon.id)} className="inline-flex items-center justify-center rounded-xl bg-red-50 px-3 py-2.5 text-red-600"><Trash2 size={17} /></button></div></article>)}
        </div>
      </div>
    </main>
  );
}
