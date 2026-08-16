import { firestoreGet, firestoreSet, verifyFirebaseIdToken } from "./_firebase.js";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

const METHODS = new Set(["jazzcash", "easypaisa", "bank_transfer"]);

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method Not Allowed" });

  try {
    const authHeader = String(req.headers.authorization || "");
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!idToken) return json(res, 401, { error: "Authentication required" });

    const user = await verifyFirebaseIdToken(idToken);
    const orderId = String(req.body?.orderId || "").trim();
    const paymentMethod = String(req.body?.paymentMethod || "").trim();
    const reference = String(req.body?.reference || "").trim().slice(0, 120);
    const senderName = String(req.body?.senderName || "").trim().slice(0, 120);

    if (!orderId || !METHODS.has(paymentMethod)) return json(res, 400, { error: "Invalid manual payment details" });
    if (reference.length < 4) return json(res, 400, { error: "Enter the transaction/reference number" });

    const orderDoc = await firestoreGet(`orders/${orderId}`);
    if (!orderDoc) return json(res, 404, { error: "Order not found" });
    const order = orderDoc.fields;
    if (order.userId !== user.localId) return json(res, 403, { error: "Order does not belong to this account" });
    if (order.status !== "pending") return json(res, 400, { error: `Order is already ${order.status}` });

    const now = new Date();
    await firestoreSet(`orders/${orderId}`, {
      ...order,
      status: "manual_pending",
      paymentProvider: paymentMethod,
      paymentMethod,
      manualReference: reference,
      manualSenderName: senderName,
      manualSubmittedAt: now,
      updatedAt: now,
    });

    return json(res, 200, { orderId, status: "manual_pending", paymentMethod });
  } catch (error) {
    console.error("Manual payment submit error:", error?.message || error);
    return json(res, 500, { error: "Unable to submit payment reference" });
  }
}
