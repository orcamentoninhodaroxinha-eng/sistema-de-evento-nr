import { useEffect } from 'react';
import { useLoginUser } from './useLoginUser';

export function usePushNotifications() {
  const loginUser = useLoginUser();

  useEffect(() => {
    if (!loginUser || typeof window === 'undefined') return;

    // Wait for OneSignal to be available
    const tryInit = () => {
      if (!window.OneSignal) return;

      window.OneSignal.push(() => {
        // Set the user's role as a tag for targeting
        if (loginUser.role) {
          window.OneSignal.sendTag('role', loginUser.role);
        }
        if (loginUser.username) {
          window.OneSignal.sendTag('username', loginUser.username);
        }
      });
    };

    // Try immediately, then wait a bit for SDK to load
    tryInit();
    const timer = setTimeout(tryInit, 3000);
    return () => clearTimeout(timer);
  }, [loginUser?.username]);
}