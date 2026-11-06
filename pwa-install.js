/* 2º Cérebro 7.3: único gestor de instalação e atualização de Service Worker. */
(function(){
'use strict';
var instalar=null, aprovou=false, registro=null, bar=null;
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();instalar=e;});
window.scInstalarPWA=function(){if(instalar){var x=instalar;instalar=null;x.prompt();return;}alert('Android / Chrome: toque em ⋮ → Instalar aplicativo ou Adicionar à tela inicial.');};
if(!('serviceWorker' in navigator))return;
function contagem(chave){
 try{var arr=JSON.parse(localStorage.getItem(chave)||'[]');return Array.isArray(arr)?arr.length:1;}catch(e){return 1;}
}
function totalRisco(){
 var fila=contagem('sc_fila_v1'),quarentena=contagem('sc_fila_mortos_v1');
 return fila+quarentena+(window.sc60FilaNaoPersistida===true?1:0);
}
function alertar(reg){
 if(!reg||!reg.waiting)return;
 if(!bar){
  bar=document.createElement('div');bar.id='sc73-atualizacao';bar.setAttribute('role','status');
  bar.style.cssText='position:fixed;bottom:calc(82px + env(safe-area-inset-bottom,0px));left:12px;right:12px;max-width:540px;margin:auto;z-index:99980;background:#20375a;color:#fff;border:1px solid #81a8d2;border-radius:13px;padding:12px;display:flex;align-items:center;gap:8px;font:13px system-ui;box-shadow:0 8px 24px #0004';
  var texto=document.createElement('span');texto.style.flex='1';texto.id='sc73-aviso-texto';bar.appendChild(texto);
  var btn=document.createElement('button');btn.type='button';btn.id='sc73-aplicar';btn.textContent='Atualizar';btn.style.cssText='background:#fff;color:#183153;border:0;border-radius:8px;padding:9px;font-weight:700;min-height:42px';bar.appendChild(btn);
  btn.onclick=function(){
   var n=totalRisco();if(n){atualizar();alert('Existem '+n+' operações locais pendentes, em quarentena ou com risco de perda. Sincronize ou exporte antes de atualizar.');return;}
   if(!window.confirm('Aplicar a nova versão agora?'))return;
   aprovou=true;
   reg.waiting.postMessage({type:'SC55_ACTIVATE_APPROVED'}); // compatível também com SWs anteriores
  };
  document.body.appendChild(bar);
 }
 atualizar();
}
function atualizar(){
 if(!bar)return;
 var n=totalRisco(), msg=bar.querySelector('#sc73-aviso-texto'),b=bar.querySelector('#sc73-aplicar');
 msg.textContent=n?'Atualização disponível; '+n+' operação(ões) local(is) exigem atenção.':'Nova versão disponível para instalar.';
 b.disabled=!!n;b.style.opacity=n?'.55':'1';
}
window.addEventListener('load',function(){
 navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(function(reg){
  registro=reg;
  if(reg.waiting)alertar(reg);
  reg.addEventListener('updatefound',function(){var w=reg.installing;if(w)w.addEventListener('statechange',function(){if(w.state==='installed'&&navigator.serviceWorker.controller)alertar(reg);});});
  reg.update().catch(function(){});
 }).catch(function(e){console.warn('Offline indisponível:',e);});
});
navigator.serviceWorker.addEventListener('controllerchange',function(){if(aprovou){aprovou=false;location.reload();}});
})();
