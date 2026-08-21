'use client';

import { getVapidPublicKeyAction, savePushSubscriptionAction, removePushSubscriptionAction } from '@/app/actions/notification.actions';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function subscribeToPushNotifications(businessId: string) {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported in this browser.');
  }

  // 1. Request browser permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was denied by the user.');
  }

  // 2. Fetch VAPID Public Key from server
  const keyRes = await getVapidPublicKeyAction();
  const data = keyRes.data as { publicKey: string } | undefined;
  if (!keyRes.success || !data?.publicKey) {
    throw new Error('Failed to retrieve server VAPID public key.');
  }

  const convertedVapidKey = urlBase64ToUint8Array(data.publicKey);

  // 3. Register push subscription with browser
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedVapidKey,
  });

  const subJson = subscription.toJSON();

  // 4. Save subscription to server
  const saveRes = await savePushSubscriptionAction(businessId, {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subJson.keys?.p256dh || '',
      auth: subJson.keys?.auth || '',
    },
    userAgent: navigator.userAgent,
    deviceLabel: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser',
  });

  if (!saveRes.success) {
    throw new Error(saveRes.message || 'Failed to save push subscription on server.');
  }

  return subscription;
}

export async function unsubscribeFromPushNotifications(businessId: string) {
  if (!isPushNotificationSupported()) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    await removePushSubscriptionAction(businessId, subscription.endpoint);
    await subscription.unsubscribe();
  }
}
