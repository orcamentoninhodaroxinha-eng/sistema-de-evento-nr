import { useEffect } from 'react';
import { useLoginUser } from './useLoginUser';

export function usePushNotifications() {
  const loginUser = useLoginUser();

  useEffect(() => {
    if (!loginUser || typeof window === 'undefined') return;

    const tryInit = () => {
      if (!window.OneSignalDeferred) return;

      window.OneSignalDeferred.push(async (OneSignal) => {
        try {
          // Request permission so the user gets the native push prompt
          const permission = await OneSignal.Notifications.requestPermission();
          console.log('OneSignal permission:', permission);

          // Tag the user by role and username for targeted notifications
          if (loginUser.role) {
            await OneSignal.User.addTag('role', loginUser.role);
          }
          if (loginUser.username) {
            await OneSignal.User.addTag('username', loginUser.username);
          }
        } catch (e) {
          console.warn('OneSignal init error:', e.message);
        }
      });
    };

    // Try immediately and retry after SDK loads
    tryInit();
    const timer = setTimeout(tryInit, 2500);
    return () => clearTimeout(timer);
  }, [loginUser?.username]);
}