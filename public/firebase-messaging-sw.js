importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBeKiWCFvX2AjSVToOjZBtkOe2LI8wy7_k",
  authDomain: "app-ninho-294c2.firebaseapp.com",
  projectId: "app-ninho-294c2",
  storageBucket: "app-ninho-294c2.firebasestorage.app",
  messagingSenderId: "262688298106",
  appId: "1:262688298106:web:e3fc5d3202ead9ef8ad7c3",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || "Ninho da Roxinha", {
    body: body || "",
    icon: icon || "https://media.base44.com/images/public/69cbd80727489d185bf14962/7cb5516e1_download.png",
    badge: "https://media.base44.com/images/public/69cbd80727489d185bf14962/7cb5516e1_download.png",
    vibrate: [200, 100, 200],
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
