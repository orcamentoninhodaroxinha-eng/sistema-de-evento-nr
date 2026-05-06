import { useEffect, useCallback } from 'react';
import { useLoginUser } from './useLoginUser';
import { base44 } from '@/api/base44Client';

const KODEPUSH_APP_ID = 'MeuApp-Android';

export function usePushNotifications() {
  const loginUser = useLoginUser();

  // Registra o usuário no backend ao entrar (sem abrir popup)
  useEffect(() => {
    if (!loginUser) return;
    base44.functions.invoke('savePushSubscription', {
      username: loginUser.username,
      role: loginUser.role,
    }).catch(e => console.warn('savePushSubscription error:', e.message));
  }, [loginUser?.username]);

  // Abre o fluxo de opt-in do KodePush em popup
  const requestPushPermission = useCallback(async () => {
    if (!loginUser) return false;

    const url = `https://notify.kodebase.us/subscribe?app_id=${KODEPUSH_APP_ID}&user_id=${encodeURIComponent(loginUser.username)}`;
    const popup = window.open(url, '_blank', 'width=500,height=600');

    // Quando o popup fechar, considera inscrito
    return new Promise((resolve) => {
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          resolve(true);
        }
      }, 500);
    });
  }, [loginUser]);

  return { requestPushPermission, permission: 'default' };
}