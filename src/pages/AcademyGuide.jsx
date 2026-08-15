import { Link, useLocation } from "react-router-dom";
import { ArrowRight, BadgeCheck, BookOpen, CheckCircle2, CircleHelp, CreditCard, Headphones, LockKeyhole, MessageCircle, ShieldCheck, Sparkles, UserRound } from "lucide-react";

const aboutItems = [
  [BookOpen, "Structured learning", "Courses can combine video lessons, assessments, resources and a clear completion journey."],
  [ShieldCheck, "Secure progress", "Your learning progress, purchases and course access are designed around authenticated accounts."],
  [BadgeCheck, "Certificate pathway", "Complete the required learning journey and use the certificate area for your completion record."],
  [CreditCard, "Free & premium", "Explore free learning or unlock premium courses through the site's checkout experience."],
  [Sparkles, "Modern experience", "Responsive layouts, fast navigation, PWA support and accessible interactions across devices."],
  [Headphones, "Human support", "Use Reviews & Support to send a contact request, feedback or course review."],
];

const faqs = [
  ["How do I start a course?", "Open Courses, choose a published course and select View Course. Free courses can be opened directly; premium courses can be unlocked through checkout."],
  ["How does paid-course access work?", "Premium course access is tied to your account and payment status. Once the purchase is confirmed, the course experience can unlock automatically."],
  ["Where can I track my progress?", "Use Dashboard to continue learning, review progress and see completed courses and learning activity."],
  ["How do certificates work?", "The learning journey can require lessons and assessments before completion. When eligible, use the Certificate area to continue the certificate process."],
  ["How can I verify a certificate?", "Open Verify Certificate and enter the certificate ID supplied with the certificate record."],
  ["How do I contact support?", "Open Reviews & Support from the floating button and choose Contact or Feedback. You can also submit a course review after signing in."],
];

export default function AcademyGuide() {
  const { pathname } = useLocation();
  const isHelp = pathname === "/help";
  return <main className="min-h-[70vh] bg-[#f7f9fc] text-slate-950">
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(37,99,235,.34),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(99,102,241,.28),transparent_32%)]" />
      <div className="relative mx-auto max-w-[1200px] px-5 py-14 sm:px-7 sm:py-20 lg:px-10">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[.18em] text-blue-100"><Sparkles size={14} /> {isHelp ? "Help Center" : "About Online Academy"}</span>
          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">{isHelp ? "Everything you need to keep learning." : "A modern home for practical learning."}</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">{isHelp ? "Find quick answers about courses, payments, progress, certificates and support." : "Online Academy brings courses, assessments, progress tracking, premium learning and certificates together in one responsive platform."}</p>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-[1200px] px-5 py-12 sm:px-7 sm:py-16 lg:px-10">
      {!isHelp ? <>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {aboutItems.map(([Icon, title, text]) => <article key={title} className="oa-feature-card rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Icon size={23} /></span><h2 className="mt-5 text-lg font-black">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></article>)}
        </div>
        <div className="mt-12 grid gap-6 rounded-[2rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6 sm:p-8 lg:grid-cols-2 lg:p-10">
          <div><p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">Designed around the learner</p><h2 className="mt-3 text-3xl font-black tracking-tight">Learn, prove, complete.</h2><p className="mt-3 text-sm leading-7 text-slate-600">From the first lesson to the final assessment, the platform is built to make the next action obvious and keep your learning journey organized.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">{["Responsive on phone and desktop", "Course progress tracking", "Free and premium catalog", "Certificate verification", "Secure account flows", "Community & support"].map((item) => <div key={item} className="flex items-center gap-2 rounded-2xl border border-white bg-white/80 p-3 text-sm font-bold text-slate-700 shadow-sm"><CheckCircle2 size={17} className="shrink-0 text-emerald-500" />{item}</div>)}</div>
        </div>
      </> : <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[[BookOpen, "Courses", "Browse the published catalog and open a course to see its learning journey."], [UserRound, "Account", "Sign in or create an account to keep your learning progress connected."], [CreditCard, "Payments", "Use the premium checkout flow for paid courses and wait for payment confirmation."], [BadgeCheck, "Certificates", "Check your completion status and use the certificate area when eligible."], [ShieldCheck, "Verification", "Validate a certificate with its unique certificate ID."], [MessageCircle, "Support", "Send a review, contact request or feedback through Reviews & Support."]].map(([Icon, title, text]) => <article key={title} className="oa-feature-card rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon size={21} /></span><h2 className="mt-4 font-black">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></article>)}</div>
        <div className="oa-faq mt-12 space-y-3">{faqs.map(([question, answer]) => <details key={question} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><summary className="pr-8 text-sm font-black text-slate-900 sm:text-base">{question}</summary><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">{answer}</p></details>)}</div>
      </>}

      <div className="mt-12 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8"><div><p className="text-lg font-black">Ready for the next step?</p><p className="mt-1 text-sm text-slate-400">Explore the catalog or open support when you need help.</p></div><div className="flex flex-wrap gap-2"><Link to="/courses" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-slate-950">Explore Courses <ArrowRight size={16} /></Link><Link to={isHelp ? "/" : "/help"} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-black text-white">{isHelp ? "Home" : "Help Center"} <CircleHelp size={16} /></Link></div></div>
    </section>
  </main>;
}
