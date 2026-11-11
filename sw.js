/* 2º Cérebro Studio 9.0 — cache isolado da interface; NUNCA armazena respostas Google. */
const CACHE='segundo-cerebro-2026-11-11c-sc903';
const PREFIX='segundo-cerebro-';
const ESSENCIAIS=['./index.html','./pwa-transport.js?v=2026-11-11c','./pwa-install.js?v=2026-11-11c'];
const OPCIONAIS=['./offline.html','./','./manifest.webmanifest','./icon-192.png','./icon-512.png','./segundo-cerebro-fundo.webp','./fundo-minimal.webp','./fundo-glass.webp','./fundo-executive.webp','./fundo-editorial.webp'];
self.addEventListener('install',event=>{event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await cache.addAll(ESSENCIAIS); // sem app shell funcional, manter SW anterior
 await Promise.all(OPCIONAIS.map(async path=>{try{await cache.add(path);}catch(e){console.warn('[SW] recurso opcional:',path);}}));
})());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
 const keys=await caches.keys();
 // GitHub Pages pode hospedar vários aplicativos no mesmo domínio.
 // Excluir somente caches antigos com respostas pertencentes ao escopo atual.
 await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(async k=>{
   try{
     const antigo=await caches.open(k), recursos=await antigo.keys();
     if(recursos.some(r=>r.url.startsWith(self.registration.scope))) await caches.delete(k);
   }catch(e){console.warn('[SW] cache antigo preservado:',k);}
 }));
 await self.clients.claim();
})());});
self.addEventListener('message',e=>{if(e.data&&['SKIP_WAITING','SC55_ACTIVATE_APPROVED','SC73_ACTIVATE_APPROVED','SC74_ACTIVATE_APPROVED','SC75_ACTIVATE_APPROVED'].includes(e.data.type))self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const r=event.request;if(r.method!=='GET')return;
 const url=new URL(r.url);if(url.origin!==self.location.origin)return;
 if(r.mode==='navigate'){
  event.respondWith((async()=>{try{
    const response=await fetch(r);
    const start=new URL('./',self.registration.scope);
    if(response.ok && (url.pathname===start.pathname || url.pathname===start.pathname+'index.html') && (response.headers.get('Content-Type')||'').includes('text/html')){const cache=await caches.open(CACHE);cache.put('./index.html',response.clone()).catch(()=>{});}
    return response;
   }catch(e){return (await caches.match('./index.html'))||(await caches.match('./offline.html'))||Response.error();}})());return;
 }
 if(!/\.(?:html|webmanifest|png|webp|css|js|svg)$/i.test(url.pathname))return;
 event.respondWith((async()=>{
   const cached=await caches.match(r);if(cached)return cached;
   const response=await fetch(r);if(response.ok&&response.type==='basic'){
      const cache=await caches.open(CACHE);cache.put(r,response.clone()).catch(()=>{});
   }
   return response;
 })());
});





