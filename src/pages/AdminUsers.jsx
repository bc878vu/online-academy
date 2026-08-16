import { useEffect, useMemo, useState } from "react";
import {
  Search, RefreshCw, Users, UserCog, X, CheckCircle2, Ban, MailCheck, MapPin,
  GraduationCap, Heart, Globe2, BriefcaseBusiness, Save, Eye, ChevronDown,
  Activity, BookOpenCheck, ClipboardCheck, CalendarDays, TrendingUp,
} from "lucide-react";
import { auth } from "../firebase";

const EMPTY = {
  displayName: "", email: "", photoUrl: "", emailVerified: false, disabled: false,
  username: "", phone: "", gender: "", dateOfBirth: "", maritalStatus: "",
  city: "", country: "Pakistan", address: "", education: "", currentStudy: "",
  institution: "", profession: "", occupation: "", bio: "", website: "",
  skills: [], languages: [], interests: [], socialLinks: {},
};

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
const MARITAL_OPTIONS = ["Single", "Married", "Engaged", "Divorced", "Widowed", "Prefer not to say"];
const AGE_OPTIONS = ["under18", "18-24", "25-34", "35-44", "45-54", "55+"];

function ageOf(dob) {
  if (!dob) return "";
  const date = new Date(dob);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const month = now.getMonth() - date.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < date.getDate())) age -= 1;
  return age >= 0 && age <= 120 ? age : "";
}

function ageGroup(age) {
  const value = Number(age);
  if (!Number.isFinite(value)) return "Not specified";
  if (value < 18) return "Under 18";
  if (value < 25) return "18–24";
  if (value < 35) return "25–34";
  if (value < 45) return "35–44";
  if (value < 55) return "45–54";
  return "55+";
}

function matchesAge(age, filter) {
  if (filter === "all") return true;
  const value = Number(age);
  if (!Number.isFinite(value)) return false;
  if (filter === "under18") return value < 18;
  if (filter === "18-24") return value >= 18 && value <= 24;
  if (filter === "25-34") return value >= 25 && value <= 34;
  if (filter === "35-44") return value >= 35 && value <= 44;
  if (filter === "45-54") return value >= 45 && value <= 54;
  if (filter === "55+") return value >= 55;
  return true;
}

function initials(user) {
  return (user.displayName || user.email || "U")
    .split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase();
}

function countBy(users, key, fallback = "Not specified") {
  const map = new Map();
  users.forEach((user) => {
    const value = String(user[key] || fallback);
    map.set(value, (map.get(value) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function growthByMonth(users) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleString(undefined, { month: "short" }),
      count: 0,
    });
  }
  users.forEach((user) => {
    const timestamp = Number(user.createdAt || 0);
    if (!timestamp) return;
    const date = new Date(timestamp);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const month = months.find((item) => item.key === key);
    if (month) month.count += 1;
  });
  return months;
}

async function request(action, body = {}) {
  const current = auth.currentUser;
  if (!current) throw new Error("Admin session expired.");
  const token = await current.getIdToken();
  const response = await fetch("/api/admin-users", {
    method: action === "list" ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(action === "list" ? {} : { "Content-Type": "application/json" }),
    },
    ...(action === "list" ? {} : { body: JSON.stringify({ action, ...body }) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function Metric({ label, value, icon: Icon, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-slate-500">{label}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon size={18} /></span>
      </div>
      <p className="mt-3 text-2xl font-black text-slate-950">{value}</p>
      {hint && <p className="mt-1 text-[11px] font-semibold text-slate-400">{hint}</p>}
    </div>
  );
}

function BarChart({ title, icon: Icon, rows }) {
  const max = Math.max(1, ...rows.map(([, value]) => value));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon size={17} /></span><h3 className="text-sm font-black text-slate-900">{title}</h3></div>
      <div className="mt-4 space-y-3">
        {rows.slice(0, 7).map(([label, value]) => (
          <div key={label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs font-bold"><span className="truncate text-slate-600">{label}</span><span>{value}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(5, (value / max) * 100)}%` }} /></div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-xs text-slate-400">No profile data yet.</p>}
      </div>
    </div>
  );
}

function GrowthChart({ users }) {
  const rows = growthByMonth(users);
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><TrendingUp size={17} /></span><h3 className="text-sm font-black text-slate-900">User growth · last 6 months</h3></div>
      <div className="mt-6 flex h-40 items-end gap-3 sm:gap-5">
        {rows.map((row) => (
          <div key={row.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <span className="text-[10px] font-black text-slate-500">{row.count}</span>
            <div className="flex w-full flex-1 items-end"><div className="mx-auto w-full max-w-10 rounded-t-lg bg-blue-600" style={{ height: `${Math.max(6, (row.count / max) * 100)}%` }} /></div>
            <span className="text-[10px] font-bold text-slate-400">{row.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, label, options }) {
  return (
    <label className="relative min-w-[130px]">
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-8 text-xs font-black text-slate-700 outline-none focus:border-blue-400">
        <option value="all">All {label}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
    </label>
  );
}

function Avatar({ user, large = false }) {
  const size = large ? "h-24 w-24 rounded-3xl text-2xl" : "h-10 w-10 rounded-xl text-xs";
  return user.photoUrl
    ? <img src={user.photoUrl} alt="" className={`${size} shrink-0 object-cover ring-1 ring-slate-200`} />
    : <span className={`flex ${size} shrink-0 items-center justify-center bg-blue-600 font-black text-white`}>{initials(user)}</span>;
}

function TextField({ label, value, onChange, area = false, type = "text" }) {
  return <label className="block text-xs font-black text-slate-600">{label}{area
    ? <textarea rows={4} value={value || ""} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold outline-none focus:border-blue-500" />
    : <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-500" />}</label>;
}

function SelectField({ label, value, onChange, options }) {
  return <label className="block text-xs font-black text-slate-600">{label}<select value={value || ""} onChange={(e) => onChange(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-blue-500"><option value="">Select...</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function ProfileModal({ user, onClose, onEdit, onToggle }) {
  const age = user.age || ageOf(user.dateOfBirth);
  const activity = user.lastActivityAt ? new Date(user.lastActivityAt).toLocaleString() : "No recent activity";
  const social = user.socialLinks || {};
  const rows = [
    ["Email", user.email], ["Username", user.username], ["Phone", user.phone], ["Gender", user.gender],
    ["Date of birth", user.dateOfBirth], ["Age", age], ["Age group", ageGroup(age)], ["Marital status", user.maritalStatus],
    ["City", user.city], ["Country", user.country], ["Address", user.address], ["Education", user.education],
    ["Current study", user.currentStudy], ["Institution", user.institution], ["Profession", user.profession], ["Occupation", user.occupation],
    ["Skills", Array.isArray(user.skills) ? user.skills.join(", ") : ""], ["Languages", Array.isArray(user.languages) ? user.languages.join(", ") : ""],
    ["Interests", Array.isArray(user.interests) ? user.interests.join(", ") : ""], ["Website", user.website],
    ["Facebook", social.facebook], ["LinkedIn", social.linkedin], ["Instagram", social.instagram], ["YouTube", social.youtube],
  ];
  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
      <div className="mx-auto max-w-5xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-5"><div className="flex items-center gap-4"><Avatar user={user} large /><div><h2 className="text-xl font-black text-slate-950">{user.displayName || "Unnamed user"}</h2><p className="text-xs font-bold text-slate-400">Complete learner profile & activity</p><div className="mt-2 flex flex-wrap gap-2"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">{user.profileCompletion || 0}% complete</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${user.disabled ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{user.disabled ? "Disabled" : "Active"}</span></div></div></div><button onClick={onClose} className="rounded-xl border p-2"><X size={19} /></button></div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Profile" value={`${user.profileCompletion || 0}%`} icon={UserCog} />
          <Metric label="Paid courses" value={user.paidCourses || 0} icon={BookOpenCheck} />
          <Metric label="Completed lectures" value={user.completedLessons || 0} icon={Activity} />
          <Metric label="Quiz / assessment attempts" value={user.assessmentAttempts || 0} icon={ClipboardCheck} />
        </div>
        <div className="grid gap-5 p-5 pt-0 lg:grid-cols-[1.4fr_.8fr]">
          <div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><h3 className="font-black text-slate-900">About</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{user.bio || "No bio provided yet."}</p></div>
            <div className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">{rows.map(([label, value]) => <div key={label}><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-bold text-slate-800">{value || "—"}</p></div>)}</div>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 p-5"><h3 className="font-black text-slate-900">Learning activity</h3><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-3"><span className="text-slate-500">Courses with progress</span><b>{user.activeCourses || 0}</b></div><div className="flex justify-between gap-3"><span className="text-slate-500">Progress records</span><b>{user.progressEntries || 0}</b></div><div className="flex justify-between gap-3"><span className="text-slate-500">Completed assessments</span><b>{user.completedAssessments || 0}</b></div><div className="flex justify-between gap-3"><span className="text-slate-500">Last activity</span><b className="max-w-[190px] text-right text-xs">{activity}</b></div></div></div>
            <div className="rounded-2xl border border-slate-200 p-5"><h3 className="font-black text-slate-900">Account</h3><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-3"><span className="text-slate-500">Joined</span><b>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</b></div><div className="flex justify-between gap-3"><span className="text-slate-500">Email</span><b>{user.emailVerified ? "Verified" : "Not verified"}</b></div><div className="flex justify-between gap-3"><span className="text-slate-500">Providers</span><b>{user.providers?.join(", ") || "Email/password"}</b></div></div></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t bg-slate-50 p-5"><button onClick={onEdit} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white"><UserCog size={17} /> Edit profile</button><button onClick={onToggle} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700">{user.disabled ? <CheckCircle2 size={17} /> : <Ban size={17} />} {user.disabled ? "Activate" : "Deactivate"}</button></div>
      </div>
    </div>
  );
}

function EditModal({ form, update, onClose, onSave, saving }) {
  const social = form.socialLinks || {};
  const setSocial = (key, value) => update("socialLinks", { ...social, [key]: value });
  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"><form onSubmit={onSave} className="mx-auto max-w-5xl rounded-3xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b p-5"><div><h2 className="text-xl font-black">Edit User Profile</h2><p className="text-xs text-slate-400">Admin can update all profile categories without touching course records.</p></div><button type="button" onClick={onClose} className="rounded-xl border p-2"><X size={19} /></button></div>
      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <TextField label="Full name" value={form.displayName} onChange={(v) => update("displayName", v)} /><TextField label="Email" value={form.email} onChange={(v) => update("email", v)} /><TextField label="Username" value={form.username} onChange={(v) => update("username", v)} /><TextField label="Phone" value={form.phone} onChange={(v) => update("phone", v)} />
        <SelectField label="Gender" value={form.gender} onChange={(v) => update("gender", v)} options={GENDER_OPTIONS} /><SelectField label="Marital status" value={form.maritalStatus} onChange={(v) => update("maritalStatus", v)} options={MARITAL_OPTIONS} />
        <TextField label="Date of birth" type="date" value={form.dateOfBirth} onChange={(v) => update("dateOfBirth", v)} /><TextField label="City" value={form.city} onChange={(v) => update("city", v)} /><TextField label="Country" value={form.country} onChange={(v) => update("country", v)} /><TextField label="Address" value={form.address} onChange={(v) => update("address", v)} />
        <TextField label="Education" value={form.education} onChange={(v) => update("education", v)} /><TextField label="Current study" value={form.currentStudy} onChange={(v) => update("currentStudy", v)} /><TextField label="Institution / University" value={form.institution} onChange={(v) => update("institution", v)} /><TextField label="Profession" value={form.profession} onChange={(v) => update("profession", v)} /><TextField label="Occupation" value={form.occupation} onChange={(v) => update("occupation", v)} /><TextField label="Profile photo URL" value={form.photoUrl} onChange={(v) => update("photoUrl", v)} /><TextField label="Website" value={form.website} onChange={(v) => update("website", v)} />
        <TextField label="Skills (comma separated)" value={Array.isArray(form.skills) ? form.skills.join(", ") : form.skills} onChange={(v) => update("skills", v.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 30))} /><TextField label="Languages" value={Array.isArray(form.languages) ? form.languages.join(", ") : form.languages} onChange={(v) => update("languages", v.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 20))} /><TextField label="Interests" value={Array.isArray(form.interests) ? form.interests.join(", ") : form.interests} onChange={(v) => update("interests", v.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 30))} />
        <TextField label="Facebook" value={social.facebook} onChange={(v) => setSocial("facebook", v)} /><TextField label="LinkedIn" value={social.linkedin} onChange={(v) => setSocial("linkedin", v)} /><TextField label="Instagram" value={social.instagram} onChange={(v) => setSocial("instagram", v)} /><TextField label="YouTube" value={social.youtube} onChange={(v) => setSocial("youtube", v)} />
        <div className="sm:col-span-2 lg:col-span-3"><TextField label="Bio" value={form.bio} onChange={(v) => update("bio", v)} area /></div>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t bg-slate-50 p-5"><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={Boolean(form.emailVerified)} onChange={(e) => update("emailVerified", e.target.checked)} /> Email verified</label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={Boolean(form.disabled)} onChange={(e) => update("disabled", e.target.checked)} /> Disabled</label><div className="ml-auto flex gap-2"><button type="button" onClick={onClose} className="rounded-xl border px-4 py-2.5 text-sm font-black">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-60"><Save size={16} />{saving ? "Saving..." : "Save profile"}</button></div></div>
    </form></div>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [query, setQuery] = useState("");
  const [gender, setGender] = useState("all"); const [country, setCountry] = useState("all"); const [city, setCity] = useState("all"); const [marital, setMarital] = useState("all"); const [status, setStatus] = useState("all"); const [ageFilter, setAgeFilter] = useState("all");
  const [selected, setSelected] = useState(null); const [editing, setEditing] = useState(null); const [form, setForm] = useState(EMPTY); const [saving, setSaving] = useState(false); const [toast, setToast] = useState("");

  const load = async (refresh = false) => {
    try { refresh ? setRefreshing(true) : setLoading(true); const data = await request("list"); setUsers(Array.isArray(data.users) ? data.users : []); }
    catch (error) { setToast(error.message || "Unable to load users"); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(""), 3500); return () => clearTimeout(timer); }, [toast]);

  const options = useMemo(() => ({
    genders: countBy(users, "gender").map(([value]) => value), countries: countBy(users, "country").map(([value]) => value), cities: countBy(users, "city").map(([value]) => value), marital: countBy(users, "maritalStatus").map(([value]) => value),
  }), [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((user) => {
      const age = user.age || ageOf(user.dateOfBirth);
      const textMatch = !q || [user.displayName, user.email, user.id, user.username, user.city, user.country, user.education, user.currentStudy, user.profession, user.occupation]
        .some((value) => String(value || "").toLowerCase().includes(q));
      return textMatch && (gender === "all" || user.gender === gender) && (country === "all" || user.country === country) && (city === "all" || user.city === city) && (marital === "all" || user.maritalStatus === marital) && (status === "all" || (status === "active" && !user.disabled) || (status === "disabled" && user.disabled)) && matchesAge(age, ageFilter);
    });
  }, [users, query, gender, country, city, marital, status, ageFilter]);

  const stats = useMemo(() => {
    const thirtyDays = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const newUsers = filtered.filter((user) => Number(user.createdAt || 0) >= thirtyDays).length;
    return {
      total: filtered.length,
      active: filtered.filter((user) => !user.disabled).length,
      verified: filtered.filter((user) => user.emailVerified).length,
      complete: Math.round(filtered.reduce((sum, user) => sum + Number(user.profileCompletion || 0), 0) / Math.max(1, filtered.length)),
      newUsers,
    };
  }, [filtered]);

  const openEdit = (user) => { setSelected(null); setEditing(user); setForm({ ...EMPTY, ...user, socialLinks: user.socialLinks || {} }); };
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const save = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = { userId: editing.id, ...form };
      const data = await request("update", payload);
      setUsers((items) => items.map((user) => user.id === editing.id ? { ...user, ...(data.user || payload) } : user));
      setEditing(null); setToast("User profile updated successfully.");
    } catch (error) { setToast(error.message || "Unable to save profile"); }
    finally { setSaving(false); }
  };

  const toggle = async (user) => {
    try { await request("update", { userId: user.id, disabled: !user.disabled }); setUsers((items) => items.map((item) => item.id === user.id ? { ...item, disabled: !user.disabled } : item)); setToast(user.disabled ? "User activated." : "User deactivated."); }
    catch (error) { setToast(error.message || "Unable to update status"); }
  };

  const clearFilters = () => { setGender("all"); setCountry("all"); setCity("all"); setMarital("all"); setStatus("all"); setAgeFilter("all"); setQuery(""); };

  return (
    <div className="min-h-[calc(100vh-150px)] bg-slate-50 px-3 py-6 sm:px-5 lg:px-8 lg:py-9"><div className="mx-auto max-w-[1480px]">
      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[.16em] text-blue-700"><UserCog size={14} /> Administration</div><h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Users & Profiles</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Professional learner directory, complete bio management, dynamic categories, analytics, learning activity and account controls.</p></div><button onClick={() => load(true)} disabled={refreshing} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm"><RefreshCw size={17} className={refreshing ? "animate-spin" : ""} /> Refresh</button></div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Metric label="Users" value={stats.total} icon={Users} /><Metric label="Active" value={stats.active} icon={CheckCircle2} /><Metric label="New · 30 days" value={stats.newUsers} icon={CalendarDays} /><Metric label="Verified" value={stats.verified} icon={MailCheck} /><Metric label="Avg profile" value={`${stats.complete}%`} icon={UserCog} /></div>

      <div className="mt-5 grid gap-4 lg:grid-cols-4"><BarChart title="Gender" icon={Users} rows={countBy(filtered, "gender")} /><BarChart title="Marital status" icon={Heart} rows={countBy(filtered, "maritalStatus")} /><BarChart title="Countries" icon={Globe2} rows={countBy(filtered, "country")} /><BarChart title="Cities" icon={MapPin} rows={countBy(filtered, "city")} /></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-4"><BarChart title="Age groups" icon={CalendarDays} rows={countBy(filtered.map((user) => ({ ageGroup: ageGroup(user.age || ageOf(user.dateOfBirth)) })), "ageGroup")} /><BarChart title="Education" icon={GraduationCap} rows={countBy(filtered, "education")} /><BarChart title="Current study" icon={GraduationCap} rows={countBy(filtered, "currentStudy")} /><BarChart title="Profession" icon={BriefcaseBusiness} rows={countBy(filtered, "profession")} /></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2"><GrowthChart users={filtered} /><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Activity size={17} /></span><h3 className="text-sm font-black text-slate-900">Learning overview</h3></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase text-slate-400">Paid course enrollments</p><p className="mt-1 text-2xl font-black">{filtered.reduce((sum, user) => sum + Number(user.paidCourses || 0), 0)}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase text-slate-400">Completed lectures</p><p className="mt-1 text-2xl font-black">{filtered.reduce((sum, user) => sum + Number(user.completedLessons || 0), 0)}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase text-slate-400">Assessment attempts</p><p className="mt-1 text-2xl font-black">{filtered.reduce((sum, user) => sum + Number(user.assessmentAttempts || 0), 0)}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase text-slate-400">Completed assessments</p><p className="mt-1 text-2xl font-black">{filtered.reduce((sum, user) => sum + Number(user.completedAssessments || 0), 0)}</p></div></div></div></div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"><div className="flex flex-col gap-3 xl:flex-row xl:items-center"><label className="relative min-w-0 flex-1"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, username, city, education, study, profession..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white" /></label><div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:flex"><FilterSelect value={gender} onChange={setGender} label="Gender" options={options.genders} /><FilterSelect value={marital} onChange={setMarital} label="Marital" options={options.marital} /><FilterSelect value={country} onChange={setCountry} label="Country" options={options.countries} /><FilterSelect value={city} onChange={setCity} label="City" options={options.cities} /><FilterSelect value={ageFilter} onChange={setAgeFilter} label="Age" options={AGE_OPTIONS} /><FilterSelect value={status} onChange={setStatus} label="Status" options={["active", "disabled"]} /><button type="button" onClick={clearFilters} className="h-11 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-600">Clear</button></div></div></div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? <div className="flex min-h-80 items-center justify-center"><RefreshCw className="animate-spin text-blue-600" /></div> : filtered.length === 0 ? <div className="flex min-h-80 flex-col items-center justify-center text-center"><Users className="text-slate-300" size={34} /><p className="mt-3 font-black text-slate-800">No users match these filters</p><button onClick={clearFilters} className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white">Clear filters</button></div> : <>
          <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[1450px] text-left"><thead className="border-b border-slate-200 bg-slate-50"><tr>{["User", "Gender", "Age", "Location", "Marital", "Education / Study", "Profile", "Learning", "Status", "Action"].map((title) => <th key={title} className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">{title}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((user) => <tr key={user.id} className="hover:bg-slate-50/80"><td className="px-4 py-4"><div className="flex items-center gap-3"><Avatar user={user} /><div className="min-w-0"><p className="truncate text-sm font-black text-slate-900">{user.displayName || "Unnamed user"}</p><p className="truncate text-xs text-slate-400">{user.email}</p></div></div></td><td className="px-4 py-4 text-xs font-bold text-slate-600">{user.gender || "—"}</td><td className="px-4 py-4 text-xs font-bold text-slate-600">{user.age || ageOf(user.dateOfBirth) || "—"}</td><td className="px-4 py-4 text-xs font-bold text-slate-600">{[user.city, user.country].filter(Boolean).join(", ") || "—"}</td><td className="px-4 py-4 text-xs font-bold text-slate-600">{user.maritalStatus || "—"}</td><td className="max-w-[220px] px-4 py-4 text-xs font-bold text-slate-600">{[user.education, user.currentStudy].filter(Boolean).join(" • ") || "—"}</td><td className="px-4 py-4"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">{user.profileCompletion || 0}%</span></td><td className="px-4 py-4 text-xs font-bold text-slate-600">{Number(user.paidCourses || 0)} courses · {Number(user.completedLessons || 0)} lectures</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${user.disabled ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{user.disabled ? "Disabled" : "Active"}</span></td><td className="px-4 py-4"><div className="flex gap-2"><button onClick={() => setSelected(user)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700"><Eye size={14} /> View</button><button onClick={() => openEdit(user)} className="h-9 rounded-lg bg-blue-600 px-3 text-xs font-black text-white">Edit</button></div></td></tr>)}</tbody></table></div>
          <div className="grid gap-3 p-3 lg:hidden">{filtered.map((user) => <article key={user.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start gap-3"><Avatar user={user} /><div className="min-w-0 flex-1"><p className="font-black text-slate-900">{user.displayName || "Unnamed user"}</p><p className="truncate text-xs text-slate-400">{user.email}</p><p className="mt-2 text-xs font-bold text-slate-500">{[user.gender, user.age || ageOf(user.dateOfBirth), user.city, user.country].filter(Boolean).join(" • ") || "No profile details"}</p></div><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">{user.profileCompletion || 0}%</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-500"><span>{user.paidCourses || 0} courses</span><span>{user.completedLessons || 0} lectures</span><span>{user.assessmentAttempts || 0} attempts</span><span>{user.disabled ? "Disabled" : "Active"}</span></div><div className="mt-4 flex gap-2"><button onClick={() => setSelected(user)} className="flex-1 rounded-xl border py-2 text-xs font-black">View full profile</button><button onClick={() => openEdit(user)} className="flex-1 rounded-xl bg-blue-600 py-2 text-xs font-black text-white">Edit</button></div></article>)}</div>
        </>}
      </div>

      {toast && <div className="fixed bottom-5 right-5 z-[100] rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-2xl">{toast}</div>}
      {selected && <ProfileModal user={selected} onClose={() => setSelected(null)} onEdit={() => openEdit(selected)} onToggle={() => toggle(selected)} />}
      {editing && <EditModal form={form} update={update} onClose={() => setEditing(null)} onSave={save} saving={saving} />}
    </div></div>
  );
}
