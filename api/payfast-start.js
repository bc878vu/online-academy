import crypto from "node:crypto";
import {
  firestoreGet,
  firestoreSet,
  verifyFirebaseIdToken,
} from "./_firebase.js";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export default async function handler(req, res) {
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
    const order = orderDoc.fields;

    if (order.userId !== user.localId) return json(res, 403, { error: "Order does not belong to this account" });
    if (order.status !== "pending") return json(res, 400, { error: `Order is already ${order.status}` });

    const amount = Number(order.finalAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return json(res, 400, { error: "This order does not require payment" });
    }

    const merchantId = requiredEnv("PAYFAST_MERCHANT_ID");
    const securedKey = requiredEnv("PAYFAST_SECURED_KEY");
    const tokenUrl = String(
      process.env.PAYFAST_TOKEN_URL ||
        "https://ipguat.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken"
    ).trim();
    const checkoutUrl = String(
      process.env.PAYFAST_CHECKOUT_URL ||
        "https://ipguat.apps.net.pk/Ecommerce/api/Transaction/PostTransaction"
    ).trim();
    const merchantName = String(process.env.PAYFAST_MERCHANT_NAME || "Online Academy").trim();
    const siteUrl = String(process.env.SITE_URL || "https://online-academy-plum.vercel.app").replace(/\/$/, "");

    // PayFast's hosted-checkout token must be bound to the same basket/order,
    // amount and currency that are posted to the checkout form.
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Online-Academy-Payments/1.0",
      },
      body: new URLSearchParams({
        MERCHANT_ID: merchantId,
        SECURED_KEY: securedKey,
        BASKET_ID: orderId,
        TXNAMT: amount.toFixed(2),
        CURRENCY_CODE: "PKR",
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`PayFast token request failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const token = tokenData.ACCESS_TOKEN || tokenData.access_token || tokenData.token;
    if (!token) throw new Error("PayFast did not return an access token");

    const signature = crypto.randomBytes(18).toString("hex");
    const version = "1.0";
    const orderDate = new Date().toISOString().slice(0, 10);
    const successUrl = `${siteUrl}/payment/success?orderId=${encodeURIComponent(orderId)}`;
    const failureUrl = `${siteUrl}/payment/failed?orderId=${encodeURIComponent(orderId)}`;
    const callbackUrl = `${siteUrl}/api/payfast-callback`;

    await firestoreSet(`orders/${orderId}`, {
      ...order,
      status: "payment_started",
      provider: "payfast",
      providerBasketId: orderId,
      updatedAt: new Date(),
    });

    return json(res, 200, {
      action: checkoutUrl,
      method: "POST",
      fields: {
        MERCHANT_ID: merchantId,
        MERCHANT_NAME: merchantName,
        TOKEN: token,
        PROCCODE: "00",
        TXNAMT: amount.toFixed(2),
        CUSTOMER_MOBILE_NO: user.phoneNumber || "",
        CUSTOMER_EMAIL_ADDRESS: user.email || "",
        SIGNATURE: signature,
        VERSION: version,
        TXNDESC: `Online Academy - ${String(order.courseTitle || "Course").slice(0, 80)}`,
        SUCCESS_URL: successUrl,
        FAILURE_URL: failureUrl,
        BASKET_ID: orderId,
        ORDER_DATE: orderDate,
        CHECKOUT_URL: callbackUrl,
        CURRENCY_CODE: "PKR",
      },
    });
  } catch (error) {
    console.error("PayFast start error:", error?.message || error);
    const safe = /Missing PAYFAST_/.test(error?.message || "")
      ? "Payment gateway is not configured yet. Add the PayFast merchant environment variables in Vercel."
      : "Unable to start payment. Please try again.";
    return json(res, 500, { error: safe });
  }
}
