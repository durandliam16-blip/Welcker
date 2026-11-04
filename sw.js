const CACHE_NAME = 'monpatrimoine-v211'; // Version 2.0.7 - Cartes comptes selon croquis, saisie rapide sans sous-pages, IA biens sans blabla avec commentaires
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
  './css/chatbot.css',
  // JS
  './js/config.js',
  './js/dataManager.js',
  './js/app.js',
  './js/pages.js',
  './js/others.js',
  './js/graphs.js',
  './js/social.js',
  './js/chatbot.js',
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
  // Ignorer les requêtes non-GET et les schémas non supportés par le CacheStorage (ex: chrome-extension://, data:, etc.)
  if (e.request.method !== 'GET' || !e.request.url.startsWith('http')) {
    return;
  }

  // Ne JAMAIS cacher Supabase ou les requêtes d'API externes
  if (e.request.url.includes('supabase.co') || e.request.url.includes('supabase-js') || e.request.url.includes('generativelanguage.googleapis.com')) {
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
