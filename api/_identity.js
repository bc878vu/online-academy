import crypto from "node:crypto";
import { getConfig } from "./_firebase.js";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const IDENTITY_SCOPE = "https://www.googleapis.com/auth/identitytoolkit";
const IDENTITY_BASE = "https://identitytoolkit.googleapis.com/v1";

function base64Url(value) {
  return Buffer.from(value).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function getIdentityAccessToken() {
  const { clientEmail, privateKey } = getConfig();
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({ iss: clientEmail, scope: IDENTITY_SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const unsigned = `${header}.${payload}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey, "base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
  });
  if (!response.ok) throw new Error(`Identity Toolkit token request failed: ${response.status}`);
  const data = await response.json();
  if (!data.access_token) throw new Error("Identity Toolkit access token missing");
  return data.access_token;
}

export async function listAuthUsers() {
  const { projectId } = getConfig();
  const token = await getIdentityAccessToken();
  const users = [];
  const pageSize = 500;

  for (let offset = 0; ; offset += pageSize) {
    const response = await fetch(`${IDENTITY_BASE}/projects/${encodeURIComponent(projectId)}:queryAccounts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ returnUserInfo: true, limit: String(pageSize), offset: String(offset) }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Identity Toolkit user query failed (${response.status}): ${detail.slice(0, 300)}`);
    }
    const data = await response.json();
    const batch = Array.isArray(data.users) ? data.users : [];
    users.push(...batch);
    if (batch.length < pageSize) break;
  }

  return users;
}
