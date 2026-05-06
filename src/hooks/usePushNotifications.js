import { useEffect } from 'react';
import { useLoginUser } from './useLoginUser';

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || "";

export function usePushNotifications() {
  const loginUser = useLoginUser();

  useEffect(() => {
    if (!loginUser || typeof window === 'undefined') return;
    if (!('Notification' in window)) return;

    const init = async () => {
      try {
        // Carrega SDK OneSignal
        await new Promise((resolve, reject) => {
          if (window.OneSignal) { resolve(); return; }
          const script = document.createElement('script');
          script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
          script.defer = true;
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });

        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(async function(OneSignal) {
          if (OneSignal.initialized) return;
          
          await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            notifyButton: { enable: false },
            allowLocalhostAsSecureOrigin: true,
          });

          await OneSignal.Notifications.requestPermission();

          // Tag com role para segmentação
          await OneSignal.User.addTag('role', loginUser.role);
          await OneSignal.User.addTag('username', loginUser.username);
        });
      } catch (e) {
        console.warn('OneSignal init error:', e.message);
      }
    };

    init();
  }, [loginUser?.username]);
}