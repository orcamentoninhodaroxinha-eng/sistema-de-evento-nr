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
          // Set role tag for targeting
          if (loginUser.role) {
            await OneSignal.User.addTag('role', loginUser.role);
          }
          if (loginUser.username) {
            await OneSignal.User.addTag('username', loginUser.username);
          }
        } catch (e) {
          console.warn('OneSignal tag error:', e.message);
        }
      });
    };

    tryInit();
    const timer = setTimeout(tryInit, 2000);
    return () => clearTimeout(timer);
  }, [loginUser?.username]);
}