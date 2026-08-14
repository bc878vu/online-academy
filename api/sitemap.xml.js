import crypto from "node:crypto";

const SITE_URL = "https://online-academy-plum.vercel.app";
const FIRESTORE_SCOPE = "https://www.googleapis.com/auth/datastore";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

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
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Dynamic sitemap requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY on Vercel."
    );
  }

  return { projectId, clientEmail, privateKey };
}

async function getAccessToken({ clientEmail, privateKey }) {
  const now = Math.floor(Date.now() / 1000);

  const header = base64Url(JSON.stringify({
    alg: "RS256",
    typ: "JWT",
  }));

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
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Google OAuth token request failed: ${response.status} ${message}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error("Google OAuth token response did not contain an access token.");
  }

  return data.access_token;
}

async function fetchAllCertificates(projectId, accessToken) {
  const certificates = [];
  let pageToken = "";

  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/certificates`
    );

    url.searchParams.set("pageSize", "1000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Firestore sitemap request failed: ${response.status} ${message}`);
    }

    const payload = await response.json();

    for (const document of payload.documents || []) {
      const id = document.name?.split("/").pop();
      if (id) certificates.push(id);
    }

    pageToken = payload.nextPageToken || "";
  } while (pageToken);

  return [...new Set(certificates)];
}

function buildSitemap(urls) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${xmlEscape(url)}</loc></url>`),
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
    const certificates = await fetchAllCertificates(config.projectId, accessToken);

    const staticUrls = [
      `${SITE_URL}/`,
      `${SITE_URL}/courses`,
      `${SITE_URL}/verify-certificate`,
    ];

    const certificateUrls = certificates.map(
      (id) => `${SITE_URL}/verify-certificate?certificateId=${encodeURIComponent(id)}`
    );

    const body = buildSitemap([...staticUrls, ...certificateUrls]);

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=3600"
    );
    res.end(body);
  } catch (error) {
    console.error("Dynamic certificate sitemap error:", error?.message || error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.end(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'
    );
  }
}
