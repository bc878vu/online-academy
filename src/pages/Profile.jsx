import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  onAuthStateChanged,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Clipboard,
  Clock3,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  Moon,
  Pencil,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  User,
  X,
  Zap,
} from "lucide-react";
import { auth } from "../firebase";

const formatDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatDateTime = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [copying, setCopying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [reducedMotion, setReducedMotion] = useState(() => {
    try {
      return localStorage.getItem("onlineAcademyReducedMotion") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setLoading(false);
        navigate("/login", { replace: true });
        return;
      }
      setUser(currentUser);
      setName(currentUser.displayName || currentUser.email?.split("@")[0] || "Student");
      setLoading(false);
    });
    return unsubscribe;
  }, [navigate]);

  const userData = useMemo(() => {
    if (!user) return null;
    const displayName = user.displayName || user.email?.split("@")[0] || "Student";
    const email = user.email || "No email available";
    const provider = user.providerData?.[0]?.providerId === "google.com" ? "Google Account" : "Email Account";
    const initials = displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "S";
    const profileItems = [Boolean(user.displayName), Boolean(user.email), Boolean(user.photoURL), Boolean(user.emailVerified)];
    const completion = Math.round((profileItems.filter(Boolean).length / profileItems.length) * 100);
    return { displayName, email, provider, initials, completion };
  }, [user]);

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    const trimmedName = name.trim();
    if (!trimmedName) return setError("Please enter your full name.");
    if (trimmedName.length < 2) return setError("Name must contain at least 2 characters.");
    try {
      setSaving(true);
      await updateProfile(user, { displayName: trimmedName });
      setUser({ ...user, displayName: trimmedName });
      setName(trimmedName);
      setEditing(false);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      console.error("Profile update error:", err);
      setError("Unable to update your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setName(user?.displayName || user?.email?.split("@")[0] || "Student");
    setEditing(false);
    setError("");
  };

  const handleCopyEmail = async () => {
    if (!userData?.email || !navigator.clipboard) return;
    try {
      setCopying(true);
      await navigator.clipboard.writeText(userData.email);
      setSuccess("Email copied to clipboard.");
    } catch {
      setError("Could not copy the email address.");
    } finally {
      setTimeout(() => setCopying(false), 700);
    }
  };

  const handleVerifyEmail = async () => {
    if (!user || user.emailVerified || verifying) return;
    try {
      setVerifying(true);
      await sendEmailVerification(user);
      setSuccess("Verification email sent. Please check your inbox.");
    } catch (err) {
      console.error("Verification email error:", err);
      setError("Unable to send the verification email right now.");
    } finally {
      setVerifying(false);
    }
  };

  const handleMotionChange = (value) => {
    setReducedMotion(value);
    try {
      localStorage.setItem("onlineAcademyReducedMotion", String(value));
    } catch {
      // Preferences are optional and should never block the profile page.
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-slate-50 px-5">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <User size={26} />
          </div>
          <Loader2 size={28} className="mx-auto mt-5 animate-spin text-blue-600" />
          <p className="mt-3 text-sm font-semibold text-slate-500">Loading your profile...</p>
        </div>
      </main>
    );
  }

  if (!user || !userData) return null;

  const photo = user.photoURL || null;
  const verified = Boolean(user.emailVerified);

  return (
    <main className={`min-h-[calc(100vh-76px)] bg-slate-50 ${reducedMotion ? "[&_*]:!transition-none" : ""}`}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link to="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-blue-600">
          <ArrowLeft size={17} /> Back to Dashboard
        </Link>

        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-blue-700">
              <Sparkles size={13} /> Account Center
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">My Profile</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">Manage your identity, security status and learning shortcuts from one place.</p>
          </div>
          <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex">
            <Zap size={17} className="text-blue-600" />
            <div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Profile health</p><p className="text-sm font-black text-slate-800">{userData.completion}% complete</p></div>
          </div>
        </div>

        {success && <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"><CheckCircle2 size={18} /><span>{success}</span><button type="button" className="ml-auto rounded-lg p-1 hover:bg-emerald-100" onClick={() => setSuccess("")} aria-label="Dismiss"><X size={16} /></button></div>}
        {error && <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"><X size={18} /><span>{error}</span><button type="button" className="ml-auto rounded-lg p-1 hover:bg-red-100" onClick={() => setError("")} aria-label="Dismiss"><X size={16} /></button></div>}

        <section className="relative overflow-hidden rounded-[28px] bg-slate-950 shadow-xl shadow-slate-900/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.42),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.22),transparent_35%)]" />
          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                <div className="relative shrink-0">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[26px] border-4 border-white/15 bg-blue-600 text-2xl font-black text-white shadow-2xl sm:h-28 sm:w-28 sm:text-3xl">
                    {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : userData.initials}
                  </div>
                  <span className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-4 border-slate-950 bg-emerald-500 text-white" title="Active account"><Check size={14} strokeWidth={3} /></span>
                </div>
                <div className="min-w-0 text-white">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-2xl font-black sm:text-3xl">{userData.displayName}</h2>
                    {verified && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-black text-emerald-300 ring-1 ring-emerald-300/20"><ShieldCheck size={13} /> Verified</span>}
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-300">{userData.email}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200 ring-1 ring-white/10">Active Student</span>
                    <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200 ring-1 ring-white/10">{userData.provider}</span>
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => { setEditing(true); setSuccess(""); setError(""); }} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-100 sm:w-auto"><Pencil size={16} /> Edit Profile</button>
            </div>

            <div className="mt-8 max-w-xl">
              <div className="mb-2 flex items-center justify-between text-xs font-bold"><span className="text-slate-400">Profile completion</span><span className="text-white">{userData.completion}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${userData.completion}%` }} /></div>
              <p className="mt-2 text-[11px] text-slate-400">Add a profile photo and verify your email to make your account more complete.</p>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.55fr_0.95fr]">
          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">Personal details</p><h3 className="mt-1 text-xl font-black text-slate-950">Your information</h3><p className="mt-1 text-sm text-slate-500">Keep your account information up to date.</p></div>
              {!editing && <button type="button" onClick={() => setEditing(true)} className="hidden rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 sm:inline-flex"><Pencil size={14} className="mr-1.5" /> Edit</button>}
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Full name</label>
                <div className="relative"><User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input value={name} onChange={(e) => setName(e.target.value)} disabled={!editing || saving} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-80" placeholder="Enter your full name" /></div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3"><label className="block text-xs font-black uppercase tracking-wider text-slate-500">Email address</label><button type="button" onClick={handleCopyEmail} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700">{copying ? <Check size={13} /> : <Copy size={13} />} {copying ? "Copied" : "Copy"}</button></div>
                <div className="relative"><Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input value={userData.email} disabled className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 py-3.5 pl-11 pr-4 font-semibold text-slate-600" /></div>
              </div>

              {editing && <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={handleCancelEdit} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50"><X size={17} /> Cancel</button><button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60">{saving ? <><Loader2 size={17} className="animate-spin" /> Saving...</> : <><Save size={17} /> Save Changes</>}</button></div>}
            </form>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5"><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">Security</p><h3 className="mt-1 text-xl font-black text-slate-950">Account security</h3></div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${verified ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}><Mail size={19} /></div><div className="min-w-0 flex-1"><p className="text-sm font-black text-slate-800">Email verification</p><p className="text-xs font-semibold text-slate-500">{verified ? "Your email is verified." : "Your email is not verified yet."}</p></div>{verified ? <CheckCircle2 size={20} className="text-emerald-600" /> : <button type="button" onClick={handleVerifyEmail} disabled={verifying} className="rounded-lg bg-amber-500 px-2.5 py-2 text-[11px] font-black text-white hover:bg-amber-600 disabled:opacity-60">{verifying ? "Sending" : "Verify"}</button>}</div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600"><ShieldCheck size={19} /></div><div><p className="text-sm font-black text-slate-800">Sign-in method</p><p className="text-xs font-semibold text-slate-500">{userData.provider}</p></div></div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600"><Clock3 size={19} /></div><div><p className="text-sm font-black text-slate-800">Last sign-in</p><p className="text-xs font-semibold text-slate-500">{formatDateTime(user.metadata?.lastSignInTime)}</p></div></div>
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link to="/courses" className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5 sm:p-6">
            <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><BookOpen size={22} /></span><ArrowRight size={18} className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600" /></div>
            <h3 className="mt-5 font-black text-slate-950">Browse Courses</h3><p className="mt-1 text-sm leading-5 text-slate-500">Explore available courses and continue learning.</p>
          </Link>
          <Link to="/certificate" className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-amber-200 hover:shadow-lg hover:shadow-amber-900/5 sm:p-6">
            <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Award size={22} /></span><ArrowRight size={18} className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-amber-600" /></div>
            <h3 className="mt-5 font-black text-slate-950">My Certificate</h3><p className="mt-1 text-sm leading-5 text-slate-500">Open the certificate area from your account.</p>
          </Link>
          <Link to="/dashboard" className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-900/5 sm:p-6">
            <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><RefreshCw size={21} /></span><ArrowRight size={18} className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-violet-600" /></div>
            <h3 className="mt-5 font-black text-slate-950">Learning Dashboard</h3><p className="mt-1 text-sm leading-5 text-slate-500">Return to your main learning workspace.</p>
          </Link>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Clipboard size={21} /></div><div><h3 className="font-black text-slate-950">Account details</h3><p className="text-xs font-semibold text-slate-500">Read-only account information.</p></div></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Member since</p><p className="mt-1 text-sm font-black text-slate-800">{formatDate(user.metadata?.creationTime)}</p></div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Account status</p><p className="mt-1 inline-flex items-center gap-1.5 text-sm font-black text-emerald-600"><CheckCircle2 size={15} /> Active</p></div>
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Moon size={21} /></div><div><h3 className="font-black text-slate-950">Experience</h3><p className="text-xs font-semibold text-slate-500">Small preferences saved on this device.</p></div></div>
            <button type="button" onClick={() => handleMotionChange(!reducedMotion)} className="flex w-full items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:bg-slate-100">
              <span className={`flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition ${reducedMotion ? "bg-blue-600" : "bg-slate-300"}`}><span className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${reducedMotion ? "translate-x-5" : "translate-x-0"}`} /></span>
              <span className="min-w-0"><span className="block text-sm font-black text-slate-800">Reduce animations</span><span className="block text-xs font-semibold text-slate-500">{reducedMotion ? "Enabled for a calmer interface." : "Use the normal interface animations."}</span></span>
            </button>
            <p className="mt-3 text-[11px] leading-5 text-slate-400">This preference stays on the current device and does not change your Firebase account.</p>
          </section>
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-[24px] border border-blue-100 bg-blue-50/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm"><Sparkles size={19} /></div><div><p className="font-black text-slate-900">Your profile is ready for learning.</p><p className="mt-1 text-xs font-semibold text-slate-500">Use the shortcuts above to move quickly around Online Academy.</p></div></div>
          <Link to="/courses" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-md shadow-blue-600/20 hover:bg-blue-700">Start Learning <ExternalLink size={15} /></Link>
        </div>
      </div>
    </main>
  );
}

export default Profile;
