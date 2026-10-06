import { useCallback, useState } from 'react';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'denied' as NotificationPermission;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const notify = useCallback((title: string, options?: NotificationOptions) => {
    if (permission !== 'granted') return;
    navigator.serviceWorker?.ready.then((registration) => {
      registration.showNotification(title, options);
    });
  }, [permission]);

  return { permission, requestPermission, notify };
}
