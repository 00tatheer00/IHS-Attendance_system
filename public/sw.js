/* IHS Attendance service worker.
 * - Static assets (/_next/static, icons, wasm): cache-first (they are content-hashed or versioned).
 * - Page navigations: network-first, falling back to the last cached copy, then /offline.
 * - Supabase API calls are never cached (attendance data must be live).
 */
const VERSION = "v1";
const STATIC = `static-${VERSION}`;
const PAGES = `pages-${VERSION}`;
const PRECACHE = ["/offline", "/icons/icon-192.png", "/ihs-logo.png", "/wasm/zxing_reader.wasm"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![STATIC, PAGES].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/wasm/") ||
    url.pathname === "/ihs-logo.png" ||
    url.pathname.startsWith("/avatars/");

  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) caches.open(STATIC).then((c) => c.put(request, res.clone()));
            return res;
          }),
      ),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok && !res.redirected) caches.open(PAGES).then((c) => c.put(request, res.clone()));
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match("/offline"))),
    );
  }
});
