import { useEffect, useCallback } from 'react';
import { useLoginUser } from './useLoginUser';
import { base44 } from '@/api/base44Client';

const VAPID_PUBLIC_KEY = "BNQy3Mtf8Mt8Bf6MJ0nmWZkjQphbIrOlRXSvW9oL0javIAVJLQXr8TaUhFqFUJCyr3MiUV1om4VZ6CCCk62qbF0";

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function subscribeAndSave(loginUser) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push not supported');
    return false;
  }

  // Register SW
  const registration = await navigator.serviceWorker.register('/sw-push.js');
  await navigator.serviceWorker.ready;

  // Check if already subscribed
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    // Only subscribe if not already subscribed
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const sub = subscription.toJSON();
  if (!sub.keys?.p256dh || !sub.keys?.auth) {
    console.warn('Subscription missing keys');
    return false;
  }

  await base44.functions.invoke('savePushSubscription', {
    username: loginUser.username,
    role: loginUser.role,
    token: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
  });

  console.log('Push subscription saved successfully');
  return true;
}

export function usePushNotifications() {
  const loginUser = useLoginUser();

  useEffect(() => {
    if (!loginUser) return;
    if (!('Notification' in window)) return;

    // If permission already granted, subscribe silently
    if (Notification.permission === 'granted') {
      subscribeAndSave(loginUser).catch(e => console.warn('Auto-subscribe error:', e.message));
    }
    // If 'default' (not yet asked), we wait for user gesture via requestPushPermission
  }, [loginUser?.username]);

  // Call this from a button click to request permission + subscribe
  const requestPushPermission = useCallback(async () => {
    if (!loginUser) return false;
    if (!('Notification' in window)) return false;

    if (Notification.permission === 'denied') {
      console.warn('Push permission was denied. User must reset in browser settings.');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    return await subscribeAndSave(loginUser);
  }, [loginUser]);

  return { requestPushPermission, permission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported' };
}