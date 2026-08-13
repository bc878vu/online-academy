import { Link } from "react-router-dom";
import { ArrowLeft, GraduationCap, ShieldCheck, FileText } from "lucide-react";

export default function TermsPolicy() {
  return (
    <section className="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
            <ArrowLeft size={17} /> Back to Home
          </Link>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <GraduationCap size={19} className="text-blue-600" /> Online Academy
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <div className="mb-8 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">Terms & Policy</h1>
              <p className="mt-1 text-sm text-slate-500">Online Academy — Learn. Grow. Succeed.</p>
            </div>
          </div>

          <div className="space-y-8 text-sm leading-7 text-slate-600">
            <section>
              <h2 className="mb-2 text-lg font-bold text-slate-900">1. Acceptance of Terms</h2>
              <p>By creating an account or using Online Academy, you agree to use the platform responsibly and to follow these terms. If you do not agree, please do not use the service.</p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-bold text-slate-900">2. Account Responsibility</h2>
              <p>Users are responsible for keeping their login credentials secure and for the activity performed through their account. Do not share your password or attempt to access another user's account.</p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-bold text-slate-900">3. Course Content</h2>
              <p>Course materials are provided for educational purposes. Users may access and use the materials only in accordance with the permissions provided by Online Academy and applicable law.</p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-bold text-slate-900">4. Privacy & Data</h2>
              <p>Online Academy may process account and learning-progress information needed to provide authentication, course access, progress tracking, certificates, and related services. We do not ask users to submit information that is unnecessary for these services.</p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-bold text-slate-900">5. Prohibited Use</h2>
              <p>Do not misuse the platform, interfere with its operation, upload harmful content, bypass access controls, impersonate another person, or use the service for unlawful activity.</p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-bold text-slate-900">6. Certificates</h2>
              <p>Certificates are issued according to the completion requirements configured by Online Academy. A certificate does not guarantee employment, admission, or any professional qualification unless explicitly stated by the issuing organization.</p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-bold text-slate-900">7. Changes to These Terms</h2>
              <p>Online Academy may update these terms when the platform, courses, or policies change. Continued use of the platform after an update means you accept the revised terms.</p>
            </section>

            <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <div className="flex gap-3">
                <ShieldCheck className="mt-1 shrink-0 text-blue-600" size={20} />
                <div>
                  <h2 className="font-bold text-slate-900">Important</h2>
                  <p className="mt-1">These platform terms are general service terms and are not a substitute for legal advice. Please contact the platform administrator if you need clarification about a specific policy.</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
