
// Cache name includes version to allow easy updates - increment this to trigger updates
const CACHE_NAME = 'gonza-systems-v4';

// List of assets to cache for offline use
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/lovable-uploads/837f80d7-6ea7-4300-a319-e689320289a8.png',
  '/lovable-uploads/798d07d7-1db7-498c-92f3-6f6346827d59.png',
  '/lovable-uploads/bede0452-5ece-46ae-acae-25f8d98fbfd2.png',
  '/lovable-uploads/5de523b3-1d7b-4772-9dd4-ba050fa3fba3.png',
  '/lovable-uploads/7f7549a3-e9df-4762-b8b9-8e041e34f55d.png'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        // Only send update message if this is actually an update (not first install)
        return caches.keys().then(cacheNames => {
          const existingCaches = cacheNames.filter(name => name !== CACHE_NAME && name.startsWith('gonza-systems-'));

          // If there are existing caches with different versions, this is an update
          if (existingCaches.length > 0) {
            self.clients.matchAll().then(clients => {
              clients.forEach(client => {
                client.postMessage({
                  type: 'UPDATE_AVAILABLE'
                });
              });
            });
          }
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - respond with cached assets or fetch from network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Use cache-first strategy for static assets
  const url = new URL(event.request.url);
  const isStaticAsset = url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(event.request)
            .then(response => {
              if (response && response.status === 200 && event.request.method === 'GET') {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                  .then(cache => {
                    cache.put(event.request, responseToCache);
                  });
              }
              return response;
            });
        })
    );
  } else {
    // Network-first for HTML and API calls
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200 && event.request.method === 'GET') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  }
});
