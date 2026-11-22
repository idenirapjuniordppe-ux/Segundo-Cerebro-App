'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('sc-botoes-compactos.css','utf8');
const js=fs.readFileSync('sc-botoes-compactos.js','utf8');
const worker=fs.readFileSync('sw.js','utf8');

function fixture(){
  const dom=new JSDOM('<!doctype html><html class="sc126 sc11-active sc100-active" data-sc-theme="minimal"><body><div class="flex"><main></main></div><nav id="nav-movel"><button class="nav-m" data-sc126-route="hoje" aria-current="page"><svg></svg><span>Hoje</span></button><button class="nav-m" data-sc126-route="organizar" aria-current="false">Organizar</button><button class="nav-m" data-sc126-route="biblioteca" aria-current="false">Biblioteca</button></nav></body></html>',{
    url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true
  });
  const w=dom.window;
  const before=w.document.getElementById('nav-movel').innerHTML;
  w.eval(js);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  return {dom,w,before};
}
test('Mantém versões e integração sem migração nem mudanças de API',()=>{
  assert.match(html,/var VERSAO_TELA = '2026-11-20d';/);
  assert.match(worker,/const VERSION='2026-11-20d';/);
  assert.match(worker,/premium-dashboard-fiel-20261121n/);
  assert.match(html,/sc-drive-projetos\.js\?v=2026-11-20d/);
  assert.match(css,/Studio 11\.30/);
  assert.match(js,/version:'2026-11-21e'/);
});
test('CSS oferece três temas claros e preserva os dois escuros',()=>{
  for(const theme of ['minimal','glass','editorial'])
    assert(css.includes('[data-sc-theme="'+theme+'"]'),theme);
  for(const theme of ['neural','executive'])
    assert(css.includes(':not([data-sc-theme="'+theme+'"])'),theme);
  for(const feature of ['sc148-grid','sc182-tabstrip','sc129-project','sc126-list','#sc117-fab','#sc183-sidebar'])
    assert(css.includes(feature),feature);
});
test('Javascript e service worker compilam sem acesso aos dados do usuário',()=>{
  new vm.Script(js);
  new vm.Script(worker);
  assert.doesNotMatch(js,/DriveApp|google\.script\.run\.scDriveProjetosApi/);
});
test('Barra independente não modifica nem duplica o conteúdo da navegação móvel',t=>{
  const {dom,w,before}=fixture();
  t.after(()=>dom.window.close());
  const mobile=w.document.getElementById('nav-movel');
  const side=w.document.getElementById('sc183-sidebar');
  assert(side,'Sidebar não montada');
  assert.equal(mobile.innerHTML,before,'Navegação móvel original deve permanecer intocada');
  assert.equal(side.querySelectorAll('.sc183-sideitem').length,3);
  assert.equal(side.querySelectorAll('.sc183-quick').length,4);
  assert(side.querySelector('[data-sc126-route="agenda"]'));
  assert(side.querySelector('[data-sc126-organize="projetos"]'));
  assert(side.querySelector('[data-sc126-organize="financas"]'));
  assert(side.querySelector('[data-sc126-extra="ajustes"]'));
  assert.equal(w.document.querySelectorAll('#sc183-sidebar').length,1);
});
test('Rerender mantém sidebar única e atualiza a aba ativa sem loops',async t=>{
  const {dom,w}=fixture();
  t.after(()=>dom.window.close());
  const mobile=w.document.getElementById('nav-movel');
  mobile.innerHTML='<button class="nav-m" data-sc126-route="hoje" aria-current="false">Hoje</button><button class="nav-m" data-sc126-route="biblioteca" aria-current="page">Biblioteca</button>';
  await new Promise(resolve=>w.setTimeout(resolve,0));
  const side=w.document.getElementById('sc183-sidebar');
  assert.equal(w.document.querySelectorAll('#sc183-sidebar').length,1);
  assert.equal(side.querySelectorAll('.sc183-sideitem').length,2);
  assert.equal(side.querySelector('.sc183-sideitem.active').dataset.sc126Route,'biblioteca');
});
test('Sidebar mantém roteamento nativo por delegação de cliques',t=>{
  const {dom,w}=fixture();t.after(()=>dom.window.close());
  let route='',organize='',extra='';
  w.document.addEventListener('click',e=>{
    route=e.target.closest('[data-sc126-route]')?.dataset.sc126Route||route;
    organize=e.target.closest('[data-sc126-organize]')?.dataset.sc126Organize||organize;
    extra=e.target.closest('[data-sc126-extra]')?.dataset.sc126Extra||extra;
  });
  w.document.querySelector('#sc183-sidebar [data-sc126-route="biblioteca"]').click();
  w.document.querySelector('#sc183-sidebar [data-sc126-organize="projetos"]').click();
  w.document.querySelector('#sc183-sidebar [data-sc126-extra="ajustes"]').click();
  assert.deepEqual({route,organize,extra},{route:'biblioteca',organize:'projetos',extra:'ajustes'});
});
test('Regra desktop neutraliza seletor legado de maior especificidade',()=>{
  assert.match(html,/html\[data-sc-theme\] body #nav-movel/);
  assert.match(css,/@media\(min-width:1100px\)/);
  assert.match(css,/html\.sc126\[data-sc-theme\] body #nav-movel\s*\{\s*display:none!important/);
  assert.match(css,/#sc183-sidebar\s*\{\s*position:fixed!important/);
  assert.doesNotMatch(js,/n\.prepend\(brand\)|nav\.prepend\(brand\)/);
});
test('CSS está estruturalmente equilibrado',()=>{
  let depth=0,quoted='',comment=false;
  for(let i=0;i<css.length;i++){
    const c=css[i],n=css[i+1];
    if(comment){if(c==='*'&&n==='/'){comment=false;i++;}continue;}
    if(quoted){if(c==='\\')i++;else if(c===quoted)quoted='';continue;}
    if(c==='/'&&n==='*'){comment=true;i++;continue;}
    if(c==='"'||c==="'"){quoted=c;continue;}
    if(c==='{')depth++;
    if(c==='}')depth--;
    assert(depth>=0,'CSS contém fechamento inesperado');
  }
  assert.equal(depth,0,'CSS possui bloco não fechado');
});
