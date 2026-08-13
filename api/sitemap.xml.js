const SITE_URL = "https://online-academy-plum.vercel.app";

function xmlEscape(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getStringField(fields, key) {
  const field = fields?.[key];
  if (!field) return "";
  return field.stringValue || field.integerValue || field.doubleValue || "";
}

async function fetchAllCertificates(projectId) {
  const certificates = [];
  let pageToken = "";

  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/certificates`
    );
    url.searchParams.set("pageSize", "1000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Firestore sitemap request failed: ${response.status}`);
    }

    const payload = await response.json();
    for (const document of payload.documents || []) {
      const id = document.name?.split("/").pop();
      if (id) certificates.push(id);
    }

    pageToken = payload.nextPageToken || "";
  } while (pageToken);

  return certificates;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.end("Method Not Allowed");
    return;
  }

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    if (!projectId) throw new Error("Firebase project ID is not configured.");

    const certificates = await fetchAllCertificates(projectId);
    const staticUrls = [
      `${SITE_URL}/`,
      `${SITE_URL}/courses`,
      `${SITE_URL}/verify-certificate`,
    ];
    const certificateUrls = certificates.map(
      (id) => `${SITE_URL}/verify-certificate?certificateId=${encodeURIComponent(id)}`
    );

    const urls = [...staticUrls, ...certificateUrls];
    const body = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map((url) => `  <url><loc>${xmlEscape(url)}</loc></url>`),
      "</urlset>",
    ].join("\n");

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
    res.end(body);
  } catch (error) {
    console.error("Dynamic certificate sitemap error:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.end('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
}
