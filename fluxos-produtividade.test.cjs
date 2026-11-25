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

test('prazo é um campo independente, aparece na lista e sobrevive à reprogramação',async t=>{
 const {w,q,input}=await app(t,{tarefas:[record('t1','Enviar documentos',{data:'2026-11-25',notas:'Trazer o original'})]});
 w.abrirTarefa('t1');assert.equal(q('#f-prazo-final').value,'');
 input('#f-prazo-final','2026-11-27');w.salvarTarefaModal('t1');
 let task=w.obter('tarefas','t1');
 assert.equal(task.data,'2026-11-25');assert.equal(w.SC170.deadline(task),'2026-11-27');
 w.abrirTarefa('t1');assert.equal(q('#ed').textContent.includes('[prazo:'),false);
 assert.equal(q('#f-prazo-final').value,'2026-11-27');
 w.fecharModal();w.SC154.open('t1');
 input('#sc154-date','2026-11-30');input('#sc154-time','15:00');
 assert.match(q('#sc170-move-warning').textContent,/depois do prazo final de 27\/11/);
 assert.equal(q('[data-sc154-save]').textContent,'Agendar mesmo assim');
 assert.equal(w.SC154.save(),true);
 task=w.obter('tarefas','t1');
 assert.equal(task.data,'2026-11-30');assert.equal(w.SC170.deadline(task),'2026-11-27');
 w.abrirTarefa('t1');input('#f-prazo-final','');w.salvarTarefaModal('t1');
 task=w.obter('tarefas','t1');assert.equal(w.SC170.deadline(task),'');assert.equal(task.notas,'Trazer o original');
});

test('formulário não salva agendamento posterior ao prazo se o usuário recusar',async t=>{
 const {w,input}=await app(t,{tarefas:[record('t1','Enviar',{data:'2026-11-20',notas:'[prazo:2026-11-21]'})]});
 w.abrirTarefa('t1');input('#f-data','2026-11-26');w.confirm=()=>false;
 w.salvarTarefaModal('t1');assert.equal(w.obter('tarefas','t1').data,'2026-11-20');assert.equal(w.lerFila().length,0);
});

test('Me ajude a começar usa um passo real e mantém tarefa, horário e dados intactos',async t=>{
 const {w,q,click}=await app(t,{tarefas:[record('t1','Estudar recursos',{notas:'- [x] Já fiz\n- [ ] Abrir apostila'}),record('sub','Resolver questão 1',{pai:'t1'})]});
 w.abrirTarefa('t1');
 assert.match(q('.sc170-start').textContent,/Resolver questão 1/);
 q('.sc170-start').open=true;click('[data-sc170="start-focus"]');
 assert.match(q('#sc170-focus-clock').textContent,/5:00/);
 click('[data-sc170="start-focus"]');
 assert.equal(q('#sc170-focus-clock').textContent,'');
 assert.equal(w.obter('tarefas','t1').status,'aberta');assert.equal(w.lerFila().length,0);
});

test('detalhes da rotina pertencem à ocorrência e acompanham seu reagendamento',async t=>{
 const r={id:'r1',titulo:'Academia',dias:[5],inicio:'15:30',fim:'17:00'};
 const {w,q,input,date}=await app(t,{config:{sc148_auto:'Não',rotina:JSON.stringify([r])}});
 const next='2026-11-27', moved='2026-11-21';
 const routine=day=>w.itensDoDia(day,false).find(x=>x.tipo==='rotina');
 const saveDetails=()=>q('button[onclick^="rotinaSalvarDetalhe"]').click();

 w.abrirRotina(0,date);
 assert.equal(q('label[for="rx-detalhe"]').textContent,'Detalhes deste dia');
 input('#rx-detalhe',' Treino de peito <leve> ');saveDetails();
 assert.equal(routine(date).titulo,'Academia: Treino de peito <leve>');
 assert.equal(routine(date).inicio,'15:30');
 assert.equal(routine(next).titulo,'Academia');
 assert.equal(w.D.config.rotina,JSON.stringify([r]));
 assert.match(w.htmlItemAgenda(routine(date)),/&lt;leve&gt;/);

 w.abrirRotina(0,date);assert.equal(q('#rx-detalhe').value,'Treino de peito <leve>');
 input('#rx-ini','16:00');w.rotinaSoHoje(0,date);
 assert.equal(routine(date).inicio,'16:00');
 w.rotinaRestaurar(0,date);assert.equal(routine(date).inicio,'15:30');
 w.rotinaConcluir(0,date);assert.equal(routine(date).feito,true);
 w.Planner.ocorrencia(0,date,'15:30','17:00',date);
 input('#pp-rot-dia',moved);w.Planner.mudarRotina(0,date,false);
 assert.equal(routine(date),undefined);
 assert.equal(routine(moved).titulo,'Academia: Treino de peito <leve>');
 assert.equal(routine(moved).feito,true);

 w.abrirRotina(0,moved,date);assert.equal(q('#rx-detalhe').value,'Treino de peito <leve>');
 input('#rx-detalhe','');saveDetails();
 assert.equal(routine(moved).titulo,'Academia');
 assert.equal(routine(moved).feito,true);
 assert.equal(routine(next).titulo,'Academia');
});

test('rotina flexível só ocupa horário aceito e reencaixa ao surgir conflito',async t=>{
 const fri={id:'r1',titulo:'Caminhada',dias:[5],inicio:'17:00',fim:'20:00',flexivel:{minutos:20}};
 const {w,click,q,input,date}=await app(t,{config:{sc148_auto:'Não',rotina:JSON.stringify([fri])},eventos:[{id:'e1',titulo:'Compromisso',data:'2026-11-20',inicio:'17:00',fim:'18:00'}]});
 assert.equal(w.itensDoDia(date,false).some(x=>x.tipo==='rotina'),false);
 assert.ok(w.SC148.html().includes('Rotinas flexíveis'));
 assert.equal(w.SC170.openRoutine(0,date),true);
 assert.match(q('#sc170-routine-message').textContent,/18:00–18:20/);
 input('#rx-detalhe','Rota pelo parque');
 click('[data-sc170="accept-routine"]');
 assert.equal(w.itensDoDia(date,false).find(x=>x.tipo==='rotina').inicio,'18:00');
 w.D.eventos.push({id:'e2',titulo:'Consulta',data:date,inicio:'18:00',fim:'19:00'});
 assert.match(w.SC170.routineList(date),/Reencaixar/);
 w.SC170.openRoutine(0,date);assert.match(q('#sc170-routine-message').textContent,/19:00–19:20/);
 const before=w.lerFila().length;assert.equal(w.itensDoDia(date,false).find(x=>x.tipo==='rotina').inicio,'18:00');
 click('[data-sc170="accept-routine"]');
 assert.equal(w.itensDoDia(date,false).find(x=>x.tipo==='rotina').inicio,'19:00');
 assert.equal(w.itensDoDia(date,false).find(x=>x.tipo==='rotina').titulo,'Caminhada: Rota pelo parque');
 assert.equal(w.obter('eventos','e2').inicio,'18:00');assert.equal(w.lerFila().length,before+1);
 w.irPara('config');w.renderRotinaEd();assert.ok(q('#sc170-flex-0').checked);
 assert.equal(q('#sc170-duration-0').value,'20');
});

test('rotina e blocos aguardam Google Agenda e não assumem horários vazios',async t=>{
 const fri={id:'r1',titulo:'Caminhada',dias:[5],inicio:'17:00',fim:'20:00',flexivel:{minutos:20}};
 const {w,date,q,calls,online}=await app(t,{config:{sc148_auto:'Não',google_agenda:'Sim',rotina:JSON.stringify([fri])}});
 online(true);w.SC170.openRoutine(0,date);
 assert.equal(q('[data-sc170="accept-routine"]').hidden,true);
 assert.ok(calls.length);
 calls.at(-1).ok({eventos:[{id:'g1',data:date,inicio:'17:00',fim:'18:00',titulo:'Google'}]});
 await Promise.resolve();
 assert.match(q('#sc170-routine-message').textContent,/18:00–18:20/);
 assert.equal(w.lerFila().length,0);
});

test('bloco único no Planner reúne tarefas e permite conclusão independente',async t=>{
 const {w,click,q,input,date}=await app(t,{tarefas:[record('a','Farmácia',{data:'2026-11-20'}),record('b','Mercado'),record('c','Ligar',{hora:'16:00',data:'2026-11-20'})]});
 w.SC170.editBlock('',date);
 input('#sc170-block-title','Resolver na rua');input('#sc170-block-from','17:00');input('#sc170-block-to','17:45');
 q('[data-sc170-member="a"]').checked=true;q('[data-sc170-member="b"]').checked=true;
 assert.equal(await w.SC170.saveBlock(),true);assert.equal(w.D.eventos.length,1);
 const e=w.D.eventos[0];assert.equal(e.inicio,'17:00');
 assert.deepEqual([...w.SC170.blockTasks(e)],['a','b']);
 assert.equal(w.SC148.timelineEntries(date).filter(x=>x.id===e.id).length,1);
 assert.equal(w.obter('tarefas','a').data,date);assert.equal(w.obter('tarefas','b').data,undefined);
 w.SC170.openBlock(e.id);click('[data-sc170-block-check="a"]');
 assert.equal(w.obter('tarefas','a').status,'feita');assert.equal(w.obter('tarefas','b').status,'aberta');
 assert.match(q('#sc170-block-view').textContent,/1\/2 feitas/);
 click('[data-sc170="remove-block"]');assert.equal(w.D.eventos.length,0);assert.equal(w.D.tarefas.length,3);
});

test('bloco não salva em conflito e nem depois do prazo de uma tarefa',async t=>{
 const {w,q,input,date}=await app(t,{tarefas:[record('a','Farmácia',{notas:'[prazo:2026-11-20]'})],eventos:[{id:'e1',titulo:'Consulta',data:'2026-11-20',inicio:'16:00',fim:'18:00'}]});
 w.SC170.editBlock('',date);
 input('#sc170-block-title','Na rua');input('#sc170-block-from','17:00');input('#sc170-block-to','17:45');q('[data-sc170-member]').checked=true;
 assert.equal(await w.SC170.saveBlock(),false);assert.match(q('#sc170-block-warning').textContent,/Consulta/);
 input('#sc170-block-date','2026-11-21');assert.equal(await w.SC170.saveBlock(),false);assert.match(q('#sc170-block-warning').textContent,/depois do prazo/);
 assert.equal(w.D.eventos.length,1);
});

test('nota do dia é única por data, preserva legado e pode ser reaberta pela Biblioteca',async t=>{
 const {w,d,input,q,date}=await app(t,{config:{sc148_auto:'Não',sc148_notes:'{"2026-11-20":"Ideia antiga"}'}});
 assert.ok(w.SC148.html().includes('Nota do dia'));
 w.SC170.openDayNote(date);
 assert.equal(q('#sc170-note-text').value,'Ideia antiga');
 assert.equal(w.D.notas.length,0);
 input('#sc170-note-text','Ideia antiga\nDecisão da reunião');
 assert.equal(w.SC170.saveDayNote(),true);
 const n=w.D.notas[0];assert.equal(n.id,'sc148-idea-20261120');assert.equal(n.conteudo,'Ideia antiga\nDecisão da reunião');
 assert.ok(d.querySelector('#np-document').textContent.includes('Decisão da reunião'));
 const l=w.lerFila().length;w.SC170.openDayNote(date);
 assert.equal(w.D.notas.length,1);assert.equal(w.lerFila().length,l);
 w.SC170.openDayNote('2026-11-21');assert.equal(q('#sc170-note-text').value,'');
});

test('nova ocorrência mantém a agenda da série mas não herda o prazo final de uma ocorrência anterior',async t=>{
 const {w}=await app(t);
 const current=record('t1','Pagar conta',{data:'2026-11-20',recorrencia:'mensal',hora:'08:00',notas:'Usar o aplicativo\n[prazo:2026-11-22]'});
 const next=w.novaOcorrencia(current,'2026-12-20');
 assert.equal(next.data,'2026-12-20');assert.equal(next.hora,'08:00');
 assert.equal(w.SC170.deadline(next),'');assert.equal(next.notas,'Usar o aplicativo\n');
});

test('ação do calendário abre o checklist do bloco, não o formulário de compromisso comum',async t=>{
 const id='sc170-bloco-amostra';
 const {w,q}=await app(t,{tarefas:[record('a','Farmácia')],eventos:[{id,titulo:'Na rua',data:'2026-11-20',inicio:'17:00',fim:'17:45',notas:'["a"]'}]});
 w.irPara('hoje');w.SC148.refresh();
 q('#v-hoje .sc150-block[data-id="'+id+'"]').click();
 assert.match(q('#sc170-block-view').textContent,/Farmácia/);
 w.fecharModal();w.abrirEvento(id);
 assert.match(q('#sc170-block-view').textContent,/Farmácia/);
});

test('um compromisso fixo pode ocupar o horário da rotina flexível sem movê-la silenciosamente',async t=>{
 const r={id:'r1',titulo:'Caminhada',dias:[5],inicio:'17:00',fim:'20:00',flexivel:{minutos:20}};
 const {w,date,input,q}=await app(t,{config:{sc148_auto:'Não',rotina:JSON.stringify([r]),rotina_exc:'{"2026-11-20":{"r1":{"inicio":"18:00","fim":"18:20"}}}'}});
 w.abrirEvento({data:date,inicio:'18:00',fim:'19:00'});
 input('#f-tit','Consulta');assert.match(q('#sc150-conflict').textContent,/rotina flexível/);
 w.salvarEventoModal('');
 assert.equal(w.D.eventos.length,1);assert.equal(w.itensDoDia(date,false).find(x=>x.tipo==='rotina').inicio,'18:00');
 assert.match(w.SC170.routineList(date),/Reencaixar/);
});

test('falha na gravação mantém o formulário de nota e não cria registro parcial',async t=>{
 const {w,date,q,input}=await app(t);
 w.SC170.openDayNote(date);input('#sc170-note-text','Anotação não salva');
 const set=w.Storage.prototype.setItem;
 w.Storage.prototype.setItem=function(k,v){if(k.startsWith('sc_fila_cmd_v3:'))throw Error('quota');return set.call(this,k,v);};
 assert.equal(w.SC170.saveDayNote(),false);assert.equal(w.D.notas.length,0);
 assert.equal(q('#sc170-note-text').value,'Anotação não salva');assert.equal(q('#modal').classList.contains('hidden'),false);
});

test('automação só confirma o plano explícito e protege tarefas fixas, recorrentes e com prazo',async t=>{
 const {w,q,date}=await app(t,{config:{sc148_auto:'Não',dia_fim:'13:00'},tarefas:[
  record('fixed','Compromisso',{data:'2026-11-20',hora:'12:50',duracao:'10'}),
  record('small','Questões',{data:'2026-11-20',duracao:'25',prioridade:'alta'}),
  record('large','Corrigir',{data:'2026-11-20',duracao:'90'}),
  record('deadline','Entrega',{data:'2026-11-20',duracao:'90',notas:'[prazo:2026-11-20]'}),
  record('repeat','Repetição',{data:'2026-11-20',duracao:'90',recorrencia:'diaria'})
 ]});
 w.eval(readFileSync('sc-automacoes.js','utf8'));
 await w.SCAutomacoes.reviewPlan();
 assert.match(q('#modal-corpo').textContent,/Entrega/);
 assert.equal(w.lerFila().length,0);
 q('input[value="large"]').checked=true;
 w.SCAutomacoes.applyPlan();
 assert.equal(w.obter('tarefas','small').data,date);
 assert.ok(w.obter('tarefas','small').hora);
 assert.equal(w.obter('tarefas','large').data,w.somaDias(date,1));
 assert.equal(w.obter('tarefas','deadline').data,date);
 assert.equal(w.obter('tarefas','repeat').data,date);
 assert.equal(w.obter('tarefas','fixed').hora,'12:50');
});

test('ações de tarefa adiada, retorno e revisão registram apenas escolhas confirmadas',async t=>{
 const {w,q,input,date}=await app(t,{notas:[{id:'n1',titulo:'Estudo',conteudo:'Trecho de estudo'}],tarefas:[
  record('t1','Orçamento da gráfica',{data:'2026-11-20',adiamentos:3})
 ]});
 w.eval(readFileSync('sc-automacoes.js','utf8'));
 const a=w.SCAutomacoes;
 a.unblock('t1');
 assert.match(q('#modal-corpo').textContent,/Adiada 3 vezes/);
 a.focus('t1');assert.equal(w.foco.id,'t1');assert.equal(w.foco.resta,600);w.alternarFoco();
 a.split('t1');input('#sc-auto-steps','Separar materiais\nRevisar texto');input('#sc-auto-first',date);a.saveSteps('t1');
 assert.equal(w.D.tarefas.filter(x=>x.pai==='t1').length,2);
 a.waiting('t1');input('#sc-auto-return-day',date);input('#sc-auto-return-url','https://example.org/conversa');a.saveWaiting('t1');
 assert.match(a.home(),/1 retorno pendente/);
 a.message('t1');assert.match(q('#sc-auto-message').value,/Orçamento da gráfica/);
 a.receive('t1');assert.doesNotMatch(a.home(),/retorno pendente/);
 a.newReview('n1','Trecho de estudo');input('#sc-auto-question','Qual é a regra?');a.saveReview('n1');
 const entry=()=>JSON.parse(w.D.config.sc_auto_revisoes)[0];
 a.study(entry().id,'show');assert.match(q('#modal-corpo').textContent,/Trecho de estudo/);
 a.grade(entry().id,'yes');assert.equal(entry().day,w.somaDias(date,3));
 a.grade(entry().id,'no');assert.equal(entry().day,w.somaDias(date,1));
});
