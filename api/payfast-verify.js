import { firestoreGet, firestoreSet, verifyFirebaseIdToken } from "./_firebase.js";

const ADMIN_UID = "CDwCqUitlaSHEVeWQufCb0lXzMx1";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function env(name, fallback = "") {
  return String(process.env[name] || fallback).trim();
}

function isSuccess(code) {
  return new Set(["00", "000", "0"]).has(String(code || "").trim());
}

function providerMessage(code, fallback = "") {
  const messages = {
    "00": "Payment processed successfully.",
    "000": "Payment processed successfully.",
    "001": "Payment is still pending.",
    "002": "Payment timed out.",
    "97": "Insufficient balance in the customer's account/wallet.",
    "106": "Transaction limit has been exceeded.",
    "3": "Customer account is inactive.",
    "13": "Invalid payment amount.",
    "14": "Payment details are incorrect or inactive.",
    "41": "Customer account details do not match.",
    "42": "Invalid CNIC.",
    "55": "Invalid OTP/PIN.",
    "75": "Maximum PIN retries exceeded.",
    "9000": "Payment was rejected by the risk system.",
  };
  return messages[String(code || "").trim()] || String(fallback || "Payment was not approved.");
}

async function getGatewayToken() {
  const tokenUrl = env("PAYFAST_TOKEN_URL", "https://ipguat.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken");
  const merchantId = env("PAYFAST_MERCHANT_ID");
  const securedKey = env("PAYFAST_SECURED_KEY");
  if (!merchantId || !securedKey) throw new Error("Payment gateway is not configured");

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Online-Academy-Payments/1.0" },
    body: new URLSearchParams({ MERCHANT_ID: merchantId, SECURED_KEY: securedKey, BASKET_ID: "STATUS-CHECK", TXNAMT: "0.00", CURRENCY_CODE: "PKR" }),
  });
  if (!response.ok) throw new Error(`PayFast token request failed: ${response.status}`);
  const data = await response.json();
  const token = data.ACCESS_TOKEN || data.access_token || data.token;
  if (!token) throw new Error("PayFast did not return an access token");
  return token;
}

async function queryGateway(order) {
  const token = await getGatewayToken();
  const transactionId = String(order.providerTransactionId || order.transactionId || "").trim();
  const orderId = String(order.orderId || "").trim();
  const orderDate = new Date(order.createdAt || Date.now()).toISOString().slice(0, 10);
  const tokenUrl = env("PAYFAST_TOKEN_URL", "https://ipguat.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken");
  const baseUrl = env("PAYFAST_STATUS_BASE_URL", tokenUrl.replace(/\/GetAccessToken\/?$/i, ""));
  const url = transactionId
    ? `${baseUrl}/transaction/${encodeURIComponent(transactionId)}`
    : `${baseUrl}/transaction/basket_id/${encodeURIComponent(orderId)}?order_date=${encodeURIComponent(orderDate)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${token}`, "User-Agent": "Online-Academy-Payments/1.0" },
  });
  const raw = await response.text();
  let data = {};
  try { data = JSON.parse(raw); } catch { data = { raw: raw.slice(0, 1000) }; }
  if (!response.ok) throw new Error(`PayFast status request failed: ${response.status}`);
  return data;
}

function extractStatus(data) {
  const code = String(data?.status_code ?? data?.STATUS_CODE ?? data?.code ?? data?.CODE ?? data?.err_code ?? data?.ERR_CODE ?? "").trim();
  const transactionId = String(data?.transaction_id ?? data?.TRANSACTION_ID ?? data?.transactionId ?? "").trim();
  const amount = Number(data?.transaction_amount ?? data?.TRANSACTION_AMOUNT ?? data?.merchant_amount ?? data?.MERCHANT_AMOUNT ?? data?.TXNAMT ?? data?.txnamt ?? 0);
  const message = String(data?.status_msg ?? data?.STATUS_MSG ?? data?.message ?? data?.MESSAGE ?? "").trim();
  return { code, transactionId, amount, message };
}

async function authorize(req, order) {
  const authHeader = String(req.headers.authorization || "");
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!idToken) throw Object.assign(new Error("Authentication required"), { status: 401 });
  const user = await verifyFirebaseIdToken(idToken);
  if (user.localId !== ADMIN_UID && user.localId !== order.userId) throw Object.assign(new Error("Order does not belong to this account"), { status: 403 });
  return user;
}

async function applyGatewayResult(order, gateway) {
  const expectedAmount = Number(order.finalAmount || 0);
  const amountMatches = gateway.amount <= 0 || Math.abs(gateway.amount - expectedAmount) < 0.01;
  const successful = isSuccess(gateway.code) && amountMatches;
  const message = providerMessage(gateway.code, gateway.message);
  const now = new Date();
  const next = {
    ...order,
    provider: "payfast",
    providerTransactionId: gateway.transactionId || order.providerTransactionId || "",
    providerStatusCode: gateway.code,
    providerStatusMessage: message,
    providerStatus: successful ? "verified" : gateway.code === "001" ? "pending" : "failed",
    transactionAmount: Number.isFinite(gateway.amount) && gateway.amount > 0 ? gateway.amount : (order.transactionAmount || null),
    paymentVerified: successful,
    paymentVerification: { gatewayChecked: true, statusCode: gateway.code, amountMatches, checkedAt: now },
    status: successful ? "paid" : gateway.code === "001" ? "payment_started" : "payment_failed",
    paidAt: successful ? (order.paidAt || now) : (order.paidAt || null),
    updatedAt: now,
  };
  await firestoreSet(`orders/${order.orderId}`, next);

  const event = successful ? "gateway_payment_verified" : gateway.code === "001" ? "gateway_payment_pending" : "gateway_payment_failed";
  await firestoreSet(`adminNotifications/payment-${order.orderId}-${event}`, {
    type: "payment",
    event,
    title: successful ? "Payment received & verified" : gateway.code === "97" ? "Payment failed — insufficient balance" : gateway.code === "001" ? "Payment pending" : "Payment verification failed",
    message: `${message} ${order.courseTitle || "Course"} — ${moneyLabel(expectedAmount)}.`,
    orderId: order.orderId,
    userId: order.userId || "",
    customerEmail: order.customerEmail || "",
    courseId: order.courseId || "",
    courseTitle: order.courseTitle || "Course",
    amount: expectedAmount,
    transactionAmount: gateway.amount || null,
    paymentMethod: "payfast",
    providerStatusCode: gateway.code,
    providerStatusMessage: message,
    read: false,
    createdAt: now,
  });
  return { successful, status: next.status, providerStatusCode: gateway.code, providerStatusMessage: message, transactionId: next.providerTransactionId };
}

function moneyLabel(value) { return `Rs. ${Math.round(Number(value || 0)).toLocaleString("en-PK")}`; }

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method Not Allowed" });
  try {
    const orderId = String(req.body?.orderId || "").trim();
    if (!orderId) return json(res, 400, { error: "Order ID is required" });
    const orderDoc = await firestoreGet(`orders/${orderId}`);
    if (!orderDoc) return json(res, 404, { error: "Order not found" });
    const order = orderDoc.fields;
    await authorize(req, order);

    if (order.status === "paid") return json(res, 200, { ok: true, status: "paid", verified: true, orderId, providerStatusCode: order.providerStatusCode || "00", providerStatusMessage: order.providerStatusMessage || "Payment processed successfully." });
    if (String(order.paymentProvider || order.provider || "") !== "payfast") return json(res, 400, { error: "This order is not a PayFast order" });

    const gateway = extractStatus(await queryGateway(order));
    const result = await applyGatewayResult(order, gateway);
    return json(res, 200, { ok: true, orderId, ...result });
  } catch (error) {
    console.error("PayFast verification error:", error?.message || error);
    return json(res, Number(error?.status) || 500, { error: error?.message || "Unable to verify payment" });
  }
}
