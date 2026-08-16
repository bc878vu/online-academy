import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, Copy, Download, GraduationCap, Megaphone, Wifi, WifiOff, X } from "lucide-react";

function toMillis(value) { if (!value) return 0; if (typeof value === "number") return value; const n = new Date(value).getTime(); return Number.isNaN(n) ? 0 : n; }
function isLive(offer) { const now = Date.now(); const start = toMillis(offer?.startsAt); const end = toMillis(offer?.expiresAt); return offer?.active !== false && (!start || start <= now) && (!end || end >= now); }
function matchesPage(offer, pathname) { const targets = Array.isArray(offer?.targetPages) ? offer.targetPages : String(offer?.targetPages || "/").split(","); return targets.some((raw) => { const target = String(raw || "").trim(); if (!target || target === "*") return true; if (target.endsWith("/*")) return pathname.startsWith(target.slice(0, -1)); return target === pathname; }); }
function dismissKey(id) { return `oa_offer_dismissed_v2_${id}`; }
function dismiss(id) { try { localStorage.setItem(dismissKey(id), String(Date.now())); } catch {} }
function normalizeDestination(value) { const raw = String(value || "/courses").trim(); if (!raw) return "/courses"; if (/^https?:\/\//i.test(raw)) return raw; return raw.startsWith("/") ? raw : `/${raw}`; }

function OfferAction({ offer, className = "" }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [activated, setActivated] = useState(false);
  const destination = normalizeDestination(offer?.ctaUrl);
  const external = /^https?:\/\//i.test(destination);
  const activate = async (event) => {
    event?.preventDefault?.(); event?.stopPropagation?.();
    if (offer?.couponCode) { try { await navigator.clipboard.writeText(String(offer.couponCode)); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch {} }
    setActivated(true); window.setTimeout(() => setActivated(false), 1200);
    if (external) { window.open(destination, "_blank", "noopener,noreferrer"); return; }
    const target = new URL(destination, window.location.origin);
    navigate(`${target.pathname}${target.search}${target.hash}`);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  };
  return <button type="button" onClick={activate} className={`${className} pointer-events-auto cursor-pointer`} aria-label={offer?.ctaText || "Avail Offer"}>{copied ? <Check size={15} /> : offer?.couponCode ? <Copy size={15} /> : <Megaphone size={15} />}{copied ? "Code copied" : activated ? "Opening..." : offer?.ctaText || "Avail Offer"}</button>;
}
function OfferClose({ onClose }) { return <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close offer"><X size={18} /></button>; }

function PromotionLayer() {
  const location = useLocation();
  const [offers, setOffers] = useState([]);
  const [dismissed, setDismissed] = useState(() => new Set());
  useEffect(() => { const stored = new Set(); try { Object.keys(localStorage).forEach((key) => { if (key.startsWith("oa_offer_dismissed_v2_")) stored.add(key.replace("oa_offer_dismissed_v2_", "")); }); } catch {} setDismissed(stored); }, [location.pathname, location.search]);
  useEffect(() => {
    let cancelled = false; let timer;
    const load = async (attempt = 0) => {
      try {
        const response = await fetch(`/api/admin-promotions?scope=public&_t=${Date.now()}`, { method: "GET", cache: "no-store", credentials: "same-origin", headers: { Accept: "application/json", "Cache-Control": "no-cache" } });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `Unable to load promotions (${response.status})`);
        const next = Array.isArray(data.offers) ? data.offers.filter(isLive) : [];
        if (!cancelled) setOffers(next);
      } catch (error) {
        console.error("Promotion loading error:", error);
        if (!cancelled && attempt < 2) timer = window.setTimeout(() => load(attempt + 1), 700 * (attempt + 1));
      }
    };
    load();
    const refresh = () => load();
    window.addEventListener("online", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { cancelled = true; window.clearTimeout(timer); window.removeEventListener("online", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  const visible = useMemo(() => offers.filter((offer) => matchesPage(offer, location.pathname) && !dismissed.has(offer.id)), [offers, location.pathname, dismissed]);
  const offer = visible[0]; if (!offer) return null;
  const close = () => { if (offer.dismissible !== false) { dismiss(offer.id); setDismissed((current) => new Set([...current, offer.id])); } };
  const closeButton = offer.dismissible !== false ? <OfferClose onClose={close} /> : null;
  const type = offer.type || "card";
  if (type === "modal") return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true"><div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/20 bg-white shadow-2xl"><div className="bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 p-6 text-white sm:p-8"><div className="flex items-start justify-between gap-4"><span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-black tracking-[.14em]">{offer.badge || "SPECIAL OFFER"}</span>{closeButton}</div><h2 className="mt-6 text-3xl font-black tracking-tight">{offer.title}</h2><p className="mt-3 text-sm leading-6 text-blue-50">{offer.message}</p><OfferAction offer={offer} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-blue-700 shadow-xl" /></div>{offer.couponCode && <div className="border-t bg-slate-50 px-6 py-4 text-xs font-bold text-slate-500">Use code <span className="font-black text-slate-900">{offer.couponCode}</span> at checkout.</div>}</div></div>;
  if (type === "banner") return <div className="pointer-events-none fixed inset-x-3 top-[82px] z-[96] mx-auto max-w-5xl rounded-2xl border border-blue-200 bg-white/95 p-3 shadow-2xl backdrop-blur-xl sm:top-[88px] sm:p-4"><div className="pointer-events-auto flex flex-wrap items-center gap-3"><span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white sm:flex"><Megaphone size={18} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[9px] font-black uppercase tracking-[.14em] text-blue-600">{offer.badge || "SPECIAL OFFER"}</span><h2 className="truncate text-sm font-black text-slate-950 sm:text-base">{offer.title}</h2></div><p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500">{offer.message}</p></div><OfferAction offer={offer} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-black text-white shadow-lg sm:px-4" />{closeButton}</div></div>;
  return <div className="pointer-events-auto fixed bottom-4 left-4 z-[96] w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:bottom-5 sm:left-5"><div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" /><div className="p-4 sm:p-5"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Megaphone size={18} /></span><div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[.14em] text-blue-600">{offer.badge || "SPECIAL OFFER"}</p><h2 className="mt-1 text-base font-black leading-tight text-slate-950">{offer.title}</h2></div>{closeButton}</div><p className="mt-3 text-sm leading-6 text-slate-500">{offer.message}</p><div className="mt-4 flex items-center gap-2"><OfferAction offer={offer} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black text-white shadow-lg" />{offer.couponCode && <span className="rounded-xl bg-slate-100 px-3 py-2.5 text-[10px] font-black tracking-wider text-slate-700">{offer.couponCode}</span>}</div></div></div>;
}

export default function GlobalProfessionalUX() {
  const [online, setOnline] = useState(() => navigator.onLine); const [installEvent, setInstallEvent] = useState(null); const [installVisible, setInstallVisible] = useState(false);
  useEffect(() => { const onOnline = () => setOnline(true); const onOffline = () => setOnline(false); const onBeforeInstall = (event) => { event.preventDefault(); setInstallEvent(event); setInstallVisible(true); }; window.addEventListener("online", onOnline); window.addEventListener("offline", onOffline); window.addEventListener("beforeinstallprompt", onBeforeInstall); return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); window.removeEventListener("beforeinstallprompt", onBeforeInstall); }; }, []);
  const install = async () => { if (!installEvent) return; try { await installEvent.prompt(); await installEvent.userChoice; } finally { setInstallEvent(null); setInstallVisible(false); } };
  return <><PromotionLayer />{!online && <div className="fixed inset-x-3 top-[78px] z-[95] mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 shadow-xl" role="status"><WifiOff size={18} /><span>You are offline. Changes will resume when your connection returns.</span></div>}{installVisible && installEvent && <div className="fixed bottom-4 left-1/2 z-[90] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-3xl border border-blue-100 bg-white p-4 shadow-2xl" role="dialog"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white"><GraduationCap size={22} /></span><div className="min-w-0 flex-1"><h2 className="text-sm font-black">Install Online Academy</h2><p className="mt-1 text-xs leading-5 text-slate-500">Add the academy to your device for faster, app-like access.</p></div><button type="button" onClick={() => setInstallVisible(false)} aria-label="Dismiss install prompt"><X size={17} /></button></div><div className="mt-4 flex gap-2"><button type="button" onClick={install} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black text-white"><Download size={15} />Install app</button><button type="button" onClick={() => setInstallVisible(false)} className="min-h-10 rounded-xl border border-slate-200 px-4 text-xs font-black">Not now</button></div></div>}{online && <span className="sr-only" role="status"><Wifi /> Online</span>}</>;
}
