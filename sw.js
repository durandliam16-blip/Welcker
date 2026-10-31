const CACHE_NAME = 'monpatrimoine-v203'; // Version 2.0.3 - Responsive mobile & fast portfolio
const ASSETS = [
  './',
  './index.html',
  './login.html',
  // CSS
  './css/base.css',
  './css/components.css',
  './css/graphs.css',
  './css/profil_para.css',
  './css/utilities.css',
  './css/social.css',
  // JS
  './js/config.js',
  './js/dataManager.js',
  './js/app.js',
  './js/pages.js',
  './js/others.js',
  './js/graphs.js',
  './js/social.js',
  // CDN
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[SW] Suppression ancien cache', key);
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Ne JAMAIS cacher Supabase ou les requêtes d'API externes
  if (e.request.url.includes('supabase.co') || e.request.url.includes('supabase-js')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
