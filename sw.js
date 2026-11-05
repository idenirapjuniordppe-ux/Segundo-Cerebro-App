/* 2º Cérebro 6.3 PWA shell: cache de interface; jamais intercepta Google Apps Script ou dados. */
const CACHE='segundo-cerebro-6.7-android-r1';
const CORE=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./offline.html','./pwa-transport.js','./pwa-install.js'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const names=await caches.keys();await Promise.all(names.filter(n=>(n.startsWith('segundo-cerebro-6.2-android-')||n.startsWith('segundo-cerebro-6.3-android-')||n.startsWith('segundo-cerebro-6.4-android-')||n.startsWith('segundo-cerebro-6.5-android-')||n.startsWith('segundo-cerebro-6.6-android-')||n.startsWith('segundo-cerebro-6.7-android-'))&&n!==CACHE).map(n=>caches.delete(n)));await self.clients.claim();})());});
self.addEventListener('message',e=>{if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{const r=event.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==self.location.origin)return;
if(r.mode==='navigate'){event.respondWith((async()=>{try{const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),4500);try{let net=await fetch(r,{signal:ctrl.signal});if(net.ok){const cache=await caches.open(CACHE);cache.put('./index.html',net.clone());}return net;}finally{clearTimeout(t);}}catch(e){return await caches.match('./index.html')||await caches.match('./offline.html');}})());return;}
if(!/\.(?:html|webmanifest|png|css|js|svg)$/i.test(u.pathname))return;
event.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{if(res.ok&&res.type==='basic'){let clone=res.clone();caches.open(CACHE).then(c=>c.put(r,clone));}return res;})));
});
