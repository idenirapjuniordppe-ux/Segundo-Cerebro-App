// Run: npm install --no-save jsdom && node organizado.test.cjs
const {JSDOM,VirtualConsole}=require(process.env.SC_TEST_JSDOM||'jsdom');
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(require('path').join(__dirname,'index.html'),'utf8');
let scripts=0;for(const m of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){if(m[1].trim()){new vm.Script(m[1]);scripts++}}
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(e.type==='unhandled-exception')errors.push(e.message)});
const dom=new JSDOM(source,{url:'https://example.test/app/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.scrollTo=()=>{};w.matchMedia=()=>({matches:false,addListener(){},addEventListener(){}});w.confirm=()=>true;w.document.execCommand=()=>false;w.navigator.vibrate=()=>{};w.HTMLCanvasElement.prototype.getContext=()=>null;const chain=new Proxy({}, {get:(t,k)=>k==='withSuccessHandler'||k==='withFailureHandler'?()=>chain:()=>{}});w.google={script:{run:chain}};}});
const wait=()=>new Promise(r=>setTimeout(r,120));
(async()=>{await wait();const w=dom.window,doc=w.document;const click=selector=>{const x=doc.querySelector(selector);assert(x,'missing '+selector);x.click()};
 w.D.config.nome='Junior';w.D.tarefas=[{id:'t1',titulo:'Ler apelação',status:'aberta',projeto:'p1',meta_id:'m1',data:w.hojeISO()},{id:'t2',titulo:'Feita',status:'feita',projeto:'p1',concluida_em:w.carimboLocal()}];w.D.projetos=[{id:'p1',nome:'Estudar recursos',status:'ativo'}];w.D.metas=[{id:'m1',titulo:'Aprender',status:'ativa'}];w.D.eventos=[{id:'e1',titulo:'Aula',notas:'[[Estudar recursos]]',data:w.hojeISO()}];w.sc166Vincular('teste@example.test',true);w.D.notas=[{id:'n1',titulo:'Recursos no CPC',conteudo:'[[Estudar recursos]]',etiquetas:'#estudos'},{id:'n2',titulo:'Subpágina',pagina_pai:'n1',conteudo:''}];
 w.SC100.render();w.SC126.refresh();await wait();assert.equal(doc.querySelectorAll('#nav-movel button').length,3,'legacy observer must not restore five tabs');assert.equal(doc.querySelectorAll('#sc117-fab').length,1,'one movable creation button');assert(doc.querySelector('.sc129-history'));assert(doc.getElementById('sc129-settings'));assert(doc.getElementById('sc129-finished').textContent.includes('Feita'));
 w.montarNav();w.SC11.patchNav();await wait();assert.equal(doc.querySelectorAll('#nav-movel button').length,3,'old entry points cannot replace navigation');
 click('[data-sc126-route="organizar"]');click('[data-sc126-organize="projetos"]');assert(doc.querySelector('.sc129-project'));assert(doc.querySelector('.sc129-progress'));let rel=w.SC126.related(w.D.projetos[0]);assert.equal(rel.notas.length,1);assert.equal(rel.eventos.length,1);assert.equal(rel.metas.length,1,'meta linked via project task');
 click('[data-sc129-project="p1"][data-pane="eventos"]');assert(doc.getElementById('modal-corpo').textContent.includes('Aula'));click('[data-sc129-project="p1"][data-pane="tarefas"]');assert(doc.getElementById('modal-corpo').querySelector('details'));
 w.fecharModal();w.irPara('biblioteca');assert(doc.getElementById('v-biblioteca').textContent.includes('1 subpágina'));const query=doc.getElementById('sc129-library-query');query.value='Subpágina';query.dispatchEvent(new w.Event('input',{bubbles:true}));assert(doc.getElementById('v-biblioteca').textContent.includes('Subpágina'));
 w.SC126.archiveNote('n1',false);assert(w.D.notas[0].etiquetas.includes('#arquivado'));assert(w.fila.some(c=>c.tabela==='notas'),'archive persisted through normal queue');w.SC126.archiveNote('n1',true);assert(!w.D.notas[0].etiquetas.includes('#arquivado'));assert(w.D.notas[0].etiquetas.includes('#estudos'));
 w.fila=[];w.ultimaSync=Date.now();w.atualizando=false;w.SC129.update();assert.equal(doc.getElementById('sc129-sync').textContent,'✓ Salvo');w.fila=[{tipo:'SALVAR'}];w.SC129.update();assert(doc.getElementById('sc129-sync').textContent.includes('Sincronizando'));
 // O editor completo de post-it não deve herdar um checkbox de largura total.
 w.SC10.open('postits');w.SC10.edit('');
 const form=doc.getElementById('sc10-form'),pin=doc.getElementById('sc116-pin'),pinLabel=pin.closest('label');
 assert(form.classList.contains('sc10-postit-form'));
 assert.equal(pinLabel.htmlFor,'sc116-pin');
 assert.equal(pinLabel.querySelector('span').textContent,'Pendurar na tela');
 assert.equal(w.getComputedStyle(pinLabel).display,'flex','label contains a compact control and a wrappable caption');
 assert.equal(w.getComputedStyle(pin).width,'18px','checkbox is not a full-width form field');
 assert.equal(w.getComputedStyle(pin).height,'18px');
 assert.equal(w.getComputedStyle(pinLabel).minBlockSize,'44px');
 pinLabel.querySelector('span').click();
 assert(pin.checked,'touching the caption checks the control');
 const existingSalvar=w.salvar;let saved;
 w.salvar=(table,data)=>{saved={table,data};return true;};
 doc.getElementById('sc10-text').value='Exemplo de post-it';
 w.SC10.save('');
 w.salvar=existingSalvar;
 assert.equal(saved.table,'notas');assert.equal(saved.data.flutuante,'Sim');
 w.fecharModal();
 assert.deepEqual(errors,[]);console.log(`PASS: ${scripts} scripts, asynchronous legacy navigation conflict fixed, no floating capture, project relationships, completed groups, library search/subpages, durable reversible archive, truthful sync status.`);
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>dom.window.close());
