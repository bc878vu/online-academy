import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Award, CheckCircle2, Search, ShieldCheck, XCircle } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function VerifyCertificate() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [certificateId, setCertificateId] = useState(searchParams.get("id") || "");
  const [record, setRecord] = useState(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const verify = async (rawId = certificateId) => {
    const id = String(rawId || "").trim().toUpperCase();
    setCertificateId(id);
    setSearched(true);
    setRecord(null);
    if (!id) {
      setSearchParams({});
      return;
    }

    setLoading(true);
    try {
      const snapshot = await getDoc(doc(db, "certificates", id));
      if (snapshot.exists()) {
        setRecord({ id: snapshot.id, ...snapshot.data() });
      }
      setSearchParams({ id });
    } catch (error) {
      console.error("Certificate verification error:", error);
      setRecord(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) verify(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const valid = Boolean(record?.status === "Valid");

  return (
    <main className="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
          <div className="bg-gradient-to-r from-[#0B2F6B] via-[#123E80] to-[#0B2F6B] px-6 py-8 text-center text-white sm:px-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#C9A227]/70 bg-white/10">
              <ShieldCheck size={34} />
            </div>
            <h1 className="mt-5 text-2xl font-black sm:text-3xl">Certificate Verification</h1>
            <p className="mt-2 text-sm text-blue-100">Verify an Online Academy certificate using its unique Certificate ID.</p>
          </div>

          <div className="p-6 sm:p-10">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                verify();
              }}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <input
                value={certificateId}
                onChange={(event) => setCertificateId(event.target.value.toUpperCase())}
                placeholder="Enter Certificate ID e.g. OA-XXXXXXXX-XXXXXXXX"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold tracking-wide text-slate-800 outline-none ring-blue-100 focus:border-blue-500 focus:ring-4"
                autoComplete="off"
              />
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-blue-700">
                <Search size={18} /> Verify
              </button>
            </form>

            {loading && (
              <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-6 text-center text-sm font-semibold text-blue-700">
                Checking certificate...
              </div>
            )}

            {!loading && searched && !record && certificateId && (
              <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                <XCircle size={42} className="mx-auto text-red-500" />
                <h2 className="mt-4 text-xl font-extrabold text-red-800">Certificate Not Found</h2>
                <p className="mt-2 text-sm text-red-700">This Certificate ID could not be found in the Online Academy verification registry.</p>
              </div>
            )}

            {!loading && searched && !certificateId && (
              <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm font-semibold text-amber-800">
                Please enter a Certificate ID first.
              </div>
            )}

            {!loading && valid && (
              <div className="mt-8 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50">
                <div className="flex items-center gap-4 border-b border-emerald-200 px-5 py-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <CheckCircle2 size={27} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Verification Result</p>
                    <h2 className="text-2xl font-black text-emerald-900">VALID CERTIFICATE</h2>
                  </div>
                </div>
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <div><p className="text-xs font-bold uppercase text-slate-500">Student</p><p className="mt-1 font-bold text-slate-900">{record.studentName || "Student"}</p></div>
                  <div><p className="text-xs font-bold uppercase text-slate-500">Course</p><p className="mt-1 font-bold text-slate-900">{record.courseTitle || "Online Course"}</p></div>
                  <div><p className="text-xs font-bold uppercase text-slate-500">Issue Date</p><p className="mt-1 font-bold text-slate-900">{record.issueDate || "—"}</p></div>
                  <div><p className="text-xs font-bold uppercase text-slate-500">Certificate ID</p><p className="mt-1 break-all font-bold text-slate-900">{record.id}</p></div>
                </div>
                <div className="flex items-center justify-center gap-2 border-t border-emerald-200 bg-white/60 px-5 py-4 text-sm font-bold text-emerald-800">
                  <Award size={17} /> Issued and verified by Online Academy
                </div>
              </div>
            )}

            <div className="mt-8 text-center">
              <Link to="/courses" className="text-sm font-bold text-blue-600 hover:text-blue-700">Browse Courses</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
