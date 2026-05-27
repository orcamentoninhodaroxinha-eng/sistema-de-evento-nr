// Service Worker - Ninho da Roxinha
// IMPORTANT: Never cache Vite/React dev chunks to avoid stale module errors

const CACHE_NAME = 'ninho-static-v2';

// Only cache true static assets, never JS/CSS module chunks
const NEVER_CACHE = [
  '/src/',
  '/node_modules/.vite',
  '/@vite',
  '/@react-refresh',
  '.jsx',
  '.js',
  '.css',
  '.ts',
  '.tsx',
];

function shouldCache(url) {
  return !NEVER_CACHE.some(pattern => url.includes(pattern));
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Never intercept JS/CSS - let browser fetch fresh from network
  if (!shouldCache(url)) {
    return;
  }

  // For everything else, network first
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Push notification support
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'Ninho da Roxinha', {
        body: data.body || '',
        icon: data.icon || '/icon-192.png',
        badge: '/icon-192.png',
        data: data,
      })
    );
  } catch {}
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
