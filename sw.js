/* PLZ Train service worker: offline support for the installable app. */
/* P2-13: v5 adds the exercise-picture cache (runtime cache-first, below). */
var CACHE_VERSION = 'plz-fitzone-v5';
var CACHE_NAME = CACHE_VERSION;

/* P0-01: the onboarding mascot is a page asset too — precached so the first
   run looks identical offline. `plz-fitzone-logo-wide.jpg` is not referenced
   by index.html, so it is deliberately not listed. */
var CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/mascot-96.png',
  './icons/favicon-48.png',
  './assets/brand/plz-fitzone-mascot.jpg'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CORE_ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(key) {
        if (key !== CACHE_NAME) return caches.delete(key);
        return Promise.resolve(false);
      }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

function isPageRequest(request) {
  if (request.mode === 'navigate') return true;
  if (request.method !== 'GET') return false;
  var url = new URL(request.url);
  return url.pathname.endsWith('/') ||
    url.pathname.endsWith('/index.html');
}

/* P0-01: a weak gym signal could leave the page request hanging for minutes
   (and with it a white screen). Give the network 3 s, then take the cached
   page instead. */
var NETWORK_TIMEOUT_MS = 3000;

function fetchWithTimeout(request, ms) {
  if (typeof AbortController !== 'function') return fetch(request);
  var controller = new AbortController();
  var timer = setTimeout(function() {
    try { controller.abort(); } catch (e) {}
  }, ms);
  return fetch(request, { signal: controller.signal }).then(function(response) {
    clearTimeout(timer);
    return response;
  }, function(err) {
    clearTimeout(timer);
    throw err;
  });
}

/* P2-13: exercise pictures are NOT precached (10 now, ~100 later; precaching
   them would slow install and the offline page for pictures nobody opened).
   They are cached at runtime on first view, then answered from cache offline. */
function isExercisePicture(request) {
  if (request.method !== 'GET') return false;
  var url = new URL(request.url);
  return url.pathname.indexOf('/assets/exercises/') >= 0;
}

self.addEventListener('fetch', function(event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  if (isExercisePicture(request)) {
    // Runtime cache-first for exercise pictures: instant on the second view
    // and available offline. A failed/404 response is never cached, so a
    // missing file cannot stick; offline misses fall through to the browser,
    // where the <img onerror> hides the picture box.
    event.respondWith(
      caches.match(request).then(function(cached) {
        if (cached) return cached;
        return fetch(request).then(function(response) {
          if (!response || !response.ok) return response;
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(request, copy);
          }).catch(function() {});
          return response;
        });
      })
    );
    return;
  }
  if (isPageRequest(request)) {
    // NETWORK-FIRST for the page (3 s cap): a new version on Vercel shows on
    // next open when online; the cache keeps the app usable offline.
    event.respondWith(
      fetchWithTimeout(request, NETWORK_TIMEOUT_MS).then(function(response) {
        var copyIndex = response.clone();
        var copyRoot = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put('./index.html', copyIndex);
          cache.put('./', copyRoot);
        }).catch(function() {});
        return response;
      }).catch(function() {
        return caches.match('./index.html').then(function(cached) {
          if (cached) return cached;
          return caches.match('./');
        });
      })
    );
  } else {
    // Cache-first for versioned/static assets (icons, manifest).
    event.respondWith(
      caches.match(request).then(function(cached) {
        if (cached) return cached;
        return fetch(request).then(function(response) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(request, copy);
          }).catch(function() {});
          return response;
        });
      })
    );
  }
});
