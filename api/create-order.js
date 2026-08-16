import crypto from "node:crypto";
import {
  firestoreGet,
  firestoreQuery,
  firestoreSet,
  verifyFirebaseIdToken,
} from "./_firebase.js";

const MAX_COUPON_DISCOUNT = 1000000;
const PAYMENT_METHODS = new Set(["payfast", "jazzcash", "easypaisa", "bank_transfer"]);

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

function calculateDiscount(coupon, amount) {
  if (!coupon || coupon.active === false) return 0;
  const type = coupon.type === "fixed" ? "fixed" : "percent";
  const value = Number(coupon.value || 0);
  if (!Number.isFinite(value) || value <= 0) return 0;

  let discount = type === "percent" ? amount * Math.min(value, 100) / 100 : value;
  const maxDiscount = Number(coupon.maxDiscount || 0);
  if (maxDiscount > 0) discount = Math.min(discount, maxDiscount);
  discount = Math.min(discount, amount, MAX_COUPON_DISCOUNT);
  return Math.round(discount * 100) / 100;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method Not Allowed" });

  try {
    const authHeader = String(req.headers.authorization || "");
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!idToken) return json(res, 401, { error: "Authentication required" });

    const user = await verifyFirebaseIdToken(idToken);
    const courseId = String(req.body?.courseId || "").trim();
    const couponCode = normalizeCode(req.body?.couponCode);
    const paymentMethod = String(req.body?.paymentMethod || "payfast").trim().toLowerCase();
    if (!courseId) return json(res, 400, { error: "Course ID is required" });
    if (!PAYMENT_METHODS.has(paymentMethod)) return json(res, 400, { error: "Unsupported payment method" });

    const course = await firestoreGet(`courses/${courseId}`);
    if (!course) return json(res, 404, { error: "Course not found" });

    const courseData = course.fields;
    if (courseData.published !== true) return json(res, 400, { error: "This course is not available for purchase" });

    const originalAmount = Number(courseData.price || 0);
    const isPaid = courseData.isPaid === true || originalAmount > 0;
    if (!isPaid || originalAmount <= 0) return json(res, 400, { error: "This course is free" });

    let coupon = null;
    let discountAmount = 0;

    if (couponCode) {
      const couponDoc = await firestoreGet(`coupons/${couponCode}`);
      if (!couponDoc) return json(res, 400, { error: "Invalid discount code" });
      coupon = couponDoc.fields;

      const now = Date.now();
      const expiresAt = coupon.expiresAt instanceof Date ? coupon.expiresAt.getTime() : 0;
      const startsAt = coupon.startsAt instanceof Date ? coupon.startsAt.getTime() : 0;
      const minOrder = Number(coupon.minOrder || 0);
      const usageLimit = Number(coupon.usageLimit || 0);

      if (coupon.active === false) return json(res, 400, { error: "This discount code is inactive" });
      if (startsAt && now < startsAt) return json(res, 400, { error: "This discount code is not active yet" });
      if (expiresAt && now > expiresAt) return json(res, 400, { error: "This discount code has expired" });
      if (minOrder > 0 && originalAmount < minOrder) return json(res, 400, { error: `Minimum order amount is Rs. ${minOrder.toLocaleString()}` });

      const courseIds = Array.isArray(coupon.courseIds) ? coupon.courseIds : [];
      if (courseIds.length && !courseIds.includes(courseId)) return json(res, 400, { error: "This coupon is not valid for this course" });

      if (usageLimit > 0) {
        const used = await firestoreQuery("orders", [
          { field: "couponCode", value: couponCode },
          { field: "status", value: "paid" },
        ]);
        if (used.length >= usageLimit) return json(res, 400, { error: "This discount code has reached its usage limit" });
      }

      discountAmount = calculateDiscount(coupon, originalAmount);
    }

    const finalAmount = Math.max(0, Math.round((originalAmount - discountAmount) * 100) / 100);
    const orderId = `OA-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const now = new Date();
    const isZeroAmount = finalAmount <= 0;
    const actualMethod = isZeroAmount ? "coupon" : paymentMethod;

    await firestoreSet(`orders/${orderId}`, {
      orderId,
      userId: user.localId,
      customerEmail: user.email || "",
      courseId,
      courseTitle: String(courseData.title || "Untitled Course"),
      originalAmount,
      discountAmount,
      finalAmount,
      couponCode: couponCode || "",
      paymentProvider: actualMethod,
      paymentMethod: actualMethod,
      status: isZeroAmount ? "paid" : "pending",
      paidAt: isZeroAmount ? now : null,
      createdAt: now,
      updatedAt: now,
    });

    return json(res, 200, {
      orderId,
      courseId,
      courseTitle: courseData.title || "Untitled Course",
      originalAmount,
      discountAmount,
      finalAmount,
      currency: "PKR",
      paymentProvider: actualMethod,
      paymentMethod: actualMethod,
      status: isZeroAmount ? "paid" : "pending",
    });
  } catch (error) {
    console.error("Create order error:", error?.message || error);
    return json(res, 500, { error: "Unable to create order" });
  }
}
