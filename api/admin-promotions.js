import { firestoreGet, firestoreQuery, firestoreSet, getConfig, getServiceAccessToken, verifyFirebaseIdToken } from "./_firebase.js";

const ADMIN_EMAIL = "admin@onlineacademy.com";
const FIRESTORE_BASE = "https://firestore.googleapis.com/v1";

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

function millis(value) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeOffer(id, fields = {}) {
  return {
    id,
    title: String(fields.title || ""),
    badge: String(fields.badge || "SPECIAL OFFER"),
    message: String(fields.message || ""),
    type: ["card", "banner", "modal"].includes(fields.type) ? fields.type : "card",
    ctaText: String(fields.ctaText || "Avail Offer"),
    ctaUrl: String(fields.ctaUrl || "/courses"),
    couponCode: String(fields.couponCode || ""),
    targetPages: Array.isArray(fields.targetPages) ? fields.targetPages.map(String) : [String(fields.targetPages || "/")],
    startsAt: fields.startsAt instanceof Date ? fields.startsAt.toISOString() : (fields.startsAt || null),
    expiresAt: fields.expiresAt instanceof Date ? fields.expiresAt.toISOString() : (fields.expiresAt || null),
    active: fields.active !== false,
    dismissible: fields.dismissible !== false,
    createdAt: fields.createdAt instanceof Date ? fields.createdAt.toISOString() : (fields.createdAt || null),
    updatedAt: fields.updatedAt instanceof Date ? fields.updatedAt.toISOString() : (fields.updatedAt || null),
  };
}

function validateOffer(body) {
  const title = String(body.title || "").trim();
  const message = String(body.message || "").trim();
  const type = String(body.type || "card");
  const ctaUrl = String(body.ctaUrl || "/courses").trim();
  const targets = Array.isArray(body.targetPages)
    ? body.targetPages.map((item) => String(item || "").trim()).filter(Boolean)
    : String(body.targetPages || "/").split(",").map((item) => item.trim()).filter(Boolean);

  if (!title || title.length > 120) throw Object.assign(new Error("Offer title is required and must be 120 characters or less"), { status: 400 });
  if (!message || message.length > 500) throw Object.assign(new Error("Offer message is required and must be 500 characters or less"), { status: 400 });
  if (!["card", "banner", "modal"].includes(type)) throw Object.assign(new Error("Invalid offer display type"), { status: 400 });
  if (!targets.length) throw Object.assign(new Error("At least one target page is required"), { status: 400 });
  if (ctaUrl && !/^https?:\/\//i.test(ctaUrl) && !ctaUrl.startsWith("/")) throw Object.assign(new Error("CTA URL must start with / or https://"), { status: 400 });

  const startsAt = body.startsAt ? new Date(body.startsAt) : null;
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (startsAt && Number.isNaN(startsAt.getTime())) throw Object.assign(new Error("Invalid start date"), { status: 400 });
  if (expiresAt && Number.isNaN(expiresAt.getTime())) throw Object.assign(new Error("Invalid expiry date"), { status: 400 });
  if (startsAt && expiresAt && expiresAt < startsAt) throw Object.assign(new Error("Expiry must be after the start time"), { status: 400 });

  return {
    title,
    badge: String(body.badge || "SPECIAL OFFER").trim().slice(0, 60) || "SPECIAL OFFER",
    message,
    type,
    ctaText: String(body.ctaText || "Avail Offer").trim().slice(0, 40) || "Avail Offer",
    ctaUrl: ctaUrl || "/courses",
    couponCode: String(body.couponCode || "").trim().toUpperCase().slice(0, 40),
    targetPages: targets.slice(0, 20),
    startsAt,
    expiresAt,
    active: body.active !== false,
    dismissible: body.dismissible !== false,
  };
}

function isLive(offer) {
  const now = Date.now();
  const start = millis(offer.startsAt);
  const end = millis(offer.expiresAt);
  return offer.active !== false && (!start || start <= now) && (!end || end >= now);
}

async function listOffers({ liveOnly = false } = {}) {
  const rows = await firestoreQuery("siteOffers");
  const offers = rows.map((row) => normalizeOffer(row.name.split("/").pop(), row.fields));
  const filtered = liveOnly ? offers.filter(isLive) : offers;
  return filtered.sort((a, b) => millis(b.updatedAt) - millis(a.updatedAt));
}

async function deleteOffer(id) {
  const { projectId } = getConfig();
  const token = await getServiceAccessToken();
  const response = await fetch(`${FIRESTORE_BASE}/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/siteOffers/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok && response.status !== 404) throw new Error(`Firestore DELETE failed: ${response.status}`);
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET" && String(req.query?.scope || "") === "public") {
      return json(res, 200, { ok: true, offers: await listOffers({ liveOnly: true }) });
    }

    await requireAdmin(req);
    const action = String(req.method === "GET" ? req.query?.action || "list" : req.body?.action || "").trim();

    if (req.method === "GET" && action === "list") return json(res, 200, { ok: true, offers: await listOffers() });
    if (req.method !== "POST") return json(res, 405, { error: "Method Not Allowed" });

    if (action === "create") {
      const offer = validateOffer(req.body || {});
      const { randomUUID } = await import("node:crypto");
      const id = randomUUID();
      const now = new Date();
      await firestoreSet(`siteOffers/${id}`, { ...offer, createdAt: now, updatedAt: now });
      return json(res, 201, { ok: true, offer: normalizeOffer(id, { ...offer, createdAt: now, updatedAt: now }) });
    }

    if (action === "update") {
      const id = String(req.body?.offerId || "").trim();
      if (!id) throw Object.assign(new Error("Offer ID is required"), { status: 400 });
      const existing = await firestoreGet(`siteOffers/${id}`);
      if (!existing) throw Object.assign(new Error("Offer not found"), { status: 404 });
      const offer = validateOffer(req.body || {});
      const updatedAt = new Date();
      await firestoreSet(`siteOffers/${id}`, { ...existing.fields, ...offer, updatedAt });
      return json(res, 200, { ok: true, offer: normalizeOffer(id, { ...existing.fields, ...offer, updatedAt }) });
    }

    if (action === "toggle") {
      const id = String(req.body?.offerId || "").trim();
      if (!id) throw Object.assign(new Error("Offer ID is required"), { status: 400 });
      const existing = await firestoreGet(`siteOffers/${id}`);
      if (!existing) throw Object.assign(new Error("Offer not found"), { status: 404 });
      const updatedAt = new Date();
      const active = existing.fields.active === false;
      await firestoreSet(`siteOffers/${id}`, { ...existing.fields, active, updatedAt });
      return json(res, 200, { ok: true, offer: normalizeOffer(id, { ...existing.fields, active, updatedAt }) });
    }

    if (action === "delete") {
      const id = String(req.body?.offerId || "").trim();
      if (!id) throw Object.assign(new Error("Offer ID is required"), { status: 400 });
      await deleteOffer(id);
      return json(res, 200, { ok: true, deletedOfferId: id });
    }

    return json(res, 400, { error: "Unknown promotion action" });
  } catch (error) {
    console.error("Admin promotions error:", error?.message || error);
    return json(res, Number(error?.status) || 500, { error: error?.message || "Unable to manage promotions" });
  }
}
