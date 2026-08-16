import { firestoreGet, firestoreQuery, firestoreSet, verifyFirebaseIdToken } from "./_firebase.js";

const ADMIN_UID = "CDwCqUitlaSHEVeWQufCb0lXzMx1";

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

function timeValue(value) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function documentId(name = "") {
  const parts = String(name).split("/");
  return parts[parts.length - 1] || "";
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) return json(res, 405, { error: "Method Not Allowed" });

  try {
    await requireAdmin(req);

    if (req.method === "GET") {
      const rows = await firestoreQuery("adminNotifications", [{ field: "type", value: "payment" }]);
      const notifications = rows
        .map((row) => ({ id: documentId(row.name), ...(row.fields || {}) }))
        .filter((item) => item.id)
        .sort((a, b) => timeValue(b.createdAt) - timeValue(a.createdAt))
        .slice(0, 50);
      return json(res, 200, { notifications });
    }

    const notificationId = String(req.body?.notificationId || "").trim();
    const read = req.body?.read === true;
    if (!notificationId) return json(res, 400, { error: "Notification ID is required" });

    const notificationDoc = await firestoreGet(`adminNotifications/${notificationId}`);
    if (!notificationDoc) return json(res, 404, { error: "Notification not found" });

    const now = new Date();
    await firestoreSet(`adminNotifications/${notificationId}`, {
      ...(notificationDoc.fields || {}),
      read,
      ...(read ? { readAt: now } : { readAt: null }),
      updatedAt: now,
    });

    return json(res, 200, { ok: true, notificationId, read });
  } catch (error) {
    console.error("Admin payment notification error:", error?.message || error);
    return json(res, Number(error?.status) || 500, { error: error?.message || "Unable to load payment notifications" });
  }
}
