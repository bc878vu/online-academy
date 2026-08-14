import { firestoreGet, firestoreSet } from "./_firebase.js";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function flatten(input) {
  const output = {};
  for (const [key, value] of Object.entries(input || {})) {
    output[key] = typeof value === "string" ? value.slice(0, 500) : value;
  }
  return output;
}

export default async function handler(req, res) {
  if (!["POST", "GET"].includes(req.method)) return json(res, 405, { error: "Method Not Allowed" });

  try {
    const payload = req.method === "POST" ? (req.body || {}) : (req.query || {});
    const orderId = String(
      payload.BASKET_ID || payload.basket_id || payload.orderId || ""
    ).trim();

    if (!orderId) return json(res, 400, { error: "Missing basket/order ID" });

    const orderDoc = await firestoreGet(`orders/${orderId}`);
    if (!orderDoc) return json(res, 404, { error: "Order not found" });

    const order = orderDoc.fields;
    const providerStatus = String(
      payload.STATUS || payload.status || payload.status_code || payload.err_code || "unknown"
    );

    // Never grant course access from a browser redirect alone. The callback is
    // stored for reconciliation; an authenticated gateway verification or an
    // admin confirmation is required before an order becomes paid.
    await firestoreSet(`orders/${orderId}`, {
      ...order,
      paymentCallbackStatus: providerStatus.slice(0, 100),
      paymentCallback: flatten(payload),
      status: order.status === "paid" ? "paid" : "callback_received",
      updatedAt: new Date(),
    });

    return json(res, 200, { received: true, orderId });
  } catch (error) {
    console.error("PayFast callback error:", error?.message || error);
    return json(res, 500, { error: "Unable to process callback" });
  }
}
