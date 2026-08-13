import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { CheckCircle2, FileQuestion, Lock, RotateCcw, ShieldCheck, Trophy } from "lucide-react";
import { auth, db } from "../firebase";

const PASS_DEFAULT = 70;
const WATCH_REQUIREMENT = 25;

const parseWeeks = (duration) => {
  const text = String(duration || "").toLowerCase();
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:week|weeks|wk|w)\b/);
  if (match) return Number(match[1]);
  const number = text.match(/\d+(?:\.\d+)?/);
  return number ? Number(number[0]) : 0;
};

const normalizeQuestion = (q, index) => ({
  id: q?.id || `q_${index}`,
  question: String(q?.question || ""),
  options: Array.isArray(q?.options) ? q.options.slice(0, 4) : [],
  correctIndex: Number(q?.correctIndex) || 0,
  points: Math.max(1, Number(q?.points) || 1),
});

const normalizeAssessment = (value) => ({
  enabled: value?.enabled !== false,
  passPercent: Math.min(100, Math.max(1, Number(value?.passPercent) || PASS_DEFAULT)),
  questions: Array.isArray(value?.questions) ? value.questions.map(normalizeQuestion) : [],
});

function currentLessonIndex() {
  const nodes = Array.from(document.querySelectorAll("p,span,h2,h3,div"));
  const node = nodes.find((el) => /Lesson\s+\d+\s+of\s+\d+/i.test(el.textContent || ""));
  if (!node) return 0;
  const match = (node.textContent || "").match(/Lesson\s+(\d+)\s+of\s+(\d+)/i);
  return match ? Math.max(0, Number(match[1]) - 1) : 0;
}

const storageKey = (userId, courseId, type, assessmentId) =>
  `oa_assessment_${userId}_${courseId}_${type}_${assessmentId}`;

function loadAttempt(userId, courseId, type, assessmentId) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(userId, courseId, type, assessmentId)) || "null");
  } catch {
    return null;
  }
}

function saveLocalAttempt(userId, courseId, type, assessmentId, value) {
  try {
    localStorage.setItem(storageKey(userId, courseId, type, assessmentId), JSON.stringify(value));
  } catch {
    // Local fallback is optional.
  }
}

async function saveAttempt(user, courseId, type, assessmentId, result) {
  saveLocalAttempt(user.uid, courseId, type, assessmentId, result);
  try {
    await setDoc(
      doc(db, "assessmentAttempts", `${user.uid}_${courseId}_${type}_${assessmentId}`),
      { userId: user.uid, courseId, type, assessmentId, ...result, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (error) {
    console.warn("Assessment cloud save unavailable; local result kept.", error);
  }
}

function AssessmentCard({ title, description, assessment, locked, lockedText, user, courseId, type, assessmentId }) {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(() => user && assessmentId ? loadAttempt(user.uid, courseId, type, assessmentId) : null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAnswers({});
    setResult(user && assessmentId ? loadAttempt(user.uid, courseId, type, assessmentId) : null);
  }, [user, courseId, type, assessmentId]);

  if (!assessment?.enabled || assessment.questions.length === 0) return null;

  const submit = async () => {
    if (submitting) return;
    if (assessment.questions.some((q) => answers[q.id] === undefined)) return;
    setSubmitting(true);
    let earned = 0;
    let total = 0;
    assessment.questions.forEach((q) => {
      const points = Math.max(1, Number(q.points) || 1);
      total += points;
      if (Number(answers[q.id]) === Number(q.correctIndex)) earned += points;
    });
    const percent = total ? Math.round((earned / total) * 100) : 0;
    const passed = percent >= assessment.passPercent;
    const next = { score: earned, total, percent, passed, attemptedAt: new Date().toISOString() };
    setResult(next);
    await saveAttempt(user, courseId, type, assessmentId, next);
    setSubmitting(false);
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><FileQuestion size={22} /></div>
        <div className="min-w-0 flex-1"><h3 className="text-lg font-extrabold text-slate-900">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p></div>
        {result?.passed && <CheckCircle2 className="shrink-0 text-emerald-600" size={24} />}
      </div>

      {locked ? (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><Lock size={19} className="mt-0.5 shrink-0" /><span>{lockedText}</span></div>
      ) : (
        <>
          <div className="mt-5 space-y-4">
            {assessment.questions.map((q, index) => (
              <div key={q.id} className="rounded-2xl border border-slate-200 p-4">
                <p className="font-bold leading-6 text-slate-900">{index + 1}. {q.question}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {q.options.map((option, optionIndex) => (
                    <label key={optionIndex} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${Number(answers[q.id]) === optionIndex ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}>
                      <input type="radio" name={`${assessmentId}-${q.id}`} value={optionIndex} checked={Number(answers[q.id]) === optionIndex} onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: optionIndex }))} className="h-4 w-4 text-blue-600" />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500">Pass mark: <strong>{assessment.passPercent}%</strong></p><button type="button" disabled={submitting || assessment.questions.some((q) => answers[q.id] === undefined)} onClick={submit} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Checking..." : "Submit Assessment"}</button></div>
          {result && <div className={`mt-4 rounded-2xl border p-4 ${result.passed ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}><div className="flex items-center gap-2 font-extrabold">{result.passed ? <CheckCircle2 size={19} /> : <RotateCcw size={19} />} {result.passed ? "Passed" : "Not passed yet"} — {result.percent}%</div><p className="mt-1 text-sm">You scored {result.score} out of {result.total} points. You can submit again.</p></div>}
        </>
      )}
    </section>
  );
}

export default function CourseAssessments() {
  const courseId = useMemo(() => {
    const match = window.location.pathname.match(/^\/courses\/([^/]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }, []);
  const [user, setUser] = useState(undefined);
  const [course, setCourse] = useState(null);
  const [progress, setProgress] = useState({});
  const [lessonIndex, setLessonIndex] = useState(0);

  useEffect(() => onAuthStateChanged(auth, (currentUser) => setUser(currentUser || null)), []);

  useEffect(() => {
    if (!courseId) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "courses", courseId));
        if (!cancelled && snap.exists()) setCourse({ id: snap.id, ...snap.data() });
      } catch (error) { console.error("Assessment course load error:", error); }
    };
    load();
    return () => { cancelled = true; };
  }, [courseId]);

  useEffect(() => {
    if (!user || !courseId) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const snap = await getDocs(query(collection(db, "lessonProgress"), where("userId", "==", user.uid), where("courseId", "==", courseId)));
        if (cancelled) return;
        const map = {};
        snap.docs.forEach((item) => { const data = item.data(); if (data.lessonId) map[data.lessonId] = data; });
        setProgress(map);
      } catch (error) { console.error("Assessment progress load error:", error); }
    };
    load();
    const interval = window.setInterval(load, 5000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [user, courseId]);

  useEffect(() => {
    const update = () => setLessonIndex(currentLessonIndex());
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  if (!user || !course) return null;

  const lessons = Array.isArray(course.lessons) ? [...course.lessons].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)) : [];
  const currentLesson = lessons[lessonIndex] || lessons[0];
  const currentQuiz = currentLesson ? normalizeAssessment(course.assessments?.lessonQuizzes?.[currentLesson.id]) : normalizeAssessment(null);
  const completedLectures = lessons.filter((lesson) => progress[lesson.id]?.completed25 === true).length;
  const allLecturesComplete = lessons.length > 0 && completedLectures === lessons.length;
  const weeks = parseWeeks(course.duration);
  const finalRequired = weeks === 6 || weeks === 8;
  const finalExam = normalizeAssessment(course.assessments?.finalExam);
  const courseTest = normalizeAssessment(course.assessments?.courseTest);
  const finalAttempt = loadAttempt(user.uid, courseId, "final", "final-exam");
  const courseComplete = allLecturesComplete && (!finalRequired || finalAttempt?.passed === true);

  useEffect(() => {
    if (!courseComplete) return;
    const completion = { userId: user.uid, courseId, courseTitle: course.title || "", completedAt: new Date().toISOString(), completionRule: finalRequired ? "final_exam_passed" : "lecture_completion_only" };
    try { localStorage.setItem(`oa_course_completion_${user.uid}_${courseId}`, JSON.stringify(completion)); } catch { /* optional */ }
    setDoc(doc(db, "courseCompletions", `${user.uid}_${courseId}`), { ...completion, completedAt: serverTimestamp() }, { merge: true }).catch(() => {});
  }, [courseComplete, courseId, course?.title, finalRequired, user.uid]);

  const quizLocked = !progress[currentLesson?.id]?.completed25;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
      <div className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-4 sm:p-5"><div className="flex items-start gap-3"><ShieldCheck size={21} className="mt-0.5 shrink-0 text-blue-600" /><div><p className="font-extrabold text-slate-900">Learning & Assessment</p><p className="mt-1 text-sm leading-6 text-slate-600">Lecture attendance requires {WATCH_REQUIREMENT}% verified active watch time. Seeking or changing playback speed does not create extra watch credit.</p></div></div></div>

      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-600">Lecture {Math.min(lessonIndex + 1, Math.max(lessons.length, 1))}</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">{currentLesson?.title || "Current lecture"}</h2></div><div className="text-sm font-bold text-slate-600">{completedLectures}/{lessons.length} lectures completed</div></div></div>

      <div className="mt-5"><AssessmentCard title={`${currentLesson?.title || "Lecture"} — Quiz`} description="Complete the verified lecture watch requirement before attempting this quiz." assessment={currentQuiz} locked={quizLocked} lockedText={`Watch at least ${WATCH_REQUIREMENT}% of this lecture with the screen active before the quiz unlocks.`} user={user} courseId={courseId} type="lesson" assessmentId={currentLesson?.id || "lesson"} /></div>

      {courseTest.enabled && courseTest.questions.length > 0 && <div className="mt-5"><AssessmentCard title="Course Test" description="The course test becomes available after all lectures are completed." assessment={courseTest} locked={!allLecturesComplete} lockedText="Complete every lecture first to unlock the course test." user={user} courseId={courseId} type="course-test" assessmentId="course-test" /></div>}

      {finalExam.enabled && finalExam.questions.length > 0 && <div className="mt-5"><AssessmentCard title="Final Exam" description={finalRequired ? "This final exam is mandatory for completion of this 6/8-week course." : "Final exam is optional for this course."} assessment={finalExam} locked={!allLecturesComplete} lockedText="Complete every lecture first to unlock the final exam." user={user} courseId={courseId} type="final" assessmentId="final-exam" /></div>}

      <div className={`mt-5 rounded-3xl border p-5 ${courseComplete ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}><div className="flex items-start gap-3"><Trophy size={24} className={courseComplete ? "text-emerald-600" : "text-slate-400"} /><div><h2 className="font-extrabold text-slate-900">Course Completion</h2><p className="mt-1 text-sm leading-6 text-slate-600">{courseComplete ? "Congratulations! This course is complete." : finalRequired ? "Complete all lectures and pass the final exam to complete this course." : "Complete all lectures to complete this course."}</p></div></div></div>
    </div>
  );
}
