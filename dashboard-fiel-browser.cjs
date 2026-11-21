'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const path=require('node:path');
const html=fs.readFileSync('index.html','utf8');
const inlineStyles=[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(m=>m[1]).join('\n');
const oldCss=fs.readFileSync('sc-botoes-compactos.css','utf8');
const newCss=fs.readFileSync('sc-aura-dashboard.css','utf8');
const sidebarJS=fs.readFileSync('sc-botoes-compactos.js','utf8');
const dashboardJS=fs.readFileSync('sc-aura-dashboard.js','utf8');
const css=inlineStyles+'\n'+oldCss+'\n'+newCss;
const fixture='<!doctype html><html lang="pt-BR" class="sc126 sc11-active sc100-active" data-sc-theme="minimal"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+
  '*,*::before,*::after{box-sizing:border-box}body{margin:0;min-width:0} .flex{display:flex}.min-h-screen{min-height:100vh}main{flex:1;min-width:0} .max-w-6xl{width:100%;margin:auto}'+
  css+'</style></head><body><div class="flex min-h-screen"><main><div id="topo"><div id="sc129-header"><strong>2º Cérebro</strong><div><button type="button" aria-label="Buscar">⌕</button><button type="button" aria-label="Ajustes">⚙</button></div></div><div class="max-w-6xl"><div class="flex-1"><form><input id="captura" placeholder="Converse ou peça algo"></form></div></div></div>'+
  '<div class="max-w-6xl"><section id="v-hoje" class="vista sc148-active"><div class="sc148-root"><h2>Planner antigo</h2></div></section><section id="v-agenda" class="vista hidden"></section></div></main></div>'+
  '<nav id="nav-movel" class="fixed bottom-0 inset-x-0"><button type="button" class="nav-m ativo" data-sc126-route="hoje" aria-current="page">Hoje</button><button type="button" class="nav-m" data-sc126-route="organizar" aria-current="false">Organizar</button><button type="button" class="nav-m" data-sc126-route="biblioteca" aria-current="false">Biblioteca</button></nav></body></html>';
const data={config:{nome:'Teste',sc147_account:JSON.stringify({initial:432000,date:'2026-11-01'})},
  tarefas:[
    {id:'t1',titulo:'Finalizar o relatório',data:'2026-11-21',hora:'12:00',prioridade:'Alta',status:'aberta',projeto:'p1'},
    {id:'t2',titulo:'Responder e-mails',data:'2026-11-21',hora:'09:00',status:'feita'},
    {id:'t3',titulo:'Estudar Recursos (CPC)',data:'2026-11-21',hora:'16:00',prioridade:'Alta',status:'aberta',projeto:'p1'},
    {id:'t4',titulo:'Planejar o dia seguinte',data:'2026-11-21',status:'aberta'},
    {id:'t5',titulo:'Treino',data:'2026-11-21',hora:'19:00',status:'aberta'},
    {id:'t6',titulo:'Nota futura',data:'2026-11-22',status:'aberta'}],
  projetos:[{id:'p1',nome:'TCC — Tutela Satisfativa',status:'ativo',prazo:'2026-11-30'},{id:'p2',nome:'2º Cérebro — Evoluções',status:'ativo',prazo:'2026-12-15'}],
  eventos:[{id:'e1',titulo:'Reunião de projeto',data:'2026-11-21',inicio:'14:00',fim:'15:00',status:'aberto'}],
  metas:[{id:'m1',titulo:'Estudar quatro vezes na semana',progresso:67,status:'ativa'},{id:'m2',titulo:'Treinar três vezes',progresso:60,status:'ativa'}],
  habitos:[{id:'h1',nome:'Leitura diária',dias:'0,1,2,3,4,5,6',ativo:'Sim'}],
  registros:[{habito_id:'h1',data:'2026-11-18'},{habito_id:'h1',data:'2026-11-19'},{habito_id:'h1',data:'2026-11-20'}],
  financas:[],notas:[],estudos:[]};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  let n=0;
  for(const theme of ['minimal','glass','editorial','neural','executive']){
   for(const width of [320,390,768,1100,1440,1849]){
    const page=await browser.newPage({viewport:{width,height:950},deviceScaleFactor:1});
    try{
     await page.setContent(fixture,{waitUntil:'domcontentloaded'});
     await page.evaluate(({d,theme})=>{
       document.documentElement.dataset.scTheme=theme;
       document.documentElement.classList.toggle('dark',['neural','executive'].includes(theme));
       window.D=d;
       window.vistaAtual='hoje';
       window.hojeISO=()=> '2026-11-21';
       window.somaDias=(date,n)=>{const x=new Date(date+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10);};
       window.sc155Lifecycle=x=>x.status==='feita'?'done':'open';
       window.habitoFeito=(id,date)=>window.D.registros.some(r=>r.habito_id===id&&r.data===date);
       window.sequencia=()=>3;
       window.pct=x=>Number(x.progresso)||0;
       window.itensDoDia=(date)=>date!=='2026-11-21'?[]:[
         {tipo:'tarefa',id:'t2',titulo:'Responder e-mails',inicio:'09:00'},
         {tipo:'tarefa',id:'t1',titulo:'Finalizar o relatório',inicio:'12:00'},
         {tipo:'evento',id:'e1',titulo:'Reunião de projeto',inicio:'14:00'},
         {tipo:'tarefa',id:'t3',titulo:'Estudar Recursos (CPC)',inicio:'16:00'},
         {tipo:'tarefa',id:'t5',titulo:'Treino',inicio:'19:00'}];
       window.renderVista=()=>{};
       window.irPara=to=>{window.vistaAtual=to;};
     },{d:data,theme});
     await page.addScriptTag({content:sidebarJS});
     await page.addScriptTag({content:dashboardJS});
     await page.waitForSelector('#sc190-dashboard .sc190-project');
     const info=await page.evaluate(()=>{
       const byId=id=>document.getElementById(id);
       const rect=id=>{const r=byId(id).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
       const root=byId('sc190-dashboard'),s=byId('sc183-sidebar');
       const grid=root.querySelector('.sc190-layout'),gr=grid.getBoundingClientRect(),cols=getComputedStyle(grid).gridTemplateColumns.split(' ').length;
       const r=root.getBoundingClientRect(),style=getComputedStyle(root);
       return {root:{x:r.x,right:r.right,width:r.width,display:style.display},
         bodyWidth:document.documentElement.scrollWidth,viewport:innerWidth,
         sidebar:rect('sc183-sidebar'),sidebarDisplay:getComputedStyle(s).display,
         cardCount:root.querySelectorAll('.sc190-metric').length,
         columns:cols,
         projectCount:root.querySelectorAll('.sc190-project').length,
         taskCount:root.querySelectorAll('.sc190-task').length,
         head:root.querySelector('.sc190-hero h1')?.textContent,
         oldPlannerDisplay:getComputedStyle(document.querySelector('#v-hoje .sc148-root')).display,
         mainX:document.querySelector('main').getBoundingClientRect().x,
         rightPanels:root.querySelectorAll('.sc190-right .sc190-card').length,
         heroY:root.querySelector('.sc190-hero').getBoundingClientRect().top,
         agendaY:root.querySelector('.sc190-agenda').getBoundingClientRect().top,
         capture:rect('captura'),
         actions:rect('sc129-header'),
         filtersFit:[...root.querySelectorAll('.sc190-chip')].every(chip=>chip.scrollWidth<=chip.clientWidth+1)
       };
     });
     assert.equal(info.root.display,'block','Dashboard não visível '+theme+' '+width);
     assert.equal(info.oldPlannerDisplay,'none','O planner antigo continua no lugar de Hoje '+theme+' '+width);
     assert.equal(info.cardCount,5,'Cinco métricas '+theme+' '+width);
     assert.equal(info.rightPanels,3,'Agenda/hábitos/metas '+theme+' '+width);
     assert.equal(info.projectCount,2,'Projetos reais '+theme+' '+width);
     assert.equal(info.taskCount,5,'Tarefas reais '+theme+' '+width);
     assert(info.bodyWidth<=width+2,'Rolagem lateral '+theme+' '+width+' '+JSON.stringify(info));
     assert(info.root.right<=width+2,'Dashboard além da tela '+theme+' '+width);
     assert(info.capture.right<=info.actions.x,'Captura e ações se sobrepõem '+theme+' '+width);
     assert(info.filtersFit,'Filtros cortados '+theme+' '+width);
     assert(info.root.x>=-2,'Dashboard começa fora da tela '+theme+' '+width);
     if(width>=1100){
       assert.equal(info.sidebarDisplay,'flex','Sidebar deve aparecer '+theme+' '+width);
       assert(info.root.x>=info.sidebar.right+12,'Sidebar invade painel '+theme+' '+width+' '+JSON.stringify(info));
       if(width>=1440){
         assert(info.columns>=2,'Layout desktop deve ter duas colunas '+theme+' '+width);
         assert(Math.abs(info.agendaY-info.heroY)<10,'Agenda deve iniciar alinhada à saudação '+theme+' '+width+' '+JSON.stringify(info));
       }
     }else assert.equal(info.sidebarDisplay,'none','Sidebar deve ficar oculta no mobile '+theme+' '+width);
     if(theme==='minimal'&&(width===1440||width===390||width===1849)){
       fs.mkdirSync('artefacts',{recursive:true});
       await page.screenshot({path:path.join('artefacts','aura-dashboard-'+width+'.png'),fullPage:true});
     }
     if(theme==='minimal'&&width===1440){
       await page.locator('#sc190-dashboard [data-sc190="filter"][data-value="priority"]').click();
       assert.equal(await page.locator('#sc190-dashboard .sc190-task').count(),2,'Filtro visual responde');
       await page.locator('#sc190-dashboard [data-sc190="filter"][data-value="all"]').click();
       assert.equal(await page.locator('#sc190-dashboard .sc190-task').count(),5,'Filtro Todas');
     }
     // Preserve as estruturas e seletores usados pelas rotas reais.
     await page.locator('#v-hoje').evaluate(node=>node.classList.add('hidden'));
     const routes=[
       ['organizar','<h1>Organizar</h1><div class="sc182-tabstrip"><div class="sc126-tools"><button aria-pressed="true">Tarefas</button><button>Projetos</button></div></div><div class="sc126-list"><div class="sc126-row sc153-late"><button class="sc126-row-main"><strong>Tarefa atrasada</strong></button><small class="sc153-status">Atrasado</small></div></div>','h1','.sc126-list'],
       ['biblioteca','<header class="sc182-library-header"><h1>Biblioteca</h1></header><div class="sc182-search"><input aria-label="Buscar na biblioteca"></div><div class="sc126-list"><button class="sc126-row-main">Nota de teste</button></div>','.sc182-library-header','.sc126-list'],
       ['agenda','<header class="sc148-head"><h2>Agenda</h2></header><div class="sc148-card">Horários do dia</div>','.sc148-head','.sc148-card'],
       ['config','<h1>Ajustes</h1><details class="sc134-group"><summary>Aparência</summary></details>','h1','.sc134-group']
     ];
     for(const [route,markup,header,card] of routes){
       const result=await page.evaluate(({route,markup,header,card})=>{
         const host=document.createElement('section');
         host.id='v-'+route;
         document.getElementById(host.id)?.remove();
         host.innerHTML=markup;
         document.getElementById('v-hoje').parentElement.append(host);
         const result={
           header:getComputedStyle(host.querySelector(header)).backgroundImage,
           card:getComputedStyle(host.querySelector(card)).borderRadius,
           wallpaper:getComputedStyle(document.body,'::before').opacity,
           overflow:document.documentElement.scrollWidth>innerWidth+2
         };
         host.remove();
         return result;
       },{route,markup,header,card});
       assert.match(result.header,/linear-gradient/,'Cabeçalho Aura '+route+' '+theme+' '+width);
       assert.equal(result.card,'17px','Cartão Aura '+route+' '+theme+' '+width);
       assert.equal(result.wallpaper,'0.17','Fundo discreto '+route+' '+theme+' '+width);
       assert(!result.overflow,'Rolagem lateral '+route+' '+theme+' '+width);
     }
     n++;
    }finally{await page.close();}
   }
  }
  console.log('PASS dashboard: '+n+' cenários (5 temas × 6 larguras), desktop/mobile, sem sobreposição, cartões e filtros funcionando.');
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
