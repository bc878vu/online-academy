import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { AlertCircle, Bell, CheckCircle2, Clock3, Mail, Send, X } from "lucide-react";
import { auth } from "../firebase";

const ADMIN_UID = "CDwCqUitlaSHEVeWQufCb0lXzMx1";
const API_PATH = "/api/notifications";
const PAYMENT_API_PATH = "/api/admin-payment-notifications";

async function getAdminToken() {
  const user = auth.currentUser;
  if (!user) throw new Error("Admin session is not available.");
  return user.getIdToken();
}

async function callNotificationApi(body) {
  const token = await getAdminToken();
  const response = await fetch(API_PATH, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "Notification request failed.");
  return data;
}

async function loadPaymentNotifications() {
  const token = await getAdminToken();
  const response = await fetch(PAYMENT_API_PATH, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "Unable to load payment notifications.");
  return Array.isArray(data?.notifications) ? data.notifications : [];
}

async function setPaymentNotificationRead(notificationId, read = true) {
  const token = await getAdminToken();
  const response = await fetch(PAYMENT_API_PATH, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ notificationId, read }) });
  if (!response.ok) throw new Error("Unable to update notification.");
}

function asDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function timeLabel(value) {
  const date = asDate(value);
  return date ? date.toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" }) : "Just now";
}

function money(value) {
  return `Rs. ${Math.round(Number(value || 0)).toLocaleString("en-PK")}`;
}

export default function AdminNotificationCenter() {
  const [admin, setAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [paymentNotifications, setPaymentNotifications] = useState([]);
  const [audience, setAudience] = useState("all");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  const previousPublished = useRef(new Map());
  const initialized = useRef(false);

  useEffect(() => onAuthStateChanged(auth, (user) => setAdmin(user?.uid === ADMIN_UID)), []);

  useEffect(() => {
    if (!admin) return undefined;
    let active = true;
    const refresh = async () => {
      try {
        const items = await loadPaymentNotifications();
        if (active) setPaymentNotifications(items);
      } catch (error) {
        console.error("Admin payment notifications load failed:", error);
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [admin]);

  useEffect(() => {
    if (!admin) return undefined;
    previousPublished.current = new Map();
    initialized.current = false;
    const unsubscribe = onSnapshot(collection(auth.app, "courses"), (snapshot) => {
      const current = new Map(previousPublished.current);
      if (!initialized.current) {
        snapshot.docs.forEach((item) => current.set(item.id, item.data()?.published === true));
        previousPublished.current = current;
        initialized.current = true;
        return;
      }
      snapshot.docChanges().forEach((change) => {
        const course = change.doc.data() || {};
        const wasPublished = current.get(change.doc.id) === true;
        const isPublished = course.published === true;
        current.set(change.doc.id, isPublished);
        if (isPublished && !wasPublished) {
          void callNotificationApi({ action: "courseLaunch", courseId: change.doc.id }).catch((error) => console.error("Automatic course notification failed:", error));
        }
      });
      previousPublished.current = current;
    }, (error) => console.error("Course notification watcher failed:", error));
    return unsubscribe;
  }, [admin]);

  if (!admin) return null;

  const unreadCount = paymentNotifications.filter((item) => item.read !== true).length;

  const markRead = async (notificationId) => {
    try {
      await setPaymentNotificationRead(notificationId, true);
      setPaymentNotifications((items) => items.map((item) => item.id === notificationId ? { ...item, read: true, readAt: new Date() } : item));
    } catch (error) {
      console.error("Unable to mark notification as read:", error);
    }
  };

  const markAllRead = async () => {
    const unread = paymentNotifications.filter((item) => item.read !== true);
    await Promise.all(unread.map((item) => setPaymentNotificationRead(item.id, true).catch((error) => console.error(error))));
    setPaymentNotifications((items) => items.map((item) => ({ ...item, read: true, readAt: new Date() })));
  };

  const sendAnnouncement = async (event) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setStatus({ type: "", text: "" });
    try {
      const result = await callNotificationApi({ action: "announcement", audience, subject, message, link });
      setStatus({ type: "ok", text: `Sent to ${result.sent || 0} users.` });
      setSubject("");
      setMessage("");
      setLink("");
    } catch (error) {
      setStatus({ type: "error", text: error?.message || "Unable to send announcement." });
    } finally {
      setSending(false);
    }
  };

  return <>
    <button type="button" onClick={() => { setOpen(true); setStatus({ type: "", text: "" }); }} className="fixed bottom-[5.75rem] right-3 z-[80] inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xl shadow-blue-900/30 transition hover:scale-105 hover:bg-blue-700 sm:bottom-5 sm:right-24 sm:h-14 sm:w-14" aria-label="Open admin notifications" title="Payment notifications">
      <Bell size={21} />
      {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white ring-2 ring-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
    </button>

    {open && <div className="fixed inset-0 z-[210] overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm">
      <div className="mx-auto mt-4 w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl sm:mt-10">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6"><div><p className="text-xs font-black uppercase tracking-[.16em] text-blue-600">Admin Notifications</p><h2 className="mt-1 text-xl font-black text-slate-950">Payments & announcements</h2></div><button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 hover:bg-slate-100" aria-label="Close"><X /></button></div>
        <div className="max-h-[78vh] overflow-y-auto p-5 sm:p-6">
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-amber-700">Payment activity</p><h3 className="mt-1 text-lg font-black text-slate-950">Incoming payment alerts</h3><p className="mt-1 text-xs leading-5 text-slate-600">Verified PayFast payments and submitted manual payment references appear here within a few seconds.</p></div>{unreadCount > 0 && <button type="button" onClick={markAllRead} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm ring-1 ring-amber-200">Mark all read</button>}</div>
            <div className="mt-4 space-y-2">
              {paymentNotifications.length === 0 && <div className="rounded-xl border border-dashed border-amber-200 bg-white/70 p-5 text-center text-sm font-semibold text-slate-500">No payment notifications yet.</div>}
              {paymentNotifications.map((item) => {
                const verified = item.event === "gateway_payment_verified";
                const failed = item.event === "gateway_payment_failed";
                const Icon = verified ? CheckCircle2 : failed ? AlertCircle : Clock3;
                return <button type="button" key={item.id} onClick={() => markRead(item.id)} className={`w-full rounded-2xl border p-4 text-left transition hover:border-blue-200 hover:bg-white ${item.read === true ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50/70"}`}><div className="flex items-start gap-3"><span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${verified ? "bg-emerald-100 text-emerald-700" : failed ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}><Icon size={18} /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-black text-slate-900">{item.title || "Payment notification"}</span><span className="text-[10px] font-bold text-slate-400">{timeLabel(item.createdAt)}</span></span><span className="mt-1 block text-xs leading-5 text-slate-600">{item.message}</span><span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-black text-slate-500"><span>{money(item.amount)}</span><span>{item.paymentMethod || "payment"}</span>{item.reference && <span>Ref: {item.reference}</span>}{item.customerEmail && <span>{item.customerEmail}</span>}</span></span></div></button>;
              })}
            </div>
          </section>

          <section className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4"><div className="flex items-start gap-3"><Mail className="mt-0.5 shrink-0 text-blue-600" size={19} /><p className="text-sm text-slate-600"><b className="text-slate-900">Automatic:</b> new published courses can trigger email notifications. Use the form below for announcements and notes.</p></div></section>
          <form onSubmit={sendAnnouncement} className="mt-5 space-y-5">
            <label className="block"><span className="mb-2 block text-sm font-black text-slate-700">Send to</span><select value={audience} onChange={(e) => setAudience(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"><option value="all">All users</option><option value="paid">Paid users</option><option value="free">Free users</option></select></label>
            <label className="block"><span className="mb-2 block text-sm font-black text-slate-700">Subject</span><input required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. New notes uploaded" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" /></label>
            <label className="block"><span className="mb-2 block text-sm font-black text-slate-700">Message / Notes</span><textarea required value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="Write your announcement or share notes here..." className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-500" /></label>
            <label className="block"><span className="mb-2 block text-sm font-black text-slate-700">Optional link</span><input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" /></label>
            {status.text && <div className={`flex items-start gap-2 rounded-xl border p-3 text-sm font-bold ${status.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{status.type === "ok" ? <CheckCircle2 size={18} /> : <Bell size={18} />}<span>{status.text}</span></div>}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black">Close</button><button type="submit" disabled={sending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60">{sending ? "Sending..." : <><Send size={17} /> Send announcement</>}</button></div>
          </form>
        </div>
      </div>
    </div>}
  </>;
}
