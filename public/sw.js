importScripts("https://cdn.pushalert.co/sw-89134.js");

self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Ninho da Roxinha';
  const options = {
    body: data.body || '',
    icon: 'https://media.base44.com/images/public/69cbd80727489d185bf14962/7cb5516e1_download.png',
    badge: 'https://media.base44.com/images/public/69cbd80727489d185bf14962/7cb5516e1_download.png',
    vibrate: [200, 100, 200],
    data: data,
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
