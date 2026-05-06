import { useEffect } from 'react';
import { useLoginUser } from './useLoginUser';
import { base44 } from '@/api/base44Client';

const VAPID_PUBLIC_KEY = "BNQy3Mtf8Mt8Bf6MJ0nmWZkjQphbIrOlRXSvW9oL0javIAVJLQXr8TaUhFqFUJCyr3MiUV1om4VZ6CCCk62qbF0";

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const loginUser = useLoginUser();

  useEffect(() => {
    if (!loginUser || typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const init = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Push permission denied');
          return;
        }

        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw-push.js');
        await navigator.serviceWorker.ready;

        // Subscribe to Web Push
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        const sub = subscription.toJSON();
        console.log('Web Push subscription obtained');

        // Save to backend
        await base44.functions.invoke('savePushSubscription', {
          username: loginUser.username,
          role: loginUser.role,
          token: sub.endpoint,        // endpoint
          p256dh: sub.keys?.p256dh,   // encryption key
          auth: sub.keys?.auth,       // auth secret
        });

        console.log('Push subscription saved');
      } catch (e) {
        console.warn('Push init error:', e.message);
      }
    };

    init();
  }, [loginUser?.username]);
}