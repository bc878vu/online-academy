import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Award, GraduationCap, Printer, ShieldCheck } from "lucide-react";

export default function Certificate() {
  const [searchParams] = useSearchParams();
  const studentName = searchParams.get("name") || "Student Name";
  const courseName = searchParams.get("course") || "Course Completion";
  const certificateId = searchParams.get("id") || "OA-CERT-PENDING";
  const date = searchParams.get("date") || new Date().toLocaleDateString("en-GB");

  const printCertificate = () => window.print();

  return (
    <section className="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center justify-between print:hidden">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
            <ArrowLeft size={17} /> Back to Home
          </Link>
          <button onClick={printCertificate} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700">
            <Printer size={17} /> Print Certificate
          </button>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-2 shadow-xl print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <div className="relative border-4 border-blue-600 p-8 sm:p-14 print:min-h-screen">
            <div className="absolute inset-3 border border-blue-200 pointer-events-none" />

            <div className="relative text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
                <GraduationCap size={34} />
              </div>
              <p className="mt-5 text-sm font-bold uppercase tracking-[0.3em] text-blue-600">Online Academy</p>
              <h1 className="mt-4 text-4xl font-black text-slate-900 sm:text-5xl">Certificate of Completion</h1>
              <p className="mx-auto mt-5 max-w-2xl text-slate-500">This certificate is proudly presented to</p>

              <h2 className="mt-5 break-words text-3xl font-extrabold text-slate-900 sm:text-4xl">{studentName}</h2>

              <p className="mt-6 text-slate-500">for successfully completing</p>
              <h3 className="mt-2 break-words text-2xl font-bold text-blue-700 sm:text-3xl">{courseName}</h3>

              <div className="mx-auto mt-10 grid max-w-2xl gap-6 text-left sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Certificate ID</p>
                  <p className="mt-1 break-all text-sm font-bold text-slate-800">{certificateId}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Issue Date</p>
                  <p className="mt-1 text-sm font-bold text-slate-800">{date}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600"><ShieldCheck size={16} /> Valid</p>
                </div>
              </div>

              <div className="mt-12 flex flex-col items-center justify-between gap-8 sm:flex-row sm:items-end">
                <div className="text-center sm:text-left">
                  <div className="h-px w-52 bg-slate-300" />
                  <p className="mt-2 text-sm font-bold text-slate-700">Online Academy</p>
                  <p className="text-xs text-slate-400">Authorized Issuer</p>
                </div>

                <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-blue-100 bg-blue-50 text-blue-600">
                  <Award size={38} />
                </div>

                <div className="text-center sm:text-right">
                  <div className="h-px w-52 bg-slate-300" />
                  <p className="mt-2 text-sm font-bold text-slate-700">Verified Certificate</p>
                  <p className="text-xs text-slate-400">Online Academy</p>
                </div>
              </div>

              <p className="mt-12 text-xs text-slate-400">Verify this certificate using its Certificate ID through the Online Academy platform.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
