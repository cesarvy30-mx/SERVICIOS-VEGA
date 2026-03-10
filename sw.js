// VEGA TEC — Service Worker v1
// Estrategia: Network First — siempre intenta la red, usa caché solo si falla

const CACHE_NAME = 'vegatec-v1';

self.addEventListener('install', event => {
  self.skipWaiting(); // activa inmediatamente sin esperar
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key); // borra cachés viejos
      }))
    ).then(() => self.clients.claim()) // toma control de todas las pestañas
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // Solo interceptamos solicitudes GET de la misma origen
  if (req.method !== 'GET') return;

  event.respondWith(networkFirst(req));
});

async function networkFirst(req) {
  try {
    // Fuerza red sin caché del navegador
    const networkRes = await fetch(req, { cache: 'no-store' });

    // Si la respuesta es válida, la guardamos y la devolvemos
    if (networkRes && networkRes.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, networkRes.clone());
      return networkRes;
    }

    // Si falla (ej: 404), intenta caché
    return await caches.match(req) || networkRes;

  } catch (err) {
    // Sin conexión: usa caché
    const cached = await caches.match(req);
    return cached || new Response('Sin conexión', { status: 503 });
  }
}

// Cuando llega mensaje de nueva versión, borra todo el caché y notifica
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage('CACHE_CLEARED'));
      });
    });
  }
});
