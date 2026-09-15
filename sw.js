// Caches just the app shell (this page, the manifest, the icons) so Study
// and Library — which don't need the network at all — keep working with
// no connection. AI features (Translate, Chat, Photo) still need a real
// network call every time and are deliberately never cached here; if
// there's no connection, those fail with the app's own error message
// rather than silently returning something stale.
const CACHE_NAME = "dansk-shell-v2";
const SHELL_FILES = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Only ever serve the app shell itself from cache — same-origin GET
  // requests for these known files. Everything else (in particular any
  // cross-origin AI API call) passes straight through untouched.
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  // Network-first: while this app is still being actively updated,
  // showing the latest version whenever there's a connection matters
  // more than shaving a few ms off load time. The cache is still kept
  // fresh as a side effect and is what makes Study/Library work with no
  // connection at all — it's just no longer served ahead of the network
  // when the network is actually available.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
