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
          const courseSnapshot = await getDoc(
            doc(db, "courses", courseId)
          );

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
      completedCourses.find(
        (course) => course.id === selectedCourseId
      ) || null,
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
          <h1 className="mt-6 text-2xl font-extrabold text-slate-900">
            Login Required
          </h1>
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
            <div className="certificate-sheet-inner relative border-4 border-blue-600 p-6 sm:p-10 lg:p-14">
              <div className="pointer-events-none absolute inset-3 border border-blue-200" />

              <div className="relative text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg sm:h-16 sm:w-16">
                  <GraduationCap size={32} />
                </div>

                <p className="mt-4 text-xs font-bold uppercase tracking-[0.28em] text-blue-600 sm:text-sm">
                  Online Academy
                </p>

                <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl lg:text-5xl">
                  Certificate of Completion
                </h1>

                <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-500">
                  This certificate is proudly presented to
                </p>

                <h2 className="mt-4 break-words text-2xl font-extrabold text-slate-900 sm:text-3xl lg:text-4xl">
                  {user.displayName || user.email || "Student"}
                </h2>

                <p className="mt-4 text-sm text-slate-500">
                  for successfully completing
                </p>

                <h3 className="mt-2 break-words text-xl font-bold text-blue-700 sm:text-2xl lg:text-3xl">
                  {selectedCourse.title}
                </h3>

                <div className="mx-auto mt-7 grid max-w-2xl gap-3 text-left sm:grid-cols-3 sm:gap-5">
                  <div className="rounded-xl bg-slate-50 p-3 sm:p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">
                      Certificate ID
                    </p>
                    <p className="mt-1 break-all text-xs font-bold text-slate-800 sm:text-sm">
                      {getCertificateId(user.uid, selectedCourse.id)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 sm:p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">
                      Issue Date
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-800 sm:text-sm">
                      {formatDate()}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 sm:p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">
                      Status
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 sm:text-sm">
                      <ShieldCheck size={16} /> Valid
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex flex-col items-center justify-between gap-6 sm:flex-row sm:items-end sm:gap-8">
                  <div className="text-center sm:text-left">
                    <div className="mx-auto h-px w-40 bg-slate-300 sm:mx-0 sm:w-44" />
                    <p className="mt-2 text-xs font-bold text-slate-700 sm:text-sm">
                      Online Academy
                    </p>
                    <p className="text-[10px] text-slate-400 sm:text-xs">
                      Authorized Issuer
                    </p>
                  </div>

                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-blue-100 bg-blue-50 text-blue-600 sm:h-20 sm:w-20">
                    <Award size={34} />
                  </div>

                  <div className="text-center sm:text-right">
                    <div className="mx-auto h-px w-40 bg-slate-300 sm:mx-0 sm:w-44" />
                    <p className="mt-2 text-xs font-bold text-slate-700 sm:text-sm">
                      Verified Certificate
                    </p>
                    <p className="text-[10px] text-slate-400 sm:text-xs">
                      Online Academy
                    </p>
                  </div>
                </div>

                <div className="mt-7 flex items-center justify-center gap-2 text-xs text-emerald-600">
                  <CheckCircle2 size={15} />
                  Course completion verified from your learning progress.
                </div>

                <p className="mt-3 text-[10px] text-slate-400 sm:text-xs">
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
