/**
 * NEU Lab Log — Service Worker
 *
 * Strategy: Network-first with cache fallback.
 * Firebase SDK and QR library are always fetched live (CDN).
 * Local HTML/JS files are cached for offline access to the shell UI.
 */

const CACHE_NAME = "neu-lab-log-v18";
const SHELL_URLS = [
  "/index.html",
  "/scanner.html",
  "/professor-dashboard.html",
  "/js/firebase-config.js",
  "/manifest.json",
];

// ── Install: pre-cache the app shell ─────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use individual add calls so one failure doesn't block the whole install
      return Promise.allSettled(SHELL_URLS.map((url) => cache.add(url)));
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ─────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first, fall back to cache ──────────────────────────────────
self.addEventListener("fetch", (event) => {
  // Skip non-GET and cross-origin Firebase / CDN requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Let Firebase, Google Fonts, Tailwind, and CDN libs always go to network
  const bypassHosts = [
    "firestore.googleapis.com",
    "identitytoolkit.googleapis.com",
    "securetoken.googleapis.com",
    "firebaseapp.com",
    "googleapis.com",
    "fonts.googleapis.com",
    "fonts.gstatic.com",
    "cdn.tailwindcss.com",
    "unpkg.com",
    "cdnjs.cloudflare.com",
    "gstatic.com",
  ];
  if (bypassHosts.some((h) => url.hostname.includes(h))) return;

  // Network-first for same-origin HTML/JS
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
