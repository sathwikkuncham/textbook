const CACHE_NAME = "textbook-v1";
const STATIC_CACHE = "textbook-static-v1";
const API_CACHE = "textbook-api-v1";

// Static assets to precache
const PRECACHE_URLS = ["/", "/offline"];

// Install: precache critical assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: strategy depends on request type
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip SSE streams (chat, AI search)
  if (
    url.pathname.includes("/api/learn/chat") ||
    url.pathname.includes("/api/learn/search/ai")
  ) {
    return;
  }

  // API responses: network-first, cache for offline
  if (url.pathname.startsWith("/api/learn/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || new Response("{}", { status: 503 })))
    );
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.match(/\.(js|css|woff2?|png|svg|ico)$/) ||
    url.pathname.startsWith("/_next/")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          }).catch(() => new Response("", { status: 408 }))
      )
    );
    return;
  }

  // Navigation: network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((r) => r || caches.match("/offline"))
      )
    );
    return;
  }
});
