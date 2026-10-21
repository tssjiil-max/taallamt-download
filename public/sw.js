const SW_VERSION='taallamt-pwa-20261022';
const identity=url=>url.pathname.startsWith('/pwa/')||/\.(?:webmanifest|ico)$/.test(url.pathname)||['/sw.js','/pwa-identity.js','/site-splash.css','/shakabumbo-splash.png'].includes(url.pathname)||(url.pathname==='/api/student-state'&&url.searchParams.get('view')==='pwa-manifest');
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  // Remove only cached installation artwork/metadata on this origin. Retain cached student work and all browser storage.
  for(const key of await caches.keys()){
   if(!key.toLowerCase().includes('taallamt'))continue;
   const cache=await caches.open(key);
   for(const request of await cache.keys()){const url=new URL(request.url);if(url.origin===self.location.origin&&identity(url))await cache.delete(request)}
  }
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET')return;
 const url=new URL(request.url);if(url.origin!==self.location.origin)return;
 event.respondWith(identity(url)?fetch(request,{cache:'no-store'}):fetch(request));
});
