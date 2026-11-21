'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const css=fs.readFileSync('sc-botoes-compactos.css','utf8');
const js=fs.readFileSync('sc-botoes-compactos.js','utf8');
const worker=fs.readFileSync('sw.js','utf8');
const html=fs.readFileSync('index.html','utf8');
test('Premium Light mantém contrato de dados e Apps Script',()=>{
  assert.match(html,/var VERSAO_TELA = '2026-11-20d';/);
  assert.match(worker,/const VERSION='2026-11-20d';/);
  assert.match(html,/sc-drive-projetos\.js\?v=2026-11-20d/);
  assert.match(worker,/premium-claro-20261121d/);
  assert.match(js,/SC183Premium/);
});
test('Premium Light apresenta três famílias de cores claras sem ocultar temas escuros',()=>{
  for(const theme of ['minimal','glass','editorial'])
    assert(css.includes('[data-sc-theme="'+theme+'"]'),theme);
  for(const theme of ['neural','executive'])
    assert(css.includes(':not([data-sc-theme="'+theme+'"])'),theme);
  for(const feature of ['sc148-grid','sc182-tabstrip','sc129-project','sc126-list','#sc117-fab','#nav-movel'])
    assert(css.includes(feature),feature);
});
test('Novo javascript compila sem alterar a API',()=>{
  new vm.Script(js);
  new vm.Script(worker);
  assert.doesNotMatch(js,/DriveApp|google\.script\.run\.scDriveProjetosApi/);
});
test('Barra lateral mantém somente atalhos existentes e resiste ao rerender',async t=>{
  const dom=new JSDOM('<!doctype html><html><body><nav id="nav-movel"><button data-sc126-route="hoje">Hoje</button></nav></body></html>',{
    runScripts:'outside-only',url:'https://example.test/',pretendToBeVisual:true
  });
  t.after(()=>dom.window.close());
  dom.window.eval(js);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  const nav=dom.window.document.getElementById('nav-movel');
  assert.equal(nav.querySelectorAll('.sc183-sidebrand').length,1);
  assert.equal(nav.querySelectorAll('.sc183-quick').length,4);
  assert(nav.querySelector('[data-sc126-route="agenda"]'));
  assert(nav.querySelector('[data-sc126-organize="projetos"]'));
  assert(nav.querySelector('[data-sc126-organize="financas"]'));
  assert(nav.querySelector('[data-sc126-extra="ajustes"]'));
  nav.innerHTML='<button data-sc126-route="biblioteca">Biblioteca</button>';
  await Promise.resolve();
  assert.equal(nav.querySelectorAll('.sc183-sidebrand').length,1);
  assert.equal(nav.querySelectorAll('.sc183-sidelinks').length,1);
});
test('CSS Premium Light não tem chaves desbalanceadas',()=>{
  let depth=0,quoted='',comment=false;
  for(let i=0;i<css.length;i++){
    const c=css[i],n=css[i+1];
    if(comment){if(c==='*'&&n==='/'){comment=false;i++;}continue;}
    if(quoted){if(c==='\\')i++;else if(c===quoted)quoted='';continue;}
    if(c==='/'&&n==='*'){comment=true;i++;continue;}
    if(c==='"'||c==="'"){quoted=c;continue;}
    if(c==='{')depth++;
    if(c==='}')depth--;
    assert(depth>=0,'Chave de fechamento inesperada');
  }
  assert.equal(depth,0,'CSS com bloco não fechado');
});
