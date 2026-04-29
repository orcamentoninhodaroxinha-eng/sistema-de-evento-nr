import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLoginUser } from './useLoginUser';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const loginUser = useLoginUser();

  useEffect(() => {
    if (!loginUser || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

    async function subscribe() {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        // Check if already subscribed
        let sub = await reg.pushManager.getSubscription();

        if (!sub) {
          // Request permission
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') return;

          // Subscribe — if no VAPID key in env, skip applicationServerKey
          const subOptions = { userVisibleOnly: true };
          if (VAPID_PUBLIC_KEY) {
            subOptions.applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
          }
          sub = await reg.pushManager.subscribe(subOptions);
        }

        const keys = sub.toJSON().keys || {};

        // Save to backend
        await base44.functions.invoke('savePushSubscription', {
          username: loginUser.username,
          role: loginUser.role,
          endpoint: sub.endpoint,
          p256dh: keys.p256dh || '',
          auth: keys.auth || '',
        });
      } catch (e) {
        // Silently ignore — push not critical
        console.warn('Push subscription failed:', e.message);
      }
    }

    subscribe();
  }, [loginUser?.username]);
}