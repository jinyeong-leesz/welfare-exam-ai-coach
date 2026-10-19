const CACHE='welfare-coach-v2-20261019-r2';
const ASSETS=['./','./index.html','./styles.css','./questions.js','./core.js','./app.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys()){if((k.startsWith('welfare-coach-')||k.startsWith('welfare-exam-ai-coach-'))&&k!==CACHE)await caches.delete(k);}await self.clients.claim();})()));
self.addEventListener('fetch',e=>{const url=new URL(e.request.url);if(e.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 e.respondWith((async()=>{const c=await caches.open(CACHE);const cached=await c.match(e.request,{ignoreSearch:true});if(cached)return cached;try{return await fetch(e.request);}catch{if(e.request.mode==='navigate')return c.match('./index.html');return Response.error();}})());
});
