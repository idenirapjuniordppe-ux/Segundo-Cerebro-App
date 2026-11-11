/* 2º Cérebro Studio 9.0.2 — registro seguro do Service Worker.
 * Não apaga caches nem registros locais; não força a ativação ou o recarregamento.
 * Permite que a atualização aguardando ativação entre em vigor quando as abas forem fechadas.
 */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
  function registrar() {
    navigator.serviceWorker.register('./sw.js', {scope:'./', updateViaCache:'none'})
      .then(function (reg) {
        reg.update().catch(function () {});
      })
      .catch(function (err) {
        console.warn('[2º Cérebro] atualização offline indisponível:', err);
      });
  }
  if (document.readyState === 'complete') registrar();
  else window.addEventListener('load', registrar, {once:true});
})();
