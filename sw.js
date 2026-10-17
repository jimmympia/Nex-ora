/* NEXORA — service worker : fonctionnement hors ligne */
const VERSION = 'nexora-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-180.png'];
const EXTERNAL = [
  'https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore-compat.js'
];
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.allSettled(SHELL.map(u => c.add(u)));
    await Promise.allSettled(EXTERNAL.map(u => c.add(new Request(u, { mode: 'no-cors' }))));
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
function timeout(ms) { return new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms)); }
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Page principale : réseau d'abord (nouveautés), sinon copie enregistrée
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const c = await caches.open(VERSION);
      try {
        const net = await Promise.race([fetch(req), timeout(4000)]);
