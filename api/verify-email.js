import { getConfig, getIdentityAccessToken, verifyFirebaseIdToken } from "./_firebase.js";

const IDENTITY_URL = "https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode";
const IDENTITY_PROJECT_URL = "https://identitytoolkit.googleapis.com/v1/projects";
const UPDATE_URL = "https://identitytoolkit.googleapis.com/v1/accounts:update";
const RESEND_URL = "https://api.resend.com/emails";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getAppUrl() {
  return String(process.env.PUBLIC_APP_URL || "https://online-academy-plum.vercel.app")
    .trim()
    .replace(/\/$/, "");
}

async function generateVerificationCode(email) {
  const { projectId, apiKey } = getConfig();
  if (!apiKey) throw new Error("Missing FIREBASE_WEB_API_KEY environment variable");
  const accessToken = await getIdentityAccessToken();
  const response = await fetch(`${IDENTITY_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requestType: "VERIFY_EMAIL",
      email,
      returnOobLink: true,
      targetProjectId: projectId,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Firebase verification link generation failed (${response.status}): ${detail.slice(0, 350)}`);
  }

  const data = await response.json();
  if (!data.oobCode) throw new Error("Firebase did not return a verification code");
  return data.oobCode;
}

async function sendFirebaseVerificationEmailServer(email, idToken, appUrl) {
  const { projectId } = getConfig();
  const accessToken = await getIdentityAccessToken();
  const response = await fetch(`${IDENTITY_PROJECT_URL}/${encodeURIComponent(projectId)}/accounts:sendOobCode`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requestType: "VERIFY_EMAIL",
      email,
      idToken,
      continueUrl: `${appUrl}/verify-email?verified=1`,
      canHandleCodeInApp: false,
      clientType: "CLIENT_TYPE_WEB",
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const error = new Error(`Firebase verification email fallback failed (${response.status}): ${detail.slice(0, 350)}`);
    error.status = response.status;
    error.providerDetail = detail;
    throw error;
  }

  return response.json();
}

async function completeVerification(oobCode) {
  const { apiKey } = getConfig();
  if (!apiKey) throw new Error("Missing FIREBASE_WEB_API_KEY environment variable");
  const response = await fetch(`${UPDATE_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ oobCode }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = data?.error?.message || "VERIFICATION_FAILED";
    const error = new Error(code);
    error.code = code;
    error.status = 400;
    throw error;
  }
  return data;
}

async function sendBrandedEmail(email, displayName, verificationUrl) {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const from = String(process.env.RESEND_FROM_EMAIL || "").trim();
  if (!apiKey) throw new Error("Missing RESEND_API_KEY environment variable");
  if (!from) throw new Error("Missing RESEND_FROM_EMAIL environment variable");

  const safeName = escapeHtml(displayName || "Student");
  const safeUrl = escapeHtml(verificationUrl);
  const html = `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a"><div style="max-width:620px;margin:0 auto;padding:40px 18px"><div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;padding:34px;box-shadow:0 12px 35px rgba(15,23,42,.08)"><div style="display:inline-flex;align-items:center;padding:8px 12px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:12px;font-weight:800;letter-spacing:.08em">ONLINE ACADEMY</div><h1 style="margin:24px 0 10px;font-size:28px;line-height:1.2">Verify your email address</h1><p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#475569">Hi ${safeName}, please verify your email to secure your Online Academy account.</p><div style="padding:18px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;margin:22px 0"><p style="margin:0;font-size:13px;line-height:1.6;color:#64748b">Click the button below to complete verification. This link is single-use.</p></div><p style="margin:0 0 26px"><a href="${safeUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:12px;font-size:14px;font-weight:800">Verify Email</a></p><p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8">If you did not create an Online Academy account, you can safely ignore this email.</p><div style="margin-top:28px;padding-top:18px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8">Online Academy · Learn. Grow. Succeed.</div></div></div></body></html>`;
  const text = `Hi ${displayName || "Student"},\n\nPlease verify your email address for Online Academy.\n\nOpen Online Academy → Profile → Verify Email to continue.\n\nIf you did not create an Online Academy account, you can ignore this email.\n\nOnline Academy`;

  const response = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Verify your Online Academy account",
      html,
      text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const error = new Error(`Email provider rejected verification email (${response.status}): ${detail.slice(0, 350)}`);
    error.status = response.status;
    error.providerDetail = detail;
    throw error;
  }

  return response.json();
}

function isResendDomainRestriction(error) {
  if (Number(error?.status) !== 403) return false;
  const detail = String(error?.providerDetail || error?.message || "").toLowerCase();
  return detail.includes("testing emails") || detail.includes("verify a domain") || detail.includes("from address");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method Not Allowed" });

  try {
    const action = String(req.body?.action || "send").trim();

    if (action === "complete") {
      const oobCode = String(req.body?.oobCode || "").trim();
      if (!oobCode) return json(res, 400, { error: "Verification code is required" });
      const result = await completeVerification(oobCode);
      return json(res, 200, { ok: true, email: result.email || null });
    }

    const authHeader = String(req.headers.authorization || "");
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!idToken) return json(res, 401, { error: "Authentication required" });

    const user = await verifyFirebaseIdToken(idToken);
    if (!user.email) return json(res, 400, { error: "This account does not have an email address" });
    if (user.emailVerified === true) return json(res, 400, { error: "Email is already verified" });

    const appUrl = getAppUrl();
    const oobCode = await generateVerificationCode(user.email);
    const verificationUrl = `${appUrl}/verify-email?oobCode=${encodeURIComponent(oobCode)}`;

    try {
      await sendBrandedEmail(user.email, user.displayName || user.email.split("@")[0] || "Student", verificationUrl);
      return json(res, 200, {
        ok: true,
        message: "Professional verification email sent. Please check your inbox.",
        delivery: "resend",
      });
    } catch (error) {
      if (!isResendDomainRestriction(error)) throw error;

      // Resend is still in testing mode. Use the official Identity Platform
      // OAuth endpoint for the temporary fallback instead of calling the
      // browser-restricted Firebase Web API key from Vercel.
      await sendFirebaseVerificationEmailServer(user.email, idToken, appUrl);
      return json(res, 200, {
        ok: true,
        message: "Verification email sent. Your custom Online Academy email will be used after the Resend domain is verified.",
        delivery: "firebase-fallback",
      });
    }
  } catch (error) {
    console.error("Verify email error:", error?.message || error);
    return json(res, Number(error?.status) || 500, { error: error?.message || "Unable to send verification email" });
  }
}
