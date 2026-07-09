/* Aaron's Agenda — service worker
   Purpose: makes the app installable and lets the shell (HTML/CSS/JS/icons)
   load instantly and offline. Firestore/Auth calls always go to the network —
   this never caches or intercepts live data, only the static app shell. */

const CACHE_NAME = 'aarons-agenda-shell-v2';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Never intercept Firebase/Firestore/Auth/Google traffic — that must always be live.
  if (url.includes('firestore.googleapis.com') ||
      url.includes('googleapis.com') ||
      url.includes('firebaseio.com') ||
      url.includes('identitytoolkit') ||
      url.includes('gstatic.com/firebasejs')) {
    return; // let the browser handle it normally
  }

  // App shell: cache-first, falling back to network, so it opens instantly and offline.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
