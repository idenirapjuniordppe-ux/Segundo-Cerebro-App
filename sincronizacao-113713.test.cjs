'use strict';
const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readFileSync} = require('node:fs');
const {JSDOM, VirtualConsole} = require('jsdom');
const source = readFileSync('index.html','utf8');
const A='a@example.test', B='b@example.test';
const snapshot=(usuario, data={})=>Object.assign({usuario,seq:1,config:{},tarefas:[],eventos:[],notas:[]},data);

function app(t){
  const sent=[], reads=[], errors=[];
  const vc=new VirtualConsole();
  vc.on('jsdomError',e=>{if(e.type==='unhandled exception'||e.type==='unhandled-exception')errors.push(e.detail||e);});
  const adapter=(ok,fail)=>new Proxy({}, {get:(_,name)=>{
    if(name==='withSuccessHandler')return fn=>adapter(fn,fail);
    if(name==='withFailureHandler')return fn=>adapter(ok,fn);
    if(name==='getDados')return ()=>reads.push({ok,fail});
    if(name==='enviarComando')return cmd=>sent.push({cmd,ok,fail});
    return ()=>{};
  }});
  const dom=new JSDOM(source,{url:'https://example.test/app/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.scrollTo=()=>{};w.matchMedia=()=>({matches:false,addListener(){},addEventListener(){}});
    w.confirm=()=>true;w.navigator.vibrate=()=>{};w.HTMLCanvasElement.prototype.getContext=()=>null;
    w.requestAnimationFrame=fn=>w.setTimeout(()=>fn(w.performance.now()),16);
    w.cancelAnimationFrame=w.clearTimeout.bind(w);
    w.google={script:{run:adapter()}};
  }});
  const w=dom.window;
  t.after(()=>{w.close();assert.deepEqual(errors,[]);});
  let online=true;
  Object.defineProperty(w.navigator,'onLine',{get:()=>online});
  return {w,sent,reads,online:v=>{online=v;}};
}

test('cache and queues require the matching PWA session; legacy data stays intact',t=>{
  const {w,sent,online}=app(t);
  let marker='session-A';
  w.__PWA=true;w.scPwaSessionMarker=()=>marker;w.scPwaStorageScope=()=> 'fixture-endpoint';w.scPwaAutenticado=()=>true;
  w.localStorage.setItem('sc_fila_cmd_v2:old',JSON.stringify({cid:'old',tipo:'SALVAR'}));
  w.aplicarDados(snapshot(A,{tarefas:[{id:'base-A'}]}));
  online(false);
  assert(w.enfileirarComando({cid:'one-A',tipo:'SALVAR_CONFIG',dados:{x:'offline'}},true));
  assert.equal(w.lerFila().length,1);
  w.fila=[];
  assert.equal(w.sc166Bootstrap(),true);
  assert.equal(w.lerCache().tarefas[0].id,'base-A');
  w.fila=w.lerFila();online(true);w.drenarFila();assert.equal(sent.length,0,'server must verify current identity before draining');
  w.aplicarDados(snapshot(A));w.drenarFila();
  assert.equal(sent[0].cmd.cid,'one-A');assert.equal(sent[0].cmd.sc166_owner,undefined);
  w.sc166PrepareLogout();marker='session-B';
  assert.equal(w.sc166Bootstrap(),false);
  w.aplicarDados(snapshot(B,{tarefas:[{id:'base-B'}]}));
  sent[0].ok(snapshot(A,{tarefas:[{id:'late-A'}]}));
  assert.equal(w.D.tarefas[0].id,'base-B');
  assert.equal(w.lerFila().length,0);
  assert(w.localStorage.getItem('sc_fila_cmd_v2:old'));
  w.sc166PrepareLogout();marker='session-A-new';w.aplicarDados(snapshot(A));
  assert.equal(w.lerFila()[0].cid,'one-A','unacknowledged command stays with original account');
});

test('failed local storage does not save, delete or change settings',t=>{
  const {w,sent}=app(t);
  w.aplicarDados(snapshot(A,{tarefas:[{id:'orig',titulo:'Original'}]}));
  const real=w.Storage.prototype.setItem;
  w.Storage.prototype.setItem=function(k,v){if(k.startsWith('sc_fila_cmd_v3:'))throw Error('storage quota');return real.call(this,k,v);};
  assert.equal(w.salvar('tarefas',{id:'orig',titulo:'Não salvo'}),false);
  assert.equal(w.excluir('tarefas','orig'),false);
  assert.equal(w.salvarConfig({teste:'sem gravação'}),false);
  assert.equal(w.D.tarefas[0].titulo,'Original');
  assert.equal(w.D.config.teste,undefined);
  assert.equal(sent.length,0);
});

test('task conversion can delete only after confirmation of the exact event',t=>{
  const {w,sent}=app(t);
  const task={id:'task-a',titulo:'Tarefa',data:'2026-11-20',hora:'08:00',status:'aberta'};
  w.aplicarDados(snapshot(A,{tarefas:[task]}));
  w.virarCompromisso(task.id);
  assert.equal(sent.length,1);
  assert.equal(w.D.tarefas.length,1);
  const event=sent[0].cmd.itens[0];
  assert.equal(event.id,'sc166conv-task-a');
  sent[0].ok(snapshot(A,{seq:2,tarefas:[task],eventos:[]}));
  assert.equal(sent.length,1);
  assert.equal(w.D.tarefas.length,1);
  w.virarCompromisso(task.id);
  assert.equal(sent[1].cmd.itens[0].id,event.id);
  sent[1].ok(snapshot(A,{seq:3,tarefas:[task],eventos:[event]}));
  assert.equal(sent[2].cmd.tipo,'EXCLUIR');
  assert.equal(sent[2].cmd.ids[0],task.id);
  assert.equal(sent[2].cmd.cid,'conv-del-'+sent[1].cmd.cid);
  sent[2].ok(snapshot(A,{seq:4,eventos:[event]}));
  assert.equal(w.D.tarefas.length,0);
});

test('new recurrence IDs are distinct, stable after reload and backward compatible',t=>{
  const {w,online}=app(t);online(false);
  w.aplicarDados(snapshot(A));
  const roots=[{titulo:'Ler',recorrencia:'diaria',status:'aberta'},{titulo:'Ler',recorrencia:'diaria',status:'aberta'}];
  assert(w.salvar('tarefas',roots));
  const [a,b]=w.D.tarefas;
  const next='2026-11-21';
  assert.notEqual(w.idRecorrencia(a,next),w.idRecorrencia(b,next));
  const occurrence=w.novaOcorrencia(a,next);delete occurrence.recorrencia_origem;
  assert.equal(w.sc166Serie(a),w.sc166Serie(occurrence));
  assert.equal(w.idRecorrencia(a,'2026-11-22'),w.idRecorrencia(occurrence,'2026-11-22'));
  const legacy={id:'legacy',titulo:'Ler',recorrencia:'diaria'};
  let hash=5381;
  for(const c of w.chaveSerie(legacy)+'@'+next)hash=((hash*33)^c.charCodeAt(0))>>>0;
  assert.equal(w.idRecorrencia(legacy,next),'rc'+hash.toString(36)+'20261121');
});

test('planner stores ideas as independent notes and preserves the legacy text in config',async t=>{
  const {w,online}=app(t);online(false);
  if(w.document.readyState==='loading')await new Promise(r=>w.document.addEventListener('DOMContentLoaded',r,{once:true}));
  const day=w.hojeISO(), next=w.somaDias(day,1), dateKey=d=>'sc148-idea-'+d.replace(/-/g,'');
  w.aplicarDados(snapshot(A,{config:{sc148_notes:JSON.stringify({[day]:'Legado'})}}));
  w.irPara('agenda');w.SC148.refresh();
  function write(d,text){
    const field=[...w.document.querySelectorAll('[data-sc148-note]')].find(el=>el.dataset.sc148Note===d);
    assert(field,'editor exists for '+d);
    field.value=text;
    field.dispatchEvent(new w.Event('input',{bubbles:true}));
    field.closest('.sc148-idea').querySelector('[data-sc148="save-idea"]').click();
  }
  write(day,'Uma ideia\nMais texto <b>');
  w.document.querySelector('#v-agenda [data-sc148="next"]').click();
  write(next,'Outra ideia');
  assert.equal(w.D.notas.find(n=>n.id===dateKey(day)).conteudo,'Uma ideia\nMais texto <b>');
  assert.equal(w.D.notas.find(n=>n.id===dateKey(next)).conteudo,'Outra ideia');
  assert.equal(JSON.parse(w.D.config.sc148_notes)[day],'Legado');
});
