import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
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
  Globe2,
  GraduationCap,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Moon,
  Pencil,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  User,
  X,
  LogOut,
} from "lucide-react";
import { auth } from "../firebase";

const PROFILE_KEY = "onlineAcademyProfile_v2";
const PREFS_KEY = "onlineAcademyProfilePrefs_v2";

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

const safeRead = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const safeWrite = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Device preferences are optional and must never break the account page.
  }
};

const defaultProfile = {
  bio: "",
  institution: "",
  education: "",
  city: "",
  country: "Pakistan",
  website: "",
  language: "English",
};

const defaultPrefs = {
  reducedMotion: false,
  privacyMode: false,
};

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [securityBusy, setSecurityBusy] = useState(false);
  const [copying, setCopying] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [profile, setProfile] = useState(defaultProfile);
  const [draft, setDraft] = useState(defaultProfile);
  const [prefs, setPrefs] = useState(() => safeRead(PREFS_KEY, defaultPrefs));

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setLoading(false);
        navigate("/login", { replace: true });
        return;
      }

      const saved = safeRead(`${PROFILE_KEY}_${currentUser.uid}`, defaultProfile);
      const nextProfile = { ...defaultProfile, ...saved };
      setUser(currentUser);
      setName(currentUser.displayName || currentUser.email?.split("@")[0] || "Student");
      setPhotoURL(currentUser.photoURL || "");
      setProfile(nextProfile);
      setDraft(nextProfile);
      setLoading(false);
    });
    return unsubscribe;
  }, [navigate]);

  const userData = useMemo(() => {
    if (!user) return null;
    const displayName = user.displayName || user.email?.split("@")[0] || "Student";
    const email = user.email || "No email available";
    const provider = user.providerData?.some((item) => item.providerId === "google.com")
      ? "Google Account"
      : "Email Account";
    const initials = displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "S";

    const editableItems = [
      Boolean(user.displayName),
      Boolean(user.photoURL),
      Boolean(profile.bio),
      Boolean(profile.institution),
      Boolean(profile.education),
      Boolean(profile.city),
      Boolean(profile.country),
      Boolean(user.emailVerified),
    ];
    const completion = Math.round(
      (editableItems.filter(Boolean).length / editableItems.length) * 100
    );

    return { displayName, email, provider, initials, completion };
  }, [profile, user]);

  const clearMessages = () => {
    setSuccess("");
    setError("");
  };

  const updateDraft = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    clearMessages();

    const trimmedName = name.trim();
    const trimmedPhoto = photoURL.trim();
    const trimmedWebsite = draft.website.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setError("Please enter a valid full name (at least 2 characters).");
      return;
    }

    if (trimmedPhoto && !/^https:\/\//i.test(trimmedPhoto)) {
      setError("Profile photo URL must start with https:// for safety.");
      return;
    }

    if (trimmedWebsite && !/^https:\/\//i.test(trimmedWebsite)) {
      setError("Website URL must start with https:// for safety.");
      return;
    }

    try {
      setSaving(true);
      await updateProfile(user, {
        displayName: trimmedName,
        photoURL: trimmedPhoto || null,
      });

      const cleanProfile = {
        ...draft,
        bio: draft.bio.trim().slice(0, 500),
        institution: draft.institution.trim().slice(0, 120),
        education: draft.education.trim().slice(0, 120),
        city: draft.city.trim().slice(0, 80),
        country: draft.country.trim().slice(0, 80),
        website: trimmedWebsite,
        language: draft.language || "English",
      };

      safeWrite(`${PROFILE_KEY}_${user.uid}`, cleanProfile);
      setProfile(cleanProfile);
      setDraft(cleanProfile);
      setName(trimmedName);
      setPhotoURL(trimmedPhoto);
      setEditing(false);
      setUser({ ...user, displayName: trimmedName, photoURL: trimmedPhoto || null });
      setSuccess("Profile saved successfully.");
    } catch (err) {
      console.error("Profile update error:", err);
      setError("Unable to save your profile right now. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setName(user?.displayName || user?.email?.split("@")[0] || "Student");
    setPhotoURL(user?.photoURL || "");
    setDraft(profile);
    setEditing(false);
    clearMessages();
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
      window.setTimeout(() => setCopying(false), 700);
    }
  };

  const handleVerifyEmail = async () => {
    if (!user || user.emailVerified || securityBusy) return;
    clearMessages();
    try {
      setSecurityBusy(true);
      await sendEmailVerification(user);
      setSuccess("Verification email sent. Please check your inbox.");
    } catch (err) {
      console.error("Verification email error:", err);
      setError("Unable to send the verification email right now.");
    } finally {
      setSecurityBusy(false);
    }
  };

  const handleRefreshSession = async () => {
    if (!user || securityBusy) return;
    clearMessages();
    try {
      setSecurityBusy(true);
      await reload(user);
      setUser({ ...auth.currentUser });
      setSuccess("Account security status refreshed.");
    } catch (err) {
      console.error("Session refresh error:", err);
      setError("Could not refresh the account session.");
    } finally {
      setSecurityBusy(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email || userData?.provider === "Google Account" || securityBusy) return;
    clearMessages();
    try {
      setSecurityBusy(true);
      await sendPasswordResetEmail(auth, user.email);
      setSuccess("Password reset email sent. Use the secure link in your inbox.");
    } catch (err) {
      console.error("Password reset error:", err);
      setError("Unable to send the password reset email right now.");
    } finally {
      setSecurityBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (securityBusy) return;
    clearMessages();
    try {
      setSecurityBusy(true);
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Sign out error:", err);
      setError("Unable to sign out. Please try again.");
      setSecurityBusy(false);
    }
  };

  const handlePrefChange = (field) => {
    setPrefs((current) => {
      const next = { ...current, [field]: !current[field] };
      safeWrite(PREFS_KEY, next);
      return next;
    });
  };

  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-slate-50 px-5">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <User size={26} />
          </div>
          <Loader2 size={28} className="mx-auto mt-5 animate-spin text-blue-600" />
          <p className="mt-3 text-sm font-semibold text-slate-500">Loading your secure profile...</p>
        </div>
      </main>
    );
  }

  if (!user || !userData) return null;

  const verified = Boolean(user.emailVerified);
  const photo = user.photoURL || null;
  const privacyEmail = prefs.privacyMode
    ? `${userData.email.slice(0, 2)}••••${userData.email.includes("@") ? userData.email.slice(userData.email.indexOf("@")) : ""}`
    : userData.email;

  return (
    <main className={`min-h-[calc(100vh-76px)] bg-slate-50 ${prefs.reducedMotion ? "[&_*]:!transition-none" : ""}`}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link to="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-blue-600">
          <ArrowLeft size={17} /> Back to Dashboard
        </Link>

        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-blue-700">
              <Sparkles size={13} /> Secure Account Center
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">My Profile</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">Edit your public profile, manage account security and control your private viewing preferences.</p>
          </div>
          <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex">
            <ShieldCheck size={18} className="text-emerald-600" />
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
                    {photo ? <img src={photo} alt="Profile" className="h-full w-full object-cover" /> : userData.initials}
                  </div>
                  <span className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-4 border-slate-950 bg-emerald-500 text-white" title="Active account"><Check size={14} strokeWidth={3} /></span>
                </div>
                <div className="min-w-0 text-white">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-2xl font-black sm:text-3xl">{userData.displayName}</h2>
                    {verified && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-black text-emerald-300 ring-1 ring-emerald-300/20"><ShieldCheck size={13} /> Verified</span>}
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-300">{privacyEmail}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200 ring-1 ring-white/10">Active Student</span>
                    <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200 ring-1 ring-white/10">{userData.provider}</span>
                    {profile.institution && <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200 ring-1 ring-white/10">{profile.institution}</span>}
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => { setEditing(true); clearMessages(); }} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-100 sm:w-auto"><Pencil size={16} /> Edit Profile</button>
            </div>

            <div className="mt-8 max-w-xl">
              <div className="mb-2 flex items-center justify-between text-xs font-bold"><span className="text-slate-400">Profile completion</span><span className="text-white">{userData.completion}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${userData.completion}%` }} /></div>
              <p className="mt-2 text-[11px] text-slate-400">Complete your basic information and verify your email for a stronger account profile.</p>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">Editable information</p><h3 className="mt-1 text-xl font-black text-slate-950">Personal profile</h3><p className="mt-1 text-sm text-slate-500">Your Firebase identity stays protected while these profile details remain easy to update.</p></div>
              {!editing && <button type="button" onClick={() => setEditing(true)} className="hidden rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 sm:inline-flex"><Pencil size={14} className="mr-1.5" /> Edit</button>}
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div><label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Full name</label><div className="relative"><User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input value={name} onChange={(e) => setName(e.target.value)} disabled={!editing || saving} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-80" placeholder="Your full name" /></div></div>
                <div><label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Profile photo URL</label><input value={photoURL} onChange={(e) => setPhotoURL(e.target.value)} disabled={!editing || saving} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-80" placeholder="https://..." /></div>
              </div>

              <div><label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Bio</label><textarea value={draft.bio} onChange={(e) => updateDraft("bio", e.target.value)} disabled={!editing || saving} maxLength={500} rows={3} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-80" placeholder="Tell a little about yourself..." /><p className="mt-1 text-right text-[11px] text-slate-400">{draft.bio.length}/500</p></div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div><label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Institution / University</label><div className="relative"><GraduationCap size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input value={draft.institution} onChange={(e) => updateDraft("institution", e.target.value)} disabled={!editing || saving} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-80" placeholder="Institution" /></div></div>
                <div><label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Education</label><input value={draft.education} onChange={(e) => updateDraft("education", e.target.value)} disabled={!editing || saving} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-80" placeholder="Degree / Program" /></div>
                <div><label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">City</label><div className="relative"><MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input value={draft.city} onChange={(e) => updateDraft("city", e.target.value)} disabled={!editing || saving} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-80" placeholder="City" /></div></div>
                <div><label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Country</label><input value={draft.country} onChange={(e) => updateDraft("country", e.target.value)} disabled={!editing || saving} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-80" placeholder="Country" /></div>
                <div><label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Website</label><div className="relative"><Globe2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input value={draft.website} onChange={(e) => updateDraft("website", e.target.value)} disabled={!editing || saving} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-80" placeholder="https://your-site.com" /></div></div>
                <div><label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Preferred language</label><select value={draft.language} onChange={(e) => updateDraft("language", e.target.value)} disabled={!editing || saving} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-80"><option>English</option><option>Urdu</option><option>Arabic</option><option>Punjabi</option></select></div>
              </div>

              {editing && <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={handleCancelEdit} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50"><X size={17} /> Cancel</button><button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60">{saving ? <><Loader2 size={17} className="animate-spin" /> Saving...</> : <><Save size={17} /> Save Changes</>}</button></div>}
            </form>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5"><p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-600">Security center</p><h3 className="mt-1 text-xl font-black text-slate-950">Protect your account</h3><p className="mt-1 text-sm text-slate-500">Authentication-sensitive actions stay inside Firebase Auth.</p></div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${verified ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}><Mail size={19} /></div><div className="min-w-0 flex-1"><p className="text-sm font-black text-slate-800">Email verification</p><p className="text-xs font-semibold text-slate-500">{verified ? "Verified and protected." : "Verification is recommended."}</p></div>{verified ? <CheckCircle2 size={20} className="text-emerald-600" /> : <button type="button" onClick={handleVerifyEmail} disabled={securityBusy} className="rounded-lg bg-amber-500 px-2.5 py-2 text-[11px] font-black text-white hover:bg-amber-600 disabled:opacity-60">Verify</button>}</div>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600"><KeyRound size={19} /></div><div className="min-w-0 flex-1"><p className="text-sm font-black text-slate-800">Password security</p><p className="text-xs font-semibold text-slate-500">{userData.provider === "Google Account" ? "Managed by Google." : "Reset through a secure email link."}</p></div>{userData.provider !== "Google Account" && <button type="button" onClick={handlePasswordReset} disabled={securityBusy} className="rounded-lg bg-blue-600 px-2.5 py-2 text-[11px] font-black text-white hover:bg-blue-700 disabled:opacity-60">Reset</button>}</div>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600"><Clock3 size={19} /></div><div className="min-w-0 flex-1"><p className="text-sm font-black text-slate-800">Last sign-in</p><p className="text-xs font-semibold text-slate-500">{formatDateTime(user.metadata?.lastSignInTime)}</p></div><button type="button" onClick={handleRefreshSession} disabled={securityBusy} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-60" title="Refresh security status"><RefreshCw size={16} className={securityBusy ? "animate-spin" : ""} /></button></div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><div className="flex items-start gap-3"><ShieldCheck size={19} className="mt-0.5 shrink-0 text-emerald-600" /><div><p className="text-sm font-black text-emerald-800">Security-first design</p><p className="mt-1 text-xs font-semibold leading-5 text-emerald-700">Passwords are never displayed or stored by this profile page. Firebase Auth controls your authentication credentials.</p></div></div></div>
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link to="/courses" className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5 sm:p-6"><div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><BookOpen size={22} /></span><ArrowRight size={18} className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600" /></div><h3 className="mt-5 font-black text-slate-950">Browse Courses</h3><p className="mt-1 text-sm leading-5 text-slate-500">Explore available courses and continue learning.</p></Link>
          <Link to="/certificate" className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-amber-200 hover:shadow-lg hover:shadow-amber-900/5 sm:p-6"><div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Award size={22} /></span><ArrowRight size={18} className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-amber-600" /></div><h3 className="mt-5 font-black text-slate-950">My Certificate</h3><p className="mt-1 text-sm leading-5 text-slate-500">Open the certificate area from your account.</p></Link>
          <Link to="/dashboard" className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-900/5 sm:p-6"><div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><RefreshCw size={21} /></span><ArrowRight size={18} className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-violet-600" /></div><h3 className="mt-5 font-black text-slate-950">Learning Dashboard</h3><p className="mt-1 text-sm leading-5 text-slate-500">Return to your main learning workspace.</p></Link>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Clipboard size={21} /></div><div><h3 className="font-black text-slate-950">Account details</h3><p className="text-xs font-semibold text-slate-500">Read-only Firebase account information.</p></div></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Member since</p><p className="mt-1 text-sm font-black text-slate-800">{formatDate(user.metadata?.creationTime)}</p></div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Account status</p><p className="mt-1 inline-flex items-center gap-1.5 text-sm font-black text-emerald-600"><CheckCircle2 size={15} /> Active</p></div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sign-in provider</p><p className="mt-1 text-sm font-black text-slate-800">{userData.provider}</p></div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">User ID</p><p className="mt-1 truncate text-sm font-black text-slate-800" title={user.uid}>{prefs.privacyMode ? `${user.uid.slice(0, 6)}••••${user.uid.slice(-4)}` : user.uid}</p></div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 sm:col-span-2"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Email address</p><p className="mt-1 truncate text-sm font-black text-slate-800">{privacyEmail}</p></div><button type="button" onClick={handleCopyEmail} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-100">{copying ? <Check size={13} /> : <Copy size={13} />}{copying ? "Copied" : "Copy"}</button></div></div>
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Moon size={21} /></div><div><h3 className="font-black text-slate-950">Privacy & experience</h3><p className="text-xs font-semibold text-slate-500">Private preferences are saved only on this device.</p></div></div>
            <div className="space-y-3">
              <button type="button" onClick={() => handlePrefChange("privacyMode")} className="flex w-full items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:bg-slate-100"><span className={`flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition ${prefs.privacyMode ? "bg-blue-600" : "bg-slate-300"}`}><span className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${prefs.privacyMode ? "translate-x-5" : "translate-x-0"}`} /></span><span><span className="block text-sm font-black text-slate-800">Privacy mode</span><span className="block text-xs font-semibold text-slate-500">Mask your email and user ID on this screen.</span></span></button>
              <button type="button" onClick={() => handlePrefChange("reducedMotion")} className="flex w-full items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:bg-slate-100"><span className={`flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition ${prefs.reducedMotion ? "bg-blue-600" : "bg-slate-300"}`}><span className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${prefs.reducedMotion ? "translate-x-5" : "translate-x-0"}`} /></span><span><span className="block text-sm font-black text-slate-800">Reduce animations</span><span className="block text-xs font-semibold text-slate-500">Use a calmer interface on this device.</span></span></button>
            </div>
            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs font-black text-slate-700">Stored safely</p><p className="mt-1 text-[11px] leading-5 text-slate-500">No password or authentication secret is stored by this page. Non-auth profile details and preferences are kept locally so the page remains fast and avoids unnecessary database reads.</p></div>
          </section>
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-[24px] border border-red-100 bg-red-50/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm"><LogOut size={18} /></div><div><p className="font-black text-slate-900">Sign out of this device</p><p className="mt-1 text-xs font-semibold text-slate-500">End the current Firebase session on this browser.</p></div></div>
          <button type="button" onClick={handleSignOut} disabled={securityBusy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white shadow-md shadow-red-600/20 hover:bg-red-700 disabled:opacity-60"><LogOut size={15} /> Sign Out</button>
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
