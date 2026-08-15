import { firestoreGet, firestoreQuery, firestoreSet, verifyFirebaseIdToken } from "./_firebase.js";
import { deleteAuthUser, listAuthUsers, sendPasswordReset, updateAuthUser } from "./_identity.js";

const ADMIN_UID = "CDwCqUitlaSHEVeWQufCb0lXzMx1";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

async function requireAdmin(req) {
  const authHeader = String(req.headers.authorization || "");
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!idToken) throw Object.assign(new Error("Authentication required"), { status: 401 });
  const user = await verifyFirebaseIdToken(idToken);
  if (user.localId !== ADMIN_UID) throw Object.assign(new Error("Admin access required"), { status: 403 });
  return user;
}

function safeUser(user, paidCourses = 0) {
  const providers = Array.isArray(user.providerUserInfo)
    ? user.providerUserInfo.map((item) => String(item.providerId || "")).filter(Boolean)
    : [];
  return {
    id: String(user.localId || ""),
    email: String(user.email || ""),
    displayName: String(user.displayName || ""),
    photoUrl: String(user.photoUrl || ""),
    emailVerified: user.emailVerified === true,
    disabled: user.disabled === true,
    createdAt: Number(user.createdAt || 0),
    lastLoginAt: Number(user.lastLoginAt || 0),
    providers,
    paidCourses,
  };
}

async function listUsers() {
  const [authUsers, orders] = await Promise.all([
    listAuthUsers(),
    firestoreQuery("orders", [{ field: "status", value: "paid" }]).catch(() => []),
  ]);

  const paidMap = new Map();
  for (const row of orders) {
    const fields = row.fields || {};
    const uid = String(fields.userId || "");
    const courseId = String(fields.courseId || "");
    if (!uid) continue;
    if (!paidMap.has(uid)) paidMap.set(uid, new Set());
    if (courseId) paidMap.get(uid).add(courseId);
  }

  return authUsers
    .filter((user) => String(user.localId || "") && String(user.localId) !== ADMIN_UID)
    .map((user) => safeUser(user, paidMap.get(String(user.localId))?.size || 0))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

async function updateUser(body) {
  const id = String(body.userId || "").trim();
  if (!id) throw Object.assign(new Error("User ID is required"), { status: 400 });
  if (id === ADMIN_UID) throw Object.assign(new Error("The primary administrator cannot be changed here"), { status: 400 });

  const updates = {};
  if (Object.prototype.hasOwnProperty.call(body, "displayName")) {
    const displayName = String(body.displayName || "").trim();
    if (displayName.length > 120) throw Object.assign(new Error("Name is too long"), { status: 400 });
    updates.displayName = displayName;
  }
  if (Object.prototype.hasOwnProperty.call(body, "email")) {
    const email = String(body.email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 254) throw Object.assign(new Error("Enter a valid email address"), { status: 400 });
    updates.email = email;
  }
  if (Object.prototype.hasOwnProperty.call(body, "photoUrl")) {
    const photoUrl = String(body.photoUrl || "").trim();
    if (photoUrl.length > 2048) throw Object.assign(new Error("Photo URL is too long"), { status: 400 });
    updates.photoUrl = photoUrl;
  }
  if (Object.prototype.hasOwnProperty.call(body, "emailVerified")) updates.emailVerified = Boolean(body.emailVerified);
  if (Object.prototype.hasOwnProperty.call(body, "disabled")) updates.disabled = Boolean(body.disabled);
  if (!Object.keys(updates).length) throw Object.assign(new Error("No changes supplied"), { status: 400 });

  const updated = await updateAuthUser(id, updates);
  const existing = await firestoreGet(`users/${id}`);
  await firestoreSet(`users/${id}`, {
    ...(existing?.fields || {}),
    ...(Object.prototype.hasOwnProperty.call(updates, "displayName") ? { displayName: updates.displayName } : {}),
    ...(Object.prototype.hasOwnProperty.call(updates, "email") ? { email: updates.email } : {}),
    ...(Object.prototype.hasOwnProperty.call(updates, "photoUrl") ? { photoUrl: updates.photoUrl } : {}),
    ...(Object.prototype.hasOwnProperty.call(updates, "emailVerified") ? { emailVerified: updates.emailVerified } : {}),
    ...(Object.prototype.hasOwnProperty.call(updates, "disabled") ? { disabled: updates.disabled } : {}),
    updatedAt: new Date(),
  });

  return { ok: true, user: safeUser(updated) };
}

async function resetPassword(body) {
  const id = String(body.userId || "").trim();
  if (!id || id === ADMIN_UID) throw Object.assign(new Error("A valid learner account is required"), { status: 400 });
  const user = (await listAuthUsers()).find((item) => String(item.localId) === id);
  if (!user?.email) throw Object.assign(new Error("User does not have an email address"), { status: 400 });
  await sendPasswordReset(user.email);
  return { ok: true, email: user.email };
}

async function deleteUser(body) {
  const id = String(body.userId || "").trim();
  if (!id) throw Object.assign(new Error("User ID is required"), { status: 400 });
  if (id === ADMIN_UID) throw Object.assign(new Error("The primary administrator cannot be deleted"), { status: 400 });

  await deleteAuthUser(id);

  // Keep learning/payment/certificate history for auditability, but mark the
  // profile record so it cannot accidentally be treated as an active account.
  const existing = await firestoreGet(`users/${id}`);
  if (existing?.fields) {
    await firestoreSet(`users/${id}`, {
      ...existing.fields,
      accountDeleted: true,
      deletedAt: new Date(),
      disabled: true,
    });
  }

  return { ok: true, deletedUserId: id };
}

export default async function handler(req, res) {
  try {
    await requireAdmin(req);
    const action = String(req.method === "GET" ? req.query?.action || "list" : req.body?.action || "").trim();

    if (req.method === "GET" && action === "list") return json(res, 200, { ok: true, users: await listUsers() });
    if (req.method !== "POST") return json(res, 405, { error: "Method Not Allowed" });
    if (action === "update") return json(res, 200, await updateUser(req.body || {}));
    if (action === "resetPassword") return json(res, 200, await resetPassword(req.body || {}));
    if (action === "delete") return json(res, 200, await deleteUser(req.body || {}));
    return json(res, 400, { error: "Unknown user management action" });
  } catch (error) {
    console.error("Admin users error:", error?.message || error);
    return json(res, Number(error?.status) || 500, { error: error?.message || "Unable to manage users" });
  }
}
