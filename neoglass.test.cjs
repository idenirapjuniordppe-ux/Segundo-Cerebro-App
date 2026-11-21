'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('sc-neoglass.css','utf8');
const js=fs.readFileSync('sc-neoglass.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
test('backup-friendly: Neo Glass é aditivo e mantém protocolo 2026-11-20d',()=>{
 assert.match(html,/var VERSAO_TELA = '2026-11-20d'/);
 assert.match(sw,/const VERSION='2026-11-20d'/);
 assert.match(sw,/segundo-cerebro-2026-11-21a-neoglass/);
 assert.match(html,/sc-neoglass\.css\?v=2026-11-21a/);
 assert.match(html,/sc-neoglass\.js\?v=2026-11-21a/);
 assert.match(sw,/sc-neoglass\.css\?v=2026-11-21a/);
 assert.match(sw,/sc-neoglass\.js\?v=2026-11-21a/);
 assert.match(html,/SCDrive\.shell/);
 assert.match(html,/SCDrive\.mount/);
 assert.match(html,/sc166Vincular/);
 assert.match(html,/sc166Bootstrap/);
});
test('módulos e scripts existentes não têm erros de sintaxe',()=>{
 for(const code of [js,sw])new vm.Script(code);
 let found=0;
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(m[1].includes('src=')||!m[2].trim())continue;
  new vm.Script(m[2]);found++;
 }
 assert(found>=40);
});
test('CSS cobre modos, acessibilidade e responsividade',()=>{
 assert.match(css,/data-scng-preset="aurora"/);
 assert.match(css,/data-scng-preset="neon"/);
 assert.match(css,/data-scng-preset="executive"/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/@media\(min-width:900px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/#scng-fab/);
 assert.match(css,/#modal-caixa/);
 assert.match(css,/#scd-box/);
 let count=0,quoted='',escape=false,comment=false;
 for(let i=0;i<css.length;i++){
  const c=css[i],n=css[i+1];
  if(comment){if(c==='*'&&n==='/'){comment=false;i++;}continue;}
  if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quoted)quoted='';continue;}
  if(c==='/'&&n==='*'){comment=true;i++;continue;}
  if(c==='"'||c==="'"){quoted=c;continue;}
  if(c==='{')count++;if(c==='}')count--;
  assert(count>=0,'Chaves CSS não podem fechar antes de abrir');
 }
 assert.equal(count,0,'Blocos CSS devem estar balanceados');
});
test('atmosferas persistem sem gravar em planilhas ou apagar dados',()=>{
 const saved=new Map(),byId=new Map();
 const classes=new Set();
 const document={
  readyState:'loading',
  documentElement:{
   classList:{add:x=>classes.add(x),contains:x=>classes.has(x)},
   dataset:{},attributes:{},
   setAttribute(k,v){this.attributes[k]=v;},
   removeAttribute(k){delete this.attributes[k];}
  },
  getElementById:id=>byId.get(id)||null,
  querySelector:()=>null,
  addEventListener:()=>{}
 };
 const context={
   window:{},document,localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},
   console,MutationObserver:class{},setInterval:()=>0
 };
 vm.runInNewContext(js,context);
 const api=context.window.SCNeoGlass;
 assert.equal(api.version,'2026-11-21a');
 assert.equal(api.preset(),'auto');
 api.applyPreset('neon',true);
 assert.equal(api.preset(),'neon');
 assert.equal(document.documentElement.attributes['data-scng-preset'],'neon');
 api.applyPreset('aurora',true);
 assert.equal(api.preset(),'aurora');
 api.applyPreset('auto',true);
 assert.equal(api.preset(),'auto');
 assert(!('data-scng-preset' in document.documentElement.attributes));
 assert(classes.has('scng'));
});
test('resumo usa apenas contagens reais do estado local',()=>{
 const saved=new Map(),byId=new Map();
 ['scng-overview','scng-hero-title','scng-date-label','scng-today-tasks','scng-today-events','scng-projects-count'].forEach(id=>byId.set(id,{textContent:''}));
 const document={
  readyState:'loading',
  documentElement:{classList:{add(){},contains(){return false}},dataset:{},removeAttribute(){},setAttribute(){}},
  getElementById:id=>byId.get(id)||null,querySelector:()=>null,addEventListener:()=>{}
 };
 const d=new Date(),today=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 const D={
  tarefas:[{data:today,status:'aberta'},{data:today,status:'feita'},{data:'2000-01-01',status:'aberta'}],
  eventos:[{data:today,concluido:''},{data:today,concluido:'Sim'}],
  projetos:[{status:'ativo'},{status:'concluido'}],
  config:{nome:'Teste'}
 };
 const snapshot=JSON.stringify(D);
 const context={window:{},document,D,localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},console,MutationObserver:class{},setInterval:()=>0};
 vm.runInNewContext(js,context);
 context.window.SCNeoGlass.updateSummary();
 assert.equal(byId.get('scng-today-tasks').textContent,1);
 assert.equal(byId.get('scng-today-events').textContent,1);
 assert.equal(byId.get('scng-projects-count').textContent,1);
 assert.match(byId.get('scng-hero-title').textContent,/, Teste!/);
 assert.equal(JSON.stringify(D),snapshot,'O redesign não pode mudar registros');
});
