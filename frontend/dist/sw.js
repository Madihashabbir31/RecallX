const CACHE = "recallx-shell-63b913141fba";
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll([
        "/",
        "/index.html",
        "/manifest.webmanifest",
        "/icon-192.png",
        "/icon-512.png",
        "/favicon.svg",
      ]);
      const html = await (await fetch("/index.html")).text();
      const urls = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(
        (m) => m[1],
      );
      await cache.addAll([...urls,...["/assets/index-C2b84i_Y.css","/assets/index-xOx2cf-7.js","/assets/inter-cyrillic-400-normal-HOLc17fK.woff","/assets/inter-cyrillic-400-normal-obahsSVq.woff2","/assets/inter-cyrillic-500-normal-BasfLYem.woff2","/assets/inter-cyrillic-500-normal-CxZf_p3X.woff","/assets/inter-cyrillic-600-normal-4D_pXhcN.woff","/assets/inter-cyrillic-600-normal-CWCymEST.woff2","/assets/inter-cyrillic-ext-400-normal-BQZuk6qB.woff2","/assets/inter-cyrillic-ext-400-normal-DQukG94-.woff","/assets/inter-cyrillic-ext-500-normal-B0yAr1jD.woff2","/assets/inter-cyrillic-ext-500-normal-BmqWE9Dz.woff","/assets/inter-cyrillic-ext-600-normal-Bcila6Z-.woff","/assets/inter-cyrillic-ext-600-normal-Dfes3d0z.woff2","/assets/inter-greek-400-normal-B4URO6DV.woff2","/assets/inter-greek-400-normal-q2sYcFCs.woff","/assets/inter-greek-500-normal-BIZE56-Y.woff2","/assets/inter-greek-500-normal-Xzm54t5V.woff","/assets/inter-greek-600-normal-BZpKdvQh.woff","/assets/inter-greek-600-normal-plRanbMR.woff2","/assets/inter-greek-ext-400-normal-DGGRlc-M.woff2","/assets/inter-greek-ext-400-normal-KugGGMne.woff","/assets/inter-greek-ext-500-normal-2j5mBUwD.woff","/assets/inter-greek-ext-500-normal-C4iEst2y.woff2","/assets/inter-greek-ext-600-normal-B8X0CLgF.woff","/assets/inter-greek-ext-600-normal-DRtmH8MT.woff2","/assets/inter-latin-400-normal-C38fXH4l.woff2","/assets/inter-latin-400-normal-CyCys3Eg.woff","/assets/inter-latin-500-normal-BL9OpVg8.woff","/assets/inter-latin-500-normal-Cerq10X2.woff2","/assets/inter-latin-600-normal-CiBQ2DWP.woff","/assets/inter-latin-600-normal-LgqL8muc.woff2","/assets/inter-latin-ext-400-normal-77YHD8bZ.woff","/assets/inter-latin-ext-400-normal-C1nco2VV.woff2","/assets/inter-latin-ext-500-normal-BxGbmqWO.woff","/assets/inter-latin-ext-500-normal-CV4jyFjo.woff2","/assets/inter-latin-ext-600-normal-CIVaiw4L.woff","/assets/inter-latin-ext-600-normal-D2bJ5OIk.woff2","/assets/inter-vietnamese-400-normal-Bbgyi5SW.woff","/assets/inter-vietnamese-400-normal-DMkecbls.woff2","/assets/inter-vietnamese-500-normal-DOriooB6.woff2","/assets/inter-vietnamese-500-normal-mJboJaSs.woff","/assets/inter-vietnamese-600-normal-BuLX-rYi.woff","/assets/inter-vietnamese-600-normal-Cc8MFFhd.woff2","/assets/poppins-devanagari-600-normal-ClASKHrr.woff","/assets/poppins-devanagari-600-normal-STEjXBNN.woff2","/assets/poppins-latin-600-normal-BJdTmd5m.woff","/assets/poppins-latin-600-normal-zEkxB9Mr.woff2","/assets/poppins-latin-ext-600-normal-CAhIAdZj.woff2","/assets/poppins-latin-ext-600-normal-Df5ffKXP.woff"]]);
      self.skipWaiting();
    })(),
  );
});
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api")
  )
    return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/index.html")),
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        }),
    ),
  );
});
