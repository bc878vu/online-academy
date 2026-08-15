const CACHE_NAME = "online-academy-runtime-v1";
const EXCLUDED_PREFIXES = ["/api/", "/sitemap.xml", "/robots.txt"];

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);
  if (EXCLUDED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok && response.type === "basic") {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === "navigate") {
        const fallback = await caches.match("/");
        if (fallback) return fallback;
      }
      throw new Error("Network unavailable");
    }
  })());
});
