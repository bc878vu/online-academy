import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import {
  ArrowUp, BookOpen, Command, Download, GraduationCap,
  Search, Wifi, WifiOff, X, Zap,
} from "lucide-react";
import { db } from "../firebase";

const STATIC_COMMANDS = [
  { label: "Home", description: "Go to the homepage", path: "/", keywords: "home academy" },
  { label: "Browse courses", description: "Explore all published courses", path: "/courses", keywords: "courses learning" },
  { label: "My dashboard", description: "Open your learning progress", path: "/dashboard", keywords: "dashboard progress" },
  { label: "Certificates", description: "View your certificates", path: "/certificate", keywords: "certificate completion" },
  { label: "Verify certificate", description: "Check a certificate ID", path: "/verify-certificate", keywords: "verify validation" },
  { label: "My profile", description: "Manage your account", path: "/profile", keywords: "profile account settings" },
];

const clean = (value) => String(value || "").trim();

export default function GlobalProfessionalUX() {
  const navigate = useNavigate();
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [queryText, setQueryText] = useState("");
  const [courses, setCourses] = useState([]);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [showTop, setShowTop] = useState(false);
  const [progress, setProgress] = useState(0);
  const [installEvent, setInstallEvent] = useState(null);
  const [installVisible, setInstallVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onBeforeInstall = (event) => {
      event.preventDefault();
      setInstallEvent(event);
      setInstallVisible(true);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const next = scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0;
      setProgress(next);
      setShowTop(window.scrollY > 520);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [location.pathname]);

  useEffect(() => {
    setPaletteOpen(false);
    setQueryText("");
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = event.target?.tagName?.toLowerCase();
      const typing = tag === "input" || tag === "textarea" || event.target?.isContentEditable;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (!typing && event.key === "/") {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (event.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!paletteOpen || courses.length) return undefined;
    let cancelled = false;
    getDocs(query(collection(db, "courses"), where("published", "==", true), limit(30)))
      .then((snapshot) => {
        if (cancelled) return;
        setCourses(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      })
      .catch(() => {
        if (!cancelled) setCourses([]);
      });
    return () => { cancelled = true; };
  }, [paletteOpen, courses.length]);

  const courseCommands = useMemo(() => courses.map((course) => ({
    label: clean(course.title || course.name) || "Untitled Course",
    description: `${clean(course.category) || "Online course"} · ${course.price > 0 ? `Rs. ${Number(course.price).toLocaleString()}` : "Free"}`,
    path: `/courses/${course.id}`,
    keywords: `${course.title || ""} ${course.name || ""} ${course.category || ""} ${course.description || ""}`,
  })), [courses]);

  const commands = useMemo(() => [...STATIC_COMMANDS, ...courseCommands], [courseCommands]);
  const filtered = useMemo(() => {
    const term = queryText.trim().toLowerCase();
    if (!term) return commands.slice(0, 9);
    return commands.filter((item) => `${item.label} ${item.description} ${item.keywords}`.toLowerCase().includes(term)).slice(0, 12);
  }, [commands, queryText]);

  const openCommand = (path) => {
    setPaletteOpen(false);
    navigate(path);
  };

  const install = async () => {
    if (!installEvent) return;
    setInstalling(true);
    try {
      await installEvent.prompt();
      await installEvent.userChoice;
    } finally {
      setInstallEvent(null);
      setInstallVisible(false);
      setInstalling(false);
    }
  };

  return <>
    <div className="fixed left-0 right-0 top-0 z-[100] h-0.5 bg-transparent" aria-hidden="true">
      <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-violet-500 transition-[width] duration-150" style={{ width: `${progress}%` }} />
    </div>

    {!online && <div className="fixed inset-x-3 top-[78px] z-[95] mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 shadow-xl shadow-amber-900/10" role="status"><WifiOff size={18} className="shrink-0" /><span className="min-w-0 flex-1">You are offline. Changes will resume when your connection returns.</span></div>}

    {showTop && <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-5 right-5 z-[80] flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-xl shadow-slate-900/15 transition hover:-translate-y-1 hover:border-blue-200 hover:text-blue-700" aria-label="Back to top" title="Back to top"><ArrowUp size={18} /></button>}

    <button type="button" onClick={() => setPaletteOpen(true)} className="fixed bottom-5 left-5 z-[80] hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-black text-slate-600 shadow-xl shadow-slate-900/10 transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700 sm:inline-flex" aria-label="Open quick search"><Search size={15} /> Quick search <kbd className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-black">Ctrl K</kbd></button>

    {installVisible && installEvent && <div className="fixed bottom-4 left-1/2 z-[90] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-3xl border border-blue-100 bg-white p-4 shadow-2xl shadow-blue-950/15 sm:bottom-5 sm:p-5" role="dialog" aria-label="Install Online Academy"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20"><GraduationCap size={22} /></span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="text-sm font-black text-slate-950">Install Online Academy</h2><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-700">APP</span></div><p className="mt-1 text-xs leading-5 text-slate-500">Add the academy to your device for faster, app-like access.</p></div><button type="button" onClick={() => setInstallVisible(false)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Dismiss install prompt"><X size={17} /></button></div><div className="mt-4 flex gap-2"><button type="button" disabled={installing} onClick={install} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black text-white shadow-lg shadow-blue-600/20 disabled:opacity-60"><Download size={15} />{installing ? "Opening…" : "Install app"}</button><button type="button" onClick={() => setInstallVisible(false)} className="min-h-10 rounded-xl border border-slate-200 px-4 text-xs font-black text-slate-700">Not now</button></div></div>}

    {paletteOpen && <div className="fixed inset-0 z-[120] flex items-start justify-center bg-slate-950/55 p-3 pt-[10vh] backdrop-blur-sm sm:p-6 sm:pt-[12vh]" role="dialog" aria-modal="true" aria-label="Quick search"><button type="button" className="absolute inset-0 cursor-default" onClick={() => setPaletteOpen(false)} aria-label="Close quick search" /><div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/30"><div className="flex items-center gap-3 border-b border-slate-100 px-4"><Search size={19} className="shrink-0 text-blue-600" /><input autoFocus value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder="Search courses or jump to a page…" className="h-14 min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400" aria-label="Search courses and pages" /><kbd className="hidden rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500 sm:block">ESC</kbd></div><div className="max-h-[60vh] overflow-y-auto p-2"><div className="px-3 py-2 text-[9px] font-black uppercase tracking-[.18em] text-slate-400">Quick actions</div>{filtered.length ? filtered.map((item) => <button type="button" key={item.path} onClick={() => openCommand(item.path)} className="group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-blue-50"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-blue-100 group-hover:text-blue-700"><BookOpen size={17} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-slate-800">{item.label}</span><span className="mt-0.5 block truncate text-xs text-slate-400">{item.description}</span></span><Zap size={15} className="shrink-0 text-slate-300 transition group-hover:text-blue-600" /></button>) : <div className="px-4 py-10 text-center"><Search size={28} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-black text-slate-700">No matching results</p><p className="mt-1 text-xs text-slate-400">Try a course name, category, or page.</p></div>}</div><div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 text-[10px] font-semibold text-slate-400"><span className="inline-flex items-center gap-1.5"><Command size={12} /> Fast navigation</span><span>{filtered.length} result{filtered.length === 1 ? "" : "s"}</span></div></div></div>}

    {online && <span className="sr-only" role="status"><Wifi /> Online</span>}
  </>;
}
