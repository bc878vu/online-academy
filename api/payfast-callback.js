import crypto from "node:crypto";
import { firestoreGet, firestoreSet } from "./_firebase.js";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function flatten(input) {
  const output = {};
  for (const [key, value] of Object.entries(input || {})) output[key] = typeof value === "string" ? value.slice(0, 500) : value;
  return output;
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function validationHash({ basketId, securedKey, merchantId, errCode }) {
  return crypto.createHash("sha256").update(`${basketId}|${securedKey}|${merchantId}|${errCode}`).digest("hex");
}

export default async function handler(req, res) {
  if (!["POST", "GET"].includes(req.method)) return json(res, 405, { error: "Method Not Allowed" });

  try {
    const payload = req.method === "POST" ? (req.body || {}) : (req.query || {});
    const orderId = String(payload.BASKET_ID || payload.basket_id || payload.orderId || payload.basketId || "").trim();
    if (!orderId) return json(res, 400, { error: "Missing basket/order ID" });

    const orderDoc = await firestoreGet(`orders/${orderId}`);
    if (!orderDoc) return json(res, 404, { error: "Order not found" });
    const order = orderDoc.fields;

    const errCode = String(payload.err_code || payload.ERR_CODE || payload.status_code || payload.STATUS || "").trim();
    const transactionAmount = Number(payload.transaction_amount ?? payload.TRANSACTION_AMOUNT ?? payload.merchant_amount ?? payload.MERCHANT_AMOUNT ?? payload.TXNAMT ?? 0);
    const validation = String(payload.validation_hash || payload.VALIDATION_HASH || "").trim().toLowerCase();
    const merchantId = String(process.env.PAYFAST_MERCHANT_ID || "").trim();
    const securedKey = String(process.env.PAYFAST_SECURED_KEY || "").trim();

    if (!merchantId || !securedKey) return json(res, 500, { error: "Payment verification is not configured" });

    const expectedHash = validationHash({ basketId: orderId, securedKey, merchantId, errCode });
    const validHash = validation && safeEqual(validation, expectedHash);
    const expectedAmount = Number(order.finalAmount || 0);
    const amountMatches = Number.isFinite(transactionAmount) && Math.abs(transactionAmount - expectedAmount) < 0.01;
    const successful = errCode === "000" || errCode === "00";

    const verifiedPayment = validHash && successful && amountMatches && String(order.paymentProvider || "payfast") === "payfast";
    const verificationState = verifiedPayment ? "verified" : "failed";
    const now = new Date();

    await firestoreSet(`orders/${orderId}`, {
      ...order,
      paymentCallbackStatus: errCode.slice(0, 100),
      paymentCallback: flatten(payload),
      paymentVerified: verifiedPayment,
      paymentVerification: {
        hashValid: validHash,
        amountMatches,
        successfulCode: successful,
      },
      transactionAmount: Number.isFinite(transactionAmount) ? transactionAmount : null,
      status: verifiedPayment ? "paid" : (order.status === "paid" ? "paid" : "payment_failed"),
      paidAt: verifiedPayment ? (order.paidAt || now) : (order.paidAt || null),
      updatedAt: now,
    });

    await firestoreSet(`adminNotifications/payment-${orderId}-${verificationState}`, {
      type: "payment",
      event: verifiedPayment ? "gateway_payment_verified" : "gateway_payment_failed",
      title: verifiedPayment ? "Payment received & verified" : "Payment verification failed",
      message: verifiedPayment
        ? `PayFast verified ${moneyLabel(expectedAmount)} for ${order.courseTitle || "Course"}. Course access can be unlocked automatically.`
        : `PayFast callback for ${order.courseTitle || "Course"} did not pass payment verification. Review the order before taking action.`,
      orderId,
      userId: order.userId || "",
      customerEmail: order.customerEmail || "",
      courseId: order.courseId || "",
      courseTitle: order.courseTitle || "Course",
      amount: expectedAmount,
      transactionAmount: Number.isFinite(transactionAmount) ? transactionAmount : null,
      paymentMethod: "payfast",
      read: false,
      createdAt: now,
    });

    return json(res, 200, { received: true, verified: verifiedPayment, orderId });
  } catch (error) {
    console.error("PayFast callback error:", error?.message || error);
    return json(res, 500, { error: "Unable to process callback" });
  }
}

function moneyLabel(value) {
  return `Rs. ${Math.round(Number(value || 0)).toLocaleString("en-PK")}`;
}
