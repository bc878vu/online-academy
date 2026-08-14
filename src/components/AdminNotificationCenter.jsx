import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { Bell, CheckCircle2, Mail, Send, X } from "lucide-react";
import { auth, db } from "../firebase";

const ADMIN_UID = "CDwCqUitlaSHEVeWQufCb0lXzMx1";
const API_PATH = "/api/notifications";

async function callNotificationApi(body) {
  const user = auth.currentUser;
  if (!user) throw new Error("Admin session is not available.");
  const token = await user.getIdToken();
  const response = await fetch(API_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "Notification request failed.");
  return data;
}

export default function AdminNotificationCenter() {
  const [admin, setAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState("all");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  const previousPublished = useRef(new Map());
  const initialized = useRef(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => setAdmin(user?.uid === ADMIN_UID));
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!admin) return undefined;
    previousPublished.current = new Map();
    initialized.current = false;

    const unsubscribe = onSnapshot(collection(db, "courses"), (snapshot) => {
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

        if (isPublished && (!wasPublished || change.type === "added")) {
          void callNotificationApi({ action: "courseLaunch", courseId: change.doc.id })
            .catch((error) => console.error("Automatic course notification failed:", error));
        }
      });
      previousPublished.current = current;
    }, (error) => console.error("Course notification watcher failed:", error));

    return unsubscribe;
  }, [admin]);

  if (!admin) return null;

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
    <button
      type="button"
      onClick={() => { setOpen(true); setStatus({ type: "", text: "" }); }}
      className="fixed bottom-5 right-5 z-[120] inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xl shadow-blue-900/30 transition hover:scale-105 hover:bg-blue-700"
      aria-label="Open admin notifications"
      title="Send notification"
    >
      <Bell size={22} />
    </button>

    {open && <div className="fixed inset-0 z-[130] overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm">
      <div className="mx-auto mt-6 w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl sm:mt-12">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div><p className="text-xs font-black uppercase tracking-[.16em] text-blue-600">Admin Notifications</p><h2 className="mt-1 text-xl font-black text-slate-950">Send email announcement</h2></div>
          <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 hover:bg-slate-100" aria-label="Close"><X /></button>
        </div>

        <form onSubmit={sendAnnouncement} className="space-y-5 p-5 sm:p-6">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-600">
            <div className="flex items-start gap-3"><Mail className="mt-0.5 shrink-0 text-blue-600" size={19} /><p><b className="text-slate-900">Automatic:</b> when a new published course is launched, all users receive an email automatically. This panel is for your own announcements and notes.</p></div>
          </div>

          <label className="block"><span className="mb-2 block text-sm font-black text-slate-700">Send to</span><select value={audience} onChange={(e) => setAudience(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"><option value="all">All users</option><option value="paid">Paid users</option><option value="free">Free users</option></select></label>
          <label className="block"><span className="mb-2 block text-sm font-black text-slate-700">Subject</span><input required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. New notes uploaded" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" /></label>
          <label className="block"><span className="mb-2 block text-sm font-black text-slate-700">Message / Notes</span><textarea required value={message} onChange={(e) => setMessage(e.target.value)} rows={7} placeholder="Write your announcement or share notes here..." className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-500" /></label>
          <label className="block"><span className="mb-2 block text-sm font-black text-slate-700">Optional link</span><input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" /></label>

          {status.text && <div className={`flex items-start gap-2 rounded-xl border p-3 text-sm font-bold ${status.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{status.type === "ok" ? <CheckCircle2 size={18} /> : <Bell size={18} />}<span>{status.text}</span></div>}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black">Close</button><button type="submit" disabled={sending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60">{sending ? "Sending..." : <><Send size={17} /> Send announcement</>}</button></div>
        </form>
      </div>
    </div>}
  </>;
}
