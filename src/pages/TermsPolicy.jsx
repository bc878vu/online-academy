import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  FileText,
  GraduationCap,
  HeartHandshake,
  LockKeyhole,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

const GITHUB_URL = "https://github.com/bc878vu/online-academy";
const PROJECT_URL = "https://edunexus-app.vercel.app/";

const sections = [
  {
    number: "01",
    title: "Acceptance of these terms",
    icon: FileText,
    text: "By creating an account, enrolling in a course, or using Online Academy, you agree to these Terms & Policy. If you do not agree with them, please do not create an account or use protected learning features. These terms apply to the platform, its course catalogue, learner dashboard, progress tracking, certificates, and related services.",
  },
  {
    number: "02",
    title: "Accounts and account security",
    icon: LockKeyhole,
    text: "You are responsible for providing accurate account information and for keeping your password and sign-in credentials private. Please do not share an account, impersonate another person, attempt to access another learner's account, or use someone else's credentials. If you believe your account has been compromised, contact the platform administrator as soon as possible.",
  },
  {
    number: "03",
    title: "Learning, course access and fair use",
    icon: BookOpenCheck,
    text: "Courses and lessons are provided for learning purposes. Access to a course does not transfer ownership of its videos, documents, graphics, assessments, or other protected material. Learners may use course material for their own educational use and must not copy, redistribute, resell, republish, scrape, or make paid access available to others without permission.",
  },
  {
    number: "04",
    title: "Learning integrity and progress",
    icon: UserRoundCheck,
    text: "Online Academy may record learning activity such as course progress, lesson completion, and account activity in order to provide the learner dashboard and completion features. Progress should represent genuine participation. Attempting to manipulate watch time, completion records, access controls, or certificates may result in progress being corrected or access being restricted.",
  },
  {
    number: "05",
    title: "Certificates and completion records",
    icon: CheckCircle2,
    text: "Certificates and completion records are issued according to the requirements configured for the relevant course. A certificate confirms completion under the platform's stated requirements; it does not, by itself, guarantee employment, admission, licensing, accreditation, or professional qualification unless the issuing organization expressly states otherwise.",
  },
  {
    number: "06",
    title: "Privacy and information we use",
    icon: ShieldCheck,
    text: "The platform may process information needed to operate accounts and learning services, including account details, course access, progress, and certificate-related records. Information should be collected and used for legitimate platform purposes such as authentication, learning delivery, progress tracking, security, support, and service improvement. We aim to avoid requesting information that is not needed for these purposes.",
  },
  {
    number: "07",
    title: "Acceptable use",
    icon: HeartHandshake,
    text: "You must not use Online Academy to break the law, distribute harmful or malicious material, interfere with platform availability, probe or bypass security controls, upload content that infringes another person's rights, abuse other learners, or attempt to access data that you are not authorized to access.",
  },
];

export default function TermsPolicy() {
  useEffect(() => {
    const title = "Terms & Policy | Online Academy";
    const description =
      "Read the Online Academy Terms & Policy covering accounts, course access, learning integrity, progress tracking, certificates, privacy, acceptable use, and platform changes.";
    const canonical = `${window.location.origin}/terms`;

    document.title = title;

    let descriptionTag = document.querySelector('meta[name="description"]');
    if (!descriptionTag) {
      descriptionTag = document.createElement("meta");
      descriptionTag.setAttribute("name", "description");
      document.head.appendChild(descriptionTag);
    }
    descriptionTag.setAttribute("content", description);

    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement("link");
      canonicalTag.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute("href", canonical);

    return () => {
      document.title = "Online Academy | Learn. Grow. Succeed.";
    };
  }, []);

  return (
    <section className="relative overflow-hidden bg-slate-50 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-blue-50 via-white to-transparent" />

      <div className="relative mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
          >
            <ArrowLeft size={17} />
            Back to Home
          </Link>

          <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
            <GraduationCap size={19} className="text-blue-600" />
            Online Academy
          </div>
        </div>

        <header className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm sm:p-10 lg:p-12">
          <div className="flex flex-col gap-7 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700">
                <ShieldCheck size={15} />
                Clear rules for better learning
              </div>
              <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Terms & Policy
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                A straightforward guide to using Online Academy, protecting your account,
                respecting course content, and keeping learning records fair and reliable.
              </p>
            </div>

            <div className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div className="font-bold text-slate-900">Last reviewed</div>
              <div className="mt-1">August 13, 2026</div>
            </div>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            {[
              [LockKeyhole, "Account security"],
              [BookOpenCheck, "Responsible learning"],
              [ShieldCheck, "Privacy & safety"],
            ].map(([Icon, label]) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <Icon size={19} className="text-blue-600" />
                <span className="text-sm font-bold text-slate-700">{label}</span>
              </div>
            ))}
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <main className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
            <div className="space-y-9">
              {sections.map(({ number, title, icon: Icon, text }) => (
                <section key={number} className="relative pl-14 sm:pl-16">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Icon size={19} />
                  </div>
                  <div className="mb-1 text-[11px] font-black tracking-[0.18em] text-blue-600">
                    {number}
                  </div>
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                    {title}
                  </h2>
                  <p className="mt-2 text-[15px] leading-7 text-slate-600">{text}</p>
                </section>
              ))}

              <section>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                  08. Platform availability and changes
                </h2>
                <p className="mt-2 text-[15px] leading-7 text-slate-600">
                  Online Academy is continuously improved, so features, course availability,
                  completion requirements, and parts of the interface may change over time.
                  We may temporarily limit access for maintenance, security work, technical
                  issues, or circumstances outside our reasonable control. Where practical,
                  important changes will be communicated through the platform.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                  09. Third-party services
                </h2>
                <p className="mt-2 text-[15px] leading-7 text-slate-600">
                  Some platform functions may depend on third-party infrastructure or services,
                  such as authentication, hosting, databases, video delivery, or analytics.
                  Their availability and policies may affect the experience even when the
                  Online Academy interface remains available.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                  10. Updates to this policy
                </h2>
                <p className="mt-2 text-[15px] leading-7 text-slate-600">
                  These terms may be revised when the platform, learning model, security
                  practices, or applicable requirements change. The updated version will be
                  published on this page with a revised review date. Continued use of the
                  platform after an update indicates acceptance of the updated terms, to the
                  extent permitted by applicable law.
                </p>
              </section>
            </div>

            <div className="mt-10 rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:p-6">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 shrink-0 text-blue-700" size={21} />
                <div>
                  <h2 className="font-extrabold text-slate-900">A practical note</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    These are general platform terms intended to explain how Online Academy is
                    used. They are not legal advice and should not be treated as a replacement
                    for advice from a qualified professional about a specific legal situation.
                  </p>
                </div>
              </div>
            </div>
          </main>

          <aside className="h-fit space-y-4 lg:sticky lg:top-24">
            <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-blue-300">
                Quick access
              </div>
              <h2 className="mt-2 text-xl font-extrabold">Keep learning with confidence.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Explore the course catalogue or return to your learning dashboard.
              </p>
              <div className="mt-5 grid gap-2">
                <Link
                  to="/courses"
                  className="rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold transition hover:bg-blue-500"
                >
                  Browse Courses
                </Link>
                <Link
                  to="/"
                  className="rounded-xl border border-white/15 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Return Home
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-extrabold text-slate-900">Project links</h2>
              <div className="mt-4 grid gap-2 text-sm">
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-slate-50 px-4 py-3 font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                >
                  GitHub Repository ↗
                </a>
                <a
                  href={PROJECT_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-slate-50 px-4 py-3 font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                >
                  Edunexus Project ↗
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
