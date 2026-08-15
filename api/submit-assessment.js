import { firestoreGet, firestoreSet, verifyFirebaseIdToken } from "./_firebase.js";

const TYPES = new Set(["lesson", "course-test", "final"]);
const clean = (value, max = 80) => String(value ?? "").slice(0, max);

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json").json(body);
}

function getToken(req) {
  const header = String(req.headers.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function getAssessment(answerKey, type, assessmentId) {
  const assessments = answerKey?.assessments || {};
  if (type === "lesson") return assessments.lessonQuizzes?.[assessmentId] || null;
  if (type === "course-test") return assessments.courseTest || null;
  if (type === "final") return assessments.finalExam || null;
  return null;
}

async function getAttempt(uid, courseId, type, assessmentId) {
  return firestoreGet(`assessmentAttempts/${uid}_${courseId}_${type}_${assessmentId}`);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });
  try {
    const token = getToken(req);
    if (!token) return json(res, 401, { error: "Authentication required." });
    const user = await verifyFirebaseIdToken(token);
    const uid = user.localId;
    const body = req.body || {};
    const courseId = clean(body.courseId, 160);
    const type = clean(body.type, 30);
    const assessmentId = clean(body.assessmentId, 160);
    const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
    if (!courseId || !TYPES.has(type) || !assessmentId) return json(res, 400, { error: "Invalid assessment request." });

    const course = await firestoreGet(`courses/${courseId}`);
    if (!course?.fields) return json(res, 404, { error: "Course not found." });
    const answerKey = await firestoreGet(`assessmentKeys/${courseId}`);
    if (!answerKey?.fields?.assessments) return json(res, 409, { error: "This course assessment is not secured yet. Ask the administrator to open Assessment Management and save the learning sequence once." });

    const assessment = getAssessment(answerKey.fields, type, assessmentId);
    if (!assessment?.enabled || !Array.isArray(assessment.questions) || !assessment.questions.length) return json(res, 404, { error: "Assessment is not available." });

    const existing = await getAttempt(uid, courseId, type, assessmentId);
    if (existing?.fields?.passed === true) return json(res, 409, { error: "This assessment has already been passed and cannot be attempted again." });

    if (type === "lesson") {
      const lessonProgress = await firestoreGet(`lessonProgress/${uid}_${courseId}_${assessmentId}`);
      if (lessonProgress?.fields?.completed !== true) return json(res, 403, { error: "Complete the lecture attendance requirement before taking this quiz." });
      const lessons = Array.isArray(course.fields.lessons) ? [...course.fields.lessons].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)) : [];
      const currentIndex = lessons.findIndex((lesson) => lesson?.id === assessmentId);
      if (currentIndex < 0) return json(res, 404, { error: "Lecture not found." });
      const lessonQuizzes = answerKey.fields.assessments.lessonQuizzes || {};
      for (const previous of lessons.slice(0, currentIndex)) {
        const previousQuiz = lessonQuizzes?.[previous.id];
        if (previousQuiz?.enabled !== false && Array.isArray(previousQuiz?.questions) && previousQuiz.questions.length) {
          const previousAttempt = await getAttempt(uid, courseId, "lesson", previous.id);
          if (previousAttempt?.fields?.passed !== true) return json(res, 403, { error: "Pass the previous lecture quiz first." });
        }
      }
    }

    if (type === "course-test") {
      const lessons = Array.isArray(course.fields.lessons) ? course.fields.lessons : [];
      const lessonQuizzes = answerKey.fields.assessments.lessonQuizzes || {};
      for (const lesson of lessons) {
        const lessonProgress = await firestoreGet(`lessonProgress/${uid}_${courseId}_${lesson.id}`);
        if (lessonProgress?.fields?.completed !== true) return json(res, 403, { error: "Complete every lecture before taking the course test." });
        const quiz = lessonQuizzes?.[lesson.id];
        if (quiz?.enabled !== false && Array.isArray(quiz?.questions) && quiz.questions.length) {
          const attempt = await getAttempt(uid, courseId, "lesson", lesson.id);
          if (attempt?.fields?.passed !== true) return json(res, 403, { error: "Pass every lecture quiz before taking the course test." });
        }
      }
    }

    if (type === "final") {
      const courseTest = await getAttempt(uid, courseId, "course-test", "course-test");
      const configuredCourseTest = answerKey.fields.assessments.courseTest;
      if (configuredCourseTest?.enabled !== false && Array.isArray(configuredCourseTest?.questions) && configuredCourseTest.questions.length && courseTest?.fields?.passed !== true) return json(res, 403, { error: "Pass the course test before taking the final exam." });
    }

    let score = 0;
    let total = 0;
    for (const question of assessment.questions) {
      const points = Math.max(1, Number(question.points) || 1);
      total += points;
      if (Number(answers[question.id]) === Number(question.correctIndex)) score += points;
    }
    const percent = total ? Math.round((score / total) * 100) : 0;
    const passPercent = Math.min(100, Math.max(1, Number(assessment.passPercent) || 70));
    const passed = percent >= passPercent;
    const result = { userId: uid, courseId, type, assessmentId, score, total, percent, passed, passPercent, attemptedAt: new Date().toISOString(), attemptCount: 1 };
    await firestoreSet(`assessmentAttempts/${uid}_${courseId}_${type}_${assessmentId}`, result);

    return json(res, 200, { ok: true, type, assessmentId, result: { score, total, percent, passed, passPercent, attemptedAt: result.attemptedAt } });
  } catch (error) {
    console.error("submit-assessment error", error);
    return json(res, error?.status || 500, { error: error?.message || "Assessment submission failed." });
  }
}
