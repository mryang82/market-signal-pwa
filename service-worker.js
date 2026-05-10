// Market Signal v8 PWA - Service Worker (v2)
// Strategy: Network-first for HTML/JSON, Cache-first for static assets
const CACHE_NAME = "market-signal-v8-v2";
const STATIC_ASSETS = [
  "./icon-192.png",
  "./icon-512.png",
];

// Install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate (delete old caches)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch handler
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // External APIs (Stooq, FRED, alternative.me): no cache
  if (url.origin !== location.origin) {
    return;  // browser handles directly
  }
  
  // HTML/JS/CSS: network-first (always try fresh, fallback to cache)
  if (event.request.mode === "navigate" || 
      url.pathname.endsWith(".html") || 
      url.pathname.endsWith(".js") ||
      url.pathname.endsWith(".json") ||
      url.pathname.endsWith("/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(c => c || caches.match("./index.html")))
    );
    return;
  }
  
  // Images/icons: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200) return response;
        const cloned = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        return response;
      });
    })
  );
});

// Skip waiting on message
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
