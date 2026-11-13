/* Atualiza o shell quando não há edição, captura ou gravação em andamento. */
(function(){'use strict';
 if(!('serviceWorker' in navigator)||!/^https?:$/.test(location.protocol))return;
 let registration=null,reloading=false;
 function safe(){
  if(document.visibilityState==='hidden')return false;
  const a=document.activeElement;if(a&&(a.matches('input,textarea,select')||a.isContentEditable))return false;
  if(document.querySelector('#modal:not(.hidden)'))return false;
  if(Array.from(document.querySelectorAll('#captura,#captura-m')).some(f=>f.value.trim()))return false;
  if(typeof pendentes!=='undefined'&&pendentes||typeof enviando!=='undefined'&&enviando||typeof fila!=='undefined'&&fila.length)return false;
  if(window.SC115&&['','-m'].some(k=>{const s=SC115.state(k);return s.armed||s.composing}))return false;
  return true;
 }
 function version(worker){return new Promise(resolve=>{if(!worker)return resolve(null);const c=new MessageChannel(),timer=setTimeout(()=>{c.port1.close();resolve(null)},1500);c.port1.onmessage=e=>{clearTimeout(timer);c.port1.close();resolve(e.data&&e.data.version||null)};worker.postMessage({type:'SC_SHELL_VERSION'},[c.port2])})}
 async function check(){
  if(!safe()||reloading)return;
  if(registration?.waiting){registration.waiting.postMessage({type:'SKIP_WAITING'});return}
  const active=await version(navigator.serviceWorker.controller);
  if(!active||active===window.VERSAO_TELA||!safe())return;
  const key='sc_shell_reloaded_'+active;
  try{if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,'1')}catch(_){return}
  reloading=true;location.reload();
 }
 function register(){navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(reg=>{registration=reg;reg.update().catch(()=>{});reg.addEventListener('updatefound',()=>{const w=reg.installing;w?.addEventListener('statechange',()=>{if(w.state==='installed')check()})});check()}).catch(e=>console.warn('[2º Cérebro] atualização offline indisponível:',e))}
 navigator.serviceWorker.addEventListener('controllerchange',check);
 window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);setInterval(check,15000);
 window.SC127Update={check,safe,version};
 if(document.readyState==='complete')register();else window.addEventListener('load',register,{once:true});
})();
