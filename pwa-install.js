(function(){
'use strict';
var installEvent=null;
window.addEventListener('beforeinstallprompt',function(e){ e.preventDefault(); installEvent=e; });
window.scInstalarPWA=function(){
 if(installEvent){var x=installEvent;installEvent=null;x.prompt();return;}
 alert('No Chrome para Android, toque em ⋮ → Instalar aplicativo ou Adicionar à tela inicial.');
};
if(!('serviceWorker' in navigator))return;
window.addEventListener('load',function(){navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(function(reg){
 var showed=false;
 function pending(){ try{if(typeof fila!=='undefined' && Array.isArray(fila))return fila.length;return JSON.parse(localStorage.getItem('sc_fila_v1')||'[]').length;}catch(e){return 1;} }
 function propose(){if(showed||!reg.waiting)return;showed=true;
  var bar=document.createElement('div');bar.setAttribute('role','status');bar.style.cssText='position:fixed;bottom:calc(90px + env(safe-area-inset-bottom));left:12px;right:12px;z-index:99990;padding:13px;background:#192c4e;color:#fff;border-radius:14px;box-shadow:0 8px 24px #0004;display:flex;align-items:center;gap:10px;font:13px system-ui';
  var t=document.createElement('span');t.style.flex='1';t.textContent='Atualização disponível para o 2º Cérebro.';bar.appendChild(t);
  var b=document.createElement('button');b.textContent='Atualizar';b.style.cssText='background:#fff;color:#123;border:0;padding:9px;border-radius:8px;font-weight:700';bar.appendChild(b);
  b.onclick=function(){var n=pending();if(n){alert('Existem '+n+' alterações pendentes. Sincronize antes de atualizar.');return;}reg.waiting.postMessage({type:'SKIP_WAITING'});};
  document.body.appendChild(bar);
 }
 if(reg.waiting)propose();reg.addEventListener('updatefound',function(){var w=reg.installing;if(w)w.addEventListener('statechange',function(){if(w.state==='installed'&&navigator.serviceWorker.controller)propose();});});
 var refreshing=false;navigator.serviceWorker.addEventListener('controllerchange',function(){if(!refreshing){refreshing=true;location.reload();}});
 }).catch(function(e){console.warn('Instalação offline não disponível:',e);});});
})();