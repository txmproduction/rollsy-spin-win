// Service worker minimal : rend l'application installable, sans mise en cache agressive.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // pass-through : le réseau gère tout
});
