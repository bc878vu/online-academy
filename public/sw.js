const CACHE_NAME = "online-academy-runtime-v2";
const EXCLUDED_PREFIXES = ["/api/", "/sitemap.xml", "/robots.txt"];
const IMMUTABLE_ASSET = /\.(?:js|css|woff2?|png|jpe?g|webp|svg|ico|json)$/i;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
  await self.clients.claim();
})()));

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);
  if (EXCLUDED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    // Vite hashed assets never change: serve cached bytes immediately and refresh in the background.
    if (IMMUTABLE_ASSET.test(url.pathname) && cached) {
      event.waitUntil(fetch(request).then((response) => response.ok && cache.put(request, response.clone())).catch(() => {}));
      return cached;
    }

    // Navigation uses network-first so deployments stay fresh, with an instant cached fallback.
    try {
      const response = await fetch(request);
      if (response.ok && response.type === "basic") await cache.put(request, response.clone());
      return response;
    } catch {
      if (cached) return cached;
      if (request.mode === "navigate") {
        const fallback = await cache.match("/");
        if (fallback) return fallback;
      }
      throw new Error("Network unavailable");
    }
  })());
});
