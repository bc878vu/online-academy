import { firestoreGet, firestoreSet, verifyFirebaseIdToken } from "./_firebase.js";

function json(res, status, body) { res.status(status).setHeader("Content-Type", "application/json").json(body); }
function tokenFrom(req) { const value = String(req.headers.authorization || ""); return value.startsWith("Bearer ") ? value.slice(7).trim() : ""; }

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });
  try {
    const token = tokenFrom(req);
    if (!token) return json(res, 401, { error: "Authentication required." });
    const user = await verifyFirebaseIdToken(token);
    const courseId = String(req.body?.courseId || "").trim();
    if (!courseId) return json(res, 400, { error: "Course ID is required." });
    const course = await firestoreGet(`courses/${courseId}`);
    if (!course?.fields) return json(res, 404, { error: "Course not found." });
    const lessons = Array.isArray(course.fields.lessons) ? course.fields.lessons : [];
    const keys = await firestoreGet(`assessmentKeys/${courseId}`);
    const assessments = keys?.fields?.assessments || {};
    const quizMap = assessments.lessonQuizzes || {};
    for (const lesson of lessons) {
      const progress = await firestoreGet(`lessonProgress/${user.localId}_${courseId}_${lesson.id}`);
      if (progress?.fields?.completed !== true) return json(res, 403, { error: "Course is not complete yet." });
      const quiz = quizMap?.[lesson.id];
      if (quiz?.enabled !== false && Array.isArray(quiz?.questions) && quiz.questions.length) {
        const attempt = await firestoreGet(`assessmentAttempts/${user.localId}_${courseId}_lesson_${lesson.id}`);
        if (attempt?.fields?.passed !== true) return json(res, 403, { error: "All lecture quizzes must be passed." });
      }
    }
    const courseTest = assessments.courseTest;
    if (courseTest?.enabled !== false && Array.isArray(courseTest?.questions) && courseTest.questions.length) {
      const attempt = await firestoreGet(`assessmentAttempts/${user.localId}_${courseId}_course-test_course-test`);
      if (attempt?.fields?.passed !== true) return json(res, 403, { error: "Course test is not complete." });
    }
    const finalExam = assessments.finalExam;
    if (finalExam?.enabled !== false && Array.isArray(finalExam?.questions) && finalExam.questions.length) {
      const attempt = await firestoreGet(`assessmentAttempts/${user.localId}_${courseId}_final_final-exam`);
      if (attempt?.fields?.passed !== true) return json(res, 403, { error: "Final exam is not complete." });
    }
    const payload = { userId: user.localId, courseId, courseTitle: course.fields.title || "", completionRule: "server_verified_learning_sequence", completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await firestoreSet(`courseCompletions/${user.localId}_${courseId}`, payload);
    return json(res, 200, { ok: true, completion: payload });
  } catch (error) {
    console.error("complete-course error", error);
    return json(res, error?.status || 500, { error: error?.message || "Unable to complete course." });
  }
}
