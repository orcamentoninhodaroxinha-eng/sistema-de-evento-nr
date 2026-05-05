import { useEffect } from 'react';
import { useLoginUser } from './useLoginUser';
import { base44 } from '@/api/base44Client';

// VAPID key from Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates
const VAPID_KEY = "BFyJ3VWKCy5nXvuCkHRiS2p6XkLbFM7w4xk8qHbKkKxK5H2p1yQ5ik3N8V3M2t5w3K8w9L6p7V4y7xK3Q2S1"; // substitua pela sua chave VAPID real

export function usePushNotifications() {
  const loginUser = useLoginUser();

  useEffect(() => {
    if (!loginUser || typeof window === 'undefined') return;

    const init = async () => {
      try {
        // Dynamically import to avoid SSR issues
        const { messaging, getToken } = await import('@/lib/firebase');

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Push permission denied');
          return;
        }

        // Register the FCM service worker
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        const vapidKey = VAPID_KEY || import.meta.env.VITE_FIREBASE_VAPID_KEY;

        const token = await getToken(messaging, {
          vapidKey: vapidKey,
          serviceWorkerRegistration: registration,
        });

        if (!token) {
          console.warn('No FCM token received');
          return;
        }

        console.log('FCM token obtained:', token.substring(0, 20) + '...');

        // Save token to database, keyed by username to avoid duplicates
        const existing = await base44.functions.invoke('savePushSubscription', {
          username: loginUser.username,
          role: loginUser.role,
          token,
        });

        console.log('Push subscription saved:', existing?.data);
      } catch (e) {
        console.warn('FCM init error:', e.message);
      }
    };

    init();
  }, [loginUser?.username]);
}