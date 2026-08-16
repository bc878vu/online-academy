import { firestoreGet, firestoreQuery, firestoreSet, verifyFirebaseIdToken } from "./_firebase.js";
import { createAuthUser, deleteAuthUser, listAuthUsers, sendPasswordReset, updateAuthUser } from "./_identity.js";

const ADMIN_EMAIL = "admin@onlineacademy.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function isPrimaryAdmin(user) {
  return String(user?.email || "").trim().toLowerCase() === ADMIN_EMAIL;
}

async function requireAdmin(req) {
  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw Object.assign(new Error("Authentication required"), { status: 401 });
  const user = await verifyFirebaseIdToken(token);
  if (!isPrimaryAdmin(user)) throw Object.assign(new Error("Admin access required"), { status: 403 });
  return user;
}

function profileFromFields(fields = {}) {
  return {
    gender: String(fields.gender || ""),
    dateOfBirth: String(fields.dateOfBirth || ""),
    maritalStatus: String(fields.maritalStatus || ""),
    city: String(fields.city || ""),
    country: String(fields.country || "Pakistan"),
    address: String(fields.address || ""),
    education: String(fields.education || ""),
    currentStudy: String(fields.currentStudy || ""),
    institution: String(fields.institution || ""),
    profession: String(fields.profession || ""),
    occupation: String(fields.occupation || ""),
    bio: String(fields.bio || ""),
    skills: Array.isArray(fields.skills) ? fields.skills.map(String).filter(Boolean).slice(0, 30) : [],
    languages: Array.isArray(fields.languages) ? fields.languages.map(String).filter(Boolean).slice(0, 20) : [],
    interests: Array.isArray(fields.interests) ? fields.interests.map(String).filter(Boolean).slice(0, 30) : [],
    website: String(fields.website || ""),
    socialLinks: fields.socialLinks && typeof fields.socialLinks === "object" ? fields.socialLinks : {},
    phone: String(fields.phone || ""),
    username: String(fields.username || ""),
  };
}

function calculateAge(dob) {
  if (!dob) return null;
  const date = new Date(dob);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const month = now.getMonth() - date.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < date.getDate())) age -= 1;
  return age >= 0 && age <= 120 ? age : null;
}

function profileCompletion(profile, user) {
  const values = [
    user.displayName,
    user.photoUrl,
    profile.gender,
    profile.dateOfBirth,
    profile.maritalStatus,
    profile.city,
    profile.country,
    profile.education,
    profile.currentStudy,
    profile.institution,
    profile.profession,
    profile.bio,
  ];
  return Math.round((values.filter(Boolean).length / values.length) * 100);
}

function timestampMs(value) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function safeUser(user, profile = {}, extras = {}) {
  const providers = Array.isArray(user.providerUserInfo)
    ? user.providerUserInfo.map((item) => String(item.providerId || "")).filter(Boolean)
    : [];
  const p = { ...profileFromFields(profile), ...(profile || {}) };
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
    ...p,
    age: calculateAge(p.dateOfBirth),
    profileCompletion: profileCompletion(p, user),
    ...extras,
  };
}

async function listUsers() {
  const [authUsers, orders, profileRows, progressRows, attemptRows] = await Promise.all([
    listAuthUsers(),
    firestoreQuery("orders", [{ field: "status", value: "paid" }]).catch(() => []),
    firestoreQuery("users").catch(() => []),
    firestoreQuery("lessonProgress").catch(() => []),
    firestoreQuery("assessmentAttempts").catch(() => []),
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

  const profileMap = new Map(
    profileRows
      .map((row) => [String(row.name || "").split("/").pop(), row.fields || {}])
      .filter(([id]) => id),
  );

  const progressMap = new Map();
  for (const row of progressRows) {
    const fields = row.fields || {};
    const uid = String(fields.userId || "");
    if (!uid) continue;
    if (!progressMap.has(uid)) {
      progressMap.set(uid, {
        courses: new Set(),
        completedLessons: 0,
        progressEntries: 0,
        lastActivityAt: 0,
      });
    }
    const item = progressMap.get(uid);
    const courseId = String(fields.courseId || "");
    if (courseId) item.courses.add(courseId);
    item.progressEntries += 1;
    if (fields.completed === true) item.completedLessons += 1;
    item.lastActivityAt = Math.max(
      item.lastActivityAt,
      timestampMs(fields.updatedAt),
      timestampMs(fields.lastWatchedAt),
      timestampMs(fields.completedAt),
    );
  }

  const attemptMap = new Map();
  let completedAssessments = 0;
  for (const row of attemptRows) {
    const fields = row.fields || {};
    const uid = String(fields.userId || "");
    if (!uid) continue;
    const item = attemptMap.get(uid) || { attempts: 0, completed: 0, lastActivityAt: 0 };
    item.attempts += 1;
    if (fields.completed === true || fields.status === "completed") item.completed += 1;
    item.lastActivityAt = Math.max(
      item.lastActivityAt,
      timestampMs(fields.updatedAt),
      timestampMs(fields.completedAt),
      timestampMs(fields.createdAt),
    );
    attemptMap.set(uid, item);
    completedAssessments += fields.completed === true || fields.status === "completed" ? 1 : 0;
  }

  const users = authUsers
    .filter((user) => String(user.localId || "") && !isPrimaryAdmin(user))
    .map((user) => {
      const id = String(user.localId);
      const progress = progressMap.get(id) || { courses: new Set(), completedLessons: 0, progressEntries: 0, lastActivityAt: 0 };
      const attempts = attemptMap.get(id) || { attempts: 0, completed: 0, lastActivityAt: 0 };
      const lastActivityAt = Math.max(Number(user.lastLoginAt || 0), progress.lastActivityAt, attempts.lastActivityAt);
      return safeUser(user, profileMap.get(id) || {}, {
        paidCourses: paidMap.get(id)?.size || 0,
        activeCourses: progress.courses.size,
        completedLessons: progress.completedLessons,
        progressEntries: progress.progressEntries,
        assessmentAttempts: attempts.attempts,
        completedAssessments: attempts.completed,
        lastActivityAt,
      });
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return { users, totals: { completedAssessments } };
}

function cleanProfilePatch(body) {
  const profile = {};
  const scalarFields = [
    "gender", "dateOfBirth", "maritalStatus", "city", "country", "address", "education",
    "currentStudy", "institution", "profession", "occupation", "bio", "website", "phone", "username",
  ];
  for (const field of scalarFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      profile[field] = String(body[field] || "").trim().slice(0, field === "bio" ? 1200 : 240);
    }
  }
  for (const field of ["skills", "languages", "interests"]) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      profile[field] = Array.isArray(body[field])
        ? body[field].map((item) => String(item).trim()).filter(Boolean).slice(0, 30)
        : [];
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, "socialLinks")) {
    profile.socialLinks = body.socialLinks && typeof body.socialLinks === "object" ? body.socialLinks : {};
  }
  return profile;
}

async function updateUser(body) {
  const id = String(body.userId || "").trim();
  if (!id) throw Object.assign(new Error("User ID is required"), { status: 400 });
  const all = await listAuthUsers();
  const target = all.find((user) => String(user.localId || "") === id);
  if (!target) throw Object.assign(new Error("User account not found"), { status: 404 });
  if (isPrimaryAdmin(target)) throw Object.assign(new Error("The primary administrator cannot be changed here"), { status: 400 });

  const updates = {};
  if (Object.prototype.hasOwnProperty.call(body, "displayName")) {
    const value = String(body.displayName || "").trim();
    if (value.length > 120) throw Object.assign(new Error("Name is too long"), { status: 400 });
    updates.displayName = value;
  }
  if (Object.prototype.hasOwnProperty.call(body, "email")) {
    const value = String(body.email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(value) || value.length > 254) throw Object.assign(new Error("Enter a valid email address"), { status: 400 });
    if (value === ADMIN_EMAIL) throw Object.assign(new Error("The primary administrator email cannot be assigned to a learner"), { status: 400 });
    updates.email = value;
  }
  if (Object.prototype.hasOwnProperty.call(body, "photoUrl")) {
    const value = String(body.photoUrl || "").trim();
    if (value.length > 2048) throw Object.assign(new Error("Photo URL is too long"), { status: 400 });
    updates.photoUrl = value;
  }
  if (Object.prototype.hasOwnProperty.call(body, "emailVerified")) updates.emailVerified = Boolean(body.emailVerified);
  if (Object.prototype.hasOwnProperty.call(body, "disabled")) updates.disabled = Boolean(body.disabled);

  const profilePatch = cleanProfilePatch(body);
  if (!Object.keys(updates).length && !Object.keys(profilePatch).length) {
    throw Object.assign(new Error("No changes supplied"), { status: 400 });
  }

  const updated = Object.keys(updates).length ? await updateAuthUser(id, updates) : target;
  const existing = await firestoreGet(`users/${id}`);
  const merged = {
    ...(existing?.fields || {}),
    ...profilePatch,
    ...(updates.displayName !== undefined ? { displayName: updates.displayName } : {}),
    ...(updates.email !== undefined ? { email: updates.email } : {}),
    ...(updates.photoUrl !== undefined ? { photoUrl: updates.photoUrl } : {}),
    ...(updates.emailVerified !== undefined ? { emailVerified: updates.emailVerified } : {}),
    ...(updates.disabled !== undefined ? { disabled: updates.disabled } : {}),
    updatedAt: new Date(),
  };
  await firestoreSet(`users/${id}`, merged);
  return { ok: true, user: safeUser(updated, merged) };
}

async function createUser(body) {
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const displayName = String(body.displayName || "").trim();
  const photoUrl = String(body.photoUrl || "").trim();
  const emailVerified = Boolean(body.emailVerified);
  const disabled = Boolean(body.disabled);
  if (!EMAIL_RE.test(email) || email.length > 254) throw Object.assign(new Error("Enter a valid email address"), { status: 400 });
  if (email === ADMIN_EMAIL) throw Object.assign(new Error("The primary administrator email cannot be created as a learner account"), { status: 400 });
  if (password.length < 6) throw Object.assign(new Error("Password must be at least 6 characters"), { status: 400 });
  if (displayName.length > 120) throw Object.assign(new Error("Name is too long"), { status: 400 });
  if (photoUrl.length > 2048) throw Object.assign(new Error("Photo URL is too long"), { status: 400 });
  const created = await createAuthUser({ email, password, displayName, photoUrl, emailVerified, disabled });
  const id = String(created.localId || "");
  if (!id) throw new Error("User was created but no user ID was returned");
  await firestoreSet(`users/${id}`, {
    displayName,
    email,
    photoUrl,
    emailVerified,
    disabled,
    ...profileFromFields(body),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { ok: true, user: safeUser(created, body) };
}

async function resetPassword(body) {
  const id = String(body.userId || "").trim();
  if (!id) throw Object.assign(new Error("A valid learner account is required"), { status: 400 });
  const user = (await listAuthUsers()).find((item) => String(item.localId) === id);
  if (!user || isPrimaryAdmin(user) || !user.email) throw Object.assign(new Error("A valid learner account is required"), { status: 400 });
  await sendPasswordReset(user.email);
  return { ok: true, email: user.email };
}

async function deleteUser(body) {
  const id = String(body.userId || "").trim();
  if (!id) throw Object.assign(new Error("User ID is required"), { status: 400 });
  const target = (await listAuthUsers()).find((item) => String(item.localId || "") === id);
  if (!target) throw Object.assign(new Error("User account not found"), { status: 404 });
  if (isPrimaryAdmin(target)) throw Object.assign(new Error("The primary administrator cannot be deleted"), { status: 400 });
  await deleteAuthUser(id);
  const existing = await firestoreGet(`users/${id}`);
  if (existing?.fields) await firestoreSet(`users/${id}`, { ...existing.fields, accountDeleted: true, deletedAt: new Date(), disabled: true });
  return { ok: true, deletedUserId: id };
}

export default async function handler(req, res) {
  try {
    await requireAdmin(req);
    const action = String(req.method === "GET" ? req.query?.action || "list" : req.body?.action || "").trim();
    if (req.method === "GET" && action === "list") {
      const data = await listUsers();
      return json(res, 200, { ok: true, users: data.users });
    }
    if (req.method !== "POST") return json(res, 405, { error: "Method Not Allowed" });
    if (action === "create") return json(res, 201, await createUser(req.body || {}));
    if (action === "update") return json(res, 200, await updateUser(req.body || {}));
    if (action === "resetPassword") return json(res, 200, await resetPassword(req.body || {}));
    if (action === "delete") return json(res, 200, await deleteUser(req.body || {}));
    return json(res, 400, { error: "Unknown user management action" });
  } catch (error) {
    console.error("Admin users error:", error?.message || error);
    return json(res, Number(error?.status) || 500, { error: error?.message || "Unable to manage users" });
  }
}
