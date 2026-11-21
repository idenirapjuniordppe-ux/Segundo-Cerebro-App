/* 2º Cérebro — botões contextuais, versão visual 2026-11-21c
   Reutiliza o FAB arrastável e os comandos já existentes. Não altera dados. */
(function(){
'use strict';
let opened=null,previous=null;
const byId=id=>document.getElementById(id);
function activeView(){
  let v='';
  try{v=(typeof vistaAtual!=='undefined'?vistaAtual:window.vistaAtual)||'';}catch(_){}
  if(!v){
    const selected=document.querySelector('#nav-movel [data-sc126-route][aria-current="page"]');
    v=selected?.dataset.sc126Route||'hoje';
  }
  if(['notas','biblioteca'].includes(v))return 'biblioteca';
  if(['tarefas','metas','organizar'].includes(v))return 'organizar';
  return v==='agenda'?'hoje':v;
}
function activeCategory(kind,fallback){
  const p=kind==='organizar'?'data-sc126-organize':'data-sc126-library';
  const host=kind==='organizar'?'v-organizar':'v-biblioteca';
  const selected=byId(host)?.querySelector('['+p+'][aria-pressed="true"]');
  return selected?.getAttribute(p)||fallback;
}
function dateForNote(){
  const planner=document.querySelector('#v-hoje .sc148-root input[data-sc148-date],#v-agenda .sc148-root input[data-sc148-date]');
  const value=planner?.value||'';
  if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
const item=(label,attrs)=>({label,attrs});
function options(){
  const v=activeView();
  if(v==='biblioteca'){
    const cat=activeCategory('biblioteca','notas');
    if(cat==='estudos')return {title:'Criar em Estudos',items:[
      item('Novo estudo e agenda',{'data-sc126-tool':'estudos'}),
      item('Nova nota',{'data-sc126-new':'notas'}),
      item('Novo post-it',{'data-sc160':'new'})]};
    if(cat==='arquivos')return {title:'Arquivos da Biblioteca',items:[
      item('Adicionar link em uma nota',{'data-sc126-new':'notas'}),
      item('Nova nota',{'data-sc126-new':'notas'})]};
    if(cat==='postits')return {title:'Criar em Post-its',items:[
      item('Novo post-it',{'data-sc160':'new'}),
      item('Nova nota',{'data-sc126-new':'notas'})]};
    return {title:'Criar na Biblioteca',items:[
      item('Nova nota',{'data-sc126-new':'notas'}),
      item('Novo post-it',{'data-sc160':'new'}),
      item('Modelos e ferramentas',{'data-sc144':'open'})]};
  }
  if(v==='organizar'){
    const cat=activeCategory('organizar','tarefas');
    const kinds={tarefas:['Nova tarefa','tarefas'],projetos:['Novo projeto','projetos'],
      metas:['Nova meta','metas'],habitos:['Novo hábito','habitos']};
    if(cat==='financas')return {title:'Finanças',items:[
      item('Abrir ferramentas financeiras',{'data-sc126-tool':'financas'}),
      item('Nova tarefa',{'data-sc126-new':'tarefas'})]};
    if(cat==='resumo')return {title:'Criar em Organizar',items:[
      item('Nova tarefa',{'data-sc126-new':'tarefas'}),
      item('Novo projeto',{'data-sc126-new':'projetos'}),
      item('Nova meta',{'data-sc126-new':'metas'}),
      item('Novo hábito',{'data-sc126-new':'habitos'})]};
    const primary=kinds[cat]||kinds.tarefas;
    const rest=Object.values(kinds).filter(x=>x[1]!==primary[1]);
    return {title:'Criar em '+({tarefas:'Tarefas',projetos:'Projetos',metas:'Metas',habitos:'Hábitos'}[cat]||'Organizar'),
      items:[item(primary[0],{'data-sc126-new':primary[1]}),...rest.map(x=>item(x[0],{'data-sc126-new':x[1]}))]};
  }
  return {title:'Criar neste dia',items:[
    item('Nova tarefa',{'data-sc126-new':'tarefas'}),
    item('Novo compromisso',{'data-sc148':'new-event'}),
    item('Anotar neste dia',{'data-sc170':'day-note','data-day':dateForNote()}),
    item('Novo post-it',{'data-sc160':'new'})]};
}
function close(returnFocus){
  const m=opened;opened=null;
  if(m)m.remove();
  if(previous){
    previous.setAttribute('aria-expanded','false');
    if(returnFocus&&previous.isConnected)previous.focus({preventScroll:true});
  }
  previous=null;
}
function position(menu,anchor){
  if(!menu||!anchor||!menu.isConnected)return;
  const r=anchor.getBoundingClientRect(),sz=menu.getBoundingClientRect();
  const width=window.innerWidth||document.documentElement.clientWidth||360;
  const height=window.innerHeight||document.documentElement.clientHeight||640;
  const x=Math.max(12,Math.min(width-sz.width-12,r.right-sz.width));
  let y=r.top-sz.height-12;
  if(y<12)y=Math.max(12,Math.min(height-sz.height-12,r.bottom+10));
  menu.style.left=Math.round(x)+'px';menu.style.top=Math.round(y)+'px';
  menu.style.visibility='visible';
}
function createMenu(anchor){
  if(!anchor||!document.body)return;
  if(opened){const same=previous===anchor;close(false);if(same)return;}
  const config=options();
  const menu=document.createElement('div');
  menu.id='sc182-create-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label',config.title);
  menu.style.visibility='hidden';
  const h=document.createElement('strong');h.textContent=config.title;menu.append(h);
  for(const opt of config.items){
    const button=document.createElement('button');
    button.type='button';button.textContent=opt.label;button.setAttribute('role','menuitem');
    for(const [key,value] of Object.entries(opt.attrs))button.setAttribute(key,String(value));
    menu.append(button);
  }
  document.body.append(menu);opened=menu;previous=anchor;
  anchor.setAttribute('aria-haspopup','menu');anchor.setAttribute('aria-expanded','true');
  requestAnimationFrame(()=>{if(opened!==menu)return;position(menu,anchor);menu.querySelector('button')?.focus({preventScroll:true});});
}
document.addEventListener('click',e=>{
  if(!opened)return;
  const target=e.target.closest?.('#sc182-create-menu button');
  if(target){
    // A navegação, a criação e o editor mantêm seus próprios handlers delegados.
    // Fechar após a propagação permite que os handlers antigos recebam o clique.
    queueMicrotask(()=>close(false));
  }
});
document.addEventListener('pointerdown',e=>{
  if(opened&&!e.target.closest?.('#sc182-create-menu,#sc117-fab'))close(false);
},true);
document.addEventListener('keydown',e=>{
  if(!opened)return;
  if(e.key==='Escape'){e.preventDefault();close(true);return;}
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    const buttons=[...opened.querySelectorAll('button')];
    if(!buttons.length)return;
    const i=buttons.indexOf(document.activeElement);
    const next=(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;
    e.preventDefault();buttons[next].focus();
  }
});
window.addEventListener('resize',()=>{if(opened&&previous)position(opened,previous);},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)close(false);});
window.SC182Buttons={createMenu,close,options,activeView};
})();

/* Studio 11.30 — sidebar responsiva; somente navegação já suportada. */
(function(){
'use strict';
const items=[
  {label:'Agenda',symbol:'◷',attr:'data-sc126-route',value:'agenda'},
  {label:'Projetos',symbol:'▱',attr:'data-sc126-organize',value:'projetos'},
  {label:'Finanças',symbol:'◈',attr:'data-sc126-organize',value:'financas'},
  {label:'Ajustes',symbol:'⚙',attr:'data-sc126-extra',value:'ajustes'}
];
function make(tag,cls,text){
  const e=document.createElement(tag);e.className=cls;
  if(text!==undefined)e.textContent=text;
  return e;
}
function decorate(){
  const n=document.getElementById('nav-movel');
  if(!n||n.querySelector('.sc183-sidebrand'))return;
  const brand=make('div','sc183-sidebrand');
  brand.setAttribute('aria-hidden','true');
  const mark=make('span','sc183-sidemark','◈');
  const title=make('span','sc183-side-title');
  title.append(make('strong','', '2º Cérebro'),make('small','','Organizador pessoal'));
  brand.append(mark,title);
  const quick=make('div','sc183-sidelinks');
  quick.append(make('span','sc183-caption','Acessos'));
  for(const item of items){
    const b=make('button','sc183-quick');
    b.type='button';b.setAttribute(item.attr,item.value);
    const ico=make('span','',item.symbol);
    ico.setAttribute('aria-hidden','true');
    b.append(ico,document.createTextNode(item.label));
    quick.append(b);
  }
  n.prepend(brand);n.append(quick);
}
function init(){
  decorate();
  const nav=document.getElementById('nav-movel');
  if(nav&&typeof MutationObserver!=='undefined'){
    new MutationObserver(()=>{if(!nav.querySelector('.sc183-sidebrand'))decorate();})
      .observe(nav,{childList:true});
  }
}
if(document.readyState==='loading')
  document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
window.SC183Premium={decorate,version:'2026-11-21d'};
})();
