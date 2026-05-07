import { useEffect, useCallback, useState } from 'react';
import { useLoginUser } from './useLoginUser';
import { base44 } from '@/api/base44Client';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function usePushNotifications() {
  const loginUser = useLoginUser();
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // Ao logar, tenta registrar automaticamente se já tinha permissão
  useEffect(() => {
    if (!loginUser) return;
    if (Notification.permission === 'granted') {
      registerAndSave();
    }
  }, [loginUser?.email]);

  const registerAndSave = async () => {
    try {
      // Registra o Service Worker
      const reg = await navigator.serviceWorker.register('/sw-push.js');

      // Busca a chave pública VAPID do backend
      const res = await base44.functions.invoke('getVapidPublicKey');
      const { publicKey } = res;

      if (!publicKey) throw new Error('Chave VAPID não encontrada');

      // Cria ou recupera a assinatura push
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const { endpoint, keys } = subscription.toJSON();

      // Salva no banco
      await base44.functions.invoke('saveWebPushSubscription', {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });

      console.log('✅ Push registrado com sucesso');
      return true;
    } catch (err) {
      console.warn('Erro ao registrar push:', err.message);
      return false;
    }
  };

  // Solicita permissão ao usuário e registra
  const requestPushPermission = useCallback(async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      alert('Seu navegador não suporta notificações push.');
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      return await registerAndSave();
    }
    return false;
  }, [loginUser]);

  return { requestPushPermission, permission };
}
