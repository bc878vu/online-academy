import { firestoreGet, firestoreQuery, firestoreSet, verifyFirebaseIdToken } from "./_firebase.js";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

const METHODS = new Set(["jazzcash"]);
const value = (name, fallback = "") => String(process.env[name] || fallback).trim();

function paymentMethods() {
  const payfastConfigured = value("PAYFAST_MERCHANT_ID") !== "" && value("PAYFAST_SECURED_KEY") !== "";
  const jazzcashConfigured = value("JAZZCASH_ACCOUNT_NUMBER") !== "";

  return [
    { id: "payfast", name: "PayFast Checkout", type: "gateway", description: payfastConfigured ? "Secure hosted checkout for cards, bank accounts, mobile wallets and supported Raast options." : "PayFast automatic checkout — merchant configuration is required.", enabled: true, configured: payfastConfigured },
    { id: "jazzcash", name: "JazzCash", type: "manual", description: jazzcashConfigured ? "Pay directly to the configured JazzCash account and submit the transaction ID for admin verification." : "JazzCash payment option — account details are not configured yet.", enabled: true, configured: jazzcashConfigured, accountName: value("JAZZCASH_ACCOUNT_NAME"), accountNumber: value("JAZZCASH_ACCOUNT_NUMBER") },
  ];
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
    const paymentMethod = String(req.body?.paymentMethod || "").trim();
    const reference = String(req.body?.reference || "").trim().slice(0, 120);
    const senderName = String(req.body?.senderName || "").trim().slice(0, 120);

    if (!orderId || !METHODS.has(paymentMethod)) return json(res, 400, { error: "Invalid JazzCash payment details" });
    if (!reference || reference.length < 4) return json(res, 400, { error: "Enter the JazzCash transaction/reference number" });
    if (!senderName) return json(res, 400, { error: "Enter the sender name used for the JazzCash payment" });

    const method = paymentMethods().find((item) => item.id === paymentMethod);
    if (!method?.configured) return json(res, 503, { error: "JazzCash is not configured yet. Add JAZZCASH_ACCOUNT_NAME and JAZZCASH_ACCOUNT_NUMBER in Vercel Environment Variables." });

    const orderDoc = await firestoreGet(`orders/${orderId}`);
    if (!orderDoc) return json(res, 404, { error: "Order not found" });
    const order = orderDoc.fields;
    if (order.userId !== user.localId) return json(res, 403, { error: "Order does not belong to this account" });
    if (order.status !== "pending") return json(res, 400, { error: `Order is already ${order.status}` });

    const duplicateReferences = await firestoreQuery("orders", [{ field: "manualReference", value: reference }]);
    if (duplicateReferences.some((row) => String(row.fields?.orderId || row.id || "") !== orderId)) {
      return json(res, 409, { error: "This transaction/reference number has already been submitted for another order." });
    }

    const now = new Date();
    await firestoreSet(`orders/${orderId}`, {
      ...order,
      status: "manual_pending",
      paymentProvider: "jazzcash",
      paymentMethod: "jazzcash",
      manualReference: reference,
      manualSenderName: senderName,
      manualSubmittedAt: now,
      paymentVerificationStatus: "pending_admin_verification",
      updatedAt: now,
    });

    await firestoreSet(`adminNotifications/payment-${orderId}-submitted`, {
      type: "payment",
      event: "manual_payment_submitted",
      title: "Payment submitted for verification",
      message: `${senderName} submitted a JazzCash payment reference for ${order.courseTitle || "Course"}. Verify the actual transaction in Finance & Billing before approving.`,
      orderId,
      userId: user.localId,
      customerEmail: user.email || order.customerEmail || "",
      courseId: order.courseId || "",
      courseTitle: order.courseTitle || "Course",
      amount: Number(order.finalAmount || 0),
      paymentMethod: "jazzcash",
      reference,
      read: false,
      createdAt: now,
    });

    return json(res, 200, { orderId, status: "manual_pending", paymentMethod: "jazzcash" });
  } catch (error) {
    console.error("JazzCash payment submit error:", error?.message || error);
    return json(res, 500, { error: "Unable to submit JazzCash payment reference" });
  }
}
