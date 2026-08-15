import { useState } from "react";
import { KeyRound, Plus, RefreshCw, UserPlus, X } from "lucide-react";
import { auth } from "../firebase";

function makePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const values = new Uint32Array(14);
  window.crypto.getRandomValues(values);
  return Array.from(values, (value) => chars[value % chars.length]).join("");
}

export default function AdminCreateUser() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ displayName: "", email: "", password: "", photoUrl: "", emailVerified: false, disabled: false });

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    try {
      const current = auth.currentUser;
      if (!current) throw new Error("Admin session expired. Please sign in again.");
      if (form.password.length < 6) throw new Error("Password must be at least 6 characters.");
      setSaving(true);
      const token = await current.getIdToken(true);
      const response = await fetch("/api/admin-users", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...form }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to create user");
      setOpen(false);
      setForm({ displayName: "", email: "", password: "", photoUrl: "", emailVerified: false, disabled: false });
      window.location.reload();
    } catch (error) {
      setMessage(error.message || "Unable to create user");
    } finally {
      setSaving(false);
    }
  };

  return <>
    <button type="button" onClick={() => { setMessage(""); setOpen(true); }} className="fixed bottom-5 right-5 z-[90] inline-flex min-h-12 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white shadow-xl shadow-blue-600/25 transition hover:-translate-y-0.5 hover:bg-blue-700 sm:bottom-7 sm:right-7"><UserPlus size={18} /> Add User</button>
    {open && <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5"><div className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6"><div><p className="text-lg font-black text-slate-950">Create learner account</p><p className="mt-0.5 text-xs font-semibold text-slate-400">Create a new Firebase login without leaving the admin area.</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 p-2 text-slate-600" aria-label="Close"><X size={18} /></button></div><form onSubmit={submit} className="space-y-5 p-5 sm:p-6"><label className="block"><span className="text-xs font-black uppercase tracking-wider text-slate-500">Display name</span><input value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} placeholder="Student name" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" /></label><label className="block"><span className="text-xs font-black uppercase tracking-wider text-slate-500">Email address</span><input type="email" required value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="student@example.com" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" /></label><label className="block"><span className="text-xs font-black uppercase tracking-wider text-slate-500">Temporary password</span><div className="mt-2 flex gap-2"><div className="relative flex-1"><KeyRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input required minLength={6} value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 font-mono text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" /></div><button type="button" onClick={() => setForm((current) => ({ ...current, password: makePassword() }))} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700"><RefreshCw size={15} /> Generate</button></div></label><label className="block"><span className="text-xs font-black uppercase tracking-wider text-slate-500">Profile photo URL <span className="font-semibold normal-case text-slate-400">(optional)</span></span><input value={form.photoUrl} onChange={(event) => setForm((current) => ({ ...current, photoUrl: event.target.value }))} placeholder="https://..." className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3"><input type="checkbox" checked={!form.disabled} onChange={(event) => setForm((current) => ({ ...current, disabled: !event.target.checked }))} /><span><span className="block text-sm font-black text-slate-800">Active account</span><span className="block text-xs text-slate-400">Allow sign-in now</span></span></label><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3"><input type="checkbox" checked={form.emailVerified} onChange={(event) => setForm((current) => ({ ...current, emailVerified: event.target.checked }))} /><span><span className="block text-sm font-black text-slate-800">Mark verified</span><span className="block text-xs text-slate-400">Skip email verification</span></span></label></div>{message && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{message}</p>}<div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-extrabold text-slate-700">Cancel</button><button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20 disabled:opacity-60">{saving ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />} Create user</button></div></form></div></div>}
  </>;
}
