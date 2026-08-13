import { useState } from "react";
import { CheckCircle2, Search, ShieldCheck, XCircle, Award } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function VerifyCertificate() {
  const [certificateId, setCertificateId] = useState("");
  const [certificate, setCertificate] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const verifyCertificate = async (event) => {
    event.preventDefault();

    const id = certificateId.trim().toUpperCase();

    if (!id) {
      setCertificate(null);
      setStatus("error");
      setMessage("Please enter a Certificate ID.");
      return;
    }

    try {
      setStatus("loading");
      setMessage("");
      setCertificate(null);

      const certificateRef = doc(db, "certificates", id);
      const certificateSnap = await getDoc(certificateRef);

      if (!certificateSnap.exists()) {
        setStatus("invalid");
        setMessage("This Certificate ID is not registered in Online Academy.");
        return;
      }

      const data = certificateSnap.data();

      if (data.status !== "Valid") {
        setStatus("invalid");
        setMessage("This certificate is not currently valid.");
        return;
      }

      setCertificate({
        id: certificateSnap.id,
        ...data,
      });

      setStatus("valid");
    } catch (error) {
      console.error("Certificate verification error:", error);
      setStatus("error");
      setMessage(
        "Unable to verify the certificate right now. Please try again."
      );
    }
  };

  return (
    <main className="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">

        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <ShieldCheck size={32} />
          </div>

          <p className="mt-5 text-xs font-bold uppercase tracking-[0.25em] text-blue-600">
            Online Academy
          </p>

          <h1 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Verify Certificate
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
            Enter the Certificate ID printed on an Online Academy certificate
            to verify its authenticity and current validity.
          </p>
        </div>

        <form
          onSubmit={verifyCertificate}
          className="mx-auto mt-8 max-w-2xl rounded-3xl border border-slate-200 bg-white p-5 shadow-xl sm:p-7"
        >
          <label className="mb-2 block text-sm font-bold text-slate-800">
            Certificate ID
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={certificateId}
              onChange={(e) => setCertificateId(e.target.value)}
              placeholder="Example: OA-COURSE-USERID"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold uppercase outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />

            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Search size={18} />
              {status === "loading" ? "Checking..." : "Verify"}
            </button>
          </div>

          {message && (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {message}
            </div>
          )}
        </form>

        {status === "valid" && certificate && (
          <div className="mt-8 overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-xl">

            <div className="bg-emerald-600 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={30} />

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                    Verification Result
                  </p>

                  <h2 className="text-2xl font-extrabold">
                    Certificate Valid
                  </h2>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">

              <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Award size={32} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Certificate ID
                  </p>
                  <p className="mt-1 break-all text-sm font-extrabold text-slate-900">
                    {certificate.id}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Status
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-extrabold text-emerald-600">
                    <CheckCircle2 size={17} />
                    Valid
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Student
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-slate-900">
                    {certificate.studentName || "Online Academy Student"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Course
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-slate-900">
                    {certificate.courseTitle || "Online Course"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Issue Date
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-slate-900">
                    {certificate.issueDate || "—"}
                  </p>
                </div>

              </div>

              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <ShieldCheck
                  size={22}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />

                <p className="text-sm leading-6 text-emerald-800">
                  This certificate is registered with Online Academy and
                  its current status is <strong>Valid</strong>.
                </p>
              </div>

            </div>
          </div>
        )}

        {status === "invalid" && (
          <div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
              <XCircle size={34} />
            </div>

            <h2 className="mt-5 text-2xl font-extrabold text-slate-900">
              Certificate Not Found
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              The entered Certificate ID could not be verified.
              Please check the ID and try again.
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
