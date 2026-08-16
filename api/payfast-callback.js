import { firestoreGet, firestoreSet } from "./_firebase.js";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function env(name, fallback = "") { return String(process.env[name] || fallback).trim(); }
function flatten(input) { const output = {}; for (const [key, value] of Object.entries(input || {})) output[key] = typeof value === "string" ? value.slice(0, 500) : value; return output; }
function success(code) { return new Set(["00", "000", "0"]).has(String(code || "").trim()); }
function message(code, fallback = "") {
  const messages = {
    "00": "Payment processed successfully.", "000": "Payment processed successfully.", "001": "Payment is still pending.", "002": "Payment timed out.",
    "97": "Insufficient balance in the customer's account/wallet.", "106": "Transaction limit has been exceeded.", "3": "Customer account is inactive.",
    "13": "Invalid payment amount.", "14": "Payment details are incorrect or inactive.", "41": "Customer account details do not match.", "42": "Invalid CNIC.",
    "55": "Invalid OTP/PIN.", "75": "Maximum PIN retries exceeded.", "9000": "Payment was rejected by the risk system.",
  };
  return messages[String(code || "").trim()] || String(fallback || "Payment was not approved.");
}

async function gatewayToken() {
  const tokenUrl = env("PAYFAST_TOKEN_URL", "https://ipguat.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken");
  const merchantId = env("PAYFAST_MERCHANT_ID");
  const securedKey = env("PAYFAST_SECURED_KEY");
  if (!merchantId || !securedKey) throw new Error("Payment verification is not configured");
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

async function queryGateway(order, payload) {
  const token = await gatewayToken();
  const transactionId = String(payload.transaction_id || payload.TRANSACTION_ID || payload.transactionId || "").trim();
  const orderId = String(order.orderId || "").trim();
  const orderDate = new Date(order.createdAt || Date.now()).toISOString().slice(0, 10);
  const tokenUrl = env("PAYFAST_TOKEN_URL", "https://ipguat.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken");
  const baseUrl = env("PAYFAST_STATUS_BASE_URL", tokenUrl.replace(/\/GetAccessToken\/?$/i, ""));
  const url = transactionId ? `${baseUrl}/transaction/${encodeURIComponent(transactionId)}` : `${baseUrl}/transaction/basket_id/${encodeURIComponent(orderId)}?order_date=${encodeURIComponent(orderDate)}`;
  const response = await fetch(url, { method: "GET", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${token}`, "User-Agent": "Online-Academy-Payments/1.0" } });
  const raw = await response.text();
  let data = {};
  try { data = JSON.parse(raw); } catch { data = { raw: raw.slice(0, 1000) }; }
  if (!response.ok) throw new Error(`PayFast status request failed: ${response.status}`);
  return data;
}

function extract(data, payload) {
  const code = String(data?.status_code ?? data?.STATUS_CODE ?? data?.code ?? data?.CODE ?? data?.err_code ?? data?.ERR_CODE ?? payload.err_code ?? payload.ERR_CODE ?? "").trim();
  const transactionId = String(data?.transaction_id ?? data?.TRANSACTION_ID ?? payload.transaction_id ?? payload.TRANSACTION_ID ?? "").trim();
  const amount = Number(data?.transaction_amount ?? data?.TRANSACTION_AMOUNT ?? data?.merchant_amount ?? data?.MERCHANT_AMOUNT ?? data?.TXNAMT ?? payload.transaction_amount ?? payload.TRANSACTION_AMOUNT ?? payload.TXNAMT ?? 0);
  const providerMessage = String(data?.status_msg ?? data?.STATUS_MSG ?? data?.message ?? data?.MESSAGE ?? payload.status_msg ?? payload.message ?? "").trim();
  return { code, transactionId, amount, providerMessage };
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
    if (String(order.paymentProvider || order.paymentMethod || "") !== "payfast") return json(res, 400, { error: "Order is not a PayFast payment" });

    const gatewayData = await queryGateway(order, payload);
    const gateway = extract(gatewayData, payload);
    const expectedAmount = Number(order.finalAmount || 0);
    const amountMatches = gateway.amount <= 0 || Math.abs(gateway.amount - expectedAmount) < 0.01;
    const verifiedPayment = success(gateway.code) && amountMatches;
    const providerMessage = message(gateway.code, gateway.providerMessage);
    const now = new Date();
    const nextStatus = verifiedPayment ? "paid" : gateway.code === "001" ? "payment_started" : "payment_failed";

    await firestoreSet(`orders/${orderId}`, {
      ...order,
      paymentCallback: flatten(payload),
      paymentCallbackStatus: gateway.code,
      provider: "payfast",
      providerTransactionId: gateway.transactionId || order.providerTransactionId || "",
      providerStatusCode: gateway.code,
      providerStatusMessage: providerMessage,
      providerStatus: verifiedPayment ? "verified" : gateway.code === "001" ? "pending" : "failed",
      paymentVerified: verifiedPayment,
      paymentVerification: { gatewayChecked: true, statusCode: gateway.code, amountMatches, checkedAt: now },
      transactionAmount: gateway.amount > 0 ? gateway.amount : null,
      status: order.status === "paid" ? "paid" : nextStatus,
      paidAt: verifiedPayment ? (order.paidAt || now) : (order.paidAt || null),
      updatedAt: now,
    });

    const event = verifiedPayment ? "gateway_payment_verified" : gateway.code === "001" ? "gateway_payment_pending" : "gateway_payment_failed";
    await firestoreSet(`adminNotifications/payment-${orderId}-${event}`, {
      type: "payment",
      event,
      title: verifiedPayment ? "Payment received & verified" : gateway.code === "97" ? "Payment failed — insufficient balance" : gateway.code === "001" ? "Payment pending" : "Payment verification failed",
      message: `${providerMessage} ${order.courseTitle || "Course"} — ${moneyLabel(expectedAmount)}.`,
      orderId,
      userId: order.userId || "",
      customerEmail: order.customerEmail || "",
      courseId: order.courseId || "",
      courseTitle: order.courseTitle || "Course",
      amount: expectedAmount,
      transactionAmount: gateway.amount || null,
      paymentMethod: "payfast",
      providerStatusCode: gateway.code,
      providerStatusMessage: providerMessage,
      read: false,
      createdAt: now,
    });

    return json(res, 200, { received: true, verified: verifiedPayment, orderId, providerStatusCode: gateway.code, providerStatusMessage: providerMessage });
  } catch (error) {
    console.error("PayFast callback error:", error?.message || error);
    return json(res, 500, { error: "Unable to process payment callback" });
  }
}

function moneyLabel(value) { return `Rs. ${Math.round(Number(value || 0)).toLocaleString("en-PK")}`; }
