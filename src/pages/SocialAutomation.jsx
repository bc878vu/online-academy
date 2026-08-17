import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, CirclePlay, Facebook, Instagram, Plus, Settings2, Sparkles, Video, Youtube } from "lucide-react";

const platforms = [
  { id: "youtube", label: "YouTube", Icon: Youtube },
  { id: "instagram", label: "Instagram", Icon: Instagram },
  { id: "facebook", label: "Facebook", Icon: Facebook },
];

const initialQueue = [
  { title: "5 AI tools that save hours every week", platform: "YouTube", status: "Ready", time: "Today · 7:00 PM" },
  { title: "3 productivity habits for remote work", platform: "Instagram", status: "Generating", time: "Tomorrow · 12:30 PM" },
  { title: "Beginner guide to online freelancing", platform: "Facebook", status: "Scheduled", time: "Tomorrow · 8:00 PM" },
];

export default function SocialAutomation() {
  const [niche, setNiche] = useState("AI & Technology");
  const [daily, setDaily] = useState("2");
  const [schedule, setSchedule] = useState("19:00");
  const [selected, setSelected] = useState(["youtube", "instagram", "facebook"]);
  const [autoPublish, setAutoPublish] = useState(true);
  const [queue, setQueue] = useState(initialQueue);
  const [saved, setSaved] = useState(false);

  const activePlatforms = useMemo(() => platforms.filter((p) => selected.includes(p.id)), [selected]);
  const togglePlatform = (id) => setSelected((items) => items.includes(id) ? items.filter((x) => x !== id) : [...items, id]);
  const saveAutomation = () => {
    setSaved(true);
    setQueue((items) => [{ title: `${niche} — automated content batch`, platform: activePlatforms.map((p) => p.label).join(" + ") || "Not connected", status: autoPublish ? "Scheduled" : "Draft", time: `Daily · ${schedule}` }, ...items]);
    window.setTimeout(() => setSaved(false), 2500);
  };

  return <main className="min-h-[calc(100vh-150px)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-[1480px]">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700"><Sparkles size={14} /> AI SOCIAL AUTOMATION</div><h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Auto Content Studio</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Set your niche once. The automation pipeline can generate ideas, scripts, videos, captions and publishing jobs from one dashboard.</p></div>
        <button type="button" onClick={saveAutomation} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"><Plus size={18} />Create Automation</button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: "Content queued", value: queue.length, icon: Video }, { label: "Generating", value: queue.filter((x) => x.status === "Generating").length, icon: Sparkles }, { label: "Scheduled", value: queue.filter((x) => x.status === "Scheduled").length, icon: CalendarClock }, { label: "Platforms", value: selected.length, icon: Settings2 }].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</p><Icon size={18} className="text-blue-600" /></div><p className="mt-3 text-3xl font-black text-slate-950">{value}</p></div>)}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Settings2 size={19} /></div><div><h2 className="font-black text-slate-950">Automation settings</h2><p className="text-xs font-semibold text-slate-400">Your content engine defaults</p></div></div>
          <label className="mt-6 block text-sm font-black text-slate-700">Niche / topic</label><input value={niche} onChange={(e) => setNiche(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" placeholder="e.g. AI, education, fitness" />
          <div className="mt-5 grid grid-cols-2 gap-3"><div><label className="text-sm font-black text-slate-700">Videos / day</label><select value={daily} onChange={(e) => setDaily(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none"><option>1</option><option>2</option><option>3</option><option>5</option><option>10</option></select></div><div><label className="text-sm font-black text-slate-700">Publish time</label><input type="time" value={schedule} onChange={(e) => setSchedule(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none" /></div></div>
          <label className="mt-5 block text-sm font-black text-slate-700">Publish to</label><div className="mt-2 grid gap-2">{platforms.map(({ id, label, Icon }) => <button key={id} type="button" onClick={() => togglePlatform(id)} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 text-left text-sm font-black transition ${selected.includes(id) ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500"}`}><Icon size={18} /><span>{label}</span>{selected.includes(id) && <CheckCircle2 size={17} className="ml-auto" />}</button>)}</div>
          <label className="mt-5 flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4"><span><span className="block text-sm font-black text-slate-800">Auto-publish</span><span className="block text-xs font-semibold text-slate-400">Use official platform APIs after connection</span></span><input type="checkbox" checked={autoPublish} onChange={(e) => setAutoPublish(e.target.checked)} className="h-5 w-5 accent-blue-600" /></label>
          <button type="button" onClick={saveAutomation} className="mt-5 h-12 w-full rounded-xl bg-slate-950 text-sm font-black text-white hover:bg-slate-800">{saved ? "Automation created ✓" : "Save & schedule"}</button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-black text-slate-950">Content pipeline</h2><p className="mt-1 text-xs font-semibold text-slate-400">Idea → Script → Video → Metadata → Publish</p></div><span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700"><CheckCircle2 size={14} /> Pipeline ready</span></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-5">{["Ideas", "Scripts", "Voice + Visuals", "SEO + Captions", "Publish"].map((step, i) => <div key={step} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between"><span className="text-xs font-black text-slate-400">0{i + 1}</span>{i < 2 ? <CheckCircle2 size={16} className="text-emerald-500" /> : <CirclePlay size={16} className="text-blue-500" />}</div><p className="mt-3 text-sm font-black text-slate-800">{step}</p></div>)}</div>
          <div className="mt-8 flex items-center justify-between"><div><h3 className="font-black text-slate-950">Content queue</h3><p className="text-xs font-semibold text-slate-400">Latest automation jobs</p></div><span className="text-xs font-black text-slate-400">{queue.length} jobs</span></div>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">{queue.map((item, i) => <div key={`${item.title}-${i}`} className="flex flex-col gap-3 border-b border-slate-100 p-4 last:border-b-0 sm:flex-row sm:items-center"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100"><Video size={18} className="text-slate-600" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-800">{item.title}</p><p className="mt-1 text-xs font-semibold text-slate-400">{item.platform} · {item.time}</p></div><span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-black ${item.status === "Ready" ? "bg-emerald-50 text-emerald-700" : item.status === "Generating" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{item.status}</span></div>)}</div>
          <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs font-semibold leading-5 text-slate-500">Live publishing is intentionally gated behind official OAuth/API credentials. No platform passwords are stored; once connected, the same queue will feed the real publishing workers.</div>
        </section>
      </div>
    </div>
  </main>;
}
