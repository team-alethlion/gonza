// Cache name includes version to allow easy updates - increment this to trigger updates
const CACHE_NAME = "gonza-systems-v6";

// List of assets to cache for offline use
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/apple-icon.png",
  "/icon.png",
  "/logo/g_rounded.png",
  "/logo/g_transparent.png",
  "/logo/g_white_lg.png",
  "/logo/g_white_sm.png",
  "/logo/gonza_systems_lg.png",
  "/logo/gonza_systems_sm.png",
  "/logo/gonza_systems_white.png",
  "/logo/sales_tracker_profit.png",
  "/logo/sales_tracker.png",
  "/banners/b1.png",
  "/banners/b2.png",
  "/banners/b3.png",
  "/banners/b4.png",
  "/banners/b5.png",
];

// Install event - cache assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        // Only send update message if this is actually an update (not first install)
        return caches.keys().then((cacheNames) => {
          const existingCaches = cacheNames.filter(
            (name) => name !== CACHE_NAME && name.startsWith("gonza-systems-"),
          );

          // If there are existing caches with different versions, this is an update
          if (existingCaches.length > 0) {
            self.clients.matchAll().then((clients) => {
              clients.forEach((client) => {
                client.postMessage({
                  type: "UPDATE_AVAILABLE",
                });
              });
            });
          }
        });
      })
      .then(() => self.skipWaiting()),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName)),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Fetch event - respond with cached assets or fetch from network
self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Use cache-first strategy for static assets
  const url = new URL(event.request.url);
  const isStaticAsset = url.pathname.match(
    /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/,
  );

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((response) => {
          if (
            response &&
            response.status === 200 &&
            event.request.method === "GET"
          ) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        });
      }),
    );
  } else {
    // Network-first for HTML and API calls
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (
            response &&
            response.status === 200 &&
            event.request.method === "GET"
          ) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        }),
    );
  }
});
