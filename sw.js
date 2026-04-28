const CACHE_NAME = 'monpatrimoine-v213'; // new version pour forcer la mise à jour
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
  // CDN (ne pas cacher Supabase !)
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
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
    })
  );
});

self.addEventListener('fetch', (e) => {
  // Evite le blocage de ces sites
  if (e.request.url.includes('supabase.co') ||
    e.request.url.includes('supabase-js') ||
    e.request.url.includes('yahoo.com') ||
    e.request.url.includes('codetabs.com') ||
    e.request.url.includes('thingproxy.freeboard.io')) {
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