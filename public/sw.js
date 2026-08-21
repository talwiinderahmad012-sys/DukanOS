const CACHE_NAME = 'dukaanos-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/favicon.ico',
];

// Install Event: Pre-cache core application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Core asset pre-caching partial failure:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Safe Network-First with fallback
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle HTTP/HTTPS requests
  if (!request.url.startsWith('http')) return;

  // 1. NEVER cache mutations (POST, PUT, DELETE, PATCH)
  if (request.method !== 'GET') {
    return;
  }

  // 2. NEVER cache sensitive dynamic API endpoints or auth routes
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/data/') ||
    url.pathname.includes('/auth/')
  ) {
    return;
  }

  // 3. For static assets (_next/static, icons, images, fonts): Cache-First Strategy
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 4. For HTML Page Navigation: Network-First Strategy with offline page fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;

          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>Offline | DukaanOS</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
                  .card { background: white; padding: 32px; border-radius: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); max-width: 420px; border: 1px solid #e2e8f0; }
                  h1 { font-size: 20px; margin: 12px 0 8px; color: #0f172a; }
                  p { font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 20px; }
                  .btn { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 12px; font-size: 13px; font-weight: 600; text-decoration: none; border: none; cursor: pointer; }
                </style>
              </head>
              <body>
                <div class="card">
                  <div style="font-size: 40px;">⚡</div>
                  <h1>You are currently offline</h1>
                  <p>DukaanOS is operating in offline mode. If you are using the POS Terminal, your cached products and sales are safely saved locally and will sync when you reconnect.</p>
                  <button class="btn" onclick="window.location.reload()">Retry Connection</button>
                </div>
              </body>
            </html>`,
            {
              headers: { 'Content-Type': 'text/html' },
            }
          );
        })
    );
  }
});

// ----------------------------------------
// Web Push Handlers
// ----------------------------------------

self.addEventListener('push', (event) => {
  let data = {
    title: 'DukaanOS Notification',
    body: 'You have a new update from your store.',
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    data: { url: '/dashboard/notifications' },
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.svg',
    badge: data.badge || '/icons/icon-192.svg',
    vibrate: [100, 50, 100],
    data: data.data || { url: '/dashboard/notifications' },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/dashboard/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and navigate
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && client.url.includes(self.location.origin)) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }
      // If no window is open, open a new browser window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
