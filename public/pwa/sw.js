// Shared worker, independent app manifests. Only public PWA icons are cacheable.
const CACHE='taallamt-pwa-icons-v1';
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('taallamt-pwa-icons-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.search||!/^\/pwa\/(student|teacher)-(32|180|192|512)(-maskable)?\.png$/.test(url.pathname))return;
 event.respondWith(caches.open(CACHE).then(async cache=>{
  const cached=await cache.match(event.request);if(cached)return cached;
  const response=await fetch(event.request);if(response.ok&&response.type!=='opaque')await cache.put(event.request,response.clone());return response;
 }));
});
// No skipWaiting or automatic reload: active forms remain undisturbed.
