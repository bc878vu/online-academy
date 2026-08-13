import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Lock,
  Printer,
  ShieldCheck,
} from "lucide-react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";

const formatDate = (date = new Date()) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

const getCertificateId = (userId, courseId) => {
  const userPart = String(userId || "USER").slice(0, 8).toUpperCase();
  const coursePart = String(courseId || "COURSE").slice(0, 8).toUpperCase();
  return `OA-${coursePart}-${userPart}`;
};

const normalizeLessons = (course) => {
  if (!Array.isArray(course?.lessons)) return [];

  return course.lessons
    .map((lesson, index) => ({
      id: lesson?.id || `lesson_${index + 1}`,
      title: lesson?.title || `Lesson ${index + 1}`,
      order: Number(lesson?.order) || index + 1,
    }))
    .sort((a, b) => a.order - b.order);
};

export default function Certificate() {
  const [searchParams] = useSearchParams();
  const requestedCourseId = searchParams.get("courseId") || "";

  const [user, setUser] = useState(undefined);
  const [completedCourses, setCompletedCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(requestedCourseId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCompletedCourses = async () => {
      if (user === undefined) return;

      if (!user) {
        setCompletedCourses([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const progressQuery = query(
          collection(db, "lessonProgress"),
          where("userId", "==", user.uid)
        );

        const progressSnapshot = await getDocs(progressQuery);
        if (cancelled) return;

        const progressByCourse = {};

        progressSnapshot.docs.forEach((item) => {
          const data = item.data();
          if (!data.courseId || !data.lessonId) return;

          if (!progressByCourse[data.courseId]) {
            progressByCourse[data.courseId] = new Set();
          }

          if (data.completed25 === true) {
            progressByCourse[data.courseId].add(data.lessonId);
          }
        });

        const courseIds = Object.keys(progressByCourse);
        const results = [];

        for (const courseId of courseIds) {
          const courseSnapshot = await getDoc(doc(db, "courses", courseId));
          if (!courseSnapshot.exists()) continue;

          const course = {
            id: courseSnapshot.id,
            ...courseSnapshot.data(),
          };

          if (course.certificate === false) continue;

          const lessons = normalizeLessons(course);
          const completedLessons = progressByCourse[courseId];

          const isComplete =
            lessons.length > 0 &&
            lessons.every((lesson) => completedLessons.has(lesson.id));

          if (!isComplete) continue;

          results.push({
            id: courseId,
            title: course.title || "Untitled Course",
            category: course.category || "Online Course",
            lessonsCount: lessons.length,
          });
        }

        if (cancelled) return;

        setCompletedCourses(results);

        const requestedIsComplete = results.some(
          (course) => course.id === requestedCourseId
        );

        setSelectedCourseId((current) => {
          if (requestedIsComplete) return requestedCourseId;
          if (results.some((course) => course.id === current)) return current;
          return results[0]?.id || "";
        });
      } catch (err) {
        console.error("Certificate loading error:", err);
        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to verify your completed courses right now."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCompletedCourses();

    return () => {
      cancelled = true;
    };
  }, [user, requestedCourseId]);

  const selectedCourse = useMemo(
    () =>
      completedCourses.find((course) => course.id === selectedCourseId) || null,
    [completedCourses, selectedCourseId]
  );

  const printCertificate = () => window.print();

  if (user === undefined || loading) {
    return (
      <main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
            <Loader2 size={30} className="animate-spin text-blue-600" />
          </div>
          <h1 className="mt-5 text-xl font-bold text-slate-900">
            Checking completed courses...
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Your certificate is available only after the complete course is finished.
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Lock size={30} />
          </div>
          <h1 className="mt-6 text-2xl font-extrabold text-slate-900">Login Required</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Only logged-in students can access and download their certificates.
          </p>
          <Link
            to="/login"
            className="mt-7 inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            Login to Continue
          </Link>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <ShieldCheck size={42} className="mx-auto text-red-500" />
          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            Certificate Verification Error
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">{error}</p>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white"
          >
            <ArrowLeft size={17} /> Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (completedCourses.length === 0) {
    return (
      <main className="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft size={17} /> Back to Dashboard
            </Link>
          </div>

          <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 sm:p-14">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Award size={38} />
            </div>
            <h1 className="mt-6 text-2xl font-extrabold text-slate-900 sm:text-3xl">
              No Certificate Available Yet
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              Complete every lesson in a certificate-enabled course. Each lesson must reach the required attendance threshold before the certificate becomes available.
            </p>
            <Link
              to="/courses"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              Browse Courses
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="certificate-print-root min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft size={17} /> Back to Dashboard
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {completedCourses.length > 1 && (
              <select
                value={selectedCourseId}
                onChange={(event) => setSelectedCourseId(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500"
              >
                {completedCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={printCertificate}
              disabled={!selectedCourse}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer size={17} /> Download / Print Certificate
            </button>
          </div>
        </div>

        {selectedCourse && (
          <div className="certificate-sheet overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-2 shadow-xl print:rounded-none print:border-0 print:p-0 print:shadow-none">
            <div className="certificate-sheet-inner relative border-4 border-blue-700 p-6 sm:p-10 lg:p-14">
              <div className="certificate-corner certificate-corner-tl" />
              <div className="certificate-corner certificate-corner-tr" />
              <div className="certificate-corner certificate-corner-bl" />
              <div className="certificate-corner certificate-corner-br" />
              <div className="certificate-top-band" />
              <div className="certificate-bottom-band" />
              <div className="certificate-watermark">OA</div>

              <div className="certificate-content relative text-center">
                <div className="certificate-header-mark mx-auto flex items-center justify-center">
                  <GraduationCap size={32} strokeWidth={2.3} />
                </div>

                <div className="mt-3 flex items-center justify-center gap-3">
                  <span className="certificate-rule" />
                  <p className="certificate-kicker">ONLINE ACADEMY</p>
                  <span className="certificate-rule" />
                </div>

                <p className="certificate-official-label mt-2">
                  OFFICIAL ACADEMIC CERTIFICATE
                </p>

                <h1 className="certificate-title mt-2">
                  Certificate of Completion
                </h1>

                <div className="certificate-title-line mx-auto mt-2" />

                <p className="certificate-presented mt-3">
                  This certificate is proudly presented to
                </p>

                <h2 className="certificate-student mt-2 break-words">
                  {user.displayName || user.email || "Student"}
                </h2>

                <p className="certificate-presented mt-2">
                  for successfully completing
                </p>

                <h3 className="certificate-course mt-1 break-words">
                  {selectedCourse.title}
                </h3>

                <div className="certificate-meta mx-auto mt-4 grid max-w-3xl gap-2 text-left sm:grid-cols-3">
                  <div className="certificate-meta-card">
                    <p>Certificate ID</p>
                    <strong>{getCertificateId(user.uid, selectedCourse.id)}</strong>
                  </div>
                  <div className="certificate-meta-card">
                    <p>Issue Date</p>
                    <strong>{formatDate()}</strong>
                  </div>
                  <div className="certificate-meta-card">
                    <p>Status</p>
                    <strong className="certificate-valid">
                      <ShieldCheck size={15} /> Valid
                    </strong>
                  </div>
                </div>

                <div className="certificate-signatures mt-4 flex items-end justify-between gap-5">
                  <div className="certificate-signature text-left">
                    <div className="certificate-signature-line" />
                    <p>Online Academy</p>
                    <span>Authorized Issuer</span>
                  </div>

                  <div className="certificate-seal flex shrink-0 items-center justify-center">
                    <div className="certificate-seal-inner">
                      <Award size={30} />
                      <span>VERIFIED</span>
                    </div>
                  </div>

                  <div className="certificate-signature text-right">
                    <div className="certificate-signature-line" />
                    <p>Verified Certificate</p>
                    <span>Online Academy</span>
                  </div>
                </div>

                <div className="certificate-verified mt-3 flex items-center justify-center gap-2">
                  <CheckCircle2 size={15} />
                  Course completion verified from your learning progress.
                </div>

                <p className="certificate-verification mt-1">
                  Verify this certificate using its Certificate ID through the Online Academy platform.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
