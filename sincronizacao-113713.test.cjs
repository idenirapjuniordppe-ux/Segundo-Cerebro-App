'use strict';
const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readFileSync} = require('node:fs');
const {JSDOM, VirtualConsole} = require('jsdom');
const source = readFileSync('index.html','utf8');
const A='a@example.test', B='b@example.test';
const snapshot=(usuario, data={})=>Object.assign({usuario,seq:1,config:{},tarefas:[],eventos:[],notas:[]},data);

function app(t){
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
