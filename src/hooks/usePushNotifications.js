import { useEffect, useState } from "react";

const ONESIGNAL_APP_ID = "9b17635e-87cb-4c7b-92dc-ecbf7a927acd";

// Flag global para garantir init apenas uma vez
let oneSignalInitialized = false;
let oneSignalInitializing = false;

export function usePushNotifications(loginUser) {
  const [permission, setPermission] = useState("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!loginUser) return;
    if (typeof window === "undefined" || !window.OneSignalDeferred) return;
    if (oneSignalInitialized || oneSignalInitializing) {
      // Já inicializado: só atualiza as tags
      window.OneSignalDeferred.push(async function (OneSignal) {
        try {
          const username = loginUser.username || loginUser.role || "user";
          await OneSignal.login(username).catch(() => {});
          await OneSignal.User.addTag("role", loginUser.role || "user").catch(() => {});
          await OneSignal.User.addTag("username", username).catch(() => {});
          const perm = OneSignal.Notifications.permission;
          setPermission(perm ? "granted" : "default");
          setSubscribed(!!perm);
        } catch {}
      });
      return;
    }

    oneSignalInitializing = true;
    window.OneSignalDeferred.push(async function (OneSignal) {
      try {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: false },
          promptOptions: {
            slidedown: { enabled: false },
          },
        });
        oneSignalInitialized = true;

        const username = loginUser.username || loginUser.role || "user";
        await OneSignal.login(username).catch(() => {});
        await OneSignal.User.addTag("role", loginUser.role || "user").catch(() => {});
        await OneSignal.User.addTag("username", username).catch(() => {});

        const perm = OneSignal.Notifications.permission;
        setPermission(perm ? "granted" : "default");
        setSubscribed(!!perm);
      } catch (err) {
        console.warn("OneSignal init error:", err);
        oneSignalInitializing = false;
      }
    });
  }, [loginUser?.username]);

  const requestPermission = async () => {
    setLoading(true);
    try {
      // Usa a API nativa do browser diretamente — mais confiável
      const result = await Notification.requestPermission();
      setPermission(result);
      setSubscribed(result === "granted");

      // Tenta também via OneSignal se disponível e inicializado
      if (result === "granted" && oneSignalInitialized && window.OneSignalDeferred) {
        window.OneSignalDeferred.push(async function (OneSignal) {
          try {
            await OneSignal.Notifications.requestPermission();
          } catch {}
        });
      }
    } catch {
      setPermission("denied");
    }
    setLoading(false);
  };

  return { permission, subscribed, loading, requestPermission };
}