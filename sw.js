/* 2º Cérebro Studio 9.0 — cache isolado da interface; NUNCA armazena respostas Google. */
const VERSION='2026-11-13k';
const CACHE='segundo-cerebro-2026-11-13k-sc11190-'+encodeURIComponent(self.registration.scope);
const PREFIX='segundo-cerebro-';
const ESSENCIAIS=['./wallpaper-neural-11-18.webp','./wallpaper-minimal-11-18.webp','./wallpaper-glass-11-18.webp','./wallpaper-executive-11-18.webp','./wallpaper-editorial-11-18.webp','./index.html','./pwa-transport.js?v=2026-11-13k-sc11190','./pwa-install.js?v=2026-11-13k-sc11190'];
const OPCIONAIS=['./offline.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./segundo-cerebro-fundo.webp','./fundo-minimal.webp','./fundo-glass.webp','./fundo-executive.webp','./fundo-editorial.webp'];
self.addEventListener('install',event=>{event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 for(const path of ESSENCIAIS){
  const response=await fetch(new Request(new URL(path,self.registration.scope),{cache:'no-store'}));
  if(!response.ok)throw new Error('Shell indisponível');
  if(path==='./index.html'&&!((await response.clone().text()).includes("var VERSAO_TELA = '"+VERSION+"'")))throw new Error('Shell ainda não publicado nesta versão');
  await cache.put(path,response);
 } // sem app shell funcional, manter SW anterior
 await Promise.all(OPCIONAIS.map(async path=>{try{await cache.add(path);}catch(e){console.warn('[SW] recurso opcional:',path);}}));
})());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
 const keys=await caches.keys();
 // GitHub Pages pode hospedar vários aplicativos no mesmo domínio.
 // Excluir somente caches antigos com respostas pertencentes ao escopo atual.
 await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(async k=>{
   try{
     const antigo=await caches.open(k), recursos=await antigo.keys();
     if(recursos.length && recursos.every(r=>r.url.startsWith(self.registration.scope))) await caches.delete(k);
   }catch(e){console.warn('[SW] cache antigo preservado:',k);}
 }));
 await self.clients.claim();
})());});
self.addEventListener('message',e=>{if(e.data?.type==='SC_SHELL_VERSION'){e.ports?.[0]?.postMessage({version:VERSION});return}if(e.data&&['SKIP_WAITING','SC55_ACTIVATE_APPROVED','SC73_ACTIVATE_APPROVED','SC74_ACTIVATE_APPROVED','SC75_ACTIVATE_APPROVED'].includes(e.data.type))self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const r=event.request;if(r.method!=='GET')return;
 const url=new URL(r.url);if(url.origin!==self.location.origin)return;
 if(r.mode==='navigate'){
  event.respondWith((async()=>{try{
    const response=await fetch(new Request(r,{cache:'no-store'}));
    const start=new URL('./',self.registration.scope);
    if(response.ok && response.url && new URL(response.url).origin===self.location.origin && new URL(response.url).pathname===url.pathname && (url.pathname===start.pathname || url.pathname===start.pathname+'index.html') && (response.headers.get('Content-Type')||'').includes('text/html')){const cache=await caches.open(CACHE);if(!(await response.clone().text()).includes("var VERSAO_TELA = '"+VERSION+"'"))return (await cache.match('./index.html'))||response;cache.put('./index.html',response.clone()).catch(()=>{});}
    return response;
   }catch(e){const cache=await caches.open(CACHE);return (await cache.match('./index.html'))||(await cache.match('./offline.html'))||Response.error();}})());return;
 }
 if(!/\.(?:html|webmanifest|png|webp|css|js|svg)$/i.test(url.pathname))return;
 event.respondWith((async()=>{
   const cache=await caches.open(CACHE);const cached=await cache.match(r);if(cached)return cached;
   const response=await fetch(r);if(response.ok&&response.type==='basic'){
      cache.put(r,response.clone()).catch(()=>{});
   }
   return response;
 })());
});





