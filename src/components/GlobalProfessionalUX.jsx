import { useEffect, useState } from "react";
import { Download, GraduationCap, Wifi, WifiOff, X } from "lucide-react";

export default function GlobalProfessionalUX() {
  const [online, setOnline] = useState(() => navigator.onLine);
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
    {!online && (
      <div
        className="fixed inset-x-3 top-[78px] z-[95] mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 shadow-xl shadow-amber-900/10"
        role="status"
      >
        <WifiOff size={18} className="shrink-0" />
        <span className="min-w-0 flex-1">You are offline. Changes will resume when your connection returns.</span>
      </div>
    )}

    {installVisible && installEvent && (
      <div
        className="fixed bottom-4 left-1/2 z-[90] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-3xl border border-blue-100 bg-white p-4 shadow-2xl shadow-blue-950/15 sm:bottom-5 sm:p-5"
        role="dialog"
        aria-label="Install Online Academy"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <GraduationCap size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-black text-slate-950">Install Online Academy</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Add the academy to your device for faster, app-like access.</p>
          </div>
          <button type="button" onClick={() => setInstallVisible(false)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Dismiss install prompt">
            <X size={17} />
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" disabled={installing} onClick={install} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black text-white shadow-lg shadow-blue-600/20 disabled:opacity-60">
            <Download size={15} />{installing ? "Opening…" : "Install app"}
          </button>
          <button type="button" onClick={() => setInstallVisible(false)} className="min-h-10 rounded-xl border border-slate-200 px-4 text-xs font-black text-slate-700">Not now</button>
        </div>
      </div>
    )}

    {online && <span className="sr-only" role="status"><Wifi /> Online</span>}
  </>;
}
