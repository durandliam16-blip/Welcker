const CACHE_NAME = 'monpatrimoine-v2'; // Passage à la v2 pour forcer la mise à jour
const ASSETS = [
  './',
  './index.html',
  './login.html',
  './styles.css',
  './app.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// 1. Installation : mise en cache des fichiers
self.addEventListener('install', (e) => {
  self.skipWaiting(); // Oblige le navigateur à activer ce nouveau fichier immédiatement
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// 2. Activation : Nettoyage de l'ancien cache (monpatrimoine-v1)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[ServiceWorker] Suppression de l\'ancien cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
});

// 3. Stratégie : Network First, fallback sur le Cache
self.addEventListener('fetch', (e) => {
  // IMPORTANT : On ne met jamais en cache les requêtes vers Supabase !
  if (e.request.url.includes('supabase.co')) {
    return; // Laisse la requête passer normalement vers internet
  }

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Le réseau fonctionne : on récupère la version la plus récente
        // et on la sauvegarde discrètement dans le cache pour la prochaine fois
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Le réseau a échoué (mode hors-ligne ou très mauvaise connexion) :
        // On renvoie la dernière version sauvegardée dans le cache
        return caches.match(e.request);
      })
  );
});