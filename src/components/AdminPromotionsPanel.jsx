import { useCallback, useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore";
import { CalendarDays, Edit3, Eye, EyeOff, Megaphone, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { db } from "../firebase";

const EMPTY = {
  title: "",
  badge: "SPECIAL OFFER",
  message: "",
  type: "card",
  ctaText: "Avail Offer",
  ctaUrl: "/courses",
  couponCode: "",
  targetPages: "/",
  startsAt: "",
  expiresAt: "",
  active: true,
  dismissible: true,
};

function toInputDate(value) {
  if (!value?.toDate) return "";
  const d = value.toDate();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toTimestamp(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : Timestamp.fromDate(date);
}

function isLive(offer) {
  const now = Date.now();
  const start = offer.startsAt?.toMillis?.() || 0;
  const end = offer.expiresAt?.toMillis?.() || 0;
  return offer.active !== false && (!start || start <= now) && (!end || end >= now);
}

export default function AdminPromotionsPanel() {
  const [offers, setOffers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "siteOffers"));
      const next = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      next.sort((a, b) => (b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0));
      setOffers(next);
    } catch (error) {
      console.error("Promotion load error:", error);
      setMessage("Unable to load offers. Make sure you are signed in as admin.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => ({
    total: offers.length,
    live: offers.filter(isLive).length,
    hidden: offers.filter((offer) => offer.active === false).length,
  }), [offers]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
    setMessage("");
  };

  const openEdit = (offer) => {
    setEditing(offer.id);
    setForm({
      title: offer.title || "",
      badge: offer.badge || "SPECIAL OFFER",
      message: offer.message || "",
      type: offer.type || "card",
      ctaText: offer.ctaText || "Avail Offer",
      ctaUrl: offer.ctaUrl || "/courses",
      couponCode: offer.couponCode || "",
      targetPages: Array.isArray(offer.targetPages) ? offer.targetPages.join(", ") : (offer.targetPages || "/"),
      startsAt: toInputDate(offer.startsAt),
      expiresAt: toInputDate(offer.expiresAt),
      active: offer.active !== false,
      dismissible: offer.dismissible !== false,
    });
    setShowForm(true);
    setMessage("");
  };

  const save = async (event) => {
    event.preventDefault();
    if (saving) return;
    const title = form.title.trim();
    const messageText = form.message.trim();
    const targets = form.targetPages.split(",").map((item) => item.trim()).filter(Boolean);
    if (!title || title.length > 120) return setMessage("Offer title is required and must be 120 characters or less.");
    if (!messageText || messageText.length > 500) return setMessage("Offer message is required and must be 500 characters or less.");
    if (!targets.length) return setMessage("Add at least one target page, such as / or /courses. Use * for every page.");
    if (form.ctaUrl && !/^https?:\/\/|^\//i.test(form.ctaUrl.trim())) return setMessage("CTA URL must start with / or https://.");
    setSaving(true);
    setMessage("");
    try {
      const data = {
        title,
        badge: form.badge.trim().slice(0, 60) || "SPECIAL OFFER",
        message: messageText,
        type: form.type,
        ctaText: form.ctaText.trim().slice(0, 40) || "Avail Offer",
        ctaUrl: form.ctaUrl.trim() || "/courses",
        couponCode: form.couponCode.trim().toUpperCase().slice(0, 40),
        targetPages: targets,
        startsAt: toTimestamp(form.startsAt),
        expiresAt: toTimestamp(form.expiresAt),
        active: Boolean(form.active),
        dismissible: Boolean(form.dismissible),
        updatedAt: serverTimestamp(),
      };
      if (editing) {
        await updateDoc(doc(db, "siteOffers", editing), data);
      } else {
        await addDoc(collection(db, "siteOffers"), { ...data, createdAt: serverTimestamp() });
      }
      setMessage(editing ? "Offer updated successfully." : "Offer created successfully.");
      setShowForm(false);
      await load();
    } catch (error) {
      console.error("Promotion save error:", error);
      setMessage("Unable to save the offer.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (offer) => {
    try {
      await updateDoc(doc(db, "siteOffers", offer.id), { active: offer.active === false, updatedAt: serverTimestamp() });
      await load();
    } catch (error) {
      console.error("Promotion visibility error:", error);
      setMessage("Unable to change offer visibility.");
    }
  };

  const remove = async (offer) => {
    if (!window.confirm(`Delete offer “${offer.title || offer.id}”? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "siteOffers", offer.id));
      setMessage("Offer deleted.");
      await load();
    } catch (error) {
      console.error("Promotion delete error:", error);
      setMessage("Unable to delete the offer.");
    }
  };

  return (
    <section className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-indigo-600"><Megaphone size={17} /> Promotions & Offers</div>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Website offers</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Create a professional offer box, banner or popup. Choose exactly where it appears, let visitors claim it, and hide or edit it whenever you want.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">{stats.total} total</span>
          <span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">{stats.live} live</span>
          <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-500">{stats.hidden} hidden</span>
          <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700"><RefreshCw size={15} /> Refresh</button>
          <button type="button" onClick={openNew} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-black text-white shadow-lg shadow-indigo-600/20"><Plus size={16} /> New Offer</button>
        </div>
      </div>

      {message && <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm font-semibold text-indigo-800">{message}</div>}

      {showForm && (
        <form onSubmit={save} className="mt-7 rounded-3xl border border-indigo-100 bg-slate-50 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><h3 className="text-xl font-black text-slate-950">{editing ? "Edit Offer" : "Create Offer"}</h3><p className="mt-1 text-xs text-slate-500">Visitors only see an offer when it is active and its schedule matches.</p></div>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-700" aria-label="Close offer form"><X size={19} /></button>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-bold text-slate-700 lg:col-span-2">Offer title<input maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Summer Learning Offer" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-indigo-500" /></label>
            <label className="text-sm font-bold text-slate-700">Badge<input maxLength={60} value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="LIMITED TIME" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3" /></label>
            <label className="text-sm font-bold text-slate-700">Display type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3"><option value="card">Offer box</option><option value="banner">Top banner</option><option value="modal">Popup</option></select></label>
            <label className="text-sm font-bold text-slate-700 md:col-span-2 lg:col-span-4">Message<textarea maxLength={500} rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Save on selected courses for a limited time." className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-indigo-500" /></label>
            <label className="text-sm font-bold text-slate-700">Button text<input maxLength={40} value={form.ctaText} onChange={(e) => setForm({ ...form, ctaText: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3" /></label>
            <label className="text-sm font-bold text-slate-700 lg:col-span-2">Button destination<input value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} placeholder="/courses or https://example.com" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3" /></label>
            <label className="text-sm font-bold text-slate-700">Coupon code <span className="font-normal text-slate-400">optional</span><input value={form.couponCode} onChange={(e) => setForm({ ...form, couponCode: e.target.value.toUpperCase() })} placeholder="SAVE20" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3" /></label>
            <label className="text-sm font-bold text-slate-700 md:col-span-2 lg:col-span-4">Show on pages <span className="font-normal text-slate-400">comma separated; use * for every page</span><input value={form.targetPages} onChange={(e) => setForm({ ...form, targetPages: e.target.value })} placeholder="/, /courses, /help" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3" /></label>
            <label className="text-sm font-bold text-slate-700">Starts<input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3" /></label>
            <label className="text-sm font-bold text-slate-700">Ends<input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3" /></label>
            <label className="flex items-center gap-3 rounded-xl bg-white p-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Visible to visitors</label>
            <label className="flex items-center gap-3 rounded-xl bg-white p-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={form.dismissible} onChange={(e) => setForm({ ...form, dismissible: e.target.checked })} /> Allow visitor to close</label>
          </div>
          <div className="mt-5 flex flex-wrap gap-2"><button disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-black text-white shadow-lg shadow-indigo-600/20 disabled:opacity-60"><Save size={17} />{saving ? "Saving..." : editing ? "Update Offer" : "Publish Offer"}</button><button type="button" onClick={() => setShowForm(false)} className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700">Cancel</button></div>
        </form>
      )}

      <div className="mt-7 grid gap-4 lg:grid-cols-2">
        {loading ? <div className="rounded-3xl border border-slate-200 bg-slate-50 p-12 text-center lg:col-span-2"><RefreshCw className="mx-auto animate-spin text-indigo-600" /></div> : offers.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center lg:col-span-2"><Megaphone className="mx-auto text-slate-300" size={42} /><h3 className="mt-4 font-black text-slate-900">No offers yet</h3><p className="mt-2 text-sm text-slate-500">Create an offer and choose the pages where visitors should see it.</p></div> : offers.map((offer) => {
          const live = isLive(offer);
          return <article key={offer.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Megaphone size={20} /></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${live ? "bg-emerald-50 text-emerald-700" : offer.active === false ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-700"}`}>{live ? "Live" : offer.active === false ? "Hidden" : "Scheduled"}</span></div>
            <h3 className="mt-4 text-lg font-black text-slate-950">{offer.title || "Untitled offer"}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{offer.message}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500"><span className="rounded-lg bg-slate-100 px-2.5 py-1.5">{offer.type || "card"}</span><span className="rounded-lg bg-slate-100 px-2.5 py-1.5">Pages: {Array.isArray(offer.targetPages) ? offer.targetPages.join(", ") : offer.targetPages}</span>{offer.couponCode && <span className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-blue-700">{offer.couponCode}</span>}</div>
            {(offer.startsAt || offer.expiresAt) && <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-500"><CalendarDays size={14} />{offer.startsAt?.toDate?.().toLocaleString() || "Now"} → {offer.expiresAt?.toDate?.().toLocaleString() || "No end"}</div>}
            <div className="mt-5 grid grid-cols-3 gap-2"><button type="button" onClick={() => openEdit(offer)} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-black text-slate-700"><Edit3 size={15} /> Edit</button><button type="button" onClick={() => toggleActive(offer)} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-black text-slate-700">{offer.active === false ? <Eye size={15} /> : <EyeOff size={15} />}{offer.active === false ? "Show" : "Hide"}</button><button type="button" onClick={() => remove(offer)} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-black text-red-600"><Trash2 size={15} /> Delete</button></div>
          </article>;
        })}
      </div>
    </section>
  );
}
