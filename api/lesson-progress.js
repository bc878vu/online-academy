import { firestoreGet, firestoreQuery, firestoreSet, verifyFirebaseIdToken } from "./_firebase.js";

function clamp(value, min, max, fallback = min) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

function getBearer(request) {
  const header = request.headers.authorization || request.headers.Authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function send(response, status, body) {
  response.status(status).setHeader("Cache-Control", "no-store").json(body);
}

export default async function handler(request, response) {
  if (!["GET", "POST", "OPTIONS"].includes(request.method)) return send(response, 405, { error: "Method not allowed" });
  if (request.method === "OPTIONS") return response.status(204).end();

  try {
    const idToken = getBearer(request);
    if (!idToken) return send(response, 401, { error: "Authentication required" });
    const user = await verifyFirebaseIdToken(idToken);
    const userId = user.localId;

    if (request.method === "GET") {
      const courseId = String(request.query?.courseId || "").trim();
      if (!courseId) return send(response, 400, { error: "courseId is required" });
      const rows = await firestoreQuery("lessonProgress", [
        { field: "userId", value: userId },
        { field: "courseId", value: courseId },
      ]);
      return send(response, 200, { progress: rows.map((row) => row.fields) });
    }

    const body = request.body || {};
    const courseId = String(body.courseId || "").trim();
    const lessonId = String(body.lessonId || "").trim();
    if (!courseId || !lessonId) return send(response, 400, { error: "courseId and lessonId are required" });

    const path = `lessonProgress/${userId}_${courseId}_${lessonId}`;
    const existing = await firestoreGet(path);
    const old = existing?.fields || {};
    const duration = Math.max(0, Number(body.duration) || Number(old.duration) || 0);
    const activeWatchSeconds = Math.max(0, Number(old.activeWatchSeconds) || 0, Number(body.activeWatchSeconds) || 0);
    const requiredWatchPercent = clamp(body.requiredWatchPercent, 0, 100, clamp(old.requiredWatchPercent, 0, 100, 25));
    const percent = duration > 0 ? Math.min(100, Math.floor((activeWatchSeconds / duration) * 100)) : 0;
    const completed = old.completed === true || old.completed25 === true || requiredWatchPercent === 0 || percent >= requiredWatchPercent;

    const data = {
      userId,
      courseId,
      lessonId,
      lessonTitle: String(body.lessonTitle || old.lessonTitle || ""),
      duration,
      positionSeconds: clamp(body.positionSeconds, 0, duration || Number.MAX_SAFE_INTEGER, Number(old.positionSeconds) || 0),
      activeWatchSeconds,
      percent,
      requiredWatchPercent,
      completed,
      attendance: completed ? "present" : "absent",
      completedAt: completed ? new Date() : (old.completedAt || null),
      lastWatchedAt: new Date(),
      updatedAt: new Date(),
    };

    await firestoreSet(path, data);
    return send(response, 200, { ok: true, progress: data });
  } catch (error) {
    console.error("lesson-progress API error", error);
    return send(response, 500, { error: error?.message || "Progress sync failed" });
  }
}
