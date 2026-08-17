// Service worker do app Canal do Sorrilha.
// - Cacheia o "shell" (páginas, ícones, imagens) para abrir rápido e offline.
// - Usa network-first para os dados (news/clipping/trump), assim o conteúdo
//   fica sempre o mais novo quando há internet, mas ainda abre offline.
const VERSION = "v8";
const SHELL_CACHE = "sorrilha-shell-" + VERSION;
const DATA_CACHE = "sorrilha-data-" + VERSION;

const SHELL = [
  "./",
  "./index.html",
  "./simulador.html",
  "./logo.png",
  "./donkey.webp",
  "./elephant.webp",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./manifest.json",
];

// Arquivos de dados: sempre tentar a rede primeiro.
const DATA_FILES = ["news.json", "clipping.json", "trump.json", "blindspot.json", "midterms.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isData = DATA_FILES.some((f) => url.pathname.endsWith("/" + f) || url.pathname.endsWith(f));

  if (isData) {
    // network-first
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(DATA_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // shell: cache-first, com atualização em segundo plano
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
