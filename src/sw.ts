/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope;

self.addEventListener('install', () => {
  void self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.resolve(clientsClaim()));
});

precacheAndRoute((self as unknown as { __WB_MANIFEST: (string | { url: string; revision?: string })[] }).__WB_MANIFEST);
cleanupOutdatedCaches();

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? 'Bible Study Workspace';
  const options: NotificationOptions = {
    body: data.body ?? '',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: data.tag ?? 'bible-notification',
    requireInteraction: false,
    data: data.data ?? {},
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data as { url?: string } | undefined;
  const url = data?.url ?? '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});

// Background sync for notification re-scheduling and queued data sync
self.addEventListener('sync', (event) => {
  const syncEvent = event as unknown as { tag: string; waitUntil: (p: Promise<unknown>) => void };
  if (syncEvent.tag === 'sync-bible-workspace') {
    syncEvent.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: 'TRIGGER_SYNC' });
        }
      })
    );
  }
});
