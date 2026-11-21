/* 2º Cérebro • Neo Glass 2026-11-21b — apresentação progressiva e reversível.
   Não altera registros, filas, autenticação ou integrações Google. */
(function(){
  'use strict';
  const VERSION='2026-11-21b', KEY='scng_visual_preset';
  const PRESETS=['auto','aurora','neon','executive'];
  const root=document.documentElement,byId=id=>document.getElementById(id);
  let started=false,lastStamp='',observer=null;
  function storageRead(){try{return localStorage.getItem(KEY)||'neon';}catch(_){return 'neon';}}
  function storageWrite(value){try{localStorage.setItem(KEY,value);}catch(_){}}
  function preset(){
    const saved=storageRead();
    return PRESETS.includes(saved)?saved:'neon';
  }
  function applyPreset(next,save){
    const value=PRESETS.includes(next)?next:'auto';
    if(save)storageWrite(value);
    root.classList.add('scng');
    if(value==='auto')root.removeAttribute('data-scng-preset');
    else root.setAttribute('data-scng-preset',value);
    const p=byId('scng-appearance');
    if(p)p.querySelectorAll('button[data-scng-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scngMode===value)));
    const dark=value==='neon'||value==='executive'||(value==='auto'&&(root.classList.contains('dark')||['neural','executive'].includes(root.dataset.scTheme)));
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute('content',dark?'#0b1326':'#edf3ff');
  }
  function enhanceBrand(){
    const head=byId('sc129-header');
    if(!head||head.querySelector('.scng-logo'))return;
    const label=head.querySelector('strong');
    if(!label)return;
    const img=document.createElement('span');
    img.className='scng-logo';img.setAttribute('aria-hidden','true');
    img.innerHTML='<i class="fa-solid fa-brain"></i>';
    label.prepend(img);
  }
  function createFab(){
    if(byId('scng-fab'))return;
    const b=document.createElement('button');
    b.id='scng-fab';b.type='button';b.setAttribute('aria-label','Criar tarefa, nota, projeto ou compromisso');
    b.title='Criar';b.innerHTML='<i class="fa-solid fa-plus" aria-hidden="true"></i>';
    b.addEventListener('click',()=>{
      if(typeof window.abrirNovo==='function')window.abrirNovo();
      else if(typeof window.abrirTarefa==='function')window.abrirTarefa({});
    });
    document.body.appendChild(b);
  }
  function overviewMarkup(){
    return '<section class="scng-hero" aria-labelledby="scng-hero-title">'+
      '<div class="scng-overline"><span class="scng-pulse" aria-hidden="true"></span><span id="scng-date-label">Visão do dia</span></div>'+
      '<h1 id="scng-hero-title">Seu dia, com clareza.</h1>'+
      '<p class="scng-intro">Tudo o que importa, no seu ritmo.</p>'+
      '<div class="scng-brain" aria-hidden="true"><i class="fa-solid fa-brain"></i></div>'+ 
      '<div class="scng-stats" aria-label="Resumo do dia">'+
      '<div class="scng-stat"><span class="scng-stat-icon" aria-hidden="true"><i class="fa-solid fa-list-check"></i></span><span><b id="scng-today-tasks">—</b><small>Tarefas hoje</small></span></div>'+
      '<div class="scng-stat"><span class="scng-stat-icon" aria-hidden="true"><i class="fa-regular fa-calendar"></i></span><span><b id="scng-today-events">—</b><small>Compromissos</small></span></div>'+
      '<div class="scng-stat"><span class="scng-stat-icon" aria-hidden="true"><i class="fa-solid fa-layer-group"></i></span><span><b id="scng-projects-count">—</b><small>Projetos ativos</small></span></div></div></section>'+
      '<div class="scng-actions" role="group" aria-label="Criar rapidamente">'+
      '<button type="button" class="scng-action" data-scng-create="tarefa"><i class="fa-solid fa-check" aria-hidden="true"></i> Nova tarefa</button>'+
      '<button type="button" class="scng-action" data-scng-create="nota"><i class="fa-regular fa-file-lines" aria-hidden="true"></i> Nova nota</button>'+
      '<button type="button" class="scng-action" data-scng-create="projeto"><i class="fa-regular fa-folder" aria-hidden="true"></i> Novo projeto</button>'+
      '<button type="button" class="scng-action" data-scng-create="evento"><i class="fa-regular fa-calendar-plus" aria-hidden="true"></i> Compromisso</button>'+
      '</div>';
  }
  function ensureOverview(){
    const home=byId('v-hoje');if(!home)return;
    let visual=byId('scng-overview');
    if(!visual){
      visual=document.createElement('div');visual.id='scng-overview';
      visual.innerHTML=overviewMarkup();home.insertBefore(visual,byId('sc100-home')||home.firstChild);
    }else if(byId('sc100-home')&&visual.nextSibling!==byId('sc100-home')){
      home.insertBefore(visual,byId('sc100-home'));
    }
  }
  function localDate(date){
    const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');
    return y+'-'+m+'-'+d;
  }
  function summary(){
    const d=typeof D==='object'&&D?D:{},tasks=Array.isArray(d.tarefas)?d.tarefas:[],events=Array.isArray(d.eventos)?d.eventos:[],projects=Array.isArray(d.projetos)?d.projetos:[];
    const now=new Date(),today=localDate(now),h=now.getHours();
    const name=String((d.config&&d.config.nome)||'').trim().slice(0,35);
    const taskCount=tasks.filter(x=>String(x.data||'')===today&&x.status!=='feita'&&x.status!=='cancelada').length;
    const eventCount=events.filter(x=>String(x.data||'')===today&&x.concluido!=='Sim'&&x.status!=='cancelado').length;
    const projectCount=projects.filter(x=>x.status!=='concluido'&&x.status!=='cancelado'&&x.status!=='pausado').length;
    const greeting=(h<12?'Bom dia':h<18?'Boa tarde':'Boa noite')+(name?', '+name:'')+'!';
    const date=now.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});
    return {greeting,date,taskCount,eventCount,projectCount};
  }
  function updateSummary(){
    const visual=byId('scng-overview');if(!visual||typeof document==='undefined')return;
    const s=summary(),stamp=JSON.stringify(s);if(stamp===lastStamp)return;
    lastStamp=stamp;
    byId('scng-hero-title').textContent=s.greeting;
    byId('scng-date-label').textContent=s.date;
    byId('scng-today-tasks').textContent=s.taskCount;
    byId('scng-today-events').textContent=s.eventCount;
    byId('scng-projects-count').textContent=s.projectCount;
  }
  function mountAppearance(){
    const panel=byId('sc69-theme-panel');if(!panel||byId('scng-appearance'))return;
    const area=document.createElement('section');area.id='scng-appearance';area.setAttribute('aria-label','Atmosfera visual');
    area.innerHTML='<h3>Atmosfera Neo Glass</h3><p>Escolha o visual. Seus temas e dados permanecem intactos.</p><div class="scng-modes" role="group" aria-label="Atmosfera do app">'+
      [['auto','Do tema'],['aurora','Aurora'],['neon','Neon Night'],['executive','Executive']].map(([value,label])=>'<button type="button" class="scng-mode" data-scng-mode="'+value+'" aria-pressed="false">'+label+'</button>').join('')+
      '</div>';
    panel.appendChild(area);applyPreset(preset(),false);
  }
  function createItem(which){
    const day=typeof window.hojeISO==='function'?window.hojeISO():localDate(new Date());
    try{
      if(which==='tarefa'&&typeof window.abrirTarefa==='function')window.abrirTarefa({data:day});
      if(which==='nota'&&typeof window.abrirNota==='function')window.abrirNota({});
      if(which==='projeto'&&typeof window.abrirProjeto==='function')window.abrirProjeto({});
      if(which==='evento'&&typeof window.abrirEvento==='function')window.abrirEvento({data:day});
    }catch(e){console.warn('[Neo Glass] Ação de criação:',e);}
  }
  function update(){
    ensureOverview();enhanceBrand();createFab();mountAppearance();updateSummary();
  }
  function start(){
    if(started)return;started=true;
    applyPreset(preset(),false);update();
    document.addEventListener('click',event=>{
      const choice=event.target.closest('button[data-scng-mode]');
      if(choice){event.preventDefault();applyPreset(choice.dataset.scngMode,true);return;}
      const create=event.target.closest('button[data-scng-create]');
      if(create){event.preventDefault();createItem(create.dataset.scngCreate);}
    });
    /* UI legada redesenha partes da página; restaura só os encaixes visuais. */
    observer=new MutationObserver(records=>{
      let updateNeeded=false;
      for(const r of records){
        if(r.target.id==='sc100-home'||r.target.id==='v-organizar'||r.target.id==='sc69-theme-panel'||r.target.id==='topo'||r.target.id==='v-hoje'){
          updateNeeded=true;break;
        }
      }
      if(updateNeeded)requestAnimationFrame(update);
    });
    const targets=['sc100-home','v-hoje','topo','sc69-theme-panel'];
    targets.forEach(id=>{const n=byId(id);if(n)observer.observe(n,{childList:true});});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){lastStamp='';update();}});
    window.addEventListener('pageshow',()=>{lastStamp='';update();});
    window.addEventListener('sc:conta-atualizada',()=>{lastStamp='';update();});
    /* O resumo só consulta dados locais já carregados; não faz chamadas extras. */
    setInterval(()=>{if(!document.hidden&&typeof vistaAtual!=='undefined'&&vistaAtual==='hoje')updateSummary();},20000);
  }
  window.SCNeoGlass={version:VERSION,preset,applyPreset,updateSummary,update};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();