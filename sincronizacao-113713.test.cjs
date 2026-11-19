'use strict';
const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readFileSync} = require('node:fs');
const {JSDOM, VirtualConsole} = require('jsdom');
const source = readFileSync('index.html','utf8');
const A='a@example.test', B='b@example.test';
const snapshot=(usuario, data={})=>Object.assign({usuario,seq:1,config:{},tarefas:[],eventos:[],notas:[]},data);

function app(t,clock){
  const sent=[], reads=[], calendars=[], errors=[];
  const vc=new VirtualConsole();
  vc.on('jsdomError',e=>{if(e.type==='unhandled exception'||e.type==='unhandled-exception')errors.push(e.detail||e);});
  const adapter=(ok,fail)=>new Proxy({}, {get:(_,name)=>{
    if(name==='withSuccessHandler')return fn=>adapter(fn,fail);
    if(name==='withFailureHandler')return fn=>adapter(ok,fn);
    if(name==='getDados')return force=>reads.push({ok,fail,force});
    if(name==='eventosGoogle')return (from,to)=>calendars.push({from,to,ok,fail});
    if(name==='enviarComando')return cmd=>sent.push({cmd,ok,fail});
    return ()=>{};
  }});
  const dom=new JSDOM(source,{url:'https://example.test/app/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    if(clock){const Real=w.Date;w.Date=class extends Real{constructor(...args){super(...(args.length?args:[clock]));}static now(){return new Real(clock).getTime();}};}
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
  return {w,sent,reads,calendars,online:v=>{online=v;}};
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

test('planner does not claim success or replace undo when persistence fails',t=>{
  const {w,online}=app(t);online(false);
  w.aplicarDados(snapshot(A,{tarefas:[{id:'t1',titulo:'Estudar',data:'2026-11-20'}]}));
  const prev={at:234,changes:[]};w.SC145.write('planner-undo',prev);
  const original=w.Storage.prototype.setItem;
  w.Storage.prototype.setItem=function(k,v){if(k.startsWith('sc_fila_cmd_v3:'))throw Error('quota');return original.call(this,k,v);};
  assert.equal(w.SC148.apply([{id:'t1',after:{id:'t1',data:'2026-11-21'}}],'Teste'),false);
  assert.equal(w.D.tarefas[0].data,'2026-11-20');
  assert.equal(w.SC145.read('planner-undo').at,234);
  assert.equal(w.SC145.read('planner-log',null),null);
});

test('calendar failures are not empty verified calendars, and identical requests are shared',async t=>{
  const {w,calendars}=app(t);
  w.aplicarDados(snapshot(A,{config:{google_agenda:'Sim'}}));
  const a='2026-11-20',b='2026-11-22',p=w.SC167.calendar(a,b),q=w.SC167.calendar(a,b);
  assert.equal(p,q);assert.equal(calendars.length,1);
  calendars[0].ok({erro:'Sem acesso',eventos:[]});
  assert.equal(await p,false);assert.equal(w.SC144.loaded(a),false);
  assert.equal(await w.SC167.calendar(a,b),false);assert.equal(calendars.length,1);
  const retry=w.SC167.calendar(a,b,true);calendars[1].ok({eventos:[]});
  assert.equal(await retry,true);assert.equal(w.SC144.loaded(a),true);
  const late=w.SC167.calendar(a,b,true);w.sc166PrepareLogout();calendars[2].ok({eventos:[{id:'old'}]});
  assert.equal(await late,false);
  assert.equal(Object.keys(w.gcalCache).length,0);
});

test('note edit preflight preserves both versions and never posts a detected conflict',t=>{
  const {w,sent,reads}=app(t);
  w.aplicarDados(snapshot(A,{notas:[{id:'n1',titulo:'Trabalho',conteudo:'Antes'}]}));
  assert(w.salvar('notas',{id:'n1',conteudo:'Minha edição'}));
  assert.equal(sent.length,0);
  assert.equal(reads.at(-1).force,true);
  reads.at(-1).ok(snapshot(A,{seq:2,notas:[{id:'n1',titulo:'Trabalho',conteudo:'Edição em outro aparelho'}]}));
  assert.equal(sent.length,0);
  assert.equal(w.D.notas[0].conteudo,'Edição em outro aparelho');
  assert.equal(w.fila.length,0);
  assert(w.SC167.history('n1').some(x=>x.data.conteudo==='Minha edição'));
  assert(w.SC167.history('n1').some(x=>x.data.conteudo==='Antes'));
  w.sc166PrepareLogout();w.aplicarDados(snapshot(B));
  assert.equal(w.SC167.history('n1').length,0);
});

test('note links survive renames and do not silently select a duplicate title',t=>{
  const {w}=app(t);
  w.aplicarDados(snapshot(A,{notas:[{id:'n1',titulo:'Mesmo nome'},{id:'n2',titulo:'Mesmo nome'}]}));
  const token=w.SC167.noteToken('n2','Mesmo nome');
  w.D.notas[1].titulo='Renomeada';
  const markup=w.sc74Notes.renderMarkdown('[['+token+']]');
  assert.match(markup,/data-id="n2"/);
  assert.match(markup,/Renomeada/);
  w.D.notas[1].titulo='Mesmo nome';
  assert.match(w.sc74Notes.renderMarkdown('[[Mesmo nome]]'),/data-np="unresolved"/);
});

test('labels describe the actual alert state, and progress excludes cancelled tasks',t=>{
  const {w}=app(t);
  const {alert,project,habit}=w.SC167;
  assert.equal(alert('eventos',{},false).state,'saved');
  assert.equal(alert('eventos',{google_id:'id'},false).state,'sent');
  assert.equal(alert('eventos',{google_id:'id',alerta_status:'confirmado'},false).state,'confirmed');
  assert.equal(alert('tarefas',{evento_google:'id',alerta_status:'falha'},false).state,'failed');
  assert.equal(alert('eventos',{google_id:'id'},true).state,'pending');
  const p=project('p1',[{projeto:'p1',status:'feita'},{projeto:'p1',status:'aberta'},{projeto:'p1',status:'cancelada'}]);
  assert.equal(p.percent,50);assert.equal(p.count,2);
  const x=habit({id:'h1',dias:'1,2,3,4,5',criado_em:'16/11/2026' },'2026-11-17',[{habito_id:'h1',data:'2026-11-16'}]);
  assert.equal(x.total,1);assert.equal(x.done,1);
  assert.equal(w.SC153.state({data:'2026-11-01'},'habitos',new Date('2026-11-17T12:00:00')),'');
});

test('capture accepts Brazilian date and explicit time but blocks accidental idea conversion',t=>{
  const {w}=app(t);
  const u=w.SC120.understanding;
  assert.equal(u.date('Consulta em 9/12','2026-11-17'),'2026-12-09');
  assert.equal(u.date('Consulta em 31/11','2026-11-17'),'');
  assert.equal(u.hour('Treino amanhã às 11h na academia',''), '11:00');
  assert.throws(()=>w.SC167.captureCheck({acoes:[{tabela:'tarefas'}]}, {root:'Anote esta ideia: estudar francês'}),/nota/i);
  assert.doesNotThrow(()=>w.SC167.captureCheck({acoes:[{tabela:'tarefas'}]}, {root:'Transforme esta ideia em uma tarefa'}));
});

test('planner does not replace identical DOM on repeated renders',async t=>{
  const {w}=app(t);
  if(w.document.readyState==='loading')await new Promise(r=>w.document.addEventListener('DOMContentLoaded',r,{once:true}));
  w.irPara('agenda');w.SC148.refresh();
  const root=w.document.querySelector('#v-agenda .sc148-root'),n=w.SC167.metrics().planner;
  assert(root);w.SC148.refresh();w.SC148.refresh();
  assert.equal(w.document.querySelector('#v-agenda .sc148-root'),root);
  assert.equal(w.SC167.metrics().planner,n);
});

test('compatible server receives guarded delta without preflight, and rejected text stays recoverable',t=>{
  const {w,sent,reads}=app(t);
  w.aplicarDados(snapshot(A,{sc167NotasCAS:1,notas:[{id:'n1',titulo:'Original',conteudo:'Antes',colunas_nota:'1'}]}));
  const beforeReads=reads.length;
  assert(w.salvar('notas',{id:'n1',titulo:'Original',conteudo:'Minha edição',colunas_nota:'1'}));
  assert.equal(reads.length,beforeReads);
  assert.equal(sent.length,1);
  const cmd=sent[0].cmd;
  assert.equal(cmd.itens[0].titulo,undefined);
  assert.equal(cmd.itens[0].colunas_nota,undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(cmd.sc167_note_base)),[{id:'n1',fields:[['conteudo','Antes']]}]);
  sent[0].ok(snapshot(A,{sc167NotasCAS:1,seq:2,sc167Conflito:['n1'],notas:[{id:'n1',titulo:'Mais recente',conteudo:'Alteração de outro cliente'}]}));
  assert.equal(w.lerFila().length,0);
  assert.equal(w.D.notas[0].conteudo,'Alteração de outro cliente');
  assert(w.SC167.history('n1').some(x=>x.data.conteudo==='Minha edição'));
});

test('new note ID is guarded on the compatible server',t=>{
  const {w,sent}=app(t);
  w.aplicarDados(snapshot(A,{sc167NotasCAS:1}));
  assert(w.salvar('notas',{id:'sc148-idea-20261117',titulo:'Ideia',conteudo:'Texto'}));
  assert.equal(sent[0].cmd.sc167_note_base[0].missing,true);
});

test('legacy recovery data stays exportable without triggering a sync alarm',async t=>{
  const {w,sent}=app(t);
  const old={
    sc_fila_v1:'[]',
    sc_fila_mortos_v1:'[]',
    sc120_lote_Vazio:'[]',
    sc_cache_v1:'{"tarefas":[]}',
    sc_rasc:'{"nota:n1":{"draft":true}}',
    'sc119_history:escopo-antigo:1':'{"table":"notas","reason":"edit","item":{"id":"n1"}}'
  };
  for(const [key,value] of Object.entries(old))w.localStorage.setItem(key,value);
  if(w.document.readyState==='loading')await new Promise(r=>w.document.addEventListener('DOMContentLoaded',r,{once:true}));
  const notices=[];
  w.toast=(...args)=>notices.push(args);
  w.aplicarDados(snapshot(A));
  assert.equal(w.sc166HaPendenciasLegadas(w.sc166ChavesLegadas()),false);
  assert.deepEqual(notices,[]);
  const exportButton=w.document.getElementById('sc166-export-legacy');
  assert(exportButton);
  assert.equal(exportButton.hidden,true);
  await new Promise(r=>w.setTimeout(r,100));
  assert.equal(exportButton.hidden,false);
  let downloaded;
  w.downloadFile=(filename,type,data)=>downloaded={filename,type,dados:JSON.parse(data).dados};
  exportButton.click();
  assert.deepEqual(downloaded.dados,old);
  assert.equal(sent.length,0);
  for(const [key,value] of Object.entries(old))assert.equal(w.localStorage.getItem(key),value);
});

test('legacy commands at rest get only one neutral notice and are never replayed',t=>{
  const {w,sent}=app(t);
  const cmd={cid:'legacy-a',tipo:'SALVAR',tabela:'tarefas',itens:[{id:'item-a'}]};
  const sources={'sc_fila_v1':[cmd],'sc_fila_mortos_v1':[cmd],'sc120_lote_A':[cmd],'sc_fila_cmd_v2:legacy-a':cmd};
  for(const [key,value] of Object.entries(sources)){
    w.localStorage.setItem(key,JSON.stringify(value));
    assert.equal(w.sc166HaPendenciasLegadas(w.sc166ChavesLegadas()),true,key);
    w.localStorage.removeItem(key);
  }
  w.localStorage.setItem('sc_fila_v1','[]');
  w.localStorage.setItem('sc_fila_cmd_v2:invalid','{"cid":"invalid"}');
  assert.equal(w.sc166HaPendenciasLegadas(w.sc166ChavesLegadas()),false);
  const original=JSON.stringify(cmd);
  w.localStorage.setItem('sc_fila_cmd_v2:legacy-a',original);
  const notices=[];
  w.toast=(...args)=>notices.push(args);
  w.aplicarDados(snapshot(A));
  w.aplicarDados(snapshot(A));
  w.drenarFila();
  assert.equal(notices.length,1);
  assert.match(notices[0][0],/Pendências antigas/);
  assert.equal(notices[0][1],false);
  assert.equal(notices[0][2],undefined);
  assert.equal(sent.length,0);
  assert.equal(w.localStorage.getItem('sc_fila_cmd_v2:legacy-a'),original);
});

function ready(w){
  return w.document.readyState==='loading'?new Promise(resolve=>w.document.addEventListener('DOMContentLoaded',resolve,{once:true})):Promise.resolve();
}
function touch(w,target,type,x=0,y=0,count=1){
  const e=new w.Event(type,{bubbles:true,cancelable:true});
  const points=Array.from({length:count},(_,identifier)=>({identifier,clientX:x,clientY:y}));
  Object.defineProperties(e,{touches:{value:/end|cancel/.test(type)?[]:points},changedTouches:{value:points}});
  target.dispatchEvent(e);
}
test('cancelled mobile gestures clear pull-to-refresh and modal transforms without actions',async t=>{
  const {w}=app(t);
  await ready(w);
  const d=w.document;
  w.navMovelVisivel=()=>true;
  let refreshes=0;
  w.recarregar=()=>{refreshes++;};
  w.fecharModal();
  const ptr=d.getElementById('ptr');
  touch(w,d.body,'touchstart',20,60);
  touch(w,d.body,'touchmove',20,180);
  assert.equal(ptr.classList.contains('on'),true);
  touch(w,d.body,'touchcancel',20,180);
  assert.equal(ptr.classList.contains('on'),false);
  touch(w,d.body,'touchend',20,180);
  assert.equal(refreshes,0);
  touch(w,d.body,'touchstart',20,60);
  touch(w,d.body,'touchmove',20,180);
  touch(w,d.body,'touchstart',20,180,2);
  assert.equal(ptr.classList.contains('on'),false);
  touch(w,d.body,'touchend');
  assert.equal(refreshes,0);
  touch(w,d.body,'touchstart',20,60);
  touch(w,d.body,'touchmove',20,180);
  touch(w,d.body,'touchend',20,180);
  assert.equal(refreshes,1);
  w.abrirModal('Teste','<p>Exemplo</p>','');
  const modal=d.getElementById('modal-caixa'), header=modal.firstElementChild;
  touch(w,header,'touchstart',10,40);
  touch(w,header,'touchmove',10,180);
  assert.match(modal.style.transform,/translateY/);
  touch(w,header,'touchcancel',10,180);
  touch(w,header,'touchend',10,180);
  assert.equal(modal.style.transform,'');
  assert.equal(modal.style.transition,'');
  assert.equal(d.getElementById('modal').classList.contains('hidden'),false);
});

test('manual refresh explains offline and invalid replies without overwriting local data',async t=>{
  const {w,reads,online}=app(t);
  await ready(w);
  w.aplicarDados(snapshot(A,{tarefas:[{id:'original'}]}));
  const notices=[];
  w.toast=(text,bad)=>notices.push([text,!!bad]);
  const initial=reads.length;
  online(false);
  w.recarregar(true,true);
  assert.equal(reads.length,initial);
  assert.match(notices.at(-1)[0],/sem conexão/i);
  online(true);
  w.recarregar(true,true);
  assert.equal(reads.length,initial+1);
  reads.at(-1).ok({erro:'não disponível'});
  assert.match(notices.at(-1)[0],/não foi possível atualizar/i);
  assert.equal(w.D.tarefas[0].id,'original');
  w.recarregar(true,true);
  reads.at(-1).ok(snapshot(A,{seq:2,tarefas:[{id:'updated'}]}));
  assert.equal(w.D.tarefas[0].id,'updated');
  assert.deepEqual(notices.at(-1),['Atualizado.',false]);
});

test('planner shortcut Todas as tarefas opens Organizar in the tasks section',async t=>{
  const {w}=app(t);
  await ready(w);
  w.aplicarDados(snapshot(A,{tarefas:[{id:'example',titulo:'Tarefa de teste',status:'aberta'}]}));
  const d=w.document;
  w.irPara('organizar');
  d.querySelector('[data-sc126-organize="projetos"]').click();
  w.irPara('hoje');
  w.SC148.refresh();
  const shortcut=d.querySelector('#v-hoje [data-sc148="tasks"]');
  assert(shortcut);
  shortcut.click();
  assert.equal(w.vistaAtual,'organizar');
  assert.equal(d.querySelector('#v-organizar [data-sc126-organize="tarefas"]').getAttribute('aria-pressed'),'true');
  assert.match(d.getElementById('v-organizar').textContent,/Tarefa de teste/);
  assert(d.getElementById('modal').classList.contains('hidden'));
});

test('day planner shows continuation blocks but hides cached Google events when integration is off',async t=>{
  const {w}=app(t);
  await ready(w);
  const d=w.hojeISO(), next=w.somaDias(d,1), later=w.somaDias(d,2);
  w.aplicarDados(snapshot(A,{config:{google_agenda:'Sim'},eventos:[
    {id:'overnight',titulo:'Virada local',data:d,inicio:'23:00',fim:'01:30'},
    {id:'exact-midnight',titulo:'Até meia-noite',data:d,inicio:'23:30',fim:'00:00'}
  ]}));
  w.gcalCache={'test|range':[
    {id:'google',titulo:'Viagem',data:d,fim_data:later,inicio:'22:00',fim:'10:00'},
    {id:'single-all-day',titulo:'Dia inteiro',data:d,fim_data:next,diaTodo:true,inicio:'',fim:''}
  ]};
  const find=(day,id)=>w.SC148.timelineEntries(day).find(e=>e.id===id);
  assert.deepEqual([find(d,'google').start,find(d,'google').end],[1320,1440]);
  assert.deepEqual([find(next,'google').start,find(next,'google').end],[0,1440]);
  assert.deepEqual([find(later,'google').start,find(later,'google').end],[0,600]);
  assert.deepEqual([find(next,'overnight').start,find(next,'overnight').end],[0,90]);
  assert.equal(find(next,'exact-midnight'),undefined);
  assert.equal(find(next,'single-all-day'),undefined);
  w.D.config.google_agenda='Não';
  assert.equal(find(d,'google'),undefined);
  assert(find(next,'overnight'));
});

test('failed manual Google Calendar refresh keeps the last fetched events',async t=>{
  const {w,calendars}=app(t);
  await ready(w);
  const d=w.hojeISO(), next=w.somaDias(d,1);
  w.aplicarDados(snapshot(A,{config:{google_agenda:'Sim'}}));
  const cached={id:'google',titulo:'Compromisso em cache',data:d,inicio:'10:00',fim:'11:00'};
  w.gcalCache={[d+'|'+next]:[cached]};
  w.irPara('hoje');
  w.SC148.refresh();
  const n=calendars.length;
  const notices=[];w.toast=(text,bad)=>notices.push([text,!!bad]);
  w.document.querySelector('#v-hoje [data-sc148="reload"]').click();
  assert(calendars.length>n);
  calendars.slice(n).forEach(req=>req.fail(new Error('Falha simulada')));
  await new Promise(r=>w.setTimeout(r,0));
  assert(w.SC148.timelineEntries(d).some(e=>e.id==='google'));
  assert.match(notices.at(-1)[0],/não foi possível atualizar/i);
});

test('availability treats an all-day Calendar end date as exclusive',async t=>{
  const {w}=app(t);
  await ready(w);
  const d=w.somaDias(w.hojeISO(),1), next=w.somaDias(d,1), after=w.somaDias(d,2);
  const event={id:'day',data:d,fim_data:next,diaTodo:true,inicio:'',fim:''};
  const cfg={tarefas:[],eventos:[],config:{dia_inicio:'08:00',dia_fim:'10:00'}};
  assert.deepEqual(Array.from(w.SC144.available(d,30,0,cfg,[event],new w.Date(),2)),[]);
  assert.deepEqual(Array.from(w.SC144.available(next,30,0,cfg,[event],new w.Date(),2)),['08:00','08:15']);
  const lasting={...event,fim_data:after};
  assert.deepEqual(Array.from(w.SC144.available(next,30,0,cfg,[lasting],new w.Date(),2)),[]);
  assert.deepEqual(Array.from(w.SC144.available(after,30,0,cfg,[lasting],new w.Date(),2)),['08:00','08:15']);
});

test('Hoje promotes the next eligible commitment and focuses its existing planner card',async t=>{
  const {w,sent}=app(t,'2026-11-19T13:00:00');
  await ready(w);
  const d=w.hojeISO(),doc=w.document;
  w.aplicarDados(snapshot(A,{config:{sc148_auto:'Não'},eventos:[
    {id:'past',titulo:'Passado',data:d,inicio:'10:00',fim:'10:30'},
    {id:'cancelled',titulo:'Cancelado',data:d,inicio:'13:30',fim:'13:50',status:'cancelado'},
    {id:'first',titulo:'Reunião de teste',data:d,inicio:'14:00',fim:'14:40'},
    {id:'second',titulo:'Encontro seguinte',data:d,inicio:'15:20',fim:'16:00'}
  ]}));
  w.irPara('hoje');w.SC148.refresh();
  const next=()=>doc.querySelector('#v-hoje [data-sc148="jump-next"]');
  assert.match(next().textContent,/Próximo compromisso.*Reunião de teste.*14:00/);
  next().click();
  assert.equal(doc.activeElement.dataset.id,'first');
  assert.equal(doc.activeElement.dataset.sc148,'event');
  assert.equal(sent.length,0,'navigating to the card cannot change data');
  assert(w.SC152.complete('first',true));
  assert.equal(w.D.eventos.find(e=>e.id==='first').concluido,'Sim');
  assert.match(next().textContent,/Encontro seguinte/);
  assert.equal(w.D.eventos.find(e=>e.id==='second').inicio,'15:20');
});

function freeFixture(t,extra={}){
  const a=app(t,'2026-11-19T13:00:00'),w=a.w,d=w.hojeISO(),doc=w.document;
  const fixture={
    config:{sc148_auto:'Não',sc148_prefs:JSON.stringify({start:'14:00',end:'17:00',buffer:0})},
    eventos:[{id:'meeting',titulo:'Reunião',data:d,inicio:'14:00',fim:'14:40'}, {id:'review',titulo:'Revisão',data:d,inicio:'15:20',fim:'17:00'}],
    tarefas:[
      {id:'a',titulo:'Revisar anotações',status:'aberta',duracao:'25',prioridade:'alta'},
      {id:'b',titulo:'Responder e-mails',status:'aberta',duracao:'15'},
      {id:'c',titulo:'Ler pendências',status:'aberta',duracao:'20'},
      {id:'large',titulo:'Mais longa',status:'aberta',duracao:'65'},
      {id:'unknown',titulo:'Sem duração',status:'aberta'},
      {id:'future',titulo:'Não antecipar',status:'aberta',data:w.somaDias(d,1),duracao:'15'},
      {id:'blocked',titulo:'Aguardando',status:'aberta',duracao:'20',etiquetas:'aguardando'}
    ],
    ...extra
  };
  const setup=()=>{w.aplicarDados(snapshot(A,fixture));w.irPara('hoje');w.SC148.refresh();};
  return {...a,d,doc,setup};
}
test('free slot lists no more than two fitting tasks and only saves after explicit confirmation',async t=>{
  const {w,d,doc,sent,setup}=freeFixture(t);
  await ready(w);setup();
  const gap=()=>doc.querySelector('#v-hoje [data-sc148="day-gap"]');
  assert.match(gap().textContent,/40 min livres.*14:40–15:20/);
  gap().click();
  const options=doc.querySelectorAll('#sc169-gap-dialog [data-sc148="gap-select"]');
  assert.equal(options.length,2);
  assert(!Array.from(options).some(x=>['large','future','unknown','blocked'].includes(x.dataset.id)));
  const save=()=>doc.querySelector('[data-sc148="gap-save"]');
  assert.equal(save().disabled,true);
  options[0].click();
  assert.equal(save().disabled,false);
  assert.equal(sent.length,0);
  const picked=options[0].dataset.id;
  save().click();
  const item=w.D.tarefas.find(t=>t.id===picked);
  assert.deepEqual([item.data,item.hora],[d,'14:40']);
  assert.match(item.notas,/\[planner:fixo\]/);
  assert.equal(sent.length,1);
  assert.equal(w.D.tarefas.find(t=>t.id==='future').hora,undefined);
  assert.equal(w.D.eventos[0].inicio,'14:00');
});
test('a changed or unverified calendar cannot commit a previously displayed slot',async t=>{
  const {w,d,doc,sent,setup}=freeFixture(t);
  await ready(w);setup();
  doc.querySelector('#v-hoje [data-sc148="day-gap"]').click();
  const option=doc.querySelector('#sc169-gap-dialog [data-sc148="gap-select"]');
  option.click();
  w.D.eventos.push({id:'new',titulo:'Horário ocupado',data:d,inicio:'14:45',fim:'15:05'});
  doc.querySelector('[data-sc148="gap-save"]').click();
  assert.equal(sent.length,0);
  assert.equal(w.D.tarefas.find(t=>t.id===option.dataset.id).hora,undefined);
  assert.match(doc.getElementById('toasts').textContent,/agenda mudou/);
  w.fecharModal();w.D.config.google_agenda='Sim';w.SC148.refresh();
  assert.equal(doc.querySelector('#v-hoje [data-sc148="day-gap"]'),null);
});

test('task arrow opens compact rescheduling, flags clashes, and saves only confirmed date and time',async t=>{
  const {w,sent}=app(t,'2026-11-19T13:00:00');
  await ready(w);
  const d=w.hojeISO(),doc=w.document;
  w.aplicarDados(snapshot(A,{config:{sc148_auto:'Não'},eventos:[{id:'meeting',titulo:'Reunião',data:d,inicio:'14:00',fim:'14:40'}],
    tarefas:[{id:'late',titulo:'Atrasada',data:w.somaDias(d,-1),hora:'14:00',duracao:'25',status:'aberta'}]}));
  w.SC126.openTasks();
  doc.querySelector('#v-organizar [data-sc154-reschedule][data-id="late"]').click();
  const warn=doc.getElementById('sc169-move-conflict'),date=doc.getElementById('sc154-date'),time=doc.getElementById('sc154-time'),save=doc.querySelector('[data-sc154-save]');
  assert.equal(date.value,d);
  assert.equal(date.parentElement.hidden,true);
  assert.equal(save.disabled,true);
  assert.match(warn.textContent,/Conflito com Reunião/);
  save.click();assert.equal(sent.length,0);
  doc.querySelector('[data-sc154-day="1"]').click();
  assert.equal(date.value,w.somaDias(d,1));
  assert.equal(warn.hidden,true);
  time.value='16:20';time.dispatchEvent(new w.Event('input',{bubbles:true}));
  assert.equal(sent.length,0);
  save.click();assert.equal(sent.length,1);
  assert.deepEqual([w.D.tarefas[0].data,w.D.tarefas[0].hora,w.D.tarefas[0].status],[w.somaDias(d,1),'16:20','aberta']);
});

test('projects advance the next-task highlight without changing the project lifecycle',async t=>{
  const {w,sent}=app(t,'2026-11-19T13:00:00');
  await ready(w);
  const d=w.hojeISO(),doc=w.document;
  w.aplicarDados(snapshot(A,{config:{sc148_auto:'Não'},projetos:[{id:'p1',nome:'Organizar estudos',status:'ativo'}],
    tarefas:[
      {id:'t1',titulo:'Revisar roteiro',projeto:'p1',data:d,hora:'13:50',status:'aberta',prioridade:'alta'},
      {id:'t2',titulo:'Preparar a versão final',projeto:'p1',data:d,hora:'17:00',status:'aberta'},
      {id:'t3',titulo:'Excluída do progresso',projeto:'p1',status:'cancelada'},
      {id:'other',titulo:'Não pertence ao projeto',projeto:'p2',status:'aberta'}
    ]}));
  w.irPara('organizar');doc.querySelector('[data-sc126-organize="projetos"]').click();
  const cardNext=()=>doc.querySelector('#v-organizar [data-sc169-project-next]');
  const initial=cardNext().dataset.sc169ProjectNext;
  doc.querySelector('#v-organizar [data-sc129-project="p1"][data-pane="tarefas"]').click();
  const modal=doc.getElementById('modal-corpo'),next=()=>modal.querySelector('[data-sc169-project-next]');
  assert.equal(next().dataset.sc169ProjectNext,initial);
  modal.querySelector('[data-sc126-check="'+initial+'"]').click();
  const remaining=initial==='t1'?'t2':'t1';
  assert.equal(next().dataset.sc169ProjectNext,remaining);
  assert.equal(cardNext().dataset.sc169ProjectNext,remaining);
  modal.querySelector('[data-sc126-check="'+remaining+'"]').click();
  assert.match(modal.textContent,/Sem tarefas pendentes/);
  assert.equal(w.D.projetos[0].status,'ativo');
  assert(!sent.some(r=>r.cmd.tabela==='projetos'));
});

test('reprogramming waits for a connected calendar and catches a late-arriving conflict',async t=>{
  const {w,calendars,sent}=app(t,'2026-11-19T13:00:00');
  await ready(w);
  const d=w.somaDias(w.hojeISO(),1),doc=w.document;
  w.aplicarDados(snapshot(A,{config:{google_agenda:'Sim',sc148_auto:'Não'},
    tarefas:[{id:'change',titulo:'Reprogramar',data:d,hora:'14:00',duracao:'25',status:'aberta'}]}));
  w.SC154.open('change');
  const save=doc.querySelector('[data-sc154-save]'),warn=doc.getElementById('sc169-move-conflict');
  assert.equal(save.disabled,true);
  assert.match(warn.textContent,/Conferindo/);
  const request=calendars.find(x=>x.from===d&&x.to===d);
  assert(request);
  request.ok({eventos:[{id:'google',titulo:'Reunião no Google',data:d,inicio:'14:05',fim:'14:35'}]});
  await new Promise(resolve=>w.setTimeout(resolve,0));
  assert.match(warn.textContent,/Conflito com Reunião no Google/);
  assert.equal(save.disabled,true);
  assert.equal(sent.length,0);
});

test('free time honors working hours, transition buffers and tasks carried over after midnight',async t=>{
  const {w}=app(t,'2026-11-19T13:00:00');
  await ready(w);
  const d=w.somaDias(w.hojeISO(),1),previous=w.somaDias(d,-1);
  w.aplicarDados(snapshot(A,{config:{sc148_auto:'Não',sc148_prefs:JSON.stringify({start:'00:00',end:'02:00',buffer:10})},
    tarefas:[{id:'night',titulo:'Tarefa noturna',data:previous,hora:'23:45',duracao:'45',status:'aberta'}],
    eventos:[{id:'event',titulo:'Reunião',data:d,inicio:'01:00',fim:'01:20'}]}));
  const gaps=w.SC148.gapRanges(d);
  assert.deepEqual(Array.from(gaps,g=>[g.a,g.b]),[[40,50],[90,120]]);
  assert.deepEqual(Array.from(w.SC148.taskConflicts(d,'00:10',{id:'new',duracao:'10'})),['Tarefa noturna']);
});
