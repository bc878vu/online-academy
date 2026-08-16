import { firestoreGet, firestoreQuery, firestoreSet, verifyFirebaseIdToken } from "./_firebase.js";
import { listAuthUsers } from "./_identity.js";

const ADMIN_UID = "CDwCqUitlaSHEVeWQufCb0lXzMx1";
const RESEND_URL = "https://api.resend.com/emails/batch";
const MAX_BATCH = 100;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESERVED_EMAIL_DOMAINS = new Set(["example.com", "example.org", "example.net", "localhost", "invalid", "test"]);

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function isDeliverableEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return false;
  const domain = email.split("@").pop() || "";
  if (RESERVED_EMAIL_DOMAINS.has(domain)) return false;
  if (domain.endsWith(".invalid") || domain.endsWith(".test") || domain.endsWith(".localhost")) return false;
  return true;
}

function getFromAddress() {
  const from = String(process.env.RESEND_FROM_EMAIL || "").trim();
  if (!from) throw new Error("Missing RESEND_FROM_EMAIL environment variable");
  return from;
}

function getAppUrl(req) {
  const configured = String(process.env.PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  if (configured) return configured;
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  return host ? `${proto}://${host}` : "https://online-academy-plum.vercel.app";
}

async function getRecipients(audience) {
  const authUsers = await listAuthUsers();
  const normalized = authUsers.map((user) => ({
    id: String(user.localId || ""),
    email: String(user.email || "").trim().toLowerCase(),
    name: String(user.displayName || "Student").trim(),
  })).filter((user) => user.id && isDeliverableEmail(user.email) && user.id !== ADMIN_UID);

  if (audience === "all") return normalized;

  const paidOrders = await firestoreQuery("orders", [{ field: "status", value: "paid" }]);
  const paidIds = new Set(paidOrders.map((row) => String(row.fields?.userId || "")).filter(Boolean));
  if (audience === "paid") return normalized.filter((user) => paidIds.has(user.id));
  if (audience === "free") return normalized.filter((user) => !paidIds.has(user.id));
  throw new Error("Invalid audience");
}

async function sendBatch(recipients, subject, html, idempotencyPrefix) {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) throw new Error("Missing RESEND_API_KEY environment variable");
  const from = getFromAddress();
  let sent = 0;

  for (let index = 0; index < recipients.length; index += MAX_BATCH) {
    const chunk = recipients.slice(index, index + MAX_BATCH);
    const payload = chunk.map((recipient) => ({ from, to: [recipient.email], subject, html }));
    const response = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `${idempotencyPrefix}-${index / MAX_BATCH}`.slice(0, 256) },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Email provider rejected the batch (${response.status}): ${detail.slice(0, 300)}`);
    }
    sent += chunk.length;
  }
  return sent;
}

async function requireAdmin(req) {
  const authHeader = String(req.headers.authorization || "");
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!idToken) throw Object.assign(new Error("Authentication required"), { status: 401 });
  const user = await verifyFirebaseIdToken(idToken);
  if (user.localId !== ADMIN_UID) throw Object.assign(new Error("Admin access required"), { status: 403 });
  return user;
}

function documentId(name = "") {
  const parts = String(name).split("/");
  return parts[parts.length - 1] || "";
}

function timeValue(value) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

async function sendCourseLaunch(req, courseId) {
  const courseDoc = await firestoreGet(`courses/${courseId}`);
  if (!courseDoc) throw Object.assign(new Error("Course not found"), { status: 404 });
  const course = courseDoc.fields || {};
  if (course.published !== true) throw Object.assign(new Error("Course is not published"), { status: 400 });
  if (course.launchEmailSentAt) return { sent: 0, alreadySent: true };

  const recipients = await getRecipients("all");
  const title = String(course.title || "New Course").trim();
  const description = String(course.description || "").trim();
  const url = `${getAppUrl(req)}/courses/${encodeURIComponent(courseId)}`;
  const subject = `New course launched: ${title}`;
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:680px;margin:auto"><h2 style="color:#2563eb">New Course Available</h2><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><p><a href="${escapeHtml(url)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">View Course</a></p><p style="color:#64748b;font-size:13px">Online Academy</p></div>`;
  const sent = await sendBatch(recipients, subject, html, `course-launch-${courseId}`);

  const fresh = await firestoreGet(`courses/${courseId}`);
  if (fresh) await firestoreSet(`courses/${courseId}`, { ...(fresh.fields || {}), launchEmailSentAt: new Date() });
  return { sent, alreadySent: false };
}

async function getPaymentNotifications() {
  const rows = await firestoreQuery("adminNotifications", [{ field: "type", value: "payment" }]);
  return rows
    .map((row) => ({ id: documentId(row.name), ...(row.fields || {}) }))
    .filter((item) => item.id)
    .sort((a, b) => timeValue(b.createdAt) - timeValue(a.createdAt))
    .slice(0, 50);
}

async function markPaymentNotificationRead(notificationId, read) {
  const id = String(notificationId || "").trim();
  if (!id) throw Object.assign(new Error("Notification ID is required"), { status: 400 });
  const notificationDoc = await firestoreGet(`adminNotifications/${id}`);
  if (!notificationDoc) throw Object.assign(new Error("Notification not found"), { status: 404 });
  const now = new Date();
  await firestoreSet(`adminNotifications/${id}`, {
    ...(notificationDoc.fields || {}),
    read: read === true,
    readAt: read === true ? now : null,
    updatedAt: now,
  });
  return { ok: true, notificationId: id, read: read === true };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method Not Allowed" });
  try {
    const action = String(req.body?.action || "").trim();

    if (action === "paymentNotifications") {
      await requireAdmin(req);
      return json(res, 200, { ok: true, notifications: await getPaymentNotifications() });
    }

    if (action === "markPaymentNotificationRead") {
      await requireAdmin(req);
      return json(res, 200, await markPaymentNotificationRead(req.body?.notificationId, req.body?.read === true));
    }

    await requireAdmin(req);

    if (action === "courseLaunch") {
      const courseId = String(req.body?.courseId || "").trim();
      if (!courseId) return json(res, 400, { error: "Course ID is required" });
      return json(res, 200, { ok: true, ...(await sendCourseLaunch(req, courseId)) });
    }

    if (action === "announcement") {
      const audience = String(req.body?.audience || "all").trim();
      const subject = String(req.body?.subject || "").trim();
      const message = String(req.body?.message || "").trim();
      const link = String(req.body?.link || "").trim();
      if (!subject || !message) return json(res, 400, { error: "Subject and message are required" });
      if (!new Set(["all", "paid", "free"]).has(audience)) return json(res, 400, { error: "Invalid audience" });

      const recipients = await getRecipients(audience);
      const safeMessage = escapeHtml(message).replaceAll("\n", "<br>");
      const safeLink = link ? `<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Open Link</a></p>` : "";
      const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:680px;margin:auto"><h2 style="color:#2563eb">Online Academy</h2><h1>${escapeHtml(subject)}</h1><p>${safeMessage}</p>${safeLink}<p style="color:#64748b;font-size:13px">Online Academy</p></div>`;
      const sent = await sendBatch(recipients, subject, html, `announcement-${Date.now()}`);
      return json(res, 200, { ok: true, sent, audience });
    }

    return json(res, 400, { error: "Unknown notification action" });
  } catch (error) {
    console.error("Notification error:", error?.message || error);
    return json(res, Number(error?.status) || 500, { error: error?.message || "Unable to send notification" });
  }
}
