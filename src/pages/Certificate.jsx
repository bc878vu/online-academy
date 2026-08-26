import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Award, CheckCircle2, Clock3, FileCheck2, GraduationCap, Loader2, Lock, Printer, Send, ShieldCheck, XCircle } from "lucide-react";
import { collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, where, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import CourseThumbnail from "../components/CourseThumbnail";

const ADMIN_UID = "CDwCqUitlaSHEVeWQufCb0lXzMx1";
const certificateId = (uid, courseId) => `OA-${String(courseId || "COURSE").slice(0, 8).toUpperCase()}-${String(uid || "USER").slice(0, 8).toUpperCase()}`;
const requestId = (uid, courseId) => `${uid}_${courseId}`;
const formatDate = (value) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).format(value ? new Date(value) : new Date());

function StatusPill({ status, children }) {
  const tone = status === "approved" || status === "valid" ? "bg-emerald-50 text-emerald-700" : status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black capitalize ${tone}`}>{children || status}</span>;
}

function StudentCertificate({ user }) {
  const [params] = useSearchParams();
  const requestedCourseId = params.get("courseId") || "";
  const [courses, setCourses] = useState([]);
  const [selectedId, setSelectedId] = useState(requestedCourseId);
  const [requests, setRequests] = useState({});
  const [certificates, setCertificates] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError("");
      try {
        const [completionSnap, requestSnap] = await Promise.all([
          getDocs(query(collection(db, "courseCompletions"), where("userId", "==", user.uid))),
          getDocs(query(collection(db, "certificateRequests"), where("userId", "==", user.uid))),
        ]);
        if (cancelled) return;

        // A completed-course record already contains the authoritative courseId/title.
        // Do not re-read /courses here: a course may be unpublished while a student still
        // has a valid completion, and the public /courses rule intentionally blocks that read.
        const nextCourses = completionSnap.docs
          .map((item) => ({ id: item.data().courseId, title: item.data().courseTitle || "Untitled Course", certificate: true }))
          .filter((course) => course.id);
        const uniqueCourses = Array.from(new Map(nextCourses.map((course) => [course.id, course])).values());

        const nextRequests = {};
        requestSnap.docs.forEach((item) => { const data = item.data(); if (data.courseId) nextRequests[data.courseId] = { id: item.id, ...data }; });
        const certSnaps = await Promise.all(uniqueCourses.map((course) => getDoc(doc(db, "certificates", certificateId(user.uid, course.id)))));
        const nextCertificates = {};
        certSnaps.forEach((snap, index) => { if (snap.exists()) nextCertificates[uniqueCourses[index].id] = { id: snap.id, ...snap.data() }; });
        if (cancelled) return;
        setCourses(uniqueCourses); setRequests(nextRequests); setCertificates(nextCertificates);
        setSelectedId((current) => uniqueCourses.some((course) => course.id === current) ? current : uniqueCourses[0]?.id || "");
      } catch (err) {
        if (!cancelled) {
          const message = String(err?.message || "Unable to load certificate status.");
          setError(message.includes("Missing or insufficient permissions") ? "Your certificate data could not be read because Firebase permissions are blocking the request. Please refresh after the latest security-rule deployment." : message);
        }
      } finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [user]);

  const selectedCourse = useMemo(() => courses.find((course) => course.id === selectedId) || null, [courses, selectedId]);
  const request = selectedCourse ? requests[selectedCourse.id] : null;
  const certificate = selectedCourse ? certificates[selectedCourse.id] : null;

  const apply = async () => {
    if (!selectedCourse || submitting || certificate || request?.status === "pending" || request?.status === "approved") return;
    setSubmitting(true); setError(""); setNotice("");
    const id = requestId(user.uid, selectedCourse.id);
    const payload = { userId: user.uid, courseId: selectedCourse.id, courseTitle: selectedCourse.title || "Untitled Course", studentName: user.displayName || user.email || "Student", status: "pending", requestedAt: serverTimestamp(), updatedAt: serverTimestamp() };
    try {
      if (request?.status === "rejected") await deleteDoc(doc(db, "certificateRequests", id));
      await setDoc(doc(db, "certificateRequests", id), payload);
      setRequests((previous) => ({ ...previous, [selectedCourse.id]: { id, ...payload, status: "pending" } }));
      setNotice("Certificate application submitted successfully. It is now in the review queue.");
    } catch (err) { setError(err?.message || "Unable to submit the application."); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex min-h-[500px] items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
  if (error) return <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200"><ShieldCheck size={40} className="mx-auto text-red-500" /><h1 className="mt-5 text-2xl font-extrabold text-slate-900">Certificate status unavailable</h1><p className="mt-3 text-sm leading-7 text-slate-600">{error}</p></div>;
  if (!selectedCourse) return <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 sm:p-14"><Award size={44} className="mx-auto text-slate-400" /><h1 className="mt-6 text-2xl font-extrabold text-slate-900">No Certificate Available Yet</h1><p className="mt-3 text-sm leading-7 text-slate-600">Complete the full learning sequence and required assessments first. Once your course is completed, you can apply here.</p><Link to="/courses" className="mt-7 inline-flex rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white">Browse Courses</Link></div>;

  if (!certificate) return <div className="mx-auto max-w-5xl">
    <div className="mb-6"><p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">Certificates</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Your certificate center</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Apply for a professional certificate after completing the course requirements.</p></div>
    {courses.length > 1 && <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{courses.map((course) => <button key={course.id} type="button" onClick={() => setSelectedId(course.id)} className={`overflow-hidden rounded-2xl border text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${selectedId === course.id ? "border-blue-400 ring-2 ring-blue-500/10" : "border-slate-200 bg-white"}`}><div className="h-28"><CourseThumbnail course={course} /></div><div className="p-4"><p className="line-clamp-2 text-sm font-black text-slate-900">{course.title || "Untitled Course"}</p><span className="mt-2 inline-flex text-xs font-bold text-blue-600">{selectedId === course.id ? "Selected" : "Select course"}</span></div></button>)}</div>}
    {notice && <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{notice}</div>}
    <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200">
      <div className="grid lg:grid-cols-[280px_1fr]">
        <div className="h-56 lg:h-full lg:min-h-[360px]"><CourseThumbnail course={selectedCourse} showPlay /></div>
        <div className="p-6 sm:p-8 lg:p-10"><div className="flex items-start gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><FileCheck2 size={28} /></div><div className="min-w-0"><p className="text-xs font-black uppercase tracking-widest text-blue-600">Certificate Application</p><h2 className="mt-1 text-2xl font-extrabold text-slate-900">{selectedCourse.title}</h2><p className="mt-3 text-sm leading-7 text-slate-600">Your completion has been recorded. Submit your application and the certificate will be issued after the review process.</p></div></div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-emerald-50 p-4"><CheckCircle2 className="text-emerald-600" size={21} /><p className="mt-2 text-xs font-bold text-slate-500">Course</p><p className="font-extrabold text-emerald-700">Completed</p></div><div className="rounded-2xl bg-amber-50 p-4"><Clock3 className="text-amber-600" size={21} /><p className="mt-2 text-xs font-bold text-slate-500">Application</p><p className="font-extrabold text-amber-700">{request?.status === "pending" ? "Pending review" : request?.status === "rejected" ? "Rejected" : "Not submitted"}</p></div><div className="rounded-2xl bg-blue-50 p-4"><ShieldCheck className="text-blue-600" size={21} /><p className="mt-2 text-xs font-bold text-slate-500">Certificate</p><p className="font-extrabold text-blue-700">Official issue</p></div></div>
          {request?.status === "rejected" && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><strong>Application needs attention.</strong> You can submit a new application.</div>}
          <button type="button" onClick={apply} disabled={submitting || request?.status === "pending" || request?.status === "approved"} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Submitting..." : request?.status === "pending" ? "Application Pending" : <><Send size={17} /> {request?.status === "rejected" ? "Apply Again" : "Apply for Certificate"}</>}</button>
        </div>
      </div>
    </div>
  </div>;

  const verifyUrl = `${window.location.origin}/verify-certificate?certificateId=${encodeURIComponent(certificate.certificateId)}`;
  return <div className="mx-auto max-w-[1240px]">
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden"><div><p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">Issued Certificate</p><p className="mt-1 text-sm font-semibold text-slate-500">Professional digital certificate • ready to print</p></div><button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"><Printer size={17} /> Download / Print</button></div>
    <div className="certificate-print-root"><div className="certificate-sheet"><div className="certificate-sheet-inner"><div className="certificate-top-band" /><div className="certificate-bottom-band" /><span className="certificate-corner certificate-corner-tl" /><span className="certificate-corner certificate-corner-tr" /><span className="certificate-corner certificate-corner-bl" /><span className="certificate-corner certificate-corner-br" /><div className="certificate-watermark">OA</div><div className="certificate-content relative flex h-full flex-col justify-between text-center"><div><div className="certificate-header-mark mx-auto flex items-center justify-center"><GraduationCap size={30} /></div><p className="mt-3 text-[10px] font-black tracking-[.38em] text-blue-800 sm:text-xs">ONLINE ACADEMY</p><div className="mt-2 flex items-center justify-center gap-3"><span className="certificate-rule" /><span className="text-[9px] font-black tracking-[.2em] text-slate-500 sm:text-[10px]">CERTIFICATE OF COMPLETION</span><span className="certificate-rule" /></div><h1 className="mt-3 text-[clamp(1.65rem,4.4vw,3.35rem)] font-black leading-none tracking-tight text-slate-950">Certificate of Completion</h1><p className="mt-3 text-[11px] text-slate-500 sm:mt-4 sm:text-sm">This certificate is proudly presented to</p><h2 className="mt-1.5 break-words text-[clamp(1.45rem,4vw,2.75rem)] font-black leading-tight text-blue-800">{certificate.studentName || user.displayName || user.email}</h2><p className="mt-2 text-[11px] text-slate-500 sm:mt-3 sm:text-sm">for successfully completing</p><h3 className="mx-auto mt-1.5 max-w-4xl break-words text-[clamp(1.15rem,2.8vw,2rem)] font-extrabold leading-tight text-slate-900">{certificate.courseTitle || selectedCourse.title}</h3></div><div className="mt-4 sm:mt-5"><div className="certificate-meta-grid mx-auto grid max-w-4xl gap-2 text-left sm:grid-cols-3 sm:gap-3"><div className="rounded-xl bg-slate-50/90 p-3 sm:rounded-2xl sm:p-4"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 sm:text-[10px]">Certificate ID</p><strong className="mt-1 block break-all text-[10px] font-black text-slate-900 sm:text-xs">{certificate.certificateId}</strong></div><div className="rounded-xl bg-slate-50/90 p-3 sm:rounded-2xl sm:p-4"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 sm:text-[10px]">Issue Date</p><strong className="mt-1 block text-[10px] font-black text-slate-900 sm:text-xs">{certificate.issueDate}</strong></div><div className="rounded-xl bg-emerald-50/90 p-3 sm:rounded-2xl sm:p-4"><p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 sm:text-[10px]">Status</p><strong className="mt-1 flex items-center gap-1 text-[10px] font-black text-emerald-700 sm:text-xs"><CheckCircle2 size={14} /> Valid</strong></div></div><div className="certificate-signatures mt-4 grid grid-cols-3 items-end gap-3 text-left sm:mt-6 sm:gap-6"><div><div className="w-full max-w-[190px] border-t border-slate-400 pt-1.5 text-[10px] font-black sm:text-xs">Online Academy</div><p className="text-[9px] text-slate-500 sm:text-[10px]">Authorized Issuer</p></div><div className="flex justify-center"><Award className="text-blue-700" size={42} /></div><div className="text-right"><div className="ml-auto w-full max-w-[190px] border-t border-slate-400 pt-1.5 text-[10px] font-black sm:text-xs">Certificate Office</div><p className="text-[9px] text-slate-500 sm:text-[10px]">Official Record</p></div></div><div className="certificate-verification mt-3 text-[8px] leading-4 text-slate-400 sm:text-[9px]">Verify this certificate online: {verifyUrl}</div></div></div></div></div></div></div>;
}

function AdminCertificatePanel() {
  const [requests, setRequests] = useState([]), [loading, setLoading] = useState(true), [busy, setBusy] = useState(""), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const load = async () => { setLoading(true); setError(""); try { const snap = await getDocs(collection(db, "certificateRequests")); setRequests(snap.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1))); } catch (err) { setError(err?.message || "Unable to load requests."); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const decide = async (request, status) => { if (!request?.id || busy) return; setBusy(request.id); setError(""); setNotice(""); try { await setDoc(doc(db, "certificateRequests", request.id), { status, reviewedAt: serverTimestamp(), updatedAt: serverTimestamp(), adminNote: status === "approved" ? "Certificate approved and issued." : "Certificate application rejected by administrator." }, { merge: true }); if (status === "approved") { const id = certificateId(request.userId, request.courseId); await setDoc(doc(db, "certificates", id), { certificateId: id, userId: request.userId, courseId: request.courseId, studentName: request.studentName || "Student", courseTitle: request.courseTitle || "Untitled Course", issueDate: formatDate(), status: "Valid", issuedBy: "Online Academy", approvedAt: serverTimestamp() }, { merge: true }); } setRequests((prev) => prev.map((item) => item.id === request.id ? { ...item, status } : item)); setNotice(status === "approved" ? "Certificate approved and issued." : "Application rejected."); } catch (err) { setError(err?.message || "Unable to update request."); } finally { setBusy(""); } };
  return <main className="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-blue-600">Administration</p><h1 className="mt-2 text-3xl font-extrabold text-slate-900">Certificate Requests</h1><p className="mt-2 text-sm text-slate-600">Approve completed-course applications and issue official certificates.</p></div><div className="flex gap-2"><Link to="/admin" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold"><ArrowLeft size={17} /> Admin Courses</Link><button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold"><Clock3 size={17} /> Refresh</button></div></div>{error && <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}{notice && <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{notice}</div>}<div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">{loading ? <div className="flex min-h-60 items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div> : requests.length === 0 ? <div className="p-10 text-center text-sm font-bold text-slate-500">No certificate applications.</div> : <div className="divide-y divide-slate-100">{requests.map((request) => <div key={request.id} className="p-5 sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className={`text-xs font-black uppercase tracking-widest ${request.status === "pending" ? "text-amber-600" : request.status === "approved" ? "text-emerald-600" : "text-red-600"}`}>{request.status || "pending"}</p><h2 className="mt-1 text-lg font-extrabold text-slate-900">{request.courseTitle}</h2><p className="mt-1 text-sm text-slate-600">Student: <strong>{request.studentName}</strong></p></div>{request.status === "pending" ? <div className="flex flex-wrap gap-2"><button disabled={busy === request.id} onClick={() => decide(request, "approved")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><CheckCircle2 size={17} /> Approve & Issue</button><button disabled={busy === request.id} onClick={() => decide(request, "rejected")} className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50"><XCircle size={17} /> Reject</button></div> : <StatusPill status={request.status}>{request.status}</StatusPill>}</div></div>)}</div>}</div></div></main>;
}

export default function Certificate() {
  const [user, setUser] = useState(undefined);
  useEffect(() => onAuthStateChanged(auth, (currentUser) => setUser(currentUser || null)), []);
  if (user === undefined) return <main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={34} /></main>;
  if (!user) return <main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-slate-50 px-4"><div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200"><Lock size={38} className="mx-auto text-blue-600" /><h1 className="mt-5 text-2xl font-extrabold text-slate-900">Login Required</h1><Link to="/login" className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">Login</Link></div></main>;
  return user.uid === ADMIN_UID ? <AdminCertificatePanel /> : <main className="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8"><StudentCertificate user={user} /></main>;
}
