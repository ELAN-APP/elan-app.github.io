/* Service worker d'Élan : permet l'utilisation hors connexion.
   Stratégie : réseau d'abord (toujours à jour quand tu es en ligne), cache en secours hors connexion.

   À CHAQUE MISE À JOUR DE L'APPLI, change VERSION ci-dessous (par exemple la date du jour + un numéro).
   Le navigateur voit alors que sw.js a changé : il installe la nouvelle version, qui remplit un nouveau cache
   et supprime les anciens caches d'Élan. Les données (localStorage : elan-v3, copies…) ne sont jamais touchées. */
const VERSION = "2026-11-15-122704";
const CACHE = "elan-app-" + VERSION;
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  // supprime les anciens caches d'Élan (dont l'ancien « elan-v11 »), et seulement ceux-là
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("elan-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return; // rien d'extérieur n'est intercepté ni mis en cache

  const isPage = req.mode === "navigate";
  event.respondWith(
    fetch(req)
      .then(res => {
        // ne garder que les réponses réussies du site lui-même (pas les erreurs 404 ou 500)
        if(res.ok && res.type === "basic"){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req).then(hit => {
        if(hit) return hit;
        // hors connexion : la page d'accueil seulement pour l'ouverture de l'appli, jamais à la place d'une image
        if(isPage) return caches.match("./index.html").then(p => p || Response.error());
        return Response.error();
      }))
  );
});
