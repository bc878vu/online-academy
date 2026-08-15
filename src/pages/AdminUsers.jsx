import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Ban, Check, CheckCircle2, ChevronDown, Edit3, Filter, MailCheck,
  RefreshCw, Search, ShieldCheck, Trash2, UserCog, Users, X
} from "lucide-react";
import { auth } from "../firebase";

const EMPTY_FORM = { displayName: "", email: "", photoUrl: "", emailVerified: false, disabled: false };

function formatDate(value) {
  if (!value) return "Never";
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function initials(user) {
  return (user.displayName || user.email || "U")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

async function adminRequest(action, body = {}) {
  const current = auth.currentUser;
  if (!current) throw new Error("Admin session expired. Please sign in again.");
  const token = await current.getIdToken();
  const response = await fetch("/api/admin-users", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [verification, setVerification] = useState("all");
  const [selected, setSelected] = useState(() => new Set());
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadUsers = async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const current = auth.currentUser;
      if (!current) throw new Error("Admin session expired. Please sign in again.");
      const token = await current.getIdToken();
      const response = await fetch("/api/admin-users?action=list", { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to load users");
      setUsers(Array.isArray(data.users) ? data.users : []);
      setSelected(new Set());
    } catch (error) {
      setToast({ type: "error", message: error.message || "Unable to load users" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesText = !needle || [user.displayName, user.email, user.id].some((value) => String(value || "").toLowerCase().includes(needle));
      const matchesStatus = status === "all" || (status === "active" ? !user.disabled : user.disabled);
      const matchesVerification = verification === "all" || (verification === "verified" ? user.emailVerified : !user.emailVerified);
      return matchesText && matchesStatus && matchesVerification;
    });
  }, [users, query, status, verification]);

  const counts = useMemo(() => ({
    total: users.length,
    active: users.filter((user) => !user.disabled).length,
    disabled: users.filter((user) => user.disabled).length,
    verified: users.filter((user) => user.emailVerified).length,
  }), [users]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((user) => selected.has(user.id));

  const toggleSelected = (id) => setSelected((current) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAllVisible = () => setSelected((current) => {
    const next = new Set(current);
    if (allVisibleSelected) filtered.forEach((user) => next.delete(user.id));
    else filtered.forEach((user) => next.add(user.id));
    return next;
  });

  const openEdit = (user) => {
    setEditing(user);
    setForm({
      displayName: user.displayName || "",
      email: user.email || "",
      photoUrl: user.photoUrl || "",
      emailVerified: Boolean(user.emailVerified),
      disabled: Boolean(user.disabled),
    });
  };

  const saveUser = async (event) => {
    event.preventDefault();
    if (!editing) return;
    try {
      setSaving(true);
      const data = await adminRequest("update", { userId: editing.id, ...form });
      setUsers((current) => current.map((user) => user.id === editing.id ? { ...user, ...(data.user || form) } : user));
      setEditing(null);
      setToast({ type: "success", message: "User account updated successfully." });
    } catch (error) {
      setToast({ type: "error", message: error.message || "Unable to update user" });
    } finally {
      setSaving(false);
    }
  };

  const toggleUser = async (user) => {
    try {
      setBusyId(user.id);
      await adminRequest("update", { userId: user.id, disabled: !user.disabled });
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, disabled: !user.disabled } : item));
      setToast({ type: "success", message: `${user.disabled ? "User activated" : "User deactivated"}.` });
    } catch (error) {
      setToast({ type: "error", message: error.message || "Unable to change account status" });
    } finally {
      setBusyId("");
    }
  };

  const verifyUser = async (user) => {
    try {
      setBusyId(user.id);
      await adminRequest("update", { userId: user.id, emailVerified: true });
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, emailVerified: true } : item));
      setToast({ type: "success", message: "Email marked as verified." });
    } catch (error) {
      setToast({ type: "error", message: error.message || "Unable to verify email" });
    } finally {
      setBusyId("");
    }
  };

  const deleteOne = async (user) => {
    try {
      setBusyId(user.id);
      await adminRequest("delete", { userId: user.id });
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setSelected((current) => { const next = new Set(current); next.delete(user.id); return next; });
      setConfirmDelete(null);
      setToast({ type: "success", message: "User account permanently deleted. Learning and payment history was retained." });
    } catch (error) {
      setToast({ type: "error", message: error.message || "Unable to delete user" });
    } finally {
      setBusyId("");
    }
  };

  const bulkStatus = async (disabled) => {
    const ids = [...selected];
    if (!ids.length) return;
    try {
      setBusyId("bulk");
      for (const id of ids) await adminRequest("update", { userId: id, disabled });
      setUsers((current) => current.map((user) => selected.has(user.id) ? { ...user, disabled } : user));
      setSelected(new Set());
      setToast({ type: "success", message: `${ids.length} account${ids.length === 1 ? "" : "s"} ${disabled ? "deactivated" : "activated"}.` });
    } catch (error) {
      setToast({ type: "error", message: error.message || "Bulk update failed" });
    } finally {
      setBusyId("");
    }
  };

  return <div className="min-h-[calc(100vh-150px)] bg-slate-50 px-3 py-6 sm:px-5 lg:px-8 lg:py-9">
    <div className="mx-auto max-w-[1480px]">
      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-blue-700"><UserCog size={14} /> Administration</div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">User Management</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base">Manage learner accounts, account access, verification and profile details from one secure workspace.</p>
        </div>
        <button type="button" onClick={() => loadUsers(true)} disabled={refreshing} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 disabled:opacity-60"><RefreshCw size={17} className={refreshing ? "animate-spin" : ""} /> Refresh users</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[['Total users', counts.total, Users], ['Active', counts.active, CheckCircle2], ['Disabled', counts.disabled, Ban], ['Verified email', counts.verified, MailCheck]].map(([label, value, Icon]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-500">{label}</span><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon size={18} /></span></div><p className="mt-3 text-2xl font-black text-slate-950">{value}</p></div>)}
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative min-w-0 flex-1"><Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, email or user ID..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10" /></label>
          <div className="grid grid-cols-2 gap-2 sm:flex"><label className="relative"><Filter size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm font-bold text-slate-700 outline-none focus:border-blue-400 sm:w-36"><option value="all">All status</option><option value="active">Active</option><option value="disabled">Disabled</option></select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" /></label><label className="relative"><select value={verification} onChange={(event) => setVerification(event.target.value)} className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm font-bold text-slate-700 outline-none focus:border-blue-400 sm:w-40"><option value="all">All email status</option><option value="verified">Verified</option><option value="unverified">Unverified</option></select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" /></label></div>
        </div>

        {selected.size > 0 && <div className="mt-3 flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3 sm:flex-row sm:items-center"><p className="text-sm font-extrabold text-blue-900">{selected.size} selected</p><div className="flex flex-wrap gap-2 sm:ml-auto"><button type="button" disabled={busyId === "bulk"} onClick={() => bulkStatus(false)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 text-xs font-black text-emerald-700 hover:bg-emerald-50"><Check size={15} /> Activate</button><button type="button" disabled={busyId === "bulk"} onClick={() => bulkStatus(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 text-xs font-black text-amber-700 hover:bg-amber-50"><Ban size={15} /> Deactivate</button><button type="button" onClick={() => setSelected(new Set())} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 hover:bg-slate-50"><X size={15} /> Clear</button></div></div>}
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? <div className="flex min-h-80 items-center justify-center"><div className="text-center"><div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" /><p className="mt-3 text-sm font-bold text-slate-500">Loading user accounts...</p></div></div> : filtered.length === 0 ? <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center"><Users size={34} className="text-slate-300" /><h2 className="mt-3 text-lg font-black text-slate-800">No users found</h2><p className="mt-1 text-sm text-slate-500">Try changing your search or filters.</p></div> : <>
          <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[980px] text-left"><thead className="border-b border-slate-200 bg-slate-50/80"><tr><th className="w-12 px-4 py-3"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} aria-label="Select all visible users" /></th><th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-400">User</th><th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-400">Status</th><th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-400">Email</th><th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-400">Courses</th><th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-400">Last login</th><th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-slate-400">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((user) => <tr key={user.id} className="transition hover:bg-slate-50/70"><td className="px-4 py-4"><input type="checkbox" checked={selected.has(user.id)} onChange={() => toggleSelected(user.id)} aria-label={`Select ${user.email}`} /></td><td className="px-4 py-4"><div className="flex min-w-[260px] items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-50 text-xs font-black text-blue-700">{user.photoUrl ? <img src={user.photoUrl} alt="" className="h-full w-full object-cover" /> : initials(user)}</div><div className="min-w-0"><p className="truncate text-sm font-black text-slate-900">{user.displayName || "Unnamed user"}</p><p className="max-w-[250px] truncate font-mono text-[10px] text-slate-400">{user.id}</p></div></div></td><td className="px-4 py-4"><div className="flex flex-wrap gap-1.5"><span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black ${user.disabled ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{user.disabled ? "Disabled" : "Active"}</span>{user.emailVerified ? <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700"><MailCheck size={11} /> Verified</span> : <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700">Unverified</span>}</div></td><td className="px-4 py-4"><p className="max-w-[230px] truncate text-sm font-semibold text-slate-700">{user.email || "—"}</p><p className="mt-1 text-[10px] font-bold text-slate-400">{user.providers?.join(", ") || "password"}</p></td><td className="px-4 py-4"><span className="text-sm font-black text-slate-800">{user.paidCourses || 0}</span></td><td className="px-4 py-4 text-xs font-semibold text-slate-500">{formatDate(user.lastLoginAt)}</td><td className="px-4 py-4"><div className="flex justify-end gap-1.5"><button type="button" onClick={() => openEdit(user)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-black text-slate-700 hover:border-blue-200 hover:text-blue-700"><Edit3 size={14} /> Edit</button><button type="button" disabled={busyId === user.id} onClick={() => toggleUser(user)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-black text-slate-700 hover:border-amber-200 hover:text-amber-700"><Ban size={14} /> {user.disabled ? "Activate" : "Disable"}</button>{!user.emailVerified && <button type="button" disabled={busyId === user.id} onClick={() => verifyUser(user)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-black text-slate-700 hover:border-blue-200 hover:text-blue-700"><MailCheck size={14} /> Verify</button>}<button type="button" disabled={busyId === user.id} onClick={() => setConfirmDelete(user)} className="inline-flex h-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 px-2.5 text-xs font-black text-red-600 hover:bg-red-100"><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div>
          <div className="divide-y divide-slate-100 lg:hidden">{filtered.map((user) => <article key={user.id} className="p-4 sm:p-5"><div className="flex items-start gap-3"><input type="checkbox" className="mt-2" checked={selected.has(user.id)} onChange={() => toggleSelected(user.id)} aria-label={`Select ${user.email}`} /><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-50 text-xs font-black text-blue-700">{user.photoUrl ? <img src={user.photoUrl} alt="" className="h-full w-full object-cover" /> : initials(user)}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-900">{user.displayName || "Unnamed user"}</p><p className="truncate text-xs font-semibold text-slate-500">{user.email || "No email"}</p><p className="mt-1 truncate font-mono text-[9px] text-slate-400">{user.id}</p></div><span className={`rounded-full px-2 py-1 text-[9px] font-black ${user.disabled ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{user.disabled ? "Disabled" : "Active"}</span></div><div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs"><div><span className="text-slate-400">Email</span><p className="mt-0.5 font-bold text-slate-700">{user.emailVerified ? "Verified" : "Not verified"}</p></div><div><span className="text-slate-400">Paid courses</span><p className="mt-0.5 font-bold text-slate-700">{user.paidCourses || 0}</p></div><div className="col-span-2"><span className="text-slate-400">Last login</span><p className="mt-0.5 font-bold text-slate-700">{formatDate(user.lastLoginAt)}</p></div></div><div className="mt-3 grid grid-cols-2 gap-2 sm:flex"><button type="button" onClick={() => openEdit(user)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700"><Edit3 size={14} /> Edit</button><button type="button" disabled={busyId === user.id} onClick={() => toggleUser(user)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700"><Ban size={14} /> {user.disabled ? "Activate" : "Disable"}</button>{!user.emailVerified && <button type="button" disabled={busyId === user.id} onClick={() => verifyUser(user)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 text-xs font-black text-blue-700"><MailCheck size={14} /> Verify</button>}<button type="button" disabled={busyId === user.id} onClick={() => setConfirmDelete(user)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 text-xs font-black text-red-600"><Trash2 size={14} /> Delete</button></div></article>)}</div>
        </>}
      </div>

      <div className="mt-4 flex flex-col gap-2 text-xs font-semibold text-slate-400 sm:flex-row sm:items-center sm:justify-between"><span>Showing {filtered.length} of {users.length} accounts</span><span>Administrator accounts are protected from user-level deletion.</span></div>
    </div>

    {toast && <div className={`fixed bottom-5 left-4 right-4 z-[120] mx-auto flex max-w-xl items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold shadow-2xl ${toast.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`} role="status"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70">{toast.type === "error" ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}</span><span className="flex-1">{toast.message}</span><button type="button" onClick={() => setToast(null)} aria-label="Dismiss"><X size={17} /></button></div>}

    {editing && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-5"><div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6"><div><p className="text-lg font-black text-slate-950">Edit user</p><p className="mt-0.5 text-xs font-semibold text-slate-400">Update account details and access.</p></div><button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="Close"><X size={18} /></button></div><form onSubmit={saveUser} className="space-y-5 p-5 sm:p-6"><div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3"><div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-blue-100 text-sm font-black text-blue-700">{form.photoUrl ? <img src={form.photoUrl} alt="" className="h-full w-full object-cover" /> : initials(editing)}</div><div className="min-w-0"><p className="truncate text-sm font-black text-slate-900">{editing.email}</p><p className="font-mono text-[9px] text-slate-400">{editing.id}</p></div></div><label className="block"><span className="text-xs font-black uppercase tracking-wider text-slate-500">Display name</span><input value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" /></label><label className="block"><span className="text-xs font-black uppercase tracking-wider text-slate-500">Email address</span><input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" required /></label><label className="block"><span className="text-xs font-black uppercase tracking-wider text-slate-500">Profile photo URL</span><input value={form.photoUrl} onChange={(event) => setForm((current) => ({ ...current, photoUrl: event.target.value }))} placeholder="https://..." className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3"><input type="checkbox" checked={form.emailVerified} onChange={(event) => setForm((current) => ({ ...current, emailVerified: event.target.checked }))} /><span><span className="block text-sm font-black text-slate-800">Email verified</span><span className="block text-xs text-slate-400">Trust this address</span></span></label><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3"><input type="checkbox" checked={!form.disabled} onChange={(event) => setForm((current) => ({ ...current, disabled: !event.target.checked }))} /><span><span className="block text-sm font-black text-slate-800">Account active</span><span className="block text-xs text-slate-400">Allow sign-in</span></span></label></div><div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={() => setEditing(null)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-extrabold text-slate-700">Cancel</button><button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20 disabled:opacity-60">{saving && <RefreshCw size={16} className="animate-spin" />} Save changes</button></div></form></div></div>}

    {confirmDelete && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600"><AlertTriangle size={23} /></div><h2 className="mt-4 text-xl font-black text-slate-950">Delete this account?</h2><p className="mt-2 text-sm leading-6 text-slate-500">This permanently removes the Firebase login for <strong className="text-slate-800">{confirmDelete.email}</strong>. Course, payment and certificate history is retained for records.</p><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setConfirmDelete(null)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-extrabold text-slate-700">Cancel</button><button type="button" disabled={busyId === confirmDelete.id} onClick={() => deleteOne(confirmDelete)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-extrabold text-white disabled:opacity-60"><Trash2 size={16} /> Delete permanently</button></div></div></div>}
  </div>;
}
