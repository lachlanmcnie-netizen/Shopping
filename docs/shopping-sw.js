const CACHE_NAME = "shared-shopping-v16.3";
const APP_SHELL = [
  "shopping-login.html",
  "shopping-app.html",
  "shopping-app.css",
  "shopping-app.js",
  "shopping-auth.js",
  "shopping-cloud-config.js",
  "shopping-categories.js",
  "shopping-manifest.webmanifest",
  "shopping-icon.svg",
  "index.html"
];

function toScopedUrl(path) {
  return new URL(path, self.registration.scope).toString();
}

const APP_SHELL_URLS = APP_SHELL.map((path) => toScopedUrl(path));
const APP_SHELL_PATHS = new Set(APP_SHELL_URLS.map((url) => new URL(url).pathname));

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;
  const isAppShellRequest = isSameOrigin && APP_SHELL_PATHS.has(requestUrl.pathname);

  if (isAppShellRequest) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }

          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || "Shopping list updated";
  const options = {
    body: payload.body || "A household item was updated.",
    icon: toScopedUrl("shopping-icon.svg"),
    badge: toScopedUrl("shopping-icon.svg"),
    data: {
      url: payload.url || "shopping-app.html"
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = toScopedUrl(event.notification.data?.url || "shopping-app.html");

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
