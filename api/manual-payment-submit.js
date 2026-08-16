import { firestoreGet, firestoreSet, verifyFirebaseIdToken } from "./_firebase.js";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

const METHODS = new Set(["jazzcash", "easypaisa", "bank_transfer"]);
const value = (name, fallback = "") => String(process.env[name] || fallback).trim();

export default async function handler(req, res) {
  if (req.method === "GET") {
    return json(res, 200, {
      methods: [
        { id: "payfast", name: "PayFast Checkout", type: "gateway", description: "Cards, bank accounts, mobile wallets and supported Raast options through PayFast.", enabled: value("PAYFAST_MERCHANT_ID") !== "" },
        { id: "jazzcash", name: "JazzCash", type: "manual", description: "Pay directly to the configured JazzCash account and submit the transaction ID.", enabled: value("JAZZCASH_ACCOUNT_NUMBER") !== "", accountName: value("JAZZCASH_ACCOUNT_NAME"), accountNumber: value("JAZZCASH_ACCOUNT_NUMBER") },
        { id: "easypaisa", name: "Easypaisa", type: "manual", description: "Pay directly to the configured Easypaisa account and submit the transaction ID.", enabled: value("EASYPAISA_ACCOUNT_NUMBER") !== "", accountName: value("EASYPAISA_ACCOUNT_NAME"), accountNumber: value("EASYPAISA_ACCOUNT_NUMBER") },
        { id: "bank_transfer", name: "Bank Transfer", type: "manual", description: "Transfer the payable amount to the configured bank account and submit the transaction reference.", enabled: value("BANK_ACCOUNT_NUMBER") !== "", accountName: value("BANK_ACCOUNT_NAME"), accountNumber: value("BANK_ACCOUNT_NUMBER"), bankName: value("BANK_NAME"), iban: value("BANK_IBAN") },
      ],
    });
  }
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
    await firestoreSet(`orders/${orderId}`, { ...order, status: "manual_pending", paymentProvider: paymentMethod, paymentMethod, manualReference: reference, manualSenderName: senderName, manualSubmittedAt: now, updatedAt: now });
    return json(res, 200, { orderId, status: "manual_pending", paymentMethod });
  } catch (error) {
    console.error("Manual payment submit error:", error?.message || error);
    return json(res, 500, { error: "Unable to submit payment reference" });
  }
}
