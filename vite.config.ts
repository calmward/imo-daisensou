import { defineConfig, type Plugin } from 'vite';

/** Emits a tiny service worker that precaches every built file, so the game works offline. */
function serviceWorker(): Plugin {
  return {
    name: 'imo-sw',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      const extra = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];
      const list = [...new Set([...extra, ...files])];
      const version = Date.now().toString(36);
      const sw = `// generated
const CACHE = 'imo-${version}';
const ASSETS = ${JSON.stringify(list)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // network first for the page so updates arrive, cache fallback offline
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3500));
    e.respondWith(Promise.race([fetch(req), timeout]).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put('index.html', cp)); } return r; }).catch(() => caches.match('index.html', { ignoreVary: true })));
    return;
  }
  e.respondWith(caches.match(req, { ignoreVary: true, ignoreSearch: true }).then((hit) => hit || fetch(req).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); } return r; })));
});
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: sw });
    },
  };
}

export default defineConfig({
  base: './',
  build: { target: 'es2020', assetsInlineLimit: 0 },
  server: { host: true },
  plugins: [serviceWorker()],
  test: { environment: 'node' },
} as any);
