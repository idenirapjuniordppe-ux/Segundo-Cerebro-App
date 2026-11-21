'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const worker=fs.readFileSync('sw.js','utf8');
const css=fs.readFileSync('sc-botoes-compactos.css','utf8');
const js=fs.readFileSync('sc-botoes-compactos.js','utf8');
function fixture(){
  const dom=new JSDOM('<!doctype html><html lang="pt-BR"><body><section id="v-organizar"><button data-sc126-organize="tarefas" aria-pressed="true">Tarefas</button></section><section id="v-biblioteca"><button data-sc126-library="notas" aria-pressed="true">Notas</button></section><section id="v-hoje"><section class="sc148-root"><input type="date" data-sc148-date value="2026-11-21"></section></section><button id="sc117-fab">+</button></body></html>',{url:'https://example.test/Segundo-Cerebro-App/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;w.eval(js);
  return {dom,w};
}
test('47 scripts internos, módulo contextual e service worker compilam sem erros',()=>{
  let count=0;for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
    if(/\bsrc\s*=/.test(m[1])||!m[2].trim())continue;
    new vm.Script(m[2]);count++;
  }
  assert(count>=47);
  new vm.Script(js);new vm.Script(worker);
});
test('O contrato da API não foi alterado e os assets estão no cache',()=>{
  assert.match(html,/var VERSAO_TELA = '2026-11-20d';/);
  assert.match(worker,/const VERSION='2026-11-20d';/);
  assert.match(worker,/2026-11-21c-botoes/);
  assert.match(worker,/sc-botoes-compactos\.css\?v=2026-11-21c/);
  assert.match(worker,/sc-botoes-compactos\.js\?v=2026-11-21c/);
  assert.match(html,/sc-botoes-compactos\.css\?v=2026-11-21c/);
  assert.match(html,/sc-botoes-compactos\.js\?v=2026-11-21c/);
  assert.match(html,/sc166Vincular/);
  assert.match(html,/sc-drive-projetos\.js\?v=2026-11-20d/);
});
test('Organizar reúne filtros numa faixa única e cria pela seção selecionada',()=>{
  assert.match(html,/sc182-tabstrip/);
  assert.match(html,/sc182-section-heading/);
  assert.match(html,/Tarefas pendentes/);
  assert.match(html,/class="sc182-secondary-tools"/);
  assert.match(html,/data-sc144="slots"/);
  assert.match(html,/data-sc145="menu"/);
  assert.match(css,/.sc182-tabstrip .sc126-tools/);
  assert.match(css,/flex-wrap:nowrap/);
});
test('Biblioteca mantém a busca, filtros e ferramentas existentes com novo layout',()=>{
  assert.match(html,/class="sc182-library-header"/);
  assert.match(html,/class="sc182-library-filters"/);
  assert.match(html,/id="sc129-library-query"/);
  assert.match(html,/data-sc144="open"/);
  assert.match(html,/data-sc145="menu"/);
  assert.match(html,/data-sc126-route="notas"/);
  assert.match(html,/sc138-all-notes/);
  assert.match(css,/sc182-utilities-menu/);
});
test('Hoje mantém os três modos e ações secundárias no menu, sem Hoje redundante',()=>{
  assert.match(html,/sc182-planner-tools/);
  assert.match(html,/data-sc160="new"/);
  assert.match(html,/day===hojeISO\(\)\?'':button\('Hoje','today'\)/);
  assert.match(html,/data-sc148-date/);
  assert.match(css,/sc148-root .sc148-tabs/);
  assert.match(css,/sc148-root .sc148-date/);
});
test('FAB original continua arrastável e chama o menu contextual sem outro FAB',()=>{
  assert.match(html,/button\.addEventListener\('pointermove'/);
  assert.match(html,/setXY\(/);
  assert.match(html,/SC182Buttons\.createMenu\(button\)/);
  assert.match(js,/function createMenu\(anchor\)/);
  assert.doesNotMatch(js,/new\s+WebSocket|fetch\s*\(|DriveApp/);
});
test('FAB adapta as opções às categorias Organizar, Biblioteca e Hoje',t=>{
  const {dom,w}=fixture();t.after(()=>dom.window.close());
  w.vistaAtual='organizar';
  let info=w.SC182Buttons.options();
  assert.equal(info.items[0].label,'Nova tarefa');
  w.document.querySelector('[data-sc126-organize]').setAttribute('data-sc126-organize','projetos');
  info=w.SC182Buttons.options();assert.equal(info.items[0].label,'Novo projeto');
  w.vistaAtual='biblioteca';info=w.SC182Buttons.options();
  assert.equal(info.items[0].label,'Nova nota');
  w.document.querySelector('[data-sc126-library]').setAttribute('data-sc126-library','postits');
  info=w.SC182Buttons.options();assert.equal(info.items[0].label,'Novo post-it');
  w.vistaAtual='hoje';info=w.SC182Buttons.options();
  assert.equal(info.items.length,4);
  assert.equal(info.items.find(x=>x.label==='Anotar neste dia').attrs['data-day'],'2026-11-21');
});
test('Menu contextual preserva o click delegado do aplicativo e fecha após escolher',async t=>{
  const {dom,w}=fixture();t.after(()=>dom.window.close());
  w.vistaAtual='organizar';
  let seen='';
  w.document.addEventListener('click',e=>{if(e.target.matches('[data-sc126-new]'))seen=e.target.dataset.sc126New;});
  const fab=w.document.getElementById('sc117-fab');
  w.SC182Buttons.createMenu(fab);
  const menu=w.document.getElementById('sc182-create-menu');
  assert(menu);
  assert.equal(fab.getAttribute('aria-expanded'),'true');
  const action=menu.querySelector('[data-sc126-new]');
  assert(action);action.click();
  await Promise.resolve();
  assert.equal(seen,'tarefas');
  assert.equal(w.document.getElementById('sc182-create-menu'),null);
  assert.equal(fab.getAttribute('aria-expanded'),'false');
});
test('CSS de botões responsivo e sem blocos malformados',()=>{
  for(const p of ['#v-organizar','#v-biblioteca','.sc148-root','#sc117-fab','#sc182-create-menu'])
    assert(css.includes(p),'Falta estilo para '+p);
  assert.match(css,/@media\(max-width:640px\)/);
  assert.match(css,/@media\(min-width:900px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  let depth=0,quoted='',comment=false;
  for(let i=0;i<css.length;i++){
    const c=css[i],n=css[i+1];
    if(comment){if(c==='*'&&n==='/'){comment=false;i++;}continue;}
    if(quoted){if(c==='\\')i++;else if(c===quoted)quoted='';continue;}
    if(c==='/'&&n==='*'){comment=true;i++;continue;}
    if(c==='"'||c==="'"){quoted=c;continue;}
    if(c==='{')depth++;
    if(c==='}')depth--;
    assert(depth>=0,'Fechamento inesperado em CSS');
  }
  assert.equal(depth,0,'CSS desbalanceado');
});
