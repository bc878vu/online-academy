import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  CreditCard,
  FileText,
  GraduationCap,
  HeartHandshake,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

const GITHUB_URL = "https://github.com/bc878vu/online-academy";
const PROJECT_URL = "https://online-academy-plum.vercel.app/";

const offerings = [
  ["01", "Web Development", "Structured online learning for HTML, CSS, JavaScript, React and practical web development."],
  ["02", "Programming Fundamentals", "Beginner-friendly programming concepts, problem solving and coding practice."],
  ["03", "Database & Backend", "Learning resources covering databases, APIs, backend concepts and application development."],
  ["04", "Computer Science", "Computer science subjects, software concepts and practical technical skills."],
  ["05", "English & Communication", "Courses and learning material for English language, writing and communication skills."],
  ["06", "Professional Skills", "Practical digital and workplace skills designed for students and early-career learners."],
  ["07", "Exam Preparation", "Structured revision resources, assessments and practice material for academic preparation."],
  ["08", "Certificates & Assessments", "Course completion tracking, assessments and certificates for eligible learning programs."],
];

const sections = [
  {
    number: "01",
    title: "Acceptance of these terms",
    icon: FileText,
    text: "By creating an account, enrolling in a course, or using Online Academy, you agree to these Terms & Conditions and related policies. If you do not agree with them, please do not create an account or use protected learning features.",
  },
  {
    number: "02",
    title: "Accounts and account security",
    icon: LockKeyhole,
    text: "You are responsible for providing accurate account information and keeping your password and sign-in credentials private. Do not share an account, impersonate another person, access another learner's account, or use someone else's credentials.",
  },
  {
    number: "03",
    title: "Course access and fair use",
    icon: BookOpenCheck,
    text: "Courses and lessons are digital educational services. Access does not transfer ownership of videos, documents, graphics, assessments or other protected material. Learners must not copy, redistribute, resell, republish, scrape or share paid access without permission.",
  },
  {
    number: "04",
    title: "Learning integrity and progress",
    icon: UserRoundCheck,
    text: "Online Academy may record learning activity such as course progress, lesson completion and account activity to provide the learner dashboard and completion features. Manipulating watch time, completion records, access controls or certificates may result in corrected progress or restricted access.",
  },
  {
    number: "05",
    title: "Certificates and completion records",
    icon: CheckCircle2,
    text: "Certificates are issued according to the requirements configured for the relevant course. A certificate confirms completion under the platform's stated requirements; it does not by itself guarantee employment, admission, licensing, accreditation or professional qualification unless expressly stated.",
  },
  {
    number: "06",
    title: "Privacy and information we use",
    icon: ShieldCheck,
    text: "The platform may process account details, course access, progress, payment/order references and certificate-related records needed to operate authentication, learning delivery, progress tracking, security, support and service improvement. We aim to avoid requesting information that is not needed for these purposes.",
  },
  {
    number: "07",
    title: "Acceptable use",
    icon: HeartHandshake,
    text: "You must not use Online Academy to break the law, distribute harmful or malicious material, interfere with platform availability, bypass security controls, infringe another person's rights, abuse other learners, or access data that you are not authorized to access.",
  },
];

export default function TermsPolicy() {
  const location = useLocation();
  const policy = location.pathname.replace(/^\//, "") || "terms";
  const isPrivacy = policy === "privacy";
  const isRefund = policy === "refund-policy";
  const isService = policy === "service-policy";
  const title = isPrivacy ? "Privacy Policy" : isRefund ? "Refund & Cancellation Policy" : isService ? "Service & Delivery Policy" : "Terms & Conditions";

  useEffect(() => {
    document.title = `${title} | Online Academy`;
    let descriptionTag = document.querySelector('meta[name="description"]');
    if (!descriptionTag) {
      descriptionTag = document.createElement("meta");
      descriptionTag.setAttribute("name", "description");
      document.head.appendChild(descriptionTag);
    }
    descriptionTag.setAttribute("content", `${title} for Online Academy digital education services.`);
    const canonical = `${window.location.origin}${location.pathname}`;
    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement("link");
      canonicalTag.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute("href", canonical);
  }, [title, location.pathname]);

  const paragraphs = isPrivacy
    ? [
        "Online Academy collects only information needed to operate accounts, deliver courses, process orders and payments, track learning progress, issue certificates, provide support and protect the platform.",
        "Payment card, bank or wallet credentials are handled by the selected payment provider. Online Academy does not ask learners to send payment credentials through chat, email or ordinary website forms.",
        "Information may be processed by trusted infrastructure providers used for authentication, hosting, databases, video delivery and payment processing. We do not intentionally sell learner information as a product.",
        "Learners may contact the platform to request help with account information or other privacy questions. Where legally required, applicable requests will be handled according to relevant law and the capabilities of the service.",
      ]
    : isRefund
      ? [
          "Online Academy primarily sells digital educational access. Because course content may become available immediately after a successful payment, refund eligibility may depend on whether the learner has accessed or substantially consumed the purchased digital service.",
          "If a payment was duplicated, charged incorrectly, or a technical issue prevented delivery of the purchased service, contact Online Academy promptly with the order reference and payment details that are safe to share. We will review the transaction and, where appropriate, coordinate a correction or refund through the payment provider.",
          "Approved refunds are returned through the original payment channel where supported by the payment provider. Processing times can vary by bank, wallet or card issuer.",
          "A request does not guarantee a refund where the service was correctly delivered and the digital content has been substantially accessed, or where the issue resulted from misuse or a violation of the platform terms.",
        ]
      : isService
        ? [
            "Online Academy provides digital educational services only. Courses, lessons, assessments, progress tracking and eligible certificates are delivered electronically through the website.",
            "No physical product is shipped. There is therefore no physical shipping charge, courier delivery or physical return process for course purchases.",
            "After a verified successful payment, eligible course access is enabled through the learner account. Access may require signing in with the same account used for checkout.",
            "Temporary outages, maintenance, third-party service interruptions or security controls may affect availability. We will make reasonable efforts to restore affected services and protect learner data.",
          ]
        : [];

  return (
    <section className="relative overflow-hidden bg-slate-50 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-blue-50 via-white to-transparent" />
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-600"><ArrowLeft size={17} />Back to Home</Link>
          <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-700"><GraduationCap size={19} className="text-blue-600" />Online Academy</div>
        </div>

        <header className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700"><ShieldCheck size={15} />Payment & platform information</div>
              <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{title}</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">Clear information about Online Academy accounts, digital courses, payments, privacy, refunds and service delivery.</p>
            </div>
            <div className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"><div className="font-bold text-slate-900">Last reviewed</div><div className="mt-1">August 14, 2026</div></div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {[['/terms','Terms & Conditions'],['/privacy','Privacy Policy'],['/refund-policy','Refund Policy'],['/service-policy','Service & Delivery']].map(([to,label]) => <Link key={to} to={to} className={`rounded-xl border px-3 py-2 text-xs font-extrabold ${location.pathname === to ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:text-blue-700'}`}>{label}</Link>)}
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <main className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
            {isPrivacy || isRefund || isService ? (
              <div className="space-y-7">
                {paragraphs.map((text, index) => <p key={index} className="text-[15px] leading-7 text-slate-600">{text}</p>)}
              </div>
            ) : (
              <div className="space-y-9">
                {sections.map(({ number, title: sectionTitle, icon: Icon, text }) => <section key={number} className="relative pl-14 sm:pl-16"><div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Icon size={19} /></div><div className="mb-1 text-[11px] font-black tracking-[0.18em] text-blue-600">{number}</div><h2 className="text-xl font-extrabold tracking-tight text-slate-900">{sectionTitle}</h2><p className="mt-2 text-[15px] leading-7 text-slate-600">{text}</p></section>)}
                <section><h2 className="text-xl font-extrabold text-slate-900">08. Platform availability and changes</h2><p className="mt-2 text-[15px] leading-7 text-slate-600">Online Academy is continuously improved, so features, course availability, completion requirements and parts of the interface may change. We may temporarily limit access for maintenance, security work, technical issues or circumstances outside our reasonable control.</p></section>
                <section><h2 className="text-xl font-extrabold text-slate-900">09. Third-party services</h2><p className="mt-2 text-[15px] leading-7 text-slate-600">Some platform functions depend on third-party infrastructure or services, including authentication, hosting, databases, video delivery and payment processing. Their availability and policies may affect the experience.</p></section>
                <section><h2 className="text-xl font-extrabold text-slate-900">10. Updates to these terms</h2><p className="mt-2 text-[15px] leading-7 text-slate-600">These terms may be revised when the platform, learning model, security practices or applicable requirements change. The updated version will be published on this page with a revised review date.</p></section>
              </div>
            )}

            <div className="mt-10 border-t border-slate-100 pt-9">
              <h2 className="text-2xl font-black text-slate-950">Our courses & services</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Online Academy provides digital learning programs and related educational services. Course availability and pricing are shown on the Courses page.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">{offerings.map(([number, name, description]) => <div key={number} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-black tracking-[0.18em] text-blue-600">{number}</div><h3 className="mt-1 font-extrabold text-slate-900">{name}</h3><p className="mt-1 text-xs leading-5 text-slate-600">{description}</p></div>)}</div>
              <Link to="/courses" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">Browse Courses <ArrowLeft size={16} className="rotate-180" /></Link>
            </div>
          </main>

          <aside className="h-fit space-y-4 lg:sticky lg:top-24">
            <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-blue-300">Customer support</div>
              <h2 className="mt-2 text-xl font-extrabold">Need help with an order?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">For payment, account, refund or course-access questions, contact the Online Academy support team.</p>
              <div className="mt-5 space-y-3 text-sm text-slate-200">
                <div className="flex gap-3"><Mail size={17} className="mt-0.5 text-blue-300" /><span>Support email: <strong className="text-white">Add your support email</strong></span></div>
                <div className="flex gap-3"><Phone size={17} className="mt-0.5 text-blue-300" /><span>Contact number: <strong className="text-white">Add your business contact number</strong></span></div>
                <div className="flex gap-3"><MapPin size={17} className="mt-0.5 text-blue-300" /><span>Office address: <strong className="text-white">Add your local office address</strong></span></div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-extrabold text-slate-900">Payment & policies</h2>
              <div className="mt-4 grid gap-2 text-sm">
                <Link to="/courses" className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700"><CreditCard size={16} />Course payments</Link>
                <Link to="/refund-policy" className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700"><RefreshCw size={16} />Refunds & cancellations</Link>
                <Link to="/service-policy" className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700"><CheckCircle2 size={16} />Digital service delivery</Link>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-extrabold text-slate-900">Project links</h2>
              <div className="mt-4 grid gap-2 text-sm">
                <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="rounded-xl bg-slate-50 px-4 py-3 font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700">GitHub Repository ↗</a>
                <a href={PROJECT_URL} target="_blank" rel="noreferrer" className="rounded-xl bg-slate-50 px-4 py-3 font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700">Online Academy ↗</a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
