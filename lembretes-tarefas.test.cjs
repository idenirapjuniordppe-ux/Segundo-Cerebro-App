'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),{readFileSync}=require('node:fs');
const {JSDOM,VirtualConsole}=require(process.env.SC_TEST_JSDOM||'jsdom');
const html=readFileSync('index.html','utf8'), A='teste@example.test';
const record=(id,titulo,rest={})=>({id,titulo,status:'aberta',...rest});
async function app(t,data={}){
 const calls=[], errors=[], vc=new VirtualConsole();
 vc.on('jsdomError',e=>{if(/unhandled/.test(e.type))errors.push(e.detail||e.message)});
 const bridge=(ok,fail)=>new Proxy({}, {get:(_,name)=>{
  if(name==='withSuccessHandler')return fn=>bridge(fn,fail);
  if(name==='withFailureHandler')return fn=>bridge(ok,fn);
  if(name==='eventosGoogle')return (a,b)=>calls.push({a,b,ok,fail});
  return ()=>{};
 }});
 const dom=new JSDOM(html,{url:'https://example.test/app/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  const Real=w.Date,when=new Real(2026,10,20,12,0).getTime();
  w.Date=class extends Real{constructor(...a){super(...(a.length?a:[when]));}static now(){return when;}};
  w.scrollTo=()=>{};w.matchMedia=()=>({matches:false,addListener(){},addEventListener(){}});
  w.requestAnimationFrame=fn=>w.setTimeout(()=>fn(w.performance.now()),16);w.cancelAnimationFrame=id=>w.clearTimeout(id);
  w.google={script:{run:bridge()}};w.confirm=()=>true;w.navigator.vibrate=()=>{};
  w.HTMLCanvasElement.prototype.getContext=()=>null;
 }});
 const w=dom.window,d=w.document;
 let online=false;Object.defineProperty(w.navigator,'onLine',{get:()=>online});
 t.after(()=>{w.close();assert.deepEqual(errors,[])});
 if(d.readyState==='loading')await new Promise(r=>d.addEventListener('DOMContentLoaded',r,{once:true}));
 w.aplicarDados({usuario:A,seq:1,sc167NotasCAS:1,config:{sc148_auto:'Não'},tarefas:[],eventos:[],notas:[],...data});
 const q=(s)=>{const e=d.querySelector(s);assert.ok(e,s);return e;};
 const input=(s,value)=>{const e=q(s);e.value=value;e.dispatchEvent(new w.Event('input',{bubbles:true}));};
 const click=s=>q(s).click();
 return {w,d,q,input,click,calls,online:x=>{online=x},date:'2026-11-20'};
}

test('tarefa mostra duração e fim previsto mesmo no visual simples',async t=>{
 const {w,q,input}=await app(t);
 w.abrirTarefa({data:'2026-11-20'});
 w.modalSimples('abrirTarefa');
 const duration=q('#f-dur');
 assert.notEqual(w.campoDe(duration).style.display,'none');
 assert.match(q('#modal-corpo').textContent,/Lembrete no Google Agenda/);
 input('#f-hora','23:30');input('#f-dur','120');
 assert.match(q('#sc171-task-end').textContent,/01:30.*dia seguinte/);
 assert.match(q('#modal-corpo').textContent,/Hora de início/);
});

test('tarefa sem horário não aparece como erro de sincronização nem como notificação disponível',async t=>{
 const {w}=await app(t);
 assert.match(w.sc143AlertHTML('tarefas',record('t1','Sem hora',{data:'2026-11-21',alerta_status:'sem_lembrete'})),/Sem lembrete: falta a hora/);
 assert.match(w.sc143AlertHTML('tarefas',record('t2','Sem aviso',{data:'2026-11-21',hora:'10:00',lembrete:'-1'})),/Sem lembrete configurado/);
 assert.match(w.sc143AlertHTML('tarefas',record('t3','Confirmado',{data:'2026-11-21',hora:'10:00',lembrete:'10',evento_google:'id',alerta_status:'confirmado'})),/Lembrete confirmado no Google/);
 assert.match(w.sc143AlertHTML('tarefas',record('t4','Aviso padrão já confirmado',{data:'2026-11-21',lembrete:'0',evento_google:'id',alerta_status:'confirmado'})),/Lembrete confirmado no Google/);
});

test('revisões espaçadas herdam hora e aviso expressamente definidos, sem inventar dados nem duplicar',async t=>{
 const {w}=await app(t);
 const task=record('t1','Embargos',{projeto:'p1',data:'2026-11-20',hora:'14:00',lembrete:'10'});
 const reviews=w.criarRevisoes(task);
 assert.deepEqual(Array.from(reviews,x=>x.hora),['14:00','14:00','14:00']);
 assert.deepEqual(Array.from(reviews,x=>x.lembrete),['10','10','10']);
 assert.ok(reviews.every(x=>x.projeto==='p1'));
 w.D.tarefas.push(reviews[0]);assert.equal(w.criarRevisoes(task).length,2);
 const without=w.criarRevisoes({...task,id:'t2',hora:'',lembrete:'-1'});
 assert.ok(without.every(x=>!x.hora&&!x.lembrete));
 const noReminder=w.criarRevisoes({...task,id:'t3',lembrete:'-1'});
 assert.ok(noReminder.every(x=>!x.lembrete));
});

test('reprogramar permite configurar um lembrete sem mudar data ou hora',async t=>{
 const {w,q,input}=await app(t,{tarefas:[record('t1','Estudar',{data:'2026-11-21',hora:'14:00',status:'aberta'})]});
 w.SC154.open('t1');
 input('#sc171-move-reminder','10');assert.equal(w.SC154.save(),true);
 assert.equal(w.obter('tarefas','t1').data,'2026-11-21');
 assert.equal(w.obter('tarefas','t1').hora,'14:00');
 assert.equal(w.obter('tarefas','t1').lembrete,'10');
 assert.ok(q('#modal').classList.contains('hidden'));
});

test('a sugestão de aviso usa somente instantes futuros, inclusive no último minuto',async t=>{
 const {w}=await app(t);
 const at=(h,m,s)=>new w.Date(2026,10,20,h,m,s);
 assert.equal(w.ajustarLembrete('2026-11-20','14:00','10',at(13,50,0)).lembrete,'5');
 assert.equal(w.ajustarLembrete('2026-11-20','14:00','10',at(13,59,30)).lembrete,'0');
 assert.match(w.ajustarLembrete('2026-11-20','14:00','10',at(14,1,0)).aviso,/passou/);
 assert.equal(w.ajustarLembrete('2026-11-20','14:00','10',at(13,49,59)).lembrete,'10');
 assert.equal(w.ajustarLembrete('2026-11-20','14:00','-1',at(14,1,0)).aviso,'');
});

test('retirar o horário salva a tarefa e limpa o aviso anterior',async t=>{
 const {w,q,input}=await app(t,{tarefas:[record('t1','Estudar',{data:'2026-11-21',hora:'14:00',lembrete:'10'})]});
 w.SC154.open('t1');
 input('#sc154-time','');
 assert.match(q('#sc171-move-reminder-hint').textContent,/lembrete será removido/);
 assert.equal(w.SC154.save(),true);
 assert.equal(w.obter('tarefas','t1').hora,'');
 assert.equal(w.obter('tarefas','t1').lembrete,'');
});

test('grade e detecção de conflitos concordam quando a tarefa vira a meia-noite',async t=>{
 const {w}=await app(t,{tarefas:[record('t1','Estudar',{data:'2026-11-20',hora:'23:30',duracao:'120'})]});
 const a=w.SC148.timelineEntries('2026-11-20').find(x=>x.id==='t1');
 const b=w.SC148.timelineEntries('2026-11-21').find(x=>x.id==='t1');
 assert.deepEqual([a.start,a.end,a.label],[1410,1440,'23:30–01:30 · dia seguinte']);
 assert.deepEqual([b.start,b.end,b.label],[0,90,'Continua até 01:30']);
 assert.equal(w.SC148.busyBlocks('2026-11-21').filter(x=>x.id==='t1').length,1);
 assert.deepEqual(Array.from(w.SC148.taskConflicts('2026-11-21','01:20',{id:'t2',duracao:15})),['Estudar']);
});
