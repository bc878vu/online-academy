import crypto from "node:crypto";

const SITE_URL = "https://online-academy-plum.vercel.app";
const FIRESTORE_SCOPE = "https://www.googleapis.com/auth/datastore";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const FIRESTORE_BASE = "https://firestore.googleapis.com/v1";

function xmlEscape(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function base64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function getServiceAccountConfig() {
  const projectId = (
    process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || ""
  ).trim();
  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || "").trim();
  let privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").trim();
  privateKey = privateKey.replace(/^['"]|['"]$/g, "");
  privateKey = privateKey.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase server environment variables");
  }
  if (!privateKey.includes("BEGIN PRIVATE KEY") || !privateKey.includes("END PRIVATE KEY")) {
    throw new Error("FIREBASE_PRIVATE_KEY format is invalid");
  }
  return { projectId, clientEmail, privateKey };
}

async function getAccessToken({ clientEmail, privateKey }) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: clientEmail,
    scope: FIRESTORE_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const unsignedToken = `${header}.${payload}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(privateKey, "base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  const assertion = `${unsignedToken}.${signature}`;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`Google OAuth token request failed: ${response.status}`);
  const data = await response.json();
  if (!data.access_token) throw new Error("Google OAuth token response did not contain an access token");
  return data.access_token;
}

async function fetchCollection(projectId, accessToken, collectionName) {
  const documents = [];
  let pageToken = "";
  do {
    const url = new URL(`${FIRESTORE_BASE}/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${collectionName}`);
    url.searchParams.set("pageSize", "1000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Firestore ${collectionName} request failed: ${response.status}`);
    const payload = await response.json();
    documents.push(...(payload.documents || []));
    pageToken = payload.nextPageToken || "";
  } while (pageToken);
  return documents;
}

function firestoreBoolean(document, field) {
  return document?.fields?.[field]?.booleanValue === true;
}

function documentId(document) {
  return String(document?.name || "").split("/").pop() || "";
}

function buildSitemap(urls) {
  const uniqueUrls = [...new Set(urls.filter(Boolean))];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...uniqueUrls.map((url) => `  <url><loc>${xmlEscape(url)}</loc></url>`),
    "</urlset>",
  ].join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.end("Method Not Allowed");
    return;
  }

  try {
    const config = getServiceAccountConfig();
    const accessToken = await getAccessToken(config);
    const [courses, certificates] = await Promise.all([
      fetchCollection(config.projectId, accessToken, "courses"),
      fetchCollection(config.projectId, accessToken, "certificates"),
    ]);

    const staticUrls = [
      `${SITE_URL}/`,
      `${SITE_URL}/courses`,
      `${SITE_URL}/verify-certificate`,
      `${SITE_URL}/terms`,
    ];

    const courseUrls = courses
      .filter((document) => firestoreBoolean(document, "published"))
      .map((document) => documentId(document))
      .filter(Boolean)
      .map((id) => `${SITE_URL}/courses/${encodeURIComponent(id)}`);

    const certificateUrls = certificates
      .map((document) => documentId(document))
      .filter(Boolean)
      .map((id) => `${SITE_URL}/verify-certificate?certificateId=${encodeURIComponent(id)}`);

    const body = buildSitemap([...staticUrls, ...courseUrls, ...certificateUrls]);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
    res.setHeader("X-Course-Sitemap-Count", String(courseUrls.length));
    res.setHeader("X-Certificate-Sitemap-Count", String(certificateUrls.length));
    res.end(body);
  } catch (error) {
    console.error("Dynamic sitemap error:", error?.message || error);
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
}
