import { firestoreGet, firestoreSet, verifyFirebaseIdToken } from "./_firebase.js";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function value(name, fallback = "") { return String(process.env[name] || fallback).trim(); }

function paymentMethods() {
  const configured = value("PAYFAST_MERCHANT_ID") !== "" && value("PAYFAST_SECURED_KEY") !== "";
  return [{
    id: "payfast",
    name: "PayFast Secure Checkout",
    type: "gateway",
    description: configured
      ? "Real-time gateway payment. The bank/wallet/card balance is checked by PayFast and only a verified successful transaction unlocks the course."
      : "Secure gateway payment — merchant configuration is required.",
    enabled: true,
    configured,
  }];
}

export default async function handler(req, res) {
  if (req.method === "GET") return json(res, 200, { methods: paymentMethods() });
  if (req.method !== "POST") return json(res, 405, { error: "Method Not Allowed" });

  try {
    const authHeader = String(req.headers.authorization || "");
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!idToken) return json(res, 401, { error: "Authentication required" });
    const user = await verifyFirebaseIdToken(idToken);
    const orderId = String(req.body?.orderId || "").trim();
    if (!orderId) return json(res, 400, { error: "Order ID is required" });

    const orderDoc = await firestoreGet(`orders/${orderId}`);
    if (!orderDoc) return json(res, 404, { error: "Order not found" });
    if (orderDoc.fields?.userId !== user.localId) return json(res, 403, { error: "Order does not belong to this account" });

    await firestoreSet(`adminNotifications/payment-${orderId}-manual-disabled`, {
      type: "payment",
      event: "manual_payment_disabled",
      title: "Manual payment attempt blocked",
      message: "A manual payment reference was attempted. Manual references are disabled; use the real PayFast gateway so the customer's actual balance and transaction status are verified.",
      orderId,
      userId: user.localId,
      customerEmail: user.email || orderDoc.fields?.customerEmail || "",
      courseId: orderDoc.fields?.courseId || "",
      courseTitle: orderDoc.fields?.courseTitle || "Course",
      amount: Number(orderDoc.fields?.finalAmount || 0),
      paymentMethod: "manual_disabled",
      read: false,
      createdAt: new Date(),
    });

    return json(res, 410, { error: "Manual payment references are disabled. Use the real PayFast checkout so the customer's actual account/wallet balance and transaction status are verified by the payment gateway." });
  } catch (error) {
    console.error("Manual payment submit error:", error?.message || error);
    return json(res, 500, { error: "Unable to process manual payment request" });
  }
}
