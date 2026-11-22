/* 2º Cérebro | Aura Studio 12.0 — dashboard real para a tela Hoje.
   Usa somente registros existentes. Não grava dados automaticamente. */
(function(){
'use strict';
const key='sc190-dashboard';
let day='',filter='all',rendering=false,initialized=false;
const $=id=>document.getElementById(id);
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const data=()=>typeof D==='object'&&D?D:{};
const rows=type=>Array.isArray(data()[type])?data()[type]:[];
const currentDay=()=>typeof hojeISO==='function'?hojeISO():new Date().toLocaleDateString('sv-SE');
const addDays=(d,n)=>{if(typeof somaDias==='function')return somaDias(d,n);const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+n);return [x.getFullYear(),String(x.getMonth()+1).padStart(2,'0'),String(x.getDate()).padStart(2,'0')].join('-');};
const asDate=d=>new Date(d+'T12:00:00');
const lifecycle=x=>{try{if(typeof sc155Lifecycle==='function')return sc155Lifecycle(x);}catch(_){}
  const st=String(x?.status||'').toLowerCase();return ['feita','concluido','concluida','pago','finalizado'].includes(st)?'done':['cancelado','cancelada'].includes(st)?'cancel':'open';};
const name=x=>String(x?.titulo||x?.nome||x?.descricao||'Sem título');
const safePct=p=>Math.max(0,Math.min(100,Number(p)||0));
function pctGoal(g){try{if(typeof pct==='function')return safePct(pct(g));}catch(_){}
 return safePct(g.progresso);}
const countLabel=(n,sing,plural)=>n===1?'1 '+sing:n+' '+plural;
const icon=name=>({task:'✓',calendar:'▦',project:'◇',habit:'♧',money:'▣',goal:'◎',star:'☆'}[name]||'✦');
const hour=v=>/^\d{1,2}:\d{2}$/.test(String(v||''))?String(v).padStart(5,'0'):'';
function nav(to){if(typeof irPara==='function')irPara(to);}
function openDay(mode){
  if(typeof agDia==='string')agDia=day;
  nav('agenda');
  const root=$('v-agenda');
  const input=root?.querySelector('[data-sc148-date]');
  // A alteração da data força o planner a voltar ao modo Dia.
  // Selecione Semana/Mês SOMENTE depois da data ter sido aplicada.
  if(input&&input.value!==day){
    input.value=day;
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }
  root?.querySelector('[data-sc148="view"][data-view="'+mode+'"]')?.click();
}
function accountBalance(){
  const c=data().config||{};
  let account;try{account=JSON.parse(c.sc147_account||'null');}catch(_){return null;}
  if(!account||!Number.isSafeInteger(account.initial)||! /^\d{4}-\d{2}-\d{2}$/.test(account.date||''))return null;
  let balance=account.initial;
  for(const f of rows('financas')){
    if(f.status!=='pago'||String(f.data||'')<account.date||String(f.data||'')>currentDay())continue;
    const cents=Number(f.valor_centavos);
    if(!Number.isSafeInteger(cents)||cents<0||!['receita','despesa'].includes(f.tipo))return null;
    balance+=f.tipo==='receita'?cents:-cents;
    if(!Number.isSafeInteger(balance))return null;
  }
  return balance;
}
const money=cent=>cent==null?'—':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cent/100);
function scheduledHabits(d){
  const weekday=asDate(d).getDay();
  return rows('habitos').filter(h=>h.ativo!=='Não'&&String(h.dias||'').split(',').map(x=>x.trim()).includes(String(weekday)));
}
function habitDone(id,d){try{return typeof habitoFeito==='function'&&habitoFeito(id,d);}catch(_){return false;}}
function actualAgenda(d){
  let list=[];
  try{if(typeof itensDoDia==='function')list=itensDoDia(d,'hora');}catch(_){}
  if(!Array.isArray(list)||!list.length){
    list=rows('eventos').filter(x=>x.data===d).map(x=>({...x,tipo:'evento',inicio:x.inicio||x.hora||''}));
    list.push(...rows('tarefas').filter(x=>x.data===d&&x.hora&&lifecycle(x)==='open').map(x=>({...x,tipo:'tarefa',inicio:x.hora})));
  }else{
    list = list.slice();
  }
  // A agenda do dia também mostra tarefas concluídas com horário,
  // porque a função legada itensDoDia() exclui tarefas finalizadas.
  list.push(...rows('tarefas').filter(t=>t.data===d&&t.hora&&lifecycle(t)==='done')
    .map(t=>({...t,tipo:'tarefa',inicio:t.hora,feito:true})));
  const originals = {
    tarefa: new Map(rows('tarefas').map(t=>[String(t.id),t])),
    evento: new Map(rows('eventos').map(e=>[String(e.id),e]))
  };
  const seen=new Set();
  return list.filter(x=>{
    if(!x)return false;
    const status=lifecycle(originals[x.tipo]?.get(String(x.id))||x);
    return status!=='cancel'&&status!=='inactive';
  }).filter(x=>{
    const id=[x.tipo||'',x.id||'',x.titulo||'',hour(x.inicio)].join('|');
    if(seen.has(id))return false;seen.add(id);return true;
  }).map(x=>lifecycle(originals[x.tipo]?.get(String(x.id))||x)==='done'?{...x,feito:true}:x).sort((a,b)=>String(a.inicio||'99:99').localeCompare(String(b.inicio||'99:99')));
}
function priority(t){
  if(String(t.top3||'')===String(day||currentDay()))return true;
  const v=String(t.prioridade||t.prioritaria||t.importancia||'').toLowerCase();
  return /alta|urgente|prior|important|^1$|^sim$|^true$/.test(v);
}
function model(){
  const d=day||currentDay();
  const tasks=rows('tarefas').filter(t=>t.data===d&&lifecycle(t)!=='inactive'&&lifecycle(t)!=='cancel');
  const open=tasks.filter(t=>lifecycle(t)!=='done');
  const done=tasks.filter(t=>lifecycle(t)==='done');
  const projects=rows('projetos').filter(p=>!['concluido','pausado','cancelado'].includes(String(p.status||'').toLowerCase()));
  const goals=rows('metas').filter(g=>!['concluida','cancelada','pausada'].includes(String(g.status||'').toLowerCase()));
  const habits=scheduledHabits(d);
  const agenda=actualAgenda(d);
  return {d,tasks,open,done,projects,goals,habits,agenda,balance:accountBalance()};
}
function button(txt,action,extra='',cls=''){return '<button type="button" class="'+esc(cls)+'" data-sc190="'+esc(action)+'" '+extra+'>'+txt+'</button>';}
function hero(m){
  const now=new Date();
  const greeting=now.getHours()<12?'Bom dia':now.getHours()<18?'Boa tarde':'Boa noite';
  const who=String(data().config?.nome||'').trim().split(/\s+/)[0];
  return '<div class="sc190-hero"><div class="sc190-hero-copy">'+
    '<time datetime="'+esc(m.d)+'">'+esc(asDate(m.d).toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'}))+'</time>'+
    '<h1>'+greeting+(who?', '+esc(who):'')+'!</h1></div></div>';
}
function header(m){
  const first=m.open.find(priority)||m.open[0];
  return '<div class="sc190-datebar">'+button('‹','prev','aria-label="Dia anterior"','sc190-dayarrow')+
    '<span class="sc190-date-label"><span aria-hidden="true">▦</span> '+esc(asDate(m.d).toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short',year:'numeric'}))+'</span>'+
    button('›','next','aria-label="Próximo dia"','sc190-dayarrow')+
    '<span class="sc190-focus">'+(first?'<span aria-hidden="true">◎</span> Foco do dia: '+esc(name(first)):'Dia livre para planejar')+'</span>'+
    (m.d!==currentDay()?button('Ir para hoje','today','','sc190-today'):'')+'</div>'+
    '<div class="sc190-modes">'+button('Hoje','today','','sc190-mode-active')+button('Semana','week')+button('Mês','month')+'</div>';
}
function metrics(m){
  const cells=[
    ['task','Tarefas',String(m.open.length),countLabel(m.done.length,'concluída','concluídas'),'tasks'],
    ['calendar','Agenda',String(m.agenda.length),'Compromissos do dia','calendar'],
    ['project','Projetos',String(m.projects.length),'Em andamento','projects'],
    ['habit','Hábitos',String(m.habits.length),'Previstos hoje','habits'],
    ['money','Saldo atual',money(m.balance),m.balance==null?'Configure nas Finanças':'Conta configurada','finance']
  ];
  return '<div class="sc190-metrics">'+cells.map(([type,title,value,sub,action])=>
    button('<span class="sc190-metric-icon" aria-hidden="true">'+icon(type)+'</span><span class="sc190-metric-name">'+esc(title)+
    '</span><strong class="sc190-metric-value">'+esc(value)+'</strong><small>'+esc(sub)+'</small>',action,'','sc190-metric sc190-metric-'+type)
    ).join('')+'</div>';
}
function taskRow(t){
  const done=lifecycle(t)==='done';
  const tagged=priority(t);
  return '<div class="sc190-task '+(done?'sc190-task-done':'')+'" data-sc133-task="'+esc(t.id)+'">'+
    '<button type="button" class="sc190-taskcheck" data-sc126-check="'+esc(t.id)+'" aria-label="'+(done?'Reabrir ':'Concluir ')+esc(name(t))+'" aria-pressed="'+done+'">'+(done?'✓':'')+'</button>'+
    '<button type="button" class="sc190-taskname" data-sc126-open="tarefas" data-id="'+esc(t.id)+'"><strong>'+esc(name(t))+'</strong>'+
    (t.area?'<small>'+esc(t.area)+'</small>':'')+'</button>'+
    (tagged?'<span class="sc190-tag">Prioridade</span>':'')+
    (t.hora?'<span class="sc190-tasktime">'+esc(hour(t.hora))+'</span>':'')+
    '<button type="button" class="sc190-rowarrow" data-sc126-open="tarefas" data-id="'+esc(t.id)+'" aria-label="Detalhes">›</button></div>';
}
function taskPanel(m){
  const filters=[['all','Todas'],['priority','Prioridade'],['pending','Pendentes'],['done','Concluídas']];
  const chosen=m.tasks.filter(t=>filter==='all'||filter==='priority'&&priority(t)||filter==='pending'&&lifecycle(t)!=='done'||filter==='done'&&lifecycle(t)==='done');
  return '<section class="sc190-card sc190-priorities"><div class="sc190-cardhead"><h2><span class="sc190-heading-icon">☆</span> Prioridades do dia</h2>'+
    '<div class="sc190-filters" role="group" aria-label="Filtrar tarefas">'+filters.map(([v,t])=>button(esc(t)+(v==='all'?' '+m.tasks.length:v==='pending'?' '+m.open.length:v==='done'?' '+m.done.length:''),'filter','data-value="'+v+'" aria-pressed="'+(filter===v)+'"','sc190-chip '+(filter===v?'selected':''))).join('')+'</div></div>'+
    (chosen.length?'<div class="sc190-tasklist">'+chosen.slice(0,8).map(taskRow).join('')+'</div>':'<div class="sc190-empty">Nenhuma tarefa nesta seleção.</div>')+
    '<div class="sc190-cardfoot">'+button('Ver todas as tarefas','tasks')+button('+ Nova tarefa','new-task')+'</div></section>';
}
function agendaPanel(m){
  const list=m.agenda.filter(x=>x.inicio).slice(0,5);
  return '<section class="sc190-card sc190-agenda"><div class="sc190-cardhead"><h2><span class="sc190-heading-icon">▦</span> Agenda do dia</h2>'+button('Ver dia ›','calendar')+'</div>'+
    (list.length?'<div class="sc190-timeline">'+list.map(e=>'<div class="sc190-event'+((e.feito||lifecycle(e)==='done')?' sc190-event-done':'')+'">'+
      '<span class="sc190-eventtime">'+esc(hour(e.inicio)||'—')+'</span><span class="sc190-dot" aria-hidden="true"></span>'+
      '<button type="button" class="sc190-eventtitle" data-sc190="event" data-type="'+esc(e.tipo||'evento')+'" data-id="'+esc(e.id||'')+'">'+esc(name(e))+'</button>'+
      '</div>').join('')+'</div>':'<div class="sc190-empty">Sem compromissos com horário para este dia.</div>')+'</section>';
}
function habitsPanel(m){
  const habit=m.habits[0]||rows('habitos').find(h=>h.ativo!=='Não');
  if(!habit)return '<section class="sc190-card sc190-habits"><div class="sc190-cardhead"><h2><span class="sc190-heading-icon">♧</span> Hábitos</h2></div><div class="sc190-empty">Nenhum hábito cadastrado.</div>'+button('+ Criar hábito','habits')+'</section>';
  const days=Array.from({length:7},(_,i)=>addDays(m.d,i-6));
  const streak=typeof sequencia==='function'?sequencia(habit):0;
  return '<section class="sc190-card sc190-habits"><div class="sc190-cardhead"><h2><span class="sc190-heading-icon">♧</span> Hábitos</h2>'+
    '<span class="sc190-streak">'+esc(habit.nome)+(streak?' · '+streak+' dias':'')+'</span></div>'+
    '<div class="sc190-habitdays">'+days.map(d=>{
      const done=habitDone(habit.id,d),weekday=asDate(d).toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','');
      const scheduled=String(habit.dias||'').split(',').map(x=>x.trim()).includes(String(asDate(d).getDay()));
      const action=d===currentDay()&&scheduled?'data-sc126-habit="'+esc(habit.id)+'"':'data-sc126-open="habitos" data-id="'+esc(habit.id)+'"';
      return '<button type="button" class="sc190-habitday '+(done?'done':'')+'" '+action+' aria-label="'+(done?'Realizado: ':'Consultar: ')+esc(weekday)+'"><span class="sc190-habitcircle">'+(done?'✓':'')+'</span><small>'+esc(weekday)+'</small></button>';
    }).join('')+'</div></section>';
}
function goalsPanel(m){
  const chosen=m.goals.slice(0,3);
  return '<section class="sc190-card sc190-goals"><div class="sc190-cardhead"><h2><span class="sc190-heading-icon">◎</span> Metas em andamento</h2>'+button('Ver metas ›','goals')+'</div>'+
    (chosen.length?chosen.map(g=>{const pct=pctGoal(g);return '<button type="button" class="sc190-goal" data-sc126-open="metas" data-id="'+esc(g.id)+'"><span>'+esc(name(g))+' <strong>'+pct+'%</strong></span><span class="sc190-goalbar"><span style="width:'+pct+'%"></span></span></button>';}).join(''):'<div class="sc190-empty">Nenhuma meta ativa cadastrada.</div>')+'</section>';
}
function projectsPanel(m){
  const projects=m.projects.slice(0,3);
  return '<section class="sc190-card sc190-projects"><div class="sc190-cardhead"><h2><span class="sc190-heading-icon">◇</span> Projetos em andamento</h2>'+button('Ver todos ›','projects')+'</div>'+
    (projects.length?'<div class="sc190-projectgrid">'+projects.map(p=>{
      const related=rows('tarefas').filter(t=>String(t.projeto||'')===String(p.id)&&lifecycle(t)!=='cancel'&&lifecycle(t)!=='inactive');
      const total=related.length,done=related.filter(t=>lifecycle(t)==='done').length,pct=total?Math.round(done*100/total):0;
      return '<button type="button" class="sc190-project" data-sc126-open="projetos" data-id="'+esc(p.id)+'"><span class="sc190-projecttitle"><span class="sc190-projicon">▱</span><strong>'+esc(p.nome)+'</strong></span>'+
        '<span class="sc190-goalbar"><span style="width:'+pct+'%"></span></span><small>'+(total?pct+'% · '+done+' de '+total+' tarefas':'Sem tarefas vinculadas')+(p.prazo?' · '+esc(asDate(p.prazo).toLocaleDateString('pt-BR')):'')+'</small></button>';
    }).join('')+'</div>':'<div class="sc190-empty">Nenhum projeto em andamento.</div>')+'</section>';
}
function markup(m){
  return hero(m)+'<div class="sc190-toolbar">'+header(m)+'</div>'+
    '<div class="sc190-layout"><div class="sc190-left">'+taskPanel(m)+projectsPanel(m)+'</div>'+
    '<div class="sc190-right">'+agendaPanel(m)+habitsPanel(m)+goalsPanel(m)+'</div></div>'+metrics(m);
}
function decorateSidebar(){
  const aside=$('sc183-sidebar');if(!aside)return;
  const main=aside.querySelector('#sc183-main-links');if(!main)return;
  const access=aside.querySelector('.sc183-sidelinks');
  if(access&&access.dataset.sc190==='ready')return;
  // Não cria ferramentas sem suporte: usa apenas rotas já existentes.
  if(access){
    access.innerHTML='<span class="sc183-caption">Planejamento e áreas</span>'+
      '<button type="button" class="sc183-quick" data-sc190="week"><span aria-hidden="true">▦</span> Semana</button>'+
      '<button type="button" class="sc183-quick" data-sc190="month"><span aria-hidden="true">▣</span> Mês</button>'+
      '<button type="button" class="sc183-quick" data-sc126-library="notas"><span aria-hidden="true">▤</span> Notas</button>'+
      '<button type="button" class="sc183-quick" data-sc126-organize="projetos"><span aria-hidden="true">▱</span> Projetos</button>'+
      '<button type="button" class="sc183-quick" data-sc126-organize="metas"><span aria-hidden="true">◎</span> Metas</button>'+
      '<button type="button" class="sc183-quick" data-sc126-organize="habitos"><span aria-hidden="true">♧</span> Hábitos</button>'+
      '<button type="button" class="sc183-quick" data-sc126-organize="financas"><span aria-hidden="true">◈</span> Finanças</button>'+
      '<button type="button" class="sc183-quick" data-sc126-extra="ajustes"><span aria-hidden="true">⚙</span> Ajustes</button>';
    access.dataset.sc190='ready';
  }
}
function render(){
  if(rendering)return;
  if(typeof vistaAtual!=='undefined'&&vistaAtual!=='hoje'){decorateSidebar();return;}
  const home=$('v-hoje');if(!home)return;
  rendering=true;
  try{
    if(!day)day=currentDay();
    let node=$(key);
    if(!node){node=document.createElement('section');node.id=key;node.className='sc190-dashboard';node.setAttribute('aria-label','Painel de organização do dia');home.prepend(node);}
    const active=document.activeElement;
    const restoreFocus=node.contains(active)&&active.matches('button[data-sc190]');
    const action=restoreFocus?active.dataset.sc190:'';
    const value=restoreFocus?active.dataset.value:undefined;
    node.innerHTML=markup(model());
    if(restoreFocus){
      Array.from(node.querySelectorAll('button[data-sc190]'))
        .find(b=>b.dataset.sc190===action&&b.dataset.value===value)?.focus({preventScroll:true});
    }
    document.documentElement.classList.add('sc190-premium');
    decorateSidebar();
  }finally{rendering=false;}
}
function bind(){
  if(initialized)return;initialized=true;
  const old=window.renderVista;
  if(typeof old==='function')window.renderVista=function(){const out=old.apply(this,arguments);render();return out;};
  const oldAll=window.renderTudo;
  if(typeof oldAll==='function')window.renderTudo=function(){const out=oldAll.apply(this,arguments);render();return out;};
  // A interface legada pode concluir tarefas/hábitos sem chamar renderVista().
  // Reconciliar a leitura DEPOIS da ação nativa, sem qualquer gravação adicional.
  document.addEventListener('click',e=>{
    if(e.target.closest('#sc190-dashboard [data-sc126-check],#sc190-dashboard [data-sc126-habit]')){
      Promise.resolve().then(render);
    }
  });
  document.addEventListener('click',function(e){
    const b=e.target.closest('[data-sc190]');if(!b)return;
    // Só gerencia controles próprios; criação e edição usam handlers originais.
    const act=b.dataset.sc190;
    if(!act||act==='ready')return;
    e.preventDefault();
    if(act==='prev'){day=addDays(day,-1);filter='all';render();}
    else if(act==='next'){day=addDays(day,1);filter='all';render();}
    else if(act==='today'){day=currentDay();filter='all';render();}
    else if(act==='filter'){filter=b.dataset.value||'all';render();}
    else if(act==='week'||act==='month'||act==='calendar'){openDay(act==='week'?'semana':act==='month'?'mes':'dia');}
    else if(act==='tasks')nav('tarefas');
    else if(act==='new-task'&&typeof abrirTarefa==='function')abrirTarefa({});
    else if(act==='projects'||act==='goals'||act==='habits'){const k=act==='projects'?'projetos':act==='goals'?'metas':'habitos';const target=asideFilter(k);if(target)target.click();else nav('organizar');}
    else if(act==='finance'){const target=asideFilter('financas');if(target)target.click();else nav('organizar');}
    else if(act==='event'){const type=b.dataset.type,id=b.dataset.id;
      if(type==='tarefa'&&typeof abrirTarefa==='function')abrirTarefa(id);
      else if(type==='evento'&&id&&typeof abrirEvento==='function')abrirEvento(id);
      else openDay('dia');
    }
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
  window.addEventListener('sc166:conta-limpa',()=>{day=currentDay();filter='all';render();});
  render();
}
function asideFilter(k){return document.querySelector('#sc183-sidebar [data-sc126-organize="'+k+'"]');}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
window.SC190Dashboard={render,model,openDay,getDay:()=>day,version:'2026-11-21-fiel'};
})();
