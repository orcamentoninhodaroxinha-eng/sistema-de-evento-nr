import { useEffect, useState } from "react";

const ONESIGNAL_APP_ID = "9b17635e-87cb-4c7b-92dc-ecbf7a927acd";

export function usePushNotifications(loginUser) {
  const [permission, setPermission] = useState("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!loginUser) return;
    if (typeof window === "undefined" || !window.OneSignalDeferred) return;

    window.OneSignalDeferred.push(async function (OneSignal) {
      try {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: false },
          promptOptions: {
            slidedown: {
              enabled: false,
            },
          },
        });

        // Seta external user ID como o username
        const username = loginUser.username || loginUser.role || "user";
        await OneSignal.login(username).catch(() => {});

        // Adiciona tag de role para segmentação
        await OneSignal.User.addTag("role", loginUser.role || "user").catch(() => {});
        await OneSignal.User.addTag("username", username).catch(() => {});

        const perm = await OneSignal.Notifications.permission;
        setPermission(perm ? "granted" : "default");
        setSubscribed(!!perm);
      } catch (err) {
        console.warn("OneSignal init error:", err);
      }
    });
  }, [loginUser]);

  const requestPermission = async () => {
    if (!window.OneSignalDeferred) return;
    setLoading(true);
    try {
      window.OneSignalDeferred.push(async function (OneSignal) {
        await OneSignal.Notifications.requestPermission();
        const perm = await OneSignal.Notifications.permission;
        setPermission(perm ? "granted" : "denied");
        setSubscribed(!!perm);
        setLoading(false);
      });
    } catch {
      setLoading(false);
    }
  };

  return { permission, subscribed, loading, requestPermission };
}