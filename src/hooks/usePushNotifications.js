import { useEffect } from 'react';
import { useLoginUser } from './useLoginUser';
import { base44 } from '@/api/base44Client';

const VAPID_KEY = "BJFk1LADEJArJ0E9-Yk7DjvmeDkdwvbZDzzu6sKW5MQ_GOV_bNFCWNSNDp-43cCxLWmE0mgKrgZXDfk1Bnr2eOg";

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