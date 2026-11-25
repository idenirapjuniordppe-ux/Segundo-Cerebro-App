/* Automações contextuais do 2º Cérebro. */
(function(){
'use strict';
const task=id=>obter('tarefas',id);
const open=t=>t.id&&sc155Lifecycle(t)==='open';
const btn=(title,action,args=[],primary=false)=>'<button type="button" class="btn '+(primary?'btn-p':'btn-s')+'" onclick="'+C('SCAutomacoes.'+action,...args)+'">'+h(title)+'</button>';
const close='<button type="button" class="btn btn-s" onclick="fecharModal()">Fechar</button>';
const section=(title,body)=>'<section class="sc-auto-card"><strong>'+h(title)+'</strong>'+body+'</section>';
const line=(text)=>'<p class="subt">'+h(text)+'</p>';
const data=key=>lista(D.config['sc_auto_'+key],[]);
const save=(key,items)=>{
 const value=JSON.stringify(items);
 if(value.length>45000){toast('Limite de registros atingido.',true);return false;}
 return salvarConfig({['sc_auto_'+key]:value});
};
const byId=(key,id)=>data(key).find(x=>String(x.id)===String(id));
const replace=(key,entry)=>save(key,data(key).filter(x=>String(x.id)!==String(entry.id)).concat(entry));
const blocked=t=>SC145.blocked(t).length>0;
const eligible=t=>open(t)&&!t.hora&&!t.recorrencia&&!blocked(t)&&!byId('retornos',t.id)&&!etiquetasDe(t.etiquetas).includes('aguardando')&&!String(t.notas||'').includes('[planner:fixo]');
let draft=null,loading=null;
function plan(){
 const day=hojeISO(), tomorrow=somaDias(day,1),grouped=SC170.groupedIds(D,day);
 const filter=t=>eligible(t)&&!grouped.has(String(t.id))&&!SC170.afterDeadline(t,day);
 const result=propostaPlano(day,filter);
 const changes=result.ok.map(x=>({id:x.t.id,title:x.t.titulo,date:day,time:hhmm(x.ini),minutes:x.dur}))
  .concat(result.fora.filter(t=>!SC170.afterDeadline(t,tomorrow)).map(t=>({id:t.id,title:t.titulo,date:tomorrow,time:'',minutes:Number(t.duracao)})));
 return {day,changes,excluded:result.fora.filter(t=>SC170.afterDeadline(t,tomorrow)).map(t=>t.titulo)};
}
function offerPlan(){
 if(!SC144.loaded(hojeISO()))return pendentesDeHoje().some(t=>eligible(t)&&Number(t.duracao)>0);
 const p=plan();
 return p.changes.some(x=>!x.time)||p.excluded.length>0;
}
async function reviewPlan(){
 const today=hojeISO(),epoch=sc166Geracao;
 if(!SC144.loaded(today)){
  const request=loading={};
  abrirModal('Seu dia mudou','<p id="sc-auto-loading" role="status">Conferindo Google Agenda…</p>',close);
  await SC167.calendar(today,today);
  const status=el('sc-auto-loading');
  if(loading!==request||epoch!==sc166Geracao||!status||el('modal').classList.contains('hidden'))return;
  if(!SC144.loaded(today)){status.textContent='A disponibilidade do Google Agenda ainda não foi confirmada.';return;}
 }
 draft=plan();
 const rows=(items,checked)=>items.map(x=>'<div class="sc-auto-plan-item"><label class="sc-auto-row"><input type="checkbox" name="sc-auto-plan" value="'+h(x.id)+'"'+(checked?' checked':'')+'><span>'+h(x.title)+'<small>'+h([x.time,duracaoTxt(x.minutes)].filter(Boolean).join(' · '))+'</small></span></label>'+(!x.time?btn('Dividir em etapas','split',[x.id]):'')+'</div>').join('');
 const stay=draft.changes.filter(x=>x.time), move=draft.changes.filter(x=>!x.time),cap=capacidadeDia(today);
 abrirModal('Seu dia mudou',line((cap.livre?duracaoTxt(cap.livre):'0 min')+' livres hoje')+
  (stay.length?section('Hoje',rows(stay,true)):'')+(move.length?section('Amanhã',rows(move,false)):'')+
  (draft.excluded.length?line('Prazo preservado: '+draft.excluded.join(', ')):'')+
  (draft.changes.length?line('Compromissos fixos preservados.'):line('Nenhuma tarefa flexível com duração informada pode ser alterada.')),
  close+(draft.changes.length?btn('Confirmar proposta','applyPlan',[],true):''));
}
function applyPlan(){
 if(!draft||draft.day!==hojeISO()||!SC144.loaded(draft.day)||JSON.stringify(draft)!==JSON.stringify(plan())){
  toast('A disponibilidade mudou. Confira a proposta novamente.',true);return reviewPlan();
 }
 const ids=new Set([...document.querySelectorAll('[name="sc-auto-plan"]:checked')].map(x=>x.value));
 const changes=draft.changes.filter(x=>ids.has(String(x.id))).map(x=>{
  const t=task(x.id);
  return {id:x.id,data:x.date,hora:x.time,lembrete:x.time?ajustarLembrete(x.date,x.time,lembreteValor(t.lembrete)).lembrete:'',...(x.date!==draft.day&&ehTop3(t)?{top3:''}:{})};
 });
 if(!changes.length){toast('Selecione ao menos uma alteração.');return;}
 if(salvar('tarefas',changes)){draft=null;fecharModal();toast('Proposta aplicada.');}
}
const delayed=t=>open(t)&&Number(t.adiamentos)>=3&&Number(byId('dispensas',t.id)?.count)!==Number(t.adiamentos)&&!byId('retornos',t.id);
function actions(t){
 return (delayed(t)?btn('Destravar tarefa','unblock',[t.id]):'')+(open(t)?btn(byId('retornos',t.id)?'Retorno pendente':'Marcar como aguardando','waiting',[t.id]):'');
}
function unblock(id){
 const t=task(id);if(!delayed(t))return;
 abrirModal(h(t.titulo),section('Adiada '+t.adiamentos+' vezes',
  '<div class="sc-auto-actions">'+(blocked(t)?'':btn('Começar com 10 min','focus',[id],true))+btn('Dividir em etapas','split',[id])+btn('Marcar como aguardando','waiting',[id])+'</div>'),
  close+btn('Dispensar','dismiss',[id]));
}
function dismiss(id){
 const t=task(id);if(delayed(t)&&replace('dispensas',{id,count:t.adiamentos}))fecharModal();
}
function focus(id){
 const t=task(id);if(!open(t)||blocked(t))return;
 if(document.body.classList.contains('modo-foco')&&String(foco.id)!==String(id)){
  toast('Encerre a sessão de foco atual primeiro.');return;
 }
 fecharModal();irPara('hoje');
 if(!document.body.classList.contains('modo-foco')){
  pararFoco(true);foco.id=id;foco.resta=600;document.body.classList.add('modo-foco');
  renderFoco();focoToggle();
  el('foco-tempo')?.scrollIntoView?.({block:'center'});
 }
}
function split(id){
 const t=task(id);if(!open(t))return;
 abrirModal('Dividir em etapas',line(t.titulo)+
  '<label for="sc-auto-steps">Uma etapa por linha</label><textarea id="sc-auto-steps" class="input" rows="4" maxlength="1000" placeholder="Ler o resumo&#10;Resolver cinco questões"></textarea>'+
  '<label for="sc-auto-first">Planejar a primeira etapa para</label>'+inp('sc-auto-first','','date'),
  close+btn('Criar subtarefas','saveSteps',[id],true));
}
function saveSteps(id){
 const t=task(id),day=val('sc-auto-first').trim();
 const titles=[...new Set(val('sc-auto-steps').split(/\r?\n/).map(x=>x.trim()).filter(Boolean))];
 if(!open(t)||!titles.length||titles.length>8||titles.some(x=>x.length>160)||(day&&(!sc120Date_(day)||day<hojeISO()||SC170.afterDeadline(t,day)))){
  toast('Informe até oito etapas e confira a data da primeira.',true);return;
 }
 const existing=new Set(D.tarefas.filter(x=>String(x.pai)===String(id)).map(x=>x.titulo));
 const steps=titles.filter(x=>!existing.has(x)).map((titulo,i)=>({titulo,pai:id,area:t.area||'',projeto:t.projeto||'',status:'aberta',data:i===0?day:''}));
 if(!steps.length){toast('Essas etapas já existem.');return;}
 if(salvar('tarefas',steps)){fecharModal();abrirTarefa(id);}
}
function validURL(raw){
 try{const url=new URL(raw);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:'';}catch(_){return '';}
}
function waiting(id){
 const t=task(id),item=byId('retornos',id);if(!open(t))return;
 abrirModal('Retorno pendente',section(t.titulo,item?line('Prazo: '+dataBonita(item.day)): '')+
  '<label for="sc-auto-return-day">Cobrar retorno em</label>'+inp('sc-auto-return-day',item?.day,'date')+
  '<label for="sc-auto-return-url">Link da conversa ou documento</label>'+inp('sc-auto-return-url',item?.url,'url','maxlength="600"')+
  (validURL(item?.url)?'<p><a href="'+h(validURL(item.url))+'" target="_blank" rel="noopener noreferrer">Abrir conversa</a></p>':'')+
  (item?btn('Revisar rascunho','message',[id]):''),
  close+(item?btn('Marcar retorno recebido','receive',[id]):'')+btn('Salvar prazo','saveWaiting',[id],true));
}
function saveWaiting(id){
 const day=val('sc-auto-return-day'),raw=val('sc-auto-return-url').trim(),url=validURL(raw);
 if(!open(task(id))||!sc120Date_(day)||(raw&&!url)){toast('Confira a data e o endereço da conversa.',true);return;}
 if(replace('retornos',{id,day,url}))waiting(id);
}
function receive(id){
 if(byId('retornos',id)&&save('retornos',data('retornos').filter(x=>String(x.id)!==String(id)))){fecharModal();toast('Retorno registrado.');}
}
function message(id){
 const t=task(id);if(!open(t)||!byId('retornos',id))return;
 abrirModal('Revisar rascunho','<label for="sc-auto-message">Mensagem</label><textarea id="sc-auto-message" class="input" rows="4">'+
  h('Olá! Você tem alguma atualização sobre '+t.titulo+'? Obrigado!')+'</textarea>',
  btn('Voltar','waiting',[id])+btn('Copiar rascunho','copy',[],true));
}
async function copy(){
 const text=val('sc-auto-message').trim();if(!text)return;
 try{await navigator.clipboard.writeText(text);toast('Rascunho copiado.');}
 catch(_){el('sc-auto-message')?.select();toast('Use a opção de copiar do seu aparelho.');}
}
function newReview(noteId,excerpt){
 if(!obter('notas',noteId).id)return;
 abrirModal('Revisão de estudo','<label for="sc-auto-question">Pergunta</label>'+inp('sc-auto-question','','text','maxlength="180" placeholder="O que este trecho explica?"')+
  '<label for="sc-auto-answer">Resposta</label><textarea id="sc-auto-answer" class="input" rows="4" maxlength="1000">'+h(excerpt)+'</textarea>'+line('Primeira revisão amanhã.'),
  close+btn('Salvar revisão','saveReview',[noteId],true));
}
function saveReview(note){
 const question=val('sc-auto-question').trim(),answer=val('sc-auto-answer').trim(),all=data('revisoes');
 if(!obter('notas',note).id||!question||!answer||question.length>180||answer.length>1000){toast('Preencha a pergunta e a resposta.',true);return;}
 if(all.some(x=>x.note===note&&x.question===question&&x.answer===answer)){toast('Esta revisão já existe.');return;}
 const item={id:'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,8),note,question,answer,days:1,day:somaDias(hojeISO(),1)};
 if(save('revisoes',all.concat(item))){fecharModal();toast('Revisão sugerida para amanhã.');}
}
function reviewList(note=''){
 const entries=data('revisoes').filter(x=>note?x.note===note:x.day<=hojeISO()).sort((a,b)=>a.day.localeCompare(b.day));
 abrirModal('Revisão de estudo',entries.map(x=>section(x.question,line(dataBonita(x.day))+btn('Abrir revisão','study',[x.id]))).join('')||line('Nenhuma revisão neste momento.'),close);
}
function study(id,reveal=''){
 const item=byId('revisoes',id);if(!item)return;
 const controls=reveal?btn('Acertei','grade',[id,'yes'],true)+btn('Errei','grade',[id,'no']):btn('Mostrar resposta','study',[id,'show'],true);
 abrirModal('Revisão de estudo',section(item.question,reveal?'<p style="white-space:pre-wrap">'+h(item.answer)+'</p>':'')+
  (obter('notas',item.note).id?btn('Abrir nota de origem','note',[item.note]):''),close+controls);
}
function note(id){fecharModal();SC138Notes.open(id);}
function grade(id,answer){
 const item=byId('revisoes',id);
 if(!item||!['yes','no'].includes(answer))return;
 const days=answer==='yes'?Math.min(60,Math.max(3,Number(item.days)*2)):1;
 const next=somaDias(hojeISO(),days);
 if(replace('revisoes',{...item,days,day:next})){
  abrirModal('Revisão de estudo',line('Próxima revisão sugerida: '+dataBonita(next)+' · em '+days+(days===1?' dia.':' dias.')),close);
 }
}
function noteActions(id){
 return data('revisoes').some(x=>String(x.note)===String(id))?btn('Revisões de estudo','reviewList',[id]):'';
}
function home(){
 const due=data('retornos').filter(x=>x.day<=hojeISO()&&open(task(x.id))).sort((a,b)=>a.day.localeCompare(b.day));
 const reviews=data('revisoes').filter(x=>x.day<=hojeISO()).length;
 const late=ordenarTarefas(D.tarefas.filter(delayed))[0];
 const buttons=(offerPlan()?btn('Seu dia mudou · Ver proposta','reviewPlan'):'')+
  (late?btn('Destravar: '+late.titulo,'unblock',[late.id]):'')+
  (reviews?btn(reviews+(reviews===1?' revisão de estudo':' revisões de estudo'),'reviewList'):'')+
  (due.length?btn(due.length+(due.length===1?' retorno pendente':' retornos pendentes'),'returns'):'');
 return buttons?'<div class="sc-auto-actions" aria-label="Sugestões de automação">'+buttons+'</div>':'';
}
function returns(){
 const due=data('retornos').filter(x=>open(task(x.id))).sort((a,b)=>a.day.localeCompare(b.day));
 abrirModal('Retornos pendentes',due.map(x=>section(task(x.id).titulo,line(dataBonita(x.day))+btn('Ver retorno','waiting',[x.id]))).join('')||line('Nenhum retorno pendente.'),close);
}
const css=document.createElement('style');
css.textContent=`
.sc-auto-actions{display:flex;gap:.5rem;flex-wrap:wrap;margin:.6rem 0}
.sc-auto-actions .btn,.sc-auto-card .btn{max-width:100%;white-space:normal;overflow-wrap:anywhere}
.sc-auto-card{border:1px solid var(--sc128-border);border-radius:14px;padding:.85rem;margin:.55rem 0;overflow-wrap:anywhere}
.sc-auto-card p{margin:.35rem 0}
.sc-auto-row{display:flex;align-items:start;gap:.6rem;margin:.55rem 0}
.sc-auto-row small{display:block}.sc-auto-plan-item{padding-bottom:.4rem}
html.sc190-premium.sc126 body.modo-foco #v-hoje.sc148-active>#hoje-foco{display:block!important}
html.sc190-premium.sc126 body.modo-foco #v-hoje.sc148-active>#sc190-dashboard{display:none!important}
`;
document.head.append(css);
window.SCAutomacoes={home,plan,reviewPlan,applyPlan,actions,unblock,dismiss,focus,split,saveSteps,waiting,saveWaiting,receive,message,copy,newReview,saveReview,reviewList,study,grade,note,noteActions,returns};
window.addEventListener('sc166:conta-limpa',()=>{draft=null;loading=null;});
})();
