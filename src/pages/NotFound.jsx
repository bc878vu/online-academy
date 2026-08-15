import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, BookOpen, Compass, Home, Search } from "lucide-react";

export default function NotFound() {
  const location = useLocation();
  return <main className="flex min-h-[calc(100vh-150px)] items-center bg-[#f7f9fc] px-4 py-16 sm:px-6 lg:px-8">
    <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
      <div className="grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[.9fr_1.1fr] lg:p-14">
        <div className="relative mx-auto flex h-64 w-full max-w-sm items-center justify-center overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white shadow-xl shadow-blue-600/20">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-cyan-300/10 blur-2xl" />
          <div className="relative text-center"><p className="text-7xl font-black tracking-[-.08em] sm:text-8xl">404</p><div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] backdrop-blur"><Compass size={13} /> Page not found</div></div>
        </div>
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-blue-700"><Search size={13} /> Wrong turn?</span>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">This learning page does not exist.</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">The address you opened may be outdated, incomplete, or the course may have moved. Let’s get you back to something useful.</p>
          <p className="mt-3 truncate rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-400" title={location.pathname}>{location.pathname}</p>
          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            <Link to="/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700"><Home size={17} /> Go Home</Link>
            <Link to="/courses" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700"><BookOpen size={17} /> Browse Courses</Link>
          </div>
          <Link to={-1} className="mt-4 inline-flex items-center gap-2 text-xs font-black text-slate-400 transition hover:text-blue-700"><ArrowLeft size={14} /> Go back</Link>
        </div>
      </div>
    </div>
  </main>;
}
