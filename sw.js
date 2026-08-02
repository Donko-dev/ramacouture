/* ======================================================================
   RAMA BAZIN & COUTURE — sw.js
   Service Worker : cache offline-first, mise à jour automatique.
   Powered by EMPIRE DONKO
   ====================================================================== */

const CACHE_VERSION = "rama-couture-v2";
const STATIC_CACHE = CACHE_VERSION + "-static";
const RUNTIME_CACHE = CACHE_VERSION + "-runtime";

const APP_SHELL = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./data.json",
  "./logo.jpg",
  "./favicon.ico",
  "./icon-192.jpg",
  "./icon-512.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        Promise.all(
          APP_SHELL.map((url) =>
            cache.add(url).catch((err) => console.warn("SW: échec de mise en cache de", url, err))
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("rama-couture-") && key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isNavigationRequest(request) {
  return request.mode === "navigate" || (request.method === "GET" && request.headers.get("accept") && request.headers.get("accept").includes("text/html"));
}

// Stratégie : Network-first pour data.json et les pages HTML (contenu vivant),
// Cache-first pour les médias et ressources statiques (images/vidéos/CSS/JS).
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // data.json : toujours en réseau d'abord (catalogue à jour dès que possible),
  // mais avec un repli sur le cache hors-ligne fiable, insensible à une
  // éventuelle chaîne de requête (?v=...) ajoutée côté page.
  if (url.pathname.endsWith("/data.json")) {
    const cacheKey = new Request(url.origin + url.pathname);
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(cacheKey, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(cacheKey, { ignoreSearch: true }).then((cached) => {
            if (cached) return cached;
            return caches.match(request, { ignoreSearch: true });
          })
        )
    );
    return;
  }

  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("./index.html"))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
