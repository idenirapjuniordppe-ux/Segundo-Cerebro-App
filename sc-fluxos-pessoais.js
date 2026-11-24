/* Recursos contextuais do organizador pessoal. */
(function(){
'use strict';
const button=(label,fn,primary=false)=>'<button type="button" class="btn '+(primary?'btn-p':'btn-s')+'" onclick="'+fn+'">'+h(label)+'</button>';
const close=()=>button('Fechar','fecharModal()');
const call=(label,action,...args)=>button(label,C('SCFluxos.'+action,...args));
const panel=(title,body)=>'<details class="sc-fluxos-panel"><summary>'+h(title)+'</summary><div>'+body+'</div></details>';
const group=(body)=>'<div class="sc-fluxos-actions">'+body+'</div>';
const task=id=>obter('tarefas',id);
const active=t=>t.id&&sc155Lifecycle(t)==='open';
const cfg=(key)=>lista(D.config[key],[]);
const store=(key,items)=>salvarConfig({[key]:JSON.stringify(items)});
const safeURL=value=>{try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:'';}catch(_){return '';}};
const sourceLink=(url,label)=>safeURL(url)?'<a href="'+h(safeURL(url))+'" target="_blank" rel="noopener noreferrer">'+h(label)+'</a>':'';
const noteMatch=raw=>/^\[nota:([^\]\r\n]+)\]\s*$/m.exec(String(raw||''));
const excerptMatch=raw=>/\[trecho-nota:([^\]\r\n]+)\]/.exec(String(raw||''));
const noteId=t=>noteMatch(t.notas)?.[1];
const reviewId=id=>'revisao-7d-'+id;
let proposal=null, sound=null;

function history(r,date){
 const key=rotChave(r);
 const dates=Object.entries(rotExc()).flatMap(([origin,day])=>{
  const entry=day?.[key],when=entry?.destino||origin;
  return entry?.detalhe&&!entry.skip&&when<date?[[when,origin,entry.detalhe]]:[];
 }).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,6);
 if(!dates.length)return '';
 return panel('Histórico recente',dates.map(([when,origin,detail])=>'<div class="sc-fluxos-row"><div><small>'+h(dataBonita(when))+'</small><br>'+h(detail)+'</div>'+call('Usar como base','reuse',String(key),origin)+'</div>').join(''));
}
function reuse(key,origin){
 const input=el('rx-detalhe'),detail=rotExc()[origin]?.[key]?.detalhe;
 if(!input||!detail)return;
 if(input.value&&input.value!==detail&&!confirm('Substituir o texto que está no campo?'))return;
 input.value=detail;input.focus();
}

function movable(t){
 return active(t)&&!t.hora&&!t.recorrencia&&!SC145.blocked(t).length&&!waiting(t.id)&&!SC170.groupedIds(D,hojeISO()).has(String(t.id));
}
function plan(){
 const now=hojeISO(),tomorrow=somaDias(now,1);
 const p=propostaPlano(now,movable);
 const entry=(t,date,time)=>({id:t.id,title:t.titulo,minutes:Number(t.duracao),old:[t.data,t.duracao,t.notas,t.prioridade,t.lembrete,t.top3],date,time});
 return {now,stay:p.ok.map(x=>entry(x.t,now,hhmm(x.ini))),move:p.fora.filter(t=>!SC170.afterDeadline(t,tomorrow)).map(t=>entry(t,tomorrow,'')),excluded:p.fora.filter(t=>SC170.afterDeadline(t,tomorrow)).map(t=>t.titulo)};
}
async function replan(){
 const date=hojeISO(),epoch=sc166Geracao;
 if(!SC144.loaded(date)){
  abrirModal('Replanejar hoje','<p id="sc-fluxos-plan-loading" role="status">Conferindo a agenda…</p>',close());
  if(!await SC167.calendar(date,date)){
   if(epoch===sc166Geracao&&el('sc-fluxos-plan-loading'))el('sc-fluxos-plan-loading').textContent='A disponibilidade do Google Agenda ainda não foi confirmada.';
   return;
  }
  if(epoch!==sc166Geracao||!el('sc-fluxos-plan-loading')||el('modal').classList.contains('hidden'))return;
 }
 proposal=plan();
 const rows=(list,checked)=>list.map(x=>'<label class="sc-fluxos-row"><input type="checkbox" name="sc-fluxos-plan" value="'+h(x.id)+'" '+(checked?'checked':'')+'> <span>'+h(x.title)+'<br><small>'+h([x.time,duracaoTxt(x.minutes)].filter(Boolean).join(' · '))+'</small></span></label>').join('');
 const cap=capacidadeDia(date);
 const demand=pendentesDeHoje().filter(movable).reduce((sum,t)=>sum+(Number(t.duracao)||0),0);
 const missing=pendentesDeHoje().filter(t=>movable(t)&&!(Number(t.duracao)>0)).length;
 abrirModal('Replanejar hoje','<p class="subt">'+duracaoTxt(cap.livre)+' livres · '+duracaoTxt(demand)+' de tarefas flexíveis</p>'+
  (proposal.stay.length?'<h3>Manter hoje</h3>'+rows(proposal.stay,true):'')+
  (proposal.move.length?'<h3>Mover para amanhã</h3>'+rows(proposal.move,false):'')+
  (proposal.excluded.length?'<p class="subt">Com prazo preservado: '+h(proposal.excluded.join(', '))+'</p>':'')+
  (missing?'<p class="subt">'+missing+' tarefa(s) sem duração informada ficam como estão.</p>':'')+
  '<p class="subt">Compromissos fixos preservados.</p>',
  button('Cancelar','fecharModal()')+(proposal.stay.length||proposal.move.length?button('Aplicar mudanças','SCFluxos.applyPlan()',true):''));
}
function applyPlan(){
 const checks=[...document.querySelectorAll('[name="sc-fluxos-plan"]:checked')];
 if(!checks.length||!proposal){toast('Escolha o que deseja aplicar.');return;}
 if(proposal.now!==hojeISO()||!SC144.loaded(proposal.now)||JSON.stringify(proposal)!==JSON.stringify(plan())){toast('O plano mudou. Confira a nova proposta.',true);replan();return;}
 const ids=new Set(checks.map(input=>input.value));
 const changes=proposal.stay.concat(proposal.move).filter(x=>ids.has(String(x.id))).map(x=>{
  const t=task(x.id),lembrete=x.time?ajustarLembrete(x.date,x.time,lembreteValor(t.lembrete)).lembrete:'';
  return {id:x.id,data:x.date,hora:x.time,lembrete,...(x.date!==proposal.now&&ehTop3(t)?{top3:''}:{})};
 });
 if(salvar('tarefas',changes)){proposal=null;fecharModal();toast(changes.length+' alteração(ões) aplicada(s).');}
}

function taskFromNote(n,excerpt,project=''){
 const marker='[nota:'+n.id+']';
 const title=excerpt.trim().replace(/\s+/g,' ').slice(0,180);
 if(!title)return false;
 if(D.tarefas.some(t=>noteId(t)===String(n.id)&&t.titulo===title&&String(t.projeto||'')===project)){toast('Já existe uma tarefa vinculada a este trecho.');return false;}
 let encoded;
 try{encoded=encodeURIComponent(excerpt);}catch(_){encoded=encodeURIComponent(title);}
 const item={titulo:title,status:'aberta',prioridade:'media',area:n.area||'',projeto:project,notas:'Origem: [['+SC167.noteToken(n.id,n.titulo||'Nota')+']]\n'+marker+'\n[trecho-nota:'+encoded+']'};
 if(!salvar('tarefas',item))return false;
 toast(project?'Etapa adicionada ao projeto.':'Tarefa vinculada à nota.',false,{rotulo:'Desfazer',fn:()=>excluir('tarefas',item.id)});
 return true;
}
function chooseProject(note,excerpt){
 const options=D.projetos.filter(p=>p.status==='ativo'||!p.status);
 if(!options.length){toast('Crie ou reative um projeto para adicionar a etapa.');return;}
 abrirModal('Nova etapa',campo('Etapa',inp('sc-fluxos-step-title',excerpt,'text','readonly'))+
  '<label for="sc-fluxos-step-project">Projeto</label>'+selHtml('sc-fluxos-step-project',options.map(p=>[p.id,p.nome])),
  button('Cancelar','fecharModal()')+button('Adicionar ao projeto',C('SCFluxos.addStep',note.id),true));
}
function addStep(id){
 const n=obter('notas',id),project=val('sc-fluxos-step-project');
 if(n.id&&D.projetos.some(p=>String(p.id)===project&&(p.status==='ativo'||!p.status))&&taskFromNote(n,val('sc-fluxos-step-title'),project)){fecharModal();SC138Notes.open(id);}
}
function linkedTasks(tasks){
 return tasks.map(t=>'<div class="sc-fluxos-row">'+call(t.titulo,'openTask',t.id)+'<small>'+h(sc155Lifecycle(t)==='done'?'Concluída':'Pendente')+'</small></div>').join('');
}
function openTask(id){SC126.detail('tarefas',id);}
function taskOrigin(t){
 const id=noteId(t);
 return id&&obter('notas',id).id?call(excerptMatch(t.notas)?'Ver trecho de origem':'Ver nota de origem','origin',t.id):'';
}
function origin(id){
 const t=task(id),n=noteId(t),fragment=excerptMatch(t.notas)?.[1];
 if(!n||!obter('notas',n).id)return;
 fecharModal();SC138Notes.open(n);
 if(!fragment)return;
 let text;
 try{text=decodeURIComponent(fragment);}catch(_){return;}
 window.requestAnimationFrame(()=>{
  const reader=document.querySelector('.np-reader[data-sc138-note="'+CSS.escape(n)+'"]');
  if(!reader)return;
  const walker=document.createTreeWalker(reader,NodeFilter.SHOW_TEXT),nodes=[];
  let node,joined='';
  while((node=walker.nextNode())){nodes.push({node,start:joined.length});joined+=node.textContent;}
  const at=joined.indexOf(text);
  if(at<0||joined.indexOf(text,at+1)>=0){toast('Nota aberta. O trecho original pode ter mudado.');return;}
  const first=nodes.findLast(x=>x.start<=at),last=nodes.findLast(x=>x.start<at+text.length);
  first.node.parentElement.scrollIntoView({block:'center'});
  const range=document.createRange();range.setStart(first.node,at-first.start);range.setEnd(last.node,at+text.length-last.start);
  if(window.Highlight&&CSS.highlights){CSS.highlights.set('sc-fluxos-origem',new Highlight(range));setTimeout(()=>CSS.highlights.delete('sc-fluxos-origem'),4000);}
 });
}

function projectBoard(id){
 const rows=D.tarefas.filter(t=>String(t.projeto)===String(id));
 const stages=[['todo','A fazer'],['doing','Em andamento'],['done','Concluído']];
 const doing=t=>etiquetasDe(t.etiquetas).includes('em-andamento');
 return '<div class="sc-fluxos-board">'+stages.map(([key,title])=>{
  const items=rows.filter(t=>key==='done'?sc155Lifecycle(t)==='done':active(t)&&doing(t)===(key==='doing'));
  return '<section><h3>'+h(title)+'</h3>'+(items.map(t=>{
   const blocked=SC145.blocked(t).map(key=>task(key).titulo||'Tarefa indisponível');
   return '<article class="sc-fluxos-card">'+call(t.titulo,'openTask',t.id)+
    (blocked.length?'<small>Aguardando '+h(blocked.join(', '))+'</small>':'')+
    (key==='done'?'':call(key==='doing'?'Voltar para A fazer':'Iniciar','stage',id,t.id,key==='todo')+
    (blocked.length?'':call('Concluir','complete',id,t.id)))+'</article>';
  }).join('')||'<p class="subt">Sem tarefas.</p>')+'</section>';
 }).join('')+'</div>';
}
function stage(project,id,start){
 const t=task(id);
 if(!active(t)||String(t.projeto)!==String(project))return;
 if(start&&SC145.blocked(t).length){toast('Conclua a dependência primeiro.',true);return;}
 const tags=etiquetasDe(t.etiquetas).filter(x=>x!=='em-andamento');
 if(start)tags.push('em-andamento');
 if(salvar('tarefas',{id,etiquetas:tags.join(',')}))SC126.projectDetail(project,'quadro');
}
function complete(project,id){
 const before=task(id).status;
 alternarTarefa(id);
 if(before!==task(id).status)SC126.projectDetail(project,'quadro');
}
function projectSummary(project,notes){
 const next=SC126.projectQueue(project.id).find(t=>!SC145.blocked(t).length&&!waiting(t.id));
 const decisions=notes.filter(n=>etiquetasDe(n.etiquetas).includes('decisao')).slice().sort((a,b)=>String(b.titulo).localeCompare(String(a.titulo)));
 return (next?'<div class="sc-fluxos-row"><strong>Próxima ação</strong>'+call(next.titulo,'openTask',next.id)+'</div>':'')+
  panel('Decisões',decisions.map(n=>call(n.titulo,'showNote',n.id)).join('')+call('Registrar decisão','decision',project.id));
}
function showNote(id){fecharModal();SC138Notes.open(id);}
function decision(id){
 abrirModal('Registrar decisão','<label for="sc-fluxos-decision">Decisão</label>'+inp('sc-fluxos-decision','','text','maxlength="160"')+
  '<label for="sc-fluxos-reason">Motivo ou contexto</label><textarea class="input" id="sc-fluxos-reason" rows="3" maxlength="2000"></textarea>',
  button('Cancelar','fecharModal()')+button('Registrar',C('SCFluxos.saveDecision',id),true));
}
function saveDecision(id){
 const p=obter('projetos',id),title=val('sc-fluxos-decision').trim();
 if(!p.id||!title){toast('Informe a decisão.',true);return;}
 if(salvar('notas',{titulo:hojeISO()+' · '+title,etiquetas:'decisao',tipo:'nota',area:p.area||'',conteudo:'[projeto:'+p.id+']\n'+val('sc-fluxos-reason').trim()}))SC126.projectDetail(id,'notas');
}

function inbox(){
 const entries=cfg('sc_fluxos_inbox');
 abrirModal('Caixa de entrada','<label for="sc-fluxos-capture">Ideia, link ou trecho de mensagem</label><textarea class="input" id="sc-fluxos-capture" rows="3" maxlength="1200"></textarea>'+
  button('Guardar para depois','SCFluxos.capture()',true)+entries.map(x=>'<article class="sc-fluxos-card"><p>'+h(x.text)+'</p>'+sourceLink(x.text,'Fonte original')+
  group(call('Criar tarefa','triage',x.id,'task')+call('Guardar nota','triage',x.id,'note')+call('Vincular a projeto','triage',x.id,'project')+call('Remover','removeCapture',x.id))+'</article>').join(''),close());
}
function capture(){
 const text=val('sc-fluxos-capture').trim();
 if(!text)return;
 const entries=cfg('sc_fluxos_inbox');
 if(JSON.stringify(entries).length+text.length>30000){toast('Organize alguns itens antes de capturar mais.',true);return;}
 if(store('sc_fluxos_inbox',[{id:'i'+Date.now().toString(36)+Math.random().toString(36).slice(2,8),text},...entries]))inbox();
}
function removeCapture(id){if(confirm('Remover este item da caixa de entrada?')&&store('sc_fluxos_inbox',cfg('sc_fluxos_inbox').filter(x=>x.id!==id)))inbox();}
function triage(id,type){
 const draft=cfg('sc_fluxos_inbox').find(x=>x.id===id);
 if(!draft)return;
 if(type==='project'){
  const options=D.projetos.filter(p=>p.status!=='concluido');
  if(!options.length){toast('Crie um projeto antes de vincular.');return;}
  abrirModal('Vincular ao projeto','<label for="sc-fluxos-inbox-project">Projeto</label>'+selHtml('sc-fluxos-inbox-project',options.map(p=>[p.id,p.nome])),
   button('Voltar','SCFluxos.inbox()')+button('Vincular',C('SCFluxos.triage',id,'project-save'),true));return;
 }
 const project=type==='project-save'?val('sc-fluxos-inbox-project'):'';
 if(type==='project-save'&&!obter('projetos',project).id)return;
 const table=type==='task'?'tarefas':'notas',key=(table==='tarefas'?'t':'n')+draft.id;
 const title=draft.text.split(/\r?\n/)[0].slice(0,150);
 const item=table==='tarefas'?{titulo:title,notas:draft.text,status:'aberta'}:{titulo:title,tipo:'nota',conteudo:(project?'[projeto:'+project+']\n':'')+draft.text};
 if((obter(table,key).id||salvar(table,{id:key,...item}))&&store('sc_fluxos_inbox',cfg('sc_fluxos_inbox').filter(x=>x.id!==id)))inbox();
}
function waiting(id){return cfg('sc_fluxos_waiting').find(x=>String(x.id)===String(id));}
function waitingButton(t){
 return active(t)?call(waiting(t.id)?'Ver retorno pendente':'Acompanhar retorno','followUp',t.id):'';
}
function followUp(id){
 const t=task(id);if(!active(t))return;
 const entry=waiting(id)||{};
 abrirModal('Aguardando retorno','<p><strong>'+h(t.titulo)+'</strong></p>'+
  '<label for="sc-fluxos-return-date">Cobrar retorno em</label>'+inp('sc-fluxos-return-date',entry.date,'date')+
  '<label for="sc-fluxos-return-link">Link do documento ou conversa</label>'+inp('sc-fluxos-return-link',entry.url,'url','maxlength="600"')+
  sourceLink(entry.url,'Abrir documento ou conversa'),
  close()+(entry.date?call('Marcar retorno recebido','received',id):'')+button('Salvar',C('SCFluxos.saveFollowUp',id),true));
}
function saveFollowUp(id){
 const date=val('sc-fluxos-return-date'),value=val('sc-fluxos-return-link').trim(),url=safeURL(value);
 if(!active(task(id))||!sc120Date_(date)||(value&&!url)){toast('Informe uma data e confira o endereço.',true);return;}
 if(store('sc_fluxos_waiting',cfg('sc_fluxos_waiting').filter(x=>String(x.id)!==String(id)).concat({id,date,url})))followUp(id);
}
function received(id){if(store('sc_fluxos_waiting',cfg('sc_fluxos_waiting').filter(x=>String(x.id)!==String(id))))openTask(id);}
function dueReturns(){
 const today=hojeISO();
 return cfg('sc_fluxos_waiting').filter(x=>x.date<=today&&active(task(x.id)));
}
function returns(){
 abrirModal('Retornos pendentes',cfg('sc_fluxos_waiting').filter(x=>active(task(x.id))).sort((a,b)=>a.date.localeCompare(b.date))
  .map(x=>'<div class="sc-fluxos-row">'+call(task(x.id).titulo,'followUp',x.id)+'<small>'+h(dataBonita(x.date))+'</small></div>').join('')||'<p>Nenhum retorno pendente.</p>',close());
}

function focusReport(){
 const since=somaDias(hojeISO(),-6);
 const rows=D.tarefas.filter(t=>sc155Lifecycle(t)==='done'&&dataConcl(t)>=since&&dataConcl(t)<=hojeISO()&&tempoFeito(t)>0);
 abrirModal('Tempo planejado e registrado','<p class="subt">Tarefas concluídas nos últimos 7 dias com tempo registrado.</p>'+
  (rows.map(t=>'<div class="sc-fluxos-row"><strong>'+h(t.titulo)+'</strong><small>'+h(t.duracao?t.duracao+' min previstos · ':'')+tempoFeito(t)+' min registrados</small></div>').join('')||'<p>Sem sessões registradas nesse período.</p>'),close());
}
function stopSound(){
 if(!sound)return;
 sound.close().catch(()=>{});
 sound=null;
}
async function toggleSound(){
 if(sound){stopSound();renderFoco();return;}
 const Audio=window.AudioContext||window.webkitAudioContext;
 if(!Audio){toast('Som ambiente indisponível neste aparelho.');return;}
 const context=new Audio();sound=context;
 try{
  await context.resume();
  if(sound!==context)return;
  const buffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate);
  const samples=buffer.getChannelData(0);
  for(let i=0,prev=0;i<samples.length;i++){prev=(prev+0.02*(Math.random()*2-1))/1.02;samples[i]=prev*3.5;}
  const source=context.createBufferSource(),gain=context.createGain();
  source.buffer=buffer;source.loop=true;gain.gain.value=0.16;source.connect(gain);gain.connect(context.destination);source.start();renderFoco();
 }catch(_){if(sound===context)stopSound();toast('Não foi possível iniciar o som ambiente.',true);}
}

function eligibleReview(t){
 return sc155Lifecycle(t)==='done'&&!!dataConcl(t)&&(/estud/i.test(String(t.area||''))||noteId(t))&&
  !/^revisao-7d-/.test(String(t.id))&&somaDias(dataConcl(t),7)>=hojeISO()&&!task(reviewId(t.id)).id;
}
function rules(){
 const enabled=D.config.sc_fluxos_review==='Sim';
 const pending=enabled?D.tarefas.filter(eligibleReview):[];
 const created=D.tarefas.filter(t=>String(t.id).startsWith('revisao-7d-'));
 abrirModal('Regras pessoais','<label class="sc-fluxos-row"><span>Revisar após estudar<br><small>Sugerir revisão em 7 dias</small></span><input type="checkbox" id="sc-fluxos-rule" '+(enabled?'checked':'')+' onchange="SCFluxos.setRule(this.checked)"></label>'+
  (pending.length?panel('Sugestões de revisão',pending.map(t=>call(t.titulo+' · '+dataBonita(somaDias(dataConcl(t),7)),'review',t.id)).join('')):'')+
  panel('Histórico',created.map(t=>call(t.titulo+(t.data?' · '+dataBonita(t.data):''),'openTask',t.id)).join('')||'<p>Nenhuma revisão criada por esta regra.</p>'),close());
}
function setRule(enabled){salvarConfig({sc_fluxos_review:enabled?'Sim':'Não'});rules();}
function review(id){
 const t=task(id);if(D.config.sc_fluxos_review!=='Sim'||!eligibleReview(t))return;
 const date=somaDias(dataConcl(t),7);
 if(!confirm('Criar revisão para '+dataBonita(date)+'?'))return;
 if(salvar('tarefas',{id:reviewId(t.id),titulo:'Revisar · '+t.titulo,data:date,projeto:t.projeto||'',area:t.area||'',status:'aberta'}))rules();
}
function notice(){
 const count=dueReturns().length,reviewCount=D.config.sc_fluxos_review==='Sim'?D.tarefas.filter(eligibleReview).length:0;
 return group((count?call(count+' retorno(s) a acompanhar','returns'):'')+(reviewCount?call(reviewCount+' revisão(ões) sugerida(s)','rules'):''));
}
function init(){
 const update=()=>{
  if(sound&&(!document.body.classList.contains('modo-foco')||!el('foco-tempo')||vistaAtual!=='hoje'))stopSound();
 };
 const old=window.renderFoco;
 window.renderFoco=function(){const result=old.apply(this,arguments);update();return result;};
 const navigation=window.irPara;
 window.irPara=function(){const result=navigation.apply(this,arguments);update();return result;};
 window.addEventListener('sc166:conta-limpa',()=>{stopSound();proposal=null;});
}
const css=document.createElement('style');
css.textContent='html.sc190-premium.sc126 body.modo-foco #v-hoje.sc148-active>#hoje-foco{display:block!important}html.sc190-premium.sc126 body.modo-foco #v-hoje.sc148-active>#sc190-dashboard{display:none!important}.sc-fluxos-actions{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}.sc-fluxos-actions:empty{display:none}.sc-fluxos-panel,.sc-fluxos-card,.sc-fluxos-board section{border:1px solid var(--sc128-line,#d8dedb);border-radius:12px;padding:.65rem;margin:.5rem 0;overflow-wrap:anywhere}.sc-fluxos-panel summary{font-weight:650;cursor:pointer;padding:.2rem}.sc-fluxos-row{display:flex;gap:.6rem;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:.45rem 0;border-bottom:1px solid var(--sc128-line,#d8dedb);overflow-wrap:anywhere}.sc-fluxos-row:last-child{border-bottom:0}.sc-fluxos-card small{display:block}.sc-fluxos-card .btn,.sc-fluxos-panel .btn{max-width:100%;white-space:normal}.sc-fluxos-board{display:grid;gap:.5rem}.sc-fluxos-board .sc-fluxos-card .btn{margin:.2rem}.sc-fluxos-board h3{font-weight:700}::highlight(sc-fluxos-origem){background:#fff1a3;color:#16291c}@media(min-width:700px){.sc-fluxos-board{grid-template-columns:repeat(3,minmax(0,1fr))}}';
document.head.append(css);
window.SCFluxos={history,reuse,replan,applyPlan,taskFromNote,chooseProject,addStep,linkedTasks,taskOrigin,origin,openTask,projectBoard,projectSummary,stage,complete,showNote,decision,saveDecision,inbox,capture,triage,removeCapture,waitingButton,followUp,saveFollowUp,received,returns,focusReport,toggleSound,soundOn:()=>!!sound,rules,setRule,review,notice,button};
init();
})();
