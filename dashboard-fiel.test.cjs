'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const code=fs.readFileSync('sc-aura-dashboard.js','utf8');
const css=fs.readFileSync('sc-aura-dashboard.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
function setup(){
  const dom=new JSDOM('<!doctype html><html lang="pt-BR" class="sc126 sc100-active sc11-active" data-sc-theme="minimal"><body><div id="v-hoje" class="sc148-active"><section class="sc148-root">Original planner</section></div><div id="v-agenda"></div><aside id="sc183-sidebar"><div id="sc183-main-links"></div><div class="sc183-sidelinks"></div></aside></body></html>',{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;
  w.D={config:{nome:'Teste',sc147_account:JSON.stringify({initial:100000,date:'2026-11-01'})},tarefas:[
    {id:'t1',titulo:'Estudar recursos',data:'2026-11-21',hora:'11:00',prioridade:'Alta',status:'aberta',projeto:'p1'},
    {id:'t2',titulo:'Relatório concluído',data:'2026-11-21',status:'feita',projeto:'p1'},
    {id:'t3',titulo:'Outra tarefa',data:'2026-11-21',status:'aberta',top3:'2026-11-21'},
    {id:'t4',titulo:'Amanhã',data:'2026-11-22',status:'aberta'}],
    projetos:[{id:'p1',nome:'Projeto teste',status:'ativo'}],
    metas:[{id:'m1',titulo:'Estudar semanalmente',status:'ativa',progresso:65}],
    habitos:[{id:'h1',nome:'Leitura',dias:'0,1,2,3,4,5,6',ativo:'Sim'}],
    registros:[{habito_id:'h1',data:'2026-11-19'},{habito_id:'h1',data:'2026-11-20'}],
    eventos:[{id:'e1',titulo:'Reunião',data:'2026-11-21',inicio:'14:00',fim:'15:00',status:'aberto'}],
    financas:[{id:'f1',tipo:'receita',valor_centavos:'30000',status:'pago',data:'2026-11-15'},
              {id:'f2',tipo:'despesa',valor_centavos:'15000',status:'pago',data:'2026-11-16'}],
    notas:[]};
  w.vistaAtual='hoje';
  w.hojeISO=()=> '2026-11-21';
  w.somaDias=(d,n)=>{const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
  w.sc155Lifecycle=x=>x.status==='feita'?'done':'open';
  w.habitoFeito=(id,d)=>w.D.registros.some(r=>r.habito_id===id&&r.data===d);
  w.sequencia=()=>2;
  w.pct=x=>Number(x.progresso)||0;
  w.itensDoDia=(day)=>[{tipo:'tarefa',id:'t1',titulo:'Estudar recursos',inicio:'11:00'},{tipo:'evento',id:'e1',titulo:'Reunião',inicio:'14:00'}].filter(x=>day==='2026-11-21');
  w.renderVista=()=>{};
  w.irPara=to=>w.vistaAtual=to;
  w.abrirTarefa=()=>{};
  w.SC148={refresh:()=>{}};
  w.eval(code);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  return {dom,w};
}
test('HTML inclui arquivos de estrutura real e service worker os instala offline',()=>{
  assert.match(html,/sc-aura-dashboard\.css\?v=2026-11-21f/);
  assert.match(html,/sc-aura-dashboard\.js\?v=2026-11-21f/);
  assert.match(sw,/premium-dashboard-fiel-20261121f/);
  assert.match(sw,/sc-aura-dashboard\.css\?v=2026-11-21f/);
  assert.match(sw,/sc-aura-dashboard\.js\?v=2026-11-21f/);
  assert.match(sw,/const VERSION='2026-11-20d';/);
});
test('Código e CSS são legíveis e não alteram dados automaticamente',()=>{
  new vm.Script(code);
  assert.doesNotMatch(code,/google\.script\.run|fetch\(|DriveApp|localStorage\.setItem/);
  assert.match(css,/#sc190-dashboard/);
  assert.match(css,/\.sc190-layout/);
  assert.match(css,/\.sc190-metrics/);
  assert.match(css,/\.sc190-habitdays/);
});
test('O dashboard ocupa Hoje e preserva a rota Agenda',t=>{
  const {dom,w}=setup();t.after(()=>dom.window.close());
  const root=w.document.getElementById('sc190-dashboard');
  assert(root);
  assert.equal(w.SC190Dashboard.model().tasks.length,3);
  assert.equal(w.SC190Dashboard.model().open.length,2);
  assert.equal(w.SC190Dashboard.model().balance,115000);
  for(const heading of ['Prioridades do dia','Agenda do dia','Hábitos','Metas em andamento','Projetos em andamento'])
    assert(root.textContent.includes(heading),heading);
  assert(w.document.querySelector('#v-hoje .sc148-root'));
  assert(root.textContent.includes('R$'));
  assert(!root.textContent.includes('R$ 4.320,00'),'Nenhum saldo fictício');
});
test('Controles reais usam a delegação existente sem simularem ações',t=>{
  const {dom,w}=setup();t.after(()=>dom.window.close());
  const clicks=[];
  w.document.addEventListener('click',e=>{
    const b=e.target.closest('[data-sc126-check],[data-sc126-open],[data-sc126-habit]');
    if(b)clicks.push([b.dataset.sc126Check||b.dataset.sc126Open||'hábito',b.dataset.id||b.dataset.sc126Habit]);
  });
  w.document.querySelector('#sc190-dashboard [data-sc126-check="t1"]').click();
  w.document.querySelector('#sc190-dashboard [data-sc126-open="projetos"]').click();
  assert.deepEqual(clicks,[['t1',undefined],['projetos','p1']]);
  assert.equal(w.D.tarefas[0].status,'aberta','Não grava dados sem delegação real');
});
test('Filtros e navegação temporal funcionam e exibem resultados dos dados',t=>{
  const {dom,w}=setup();t.after(()=>dom.window.close());
  w.document.querySelector('#sc190-dashboard [data-sc190="filter"][data-value="priority"]').click();
  assert.equal(w.document.querySelectorAll('#sc190-dashboard .sc190-task').length,2,'Prioridade alta e top3 do dia');
  w.document.querySelector('#sc190-dashboard [data-sc190="next"]').click();
  assert.equal(w.SC190Dashboard.getDay(),'2026-11-22');
  assert.equal(w.SC190Dashboard.model().tasks.length,1);
  w.document.querySelector('#sc190-dashboard [data-sc190="today"]').click();
  assert.equal(w.SC190Dashboard.getDay(),'2026-11-21');
});
test('Sidebar mantém rotas reais, sem criar Minutas ou Work inexistentes',t=>{
  const {dom,w}=setup();t.after(()=>dom.window.close());
  const links=w.document.querySelector('.sc183-sidelinks');
  for(const term of ['Semana','Mês','Notas','Projetos','Metas','Hábitos','Finanças','Ajustes'])
    assert(links.textContent.includes(term),term);
  assert(!links.textContent.includes('Minutas'));
  assert(!links.textContent.includes('Work'));
});
test('Sem conta configurada, saldo não é inventado',t=>{
  const {dom,w}=setup();t.after(()=>dom.window.close());
  delete w.D.config.sc147_account;
  w.SC190Dashboard.render();
  assert.equal(w.SC190Dashboard.model().balance,null);
  assert(w.document.getElementById('sc190-dashboard').textContent.includes('Configure nas Finanças'));
});
