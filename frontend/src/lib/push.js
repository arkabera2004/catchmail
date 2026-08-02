import { api } from './api.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) throw new Error('Service workers are not supported in this browser.');
  return navigator.serviceWorker.register('/sw.js');
}

/** Requests notification permission (if not already granted), subscribes
 * the registered service worker to Web Push, and saves the subscription
 * server-side. Throws if permission is denied. */
export async function subscribeToPush(vapidPublicKey) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was denied.');

  const registration = await registerServiceWorker();
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  const json = subscription.toJSON();
  await api.subscribePush({ endpoint: json.endpoint, keys: json.keys });
  return subscription;
}

export async function unsubscribeFromPush() {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await api.unsubscribePush(subscription.endpoint);
  await subscription.unsubscribe();
}
