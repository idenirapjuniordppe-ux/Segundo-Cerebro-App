'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const script=fs.readFileSync('sc-neoglass.js','utf8');
function fixture(){
 const dom=new JSDOM('<!doctype html><html lang="pt-BR"><head><meta name="theme-color" content="#fff"></head><body><div id="topo"><div id="sc129-header"><strong>2º Cérebro</strong><div></div></div></div><main><section id="v-hoje"><div id="sc100-home"></div></section><section id="v-config"><div id="sc69-theme-panel"></div></section></main></body></html>',{url:'https://example.test/Segundo-Cerebro-App/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,dates=new Date(),today=[dates.getFullYear(),String(dates.getMonth()+1).padStart(2,'0'),String(dates.getDate()).padStart(2,'0')].join('-');
 w.D={config:{nome:'Pessoa'},tarefas:[{data:today,status:'aberta'}],eventos:[],projetos:[{status:'ativo'}]};
 w.vistaAtual='hoje';w.hojeISO=()=>today;w.scrollTo=()=>{};
 let created={};
 for(const kind of ['Tarefa','Nota','Projeto','Evento','Novo'])w['abrir'+kind]=()=>{created[kind]=(created[kind]||0)+1;};
 w.eval(script);
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 return {w,dom,created};
}
test('Neo Glass monta a tela Hoje, busca dados reais e não remove telas legadas',t=>{
 const {w,dom}=fixture();t.after(()=>dom.window.close());
 assert(w.document.documentElement.classList.contains('scng'));
 assert(w.document.querySelector('#scng-overview .scng-hero'));
 assert.equal(w.document.querySelector('#scng-today-tasks').textContent,'1');
 assert.equal(w.document.querySelector('#scng-projects-count').textContent,'1');
 assert(w.document.getElementById('sc100-home'));
 assert(w.document.getElementById('sc129-header'));
 assert(w.document.querySelector('#sc129-header .scng-logo'));
 assert(w.document.querySelector('#scng-fab'));
});
test('Ações rápidas utilizam as funções existentes e botão + continua flutuante',t=>{
 const {w,dom,created}=fixture();t.after(()=>dom.window.close());
 w.document.querySelector('[data-scng-create="projeto"]').click();
 w.document.querySelector('[data-scng-create="nota"]').click();
 w.document.getElementById('scng-fab').click();
 assert.equal(created.Projeto,1);
 assert.equal(created.Nota,1);
 assert.equal(created.Novo,1);
});
test('Opções visuais em Ajustes preservam os temas originais e podem voltar ao automático',t=>{
 const {w,dom}=fixture();t.after(()=>dom.window.close());
 const p=w.document.getElementById('sc69-theme-panel');
 assert(p.querySelector('#scng-appearance'));
 const items=p.querySelectorAll('button[data-scng-mode]');
 assert.equal(items.length,4);
 p.querySelector('[data-scng-mode="neon"]').click();
 assert.equal(w.document.documentElement.dataset.scngPreset,'neon');
 assert.equal(w.localStorage.getItem('scng_visual_preset'),'neon');
 p.querySelector('[data-scng-mode="auto"]').click();
 assert(!w.document.documentElement.hasAttribute('data-scng-preset'));
 assert.equal(w.localStorage.getItem('scng_visual_preset'),'auto');
 assert(w.document.getElementById('sc69-theme-panel'));
});
