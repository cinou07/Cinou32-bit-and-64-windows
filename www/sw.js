/* =========================================================================
   CINOU SERVICE WORKER  (v2 — device-routing safe)

   Same two jobs as before:
     1. Satisfies the browser's PWA "installability" requirement.
     2. Caches the static app shell so the installed app opens instantly
        and still opens (read-only) if offline.

   WHAT CHANGED vs v1 and WHY IT MATTERS:
     v1 answered every GET from the cache first. That meant a phone which
     had visited the site before was handed the CACHED DESKTOP index.html
     for "/", and the server-side device detector never got a say. Page
     requests (navigations) now go to the network first, so "/" is always
     resolved by the detector; the cached copy is only used when the
     network is unreachable.

   It still ignores anything that isn't a same-origin GET, so POST calls
   like /api/chat and third-party traffic (Groq, Google, Puter…) always go
   straight to the network, untouched.
   ========================================================================= */

const CACHE_NAME = 'cinouai-shell-v2';

/* Assets only — index.html is deliberately NOT pre-cached, because which
   index.html is correct depends on the device asking for it. */
const SHELL_FILES = [
    './style.css',
    './app.js',
    './logo.png',
    './mobile.css',
    './mobile.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => Promise.allSettled(
                SHELL_FILES.map((file) => cache.add(file))
            ))
            .catch((err) => console.warn('CinouAI SW: shell cache skipped', err))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {

    const request = event.request;

    if (request.method !== 'GET') return;          // never touch POST /api/chat etc.

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return; // never touch Groq/Google/Puter calls

    /* ---- PAGES: network first, so the device detector always decides ---- */

    const isPageRequest =
        request.mode === 'navigate' ||
        (request.headers.get('accept') || '').includes('text/html');

    if (isPageRequest) {

        event.respondWith(
            fetch(request)
                .then((response) => {

                    if (response && response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    }

                    return response;
                })
                .catch(() =>
                    caches.match(request).then(
                        (cached) => cached || caches.match('./')
                    )
                )
        );

        return;
    }

    /* ---- ASSETS: cache first, refreshed in the background ---- */

    event.respondWith(
        caches.match(request).then((cached) => {

            const network = fetch(request)
                .then((response) => {

                    if (response && response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    }

                    return response;
                })
                .catch(() => cached);

            return cached || network;
        })
    );
});
