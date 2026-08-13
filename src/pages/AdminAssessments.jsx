import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { CheckCircle2, ChevronDown, ChevronUp, FileQuestion, GraduationCap, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { db } from "../firebase";

const emptyQuestion = () => ({
  id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  question: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  points: 1,
});

const normalizeQuestion = (q, index = 0) => ({
  id: q?.id || `q_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
  question: q?.question || "",
  options: Array.isArray(q?.options) && q.options.length >= 2 ? [...q.options, "", "", ""].slice(0, 4) : ["", "", "", ""],
  correctIndex: Math.min(3, Math.max(0, Number(q?.correctIndex) || 0)),
  points: Math.max(1, Number(q?.points) || 1),
});

const normalizeAssessment = (value, fallback = {}) => ({
  enabled: value?.enabled !== false,
  passPercent: Math.min(100, Math.max(1, Number(value?.passPercent) || Number(fallback.passPercent) || 70)),
  questions: Array.isArray(value?.questions) ? value.questions.map(normalizeQuestion) : [],
});

const parseWeeks = (duration) => {
  const text = String(duration || "").toLowerCase();
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:week|weeks|wk|w)\b/);
  if (match) return Number(match[1]);
  const number = text.match(/\d+(?:\.\d+)?/);
  return number ? Number(number[0]) : 0;
};

function QuestionEditor({ question, index, disabled, onChange, onRemove }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Question {index + 1}</span>
        <button type="button" onClick={onRemove} disabled={disabled} className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-40" aria-label="Delete question"><Trash2 size={17} /></button>
      </div>
      <textarea value={question.question} disabled={disabled} onChange={(e) => onChange({ question: e.target.value })} rows={2} placeholder="Write the question..." className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {question.options.map((option, optionIndex) => (
          <div key={optionIndex} className={`flex items-center gap-2 rounded-xl border p-2 ${question.correctIndex === optionIndex ? "border-emerald-300 bg-emerald-50" : "border-slate-200"}`}>
            <input type="radio" name={`correct-${question.id}`} checked={question.correctIndex === optionIndex} disabled={disabled} onChange={() => onChange({ correctIndex: optionIndex })} className="h-4 w-4 text-emerald-600" />
            <input value={option} disabled={disabled} onChange={(e) => { const options = [...question.options]; options[optionIndex] = e.target.value; onChange({ options }); }} placeholder={`Option ${optionIndex + 1}`} className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm outline-none" />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>Select the radio button for the correct answer.</span><label className="flex items-center gap-2">Points <input type="number" min="1" max="20" value={question.points} disabled={disabled} onChange={(e) => onChange({ points: e.target.value })} className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-center" /></label></div>
    </div>
  );
}

function AssessmentEditor({ title, description, assessment, disabled, onChange }) {
  const updateQuestion = (index, patch) => onChange({ questions: assessment.questions.map((q, i) => i === index ? { ...q, ...patch } : q) });
  const removeQuestion = (index) => onChange({ questions: assessment.questions.filter((_, i) => i !== index) });
  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><h3 className="text-lg font-extrabold text-slate-900">{title}</h3><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p></div>
        <label className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm"><input type="checkbox" checked={assessment.enabled} disabled={disabled} onChange={(e) => onChange({ enabled: e.target.checked })} className="h-4 w-4 text-blue-600" /> Enabled</label>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4"><label className="text-sm font-bold text-slate-700">Pass percentage</label><input type="number" min="1" max="100" value={assessment.passPercent} disabled={disabled} onChange={(e) => onChange({ passPercent: e.target.value })} className="w-24 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-bold outline-none" /><span className="text-xs text-slate-500">Students must reach this score.</span></div>
      <div className="mt-5 space-y-4">
        {assessment.questions.map((question, index) => <QuestionEditor key={question.id} question={question} index={index} disabled={disabled} onChange={(patch) => updateQuestion(index, patch)} onRemove={() => removeQuestion(index)} />)}
      </div>
      <button type="button" disabled={disabled} onClick={() => onChange({ questions: [...assessment.questions, emptyQuestion()] })} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"><Plus size={17} /> Add Question</button>
    </section>
  );
}

export default function AdminAssessments() {
  const [courses, setCourses] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [course, setCourse] = useState(null);
  const [lessonQuizzes, setLessonQuizzes] = useState({});
  const [courseTest, setCourseTest] = useState(normalizeAssessment());
  const [finalExam, setFinalExam] = useState(normalizeAssessment({ enabled: true, passPercent: 70 }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openLessons, setOpenLessons] = useState({});

  const loadCourses = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const snap = await getDocs(collection(db, "courses"));
      const data = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
      setCourses(data);
      if (!selectedId && data[0]) setSelectedId(data[0].id);
    } catch (err) { console.error(err); setError(err?.message || "Unable to load courses."); }
    finally { setLoading(false); }
  }, [selectedId]);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  useEffect(() => {
    const selected = courses.find((item) => item.id === selectedId) || null;
    setCourse(selected);
    if (!selected) return;
    const lessons = Array.isArray(selected.lessons) ? selected.lessons : [];
    const stored = selected.assessments || {};
    const nextQuizzes = {};
    lessons.forEach((lesson) => {
      nextQuizzes[lesson.id] = normalizeAssessment(stored.lessonQuizzes?.[lesson.id], { passPercent: 70 });
    });
    setLessonQuizzes(nextQuizzes);
    setCourseTest(normalizeAssessment(stored.courseTest, { passPercent: 70 }));
    setFinalExam(normalizeAssessment(stored.finalExam, { passPercent: 70 }));
    setOpenLessons({});
  }, [courses, selectedId]);

  const weeks = useMemo(() => parseWeeks(course?.duration), [course]);
  const finalRequired = weeks === 6 || weeks === 8;

  const validate = () => {
    const groups = [courseTest, finalExam, ...Object.values(lessonQuizzes)];
    for (const group of groups) {
      if (!group.enabled) continue;
      for (const q of group.questions) {
        if (!q.question.trim()) return "Every enabled question needs question text.";
        if (q.options.some((option) => !String(option).trim())) return "Every question needs all four options.";
      }
    }
    if (finalRequired && finalExam.enabled && finalExam.questions.length === 0) return "A 6/8 week course must have a final exam.";
    return "";
  };

  const save = async () => {
    if (!course || saving) return;
    const validation = validate();
    if (validation) { setError(validation); setSuccess(""); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const assessments = {
        version: 1,
        completion: { mode: finalRequired ? "final_exam_required" : "lecture_completion_only", minimumFinalExamWeeks: 6 },
        lessonQuizzes,
        courseTest,
        finalExam: { ...finalExam, enabled: finalRequired ? finalExam.enabled : false },
        updatedAt: serverTimestamp(),
      };
      await updateDoc(doc(db, "courses", course.id), { assessments, updatedAt: serverTimestamp() });
      setCourses((prev) => prev.map((item) => item.id === course.id ? { ...item, assessments } : item));
      setSuccess("Assessment settings saved successfully.");
    } catch (err) { console.error(err); setError(err?.message || "Unable to save assessment settings."); }
    finally { setSaving(false); }
  };

  if (loading) return <main className="min-h-[calc(100vh-72px)] bg-slate-50"><div className="flex min-h-[500px] items-center justify-center px-4"><RefreshCw className="animate-spin text-blue-600" size={32} /></div></main>;

  return (
    <main className="min-h-[calc(100vh-72px)] bg-slate-50">
      <section className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-600">Assessment Management</p><h1 className="mt-2 text-3xl font-extrabold text-slate-900">Quizzes, Tests & Final Exams</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Add a quiz to every lecture, a course test, and a final exam. Six- and eight-week courses require a passing final exam; one- and two-week courses use lecture completion only.</p></div><button type="button" onClick={loadCourses} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"><RefreshCw size={17} /> Refresh</button></div>
        {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
        {success && <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700"><CheckCircle2 size={18} /> {success}</div>}
        <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <label className="block text-sm font-bold text-slate-700">Select Course</label>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 sm:max-w-2xl">
            {courses.map((item) => <option key={item.id} value={item.id}>{item.title || "Untitled Course"} — {item.duration || "Duration not set"}</option>)}
          </select>
        </div>
        {course && (
          <div className="mt-6 space-y-6">
            <div className={`rounded-3xl border p-5 ${finalRequired ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
              <div className="flex items-start gap-3"><GraduationCap size={24} className={finalRequired ? "text-amber-700" : "text-emerald-700"} /><div><h2 className="font-extrabold text-slate-900">Completion rule: {finalRequired ? "Final exam required" : "Lecture completion only"}</h2><p className="mt-1 text-sm leading-6 text-slate-600">Detected duration: <strong>{weeks || "unknown"} week(s)</strong>. {finalRequired ? "The student cannot complete this course until the final exam is passed." : "No final-exam pass is required for this course."}</p></div></div>
            </div>
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><div className="flex items-center gap-3"><FileQuestion className="text-blue-600" /><div><h2 className="text-xl font-extrabold text-slate-900">Lecture Quizzes</h2><p className="text-sm text-slate-500">Each lecture can have its own quiz.</p></div></div><div className="mt-5 space-y-3">
              {(Array.isArray(course.lessons) ? course.lessons : []).map((lesson, index) => {
                const assessment = lessonQuizzes[lesson.id] || normalizeAssessment();
                const open = openLessons[lesson.id];
                return <div key={lesson.id} className="overflow-hidden rounded-2xl border border-slate-200"><button type="button" onClick={() => setOpenLessons((p) => ({ ...p, [lesson.id]: !p[lesson.id] }))} className="flex w-full items-center justify-between gap-3 bg-white p-4 text-left hover:bg-slate-50"><span><span className="text-xs font-bold uppercase tracking-wide text-blue-600">Lecture {index + 1}</span><span className="mt-1 block font-bold text-slate-900">{lesson.title || `Lesson ${index + 1}`}</span><span className="mt-1 block text-xs text-slate-500">{assessment.questions.length} question(s)</span></span>{open ? <ChevronUp size={19} /> : <ChevronDown size={19} />}</button>{open && <div className="border-t border-slate-200 p-3 sm:p-4"><AssessmentEditor title="Lecture Quiz" description="This quiz is shown in the lecture learning view after the video section." assessment={assessment} disabled={saving} onChange={(patch) => setLessonQuizzes((p) => ({ ...p, [lesson.id]: { ...assessment, ...patch } }))} /></div>}</div>;
              })}
              {(!course.lessons || course.lessons.length === 0) && <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Add lectures to the course first.</p>}
            </div></section>
            <AssessmentEditor title="Course Test" description="A course-level test available after the student works through the lectures. Passing it is tracked separately from lecture attendance." assessment={courseTest} disabled={saving} onChange={(patch) => setCourseTest((p) => ({ ...p, ...patch }))} />
            <AssessmentEditor title="Final Exam" description={finalRequired ? "Required for 6- and 8-week courses. The student must pass it to complete the course." : "Optional for short courses. One- and two-week courses do not require a final-exam pass for completion."} assessment={finalExam} disabled={saving || !finalRequired} onChange={(patch) => setFinalExam((p) => ({ ...p, ...patch }))} />
            <div className="sticky bottom-4 z-20 flex justify-end"><button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60">{saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />} {saving ? "Saving..." : "Save Assessment Setup"}</button></div>
          </div>
        )}
      </section>
    </main>
  );
}
