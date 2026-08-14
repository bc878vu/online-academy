import crypto from "node:crypto";

const FIRESTORE_BASE = "https://firestore.googleapis.com/v1";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const IDENTITY_BASE = "https://identitytoolkit.googleapis.com/v1/projects";
const FIRESTORE_SCOPE = "https://www.googleapis.com/auth/datastore";
const IDENTITY_SCOPE = "https://www.googleapis.com/auth/identitytoolkit";

function base64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function getConfig() {
  const projectId = (process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "").trim();
  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || "").trim();
  let privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").trim();
  privateKey = privateKey.replace(/^['"]|['"]$/g, "").replace(/\\n/g, "\n");
  const apiKey = (process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY || "").trim();

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase server environment variables");
  }
  if (!privateKey.includes("BEGIN PRIVATE KEY") || !privateKey.includes("END PRIVATE KEY")) {
    throw new Error("FIREBASE_PRIVATE_KEY format is invalid");
  }
  return { projectId, clientEmail, privateKey, apiKey };
}

export async function getServiceAccessToken(scope = FIRESTORE_SCOPE) {
  const { clientEmail, privateKey } = getConfig();
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: clientEmail,
    scope,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey, "base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (!response.ok) throw new Error(`Google service token request failed: ${response.status}`);
  const data = await response.json();
  if (!data.access_token) throw new Error("Service token missing");
  return data.access_token;
}

export async function getIdentityAccessToken() {
  return getServiceAccessToken(IDENTITY_SCOPE);
}

// Server-side Firebase Auth calls must not depend on the browser Web API key.
// The Web API key may be restricted by HTTP referrer for the public app, while
// Vercel server functions do not send that browser referrer. Identity Platform
// explicitly supports OAuth-authenticated project account lookup for admins.
export async function verifyFirebaseIdToken(idToken) {
  const { projectId } = getConfig();
  const accessToken = await getIdentityAccessToken();
  const response = await fetch(`${IDENTITY_BASE}/${encodeURIComponent(projectId)}/accounts:lookup`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const error = new Error(`Invalid Firebase ID token (${response.status}): ${detail.slice(0, 250)}`);
    error.status = 401;
    throw error;
  }
  const data = await response.json();
  const user = data.users?.[0];
  if (!user?.localId || user.disabled === true) throw new Error("Authenticated user is unavailable");
  return user;
}

function encodeValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (typeof value === "object") {
    const fields = {};
    for (const [key, item] of Object.entries(value)) fields[key] = encodeValue(item);
    return { mapValue: { fields } };
  }
  throw new Error("Unsupported Firestore value");
}

export function encodeFields(data) {
  const fields = {};
  for (const [key, value] of Object.entries(data)) fields[key] = encodeValue(value);
  return fields;
}

function decodeValue(value = {}) {
  if (Object.prototype.hasOwnProperty.call(value, "stringValue")) return value.stringValue;
  if (Object.prototype.hasOwnProperty.call(value, "integerValue")) return Number(value.integerValue);
  if (Object.prototype.hasOwnProperty.call(value, "doubleValue")) return value.doubleValue;
  if (Object.prototype.hasOwnProperty.call(value, "booleanValue")) return value.booleanValue;
  if (Object.prototype.hasOwnProperty.call(value, "timestampValue")) return new Date(value.timestampValue);
  if (Object.prototype.hasOwnProperty.call(value, "nullValue")) return null;
  if (value.arrayValue) return (value.arrayValue.values || []).map(decodeValue);
  if (value.mapValue) return decodeFields(value.mapValue.fields || {});
  return null;
}

export function decodeFields(fields = {}) {
  const result = {};
  for (const [key, value] of Object.entries(fields)) result[key] = decodeValue(value);
  return result;
}

export async function firestoreGet(path) {
  const { projectId } = getConfig();
  const token = await getServiceAccessToken();
  const response = await fetch(`${FIRESTORE_BASE}/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${path.split("/").map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Firestore GET failed: ${response.status}`);
  const document = await response.json();
  return { name: document.name, fields: decodeFields(document.fields || {}) };
}

export async function firestoreSet(path, data) {
  const { projectId } = getConfig();
  const token = await getServiceAccessToken();
  const response = await fetch(`${FIRESTORE_BASE}/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${path.split("/").map(encodeURIComponent).join("/")}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: encodeFields(data) }),
  });
  if (!response.ok) throw new Error(`Firestore SET failed: ${response.status}`);
  return response.json();
}

export async function firestoreQuery(collectionId, filters = []) {
  const { projectId } = getConfig();
  const token = await getServiceAccessToken();
  const structuredQuery = { from: [{ collectionId }] };
  if (filters.length) {
    structuredQuery.where = {
      compositeFilter: {
        op: "AND",
        filters: filters.map(({ field, value }) => ({
          fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: encodeValue(value) },
        })),
      },
    };
  }
  const response = await fetch(`${FIRESTORE_BASE}/projects/${encodeURIComponent(projectId)}/databases/(default)/documents:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ structuredQuery }),
  });
  if (!response.ok) throw new Error(`Firestore query failed: ${response.status}`);
  const rows = await response.json();
  return rows.filter((row) => row.document).map((row) => ({
    name: row.document.name,
    fields: decodeFields(row.document.fields || {}),
  }));
}
