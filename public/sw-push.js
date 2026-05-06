self.addEventListener('push', (event) => {
  let data = { title: 'Ninho da Roxinha', body: 'Nova notificação' };
  if (event.data) {
    try { data = event.data.json(); } catch { data.body = event.data.text(); }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'https://media.base44.com/images/public/69cbd80727489d185bf14962/7cb5516e1_download.png',
      badge: 'https://media.base44.com/images/public/69cbd80727489d185bf14962/7cb5516e1_download.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
