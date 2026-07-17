// ---------------------------------------------------------------------
// LabCal Calibration Suite — service worker
// Bump CACHE_VERSION any time the HTML/JS files change and you want
// devices that already installed the app to pick up the new version.
// ---------------------------------------------------------------------
const CACHE_VERSION  = 'v1';
const STATIC_CACHE   = `labcal-static-${CACHE_VERSION}`;
const RUNTIME_CACHE  = `labcal-runtime-${CACHE_VERSION}`;

// Same-origin app shell — every worksheet in the suite.
// Add new worksheets here (and to APP_SHELL in index.html) when you add them.
const APP_SHELL = [
  './',
  './index.html',
  './barkey_calibration_form.html',
  './calibration_worksheet_SMD.html',
  './calibration_worksheet_SNMD.html',
  './calibration_worksheet_19_24.html'
];

// Third-party libraries the worksheets load from CDNs (pdf.js, html2pdf,
// xlsx, jspdf, html2canvas, Google font CSS). These URLs are versioned,
// so caching them long-term is safe.
const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/html2canvas-pro@1.5.0/dist/html2canvas-pro.min.js',
  'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(APP_SHELL);
    // Fetch CDN assets individually so one blocked/slow request doesn't
    // stop the whole install — anything missed here gets cached at
    // runtime the first time it's actually used.
    await Promise.all(CDN_ASSETS.map(async url => {
      try {
        const res = await fetch(url, { mode: 'no-cors' });
        await cache.put(url, res);
      } catch (e) { /* no connection yet — will be cached at runtime */ }
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // HTML pages: try the network first (so edits show up while online),
  // fall back to the cached copy the moment the network fails (offline).
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(STATIC_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match(req, { ignoreSearch: true });
        return cached || caches.match('./index.html');
      }
    })());
    return;
  }

  // Everything else (CDN libraries, fonts, icons, etc.): cache-first,
  // then network — and remember whatever we fetch for next time.
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const sameOrigin = new URL(req.url).origin === self.location.origin;
      const fresh = await fetch(req, sameOrigin ? {} : { mode: 'no-cors' });
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(req, fresh.clone());
      return fresh;
    } catch (e) {
      return cached; // nothing we can do — not previously cached, no network
    }
  })());
});
