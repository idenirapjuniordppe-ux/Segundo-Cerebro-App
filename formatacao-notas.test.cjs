// Run with jsdom installed, or SC_TEST_JSDOM pointing to it.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const {JSDOM, VirtualConsole} = require(process.env.SC_TEST_JSDOM || 'jsdom');
const html = fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));

async function fixture(t){
  const errors=[], vc=new VirtualConsole();
  vc.on('jsdomError',e=>{if(e.type==='unhandled-exception')errors.push(e.message)});
  const dom=new JSDOM(html,{url:'https://example.test/app/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.scrollTo=()=>{}; w.matchMedia=()=>({matches:false,addListener(){},addEventListener(){}});
    w.document.execCommand=()=>false; w.navigator.vibrate=()=>{};
    w.HTMLCanvasElement.prototype.getContext=()=>null;
    const chain=new Proxy({}, {get:(_,k)=>k==='withSuccessHandler'||k==='withFailureHandler'?()=>chain:()=>{}});
    w.google={script:{run:chain}};
  }});
  t.after(()=>{dom.window.close();assert.deepEqual(errors,[])});
  await sleep(180);
  const w=dom.window,d=w.document;
  w.sc166Vincular('teste@example.test',true);w.fila=[];
  const id='n1';
  w.D.notas=[{id,titulo:'Formatação',conteudo:'Introdução\nantes trecho depois'},{id:'n2',titulo:'Outra nota',conteudo:'Outra página'}];
  w.SC138Notes.open(id);await sleep(100);w.SC138Notes.start(id);
  const q=s=>{const x=d.querySelector(s);assert.ok(x,s);return x};
  function selectNode(node,start,end=start){
    const r=d.createRange();
    (node.nodeType===1?node.closest('.b-t'):node.parentElement.closest('.b-t')).focus();
    r.setStart(node,start);r.setEnd(node,end);
    w.getSelection().removeAllRanges();w.getSelection().addRange(r);
    d.dispatchEvent(new w.Event('selectionchange'));
  }
  function tap(node,blur=false){
    const e=new w.Event('pointerdown',{bubbles:true,cancelable:true});
    Object.defineProperty(e,'pointerType',{value:'touch'});
    node.dispatchEvent(e);
    if(blur)node.focus({preventScroll:true});
    node.click();
  }
  const toggle=k=>tap(q('[data-ed-note-menu="'+k+'"]'),true);
  function choose(k,kind,value){
    toggle(k);
    tap(q('[data-ed-note-panel="'+k+'"] [data-ed-note-'+kind+'="'+value+'"]'),true);
  }
  return {w,d,q,selectNode,tap,toggle,choose,field:()=>q('#sc138-content').value,block:()=>q('#ed .blk:nth-child(2)'),text:()=>q('#ed .blk:nth-child(2) .b-t')};
}

test('H1 a H4 funcionam com cursor e toque, persistem na nota e aparecem na leitura e prévia',async t=>{
  const {w,d,q,selectNode,tap,toggle,choose,field,block,text}=await fixture(t);
  for(let level=1;level<=4;level++){
    selectNode(text().firstChild,6);
    choose('blocks','block','h'+level);
    assert.equal(block().dataset.t,'h'+level);
    assert.equal(q('#ed-note-block-label').textContent,'Título '+level);
    assert.equal(field(),'Introdução\n'+'#'.repeat(level)+' antes trecho depois');
    assert.equal(w.getSelection().anchorOffset,6);
  }
  // Selecionar novamente o mesmo nível não desfaz a formatação.
  choose('blocks','block','h4');assert.equal(block().dataset.t,'h4');
  await sleep(760);
  assert.equal(w.D.notas[0].conteudo,'Introdução\n#### antes trecho depois');
  assert.equal(w.SC138Notes.finish(),true);
  assert.equal(q('.np-reader h4').textContent,'antes trecho depois');
  w.abrirNota('n1');
  assert.equal(q('#ed .blk:nth-child(2)').dataset.t,'h4');
  q('#ne75-preview-btn').click();
  assert.equal(q('#ne75-preview h4').textContent,'antes trecho depois');
  q('#ne75-preview-btn').click();
  const p=q('#ed .blk:nth-child(2) .b-t');
  selectNode(p.firstChild,3);choose('blocks','block','p');
  assert.equal(q('#ed .blk:nth-child(2)').dataset.t,'p');
  // A escala configurada é comum ao leitor, à prévia e aos títulos do editor.
  const levels=[...html.matchAll(/\.np-reader > h([1-4]).*?--sc-heading-scale:([\d.]+)/g)].map(m=>[Number(m[1]),Number(m[2])]);
  assert.deepEqual(levels,[[1,1.6],[2,1.38],[3,1.2],[4,1.07]]);
  assert.doesNotMatch(html,/#modal\.sc75-note #ed \.blk \.b-t\{[^}]*font-size:16px!important/);
  toggle('more');const size=q('#sc-note-size');size.value='20';size.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.equal(d.documentElement.style.getPropertyValue('--sc-note-size'),'20px');
});

test('atalhos e menu More preservam a seleção original ao formatar',async t=>{
  const {w,d,q,selectNode,tap,toggle,choose,field,text}=await fixture(t);
  selectNode(text().firstChild,6,12);
  toggle('ink');
  // Um toque no menu pode recolher a seleção do Android antes de escolher a cor.
  w.getSelection().collapse(text().firstChild,0); d.dispatchEvent(new w.Event('selectionchange'));
  tap(q('[data-ed-note-ink="#2563eb"]'),true);
  assert.equal(field(),'Introdução\nantes [cor=#2563eb]trecho[/cor] depois');
  const span=q('#ed .b-t span[style]');
  selectNode(span.firstChild,0,6);tap(q('[data-ed-note-command="fmt:bold"]'),true);
  assert.equal(q('#ed strong').textContent,'trecho');
  selectNode(q('#ed strong span').firstChild,0,6);tap(q('[data-ed-note-command="fmt:italic"]'),true);
  assert.equal(q('#ed em').textContent,'trecho');
  selectNode(q('#ed em span').firstChild,0,6);choose('mark','mark','#ffc4e0');
  assert.equal(q('#ed mark').textContent,'trecho');
  selectNode(q('#ed mark span').firstChild,0,6);choose('more','command','fmt:strike');
  assert.equal(q('#ed s').textContent,'trecho');
  // Limpar só a parte selecionada não retira a formatação dos caracteres vizinhos.
  selectNode(q('#ed s span').firstChild,1,5);choose('more','command','fmt:limpar');
  assert.equal(text().textContent,'antes trecho depois');
  assert.deepEqual([...text().querySelectorAll('s')].map(x=>x.textContent),['t','o']);
  const middle=[...text().childNodes].find(x=>x.nodeValue==='rech');assert.ok(middle);
  selectNode(middle,0,4);choose('more','command','fmt:code');
  assert.equal(q('#ed code').textContent,'rech');
  selectNode(q('#ed code').firstChild,0,4);toggle('ink');const color=q('#ed-text-color');
  color.value='#7c3aed';color.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.ok(field().includes('[cor=#7c3aed]`rech`[/cor]'));
  assert.equal(text().textContent,'antes trecho depois');
});

test('listas, numeração, níveis, citação, destaque, bloco de código, divisor e colunas',async t=>{
  const {w,d,q,selectNode,tap,choose,field,block,text}=await fixture(t);
  selectNode(text().firstChild,3);
  choose('blocks','block','todo');const box=q('#ed [role=checkbox]');
  assert.equal(box.getAttribute('aria-checked'),'false');
  box.focus();box.dispatchEvent(new w.KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true}));
  assert.equal(box.getAttribute('aria-checked'),'true');assert.ok(field().includes('- [x] antes'));
  selectNode(text().firstChild,3);
  choose('blocks','block','ul');assert.match(field(),/\n- antes/);
  choose('more','command','block:avanca');assert.match(field(),/\n  - antes/);
  choose('more','command','block:rec');assert.match(field(),/\n- antes/);
  choose('blocks','block','ol');assert.match(field(),/\n1\. antes/);
  choose('more','command','num');assert.equal(q('#ed-num').hidden,false);
  tap([...q('#ed-num').querySelectorAll('button')].find(x=>/reiniciar/i.test(x.textContent)));
  assert.equal(block().getAttribute('data-num'),'1');assert.match(field(),/\n1\. antes/);
  choose('more','command','num');
  tap([...q('#ed-num').querySelectorAll('button')].find(x=>/continuar/i.test(x.textContent)));
  assert.equal(block().getAttribute('data-num'),'seguir');assert.match(field(),/\n1\. antes/);
  choose('more','command','num');
  tap([...q('#ed-num').querySelectorAll('button')].find(x=>/automát/i.test(x.textContent)));
  assert.equal(block().dataset.t,'ol');assert.equal(block().hasAttribute('data-num'),false);assert.match(field(),/\n1\. antes/);
  choose('blocks','block','q');assert.match(field(),/\n> antes/);
  choose('blocks','block','dest');assert.match(field(),/\n> \[!\] antes/);
  choose('blocks','block','cod');assert.match(field(),/\n```\nantes trecho depois\n```/);
  choose('more','command','columns');assert.equal(w.edColunas(),'2');
  choose('blocks','block','hr');assert.match(field(),/\n---$/);
  choose('more','command','close');assert.equal(d.activeElement,d.body);
});

test('links da web, links de notas e inserção de data e hora funcionam na posição escolhida',async t=>{
  const {w,d,q,selectNode,tap,choose,field,text}=await fixture(t);
  selectNode(text().firstChild,6,12);
  choose('more','command','fmt:link');
  assert.equal(d.activeElement,q('#ed-url'));
  q('#ed-url').value='example.test';
  const web=q('#ed-link');
  tap([...web.querySelectorAll('button')].find(x=>/^OK$/i.test(x.textContent)));
  assert.ok(field().includes('[trecho](https://example.test)'));
  selectNode(q('#ed a').firstChild,1);
  choose('more','command','fmt:link');
  tap([...web.querySelectorAll('button')].find(x=>/remover/i.test(x.textContent)));
  assert.equal(field(),'Introdução\nantes trecho depois');
  assert.equal(text().textContent,'antes trecho depois');
  selectNode(text().lastChild,text().lastChild.length);
  choose('more','command','fmt:nota');
  tap(q('#ed-nota-l button'),true);
  assert.equal(q('#ed a.lnota').textContent,'Outra nota');
  assert.match(field(),/\[\[.*Outra nota\]\]/);
  for(const [label,pattern] of [['Data de hoje',/\d{2}\/\d{2}\/\d{4}/],['Hora agora',/\d{2}:\d{2}/]]){
    choose('more','command','insert');
    tap([...q('#ed-ins').querySelectorAll('button')].find(b=>b.textContent.includes(label)),true);
    assert.match(field(),pattern);
  }
});

test('sublinhado afeta apenas a seleção e formatações antigas continuam legíveis',async t=>{
  const {w,q,tap,choose,selectNode,field,text}=await fixture(t);
  for(const [command,tag] of [['underline','u']]){
    selectNode(text().firstChild,6,12);
    tap(q('.ed-note-main [data-ed-note-command="fmt:'+command+'"]'),true);
    assert.equal(field(),'Introdução\nantes ['+tag+']trecho[/'+tag+'] depois');
    assert.equal(text().querySelector(tag).textContent,'trecho');
    assert.equal(w.mdInline(field().split('\n')[1]),'antes <'+tag+'>trecho</'+tag+'> depois');
    choose('more','command','fmt:limpar');
    assert.equal(field(),'Introdução\nantes trecho depois');
    text().normalize();
  }
});

test('barra contextual no computador atua sobre o trecho e oculta formatos removidos',async t=>{
  const {w,d,q,selectNode,field,text,tap}=await fixture(t);
  const tools=q('#ed-note-tools');
  assert.equal(tools.querySelector('[data-ed-note-command="fmt:sup"],[data-ed-note-command="fmt:sub"]'),null);
  assert.equal(w.mdInline('[sup]2[/sup] [sub]2[/sub]'),'<sup>2</sup> <sub>2</sub>');
  const context=q('#ed-note-context');
  w.matchMedia=()=>({matches:true});
  w.Range.prototype.getBoundingClientRect=()=>({left:160,top:220,bottom:244,width:48});
  selectNode(text().firstChild,6,12);
  assert.equal(context.hidden,false);
  tap(context.querySelector('[data-ed-note-command="fmt:underline"]'));
  assert.match(field(),/\[u\]trecho\[\/u\]/);
  w.matchMedia=()=>({matches:false});
  d.dispatchEvent(new w.Event('selectionchange'));
  assert.equal(context.hidden,true);
});

test('alinhamento e espaçamento do bloco são salvos, reabertos e aplicados na leitura',async t=>{
  const {w,q,choose,selectNode,text,field}=await fixture(t);
  assert.equal(q('.ed-note-main [data-ed-note-command="fmt:italic"]').nextElementSibling.dataset.edNoteCommand,'fmt:underline');
  selectNode(text().firstChild,5);
  for(const align of ['left','center','right','justify']){
    choose('paragraph','command','align:'+align);
    assert.equal(text().style.textAlign,align);
  }
  for(const spacing of ['1','1.15','1.5','2']){
    choose('paragraph','command','spacing:'+spacing);
    assert.equal(text().style.lineHeight,spacing);
  }
  const saved=field();
  assert.equal(saved,'Introdução\nantes trecho depois [layout-nota:justify,2]');
  assert.match(w.mdInline(saved.split('\n')[1]),/text-align:justify;line-height:2/);
  w.edIniciar(saved);
  assert.equal(text().style.textAlign,'justify');
  assert.equal(text().style.lineHeight,'2');
  selectNode(text().firstChild,5);
  choose('paragraph','command','align:auto');
  choose('paragraph','command','spacing:auto');
  assert.equal(field(),'Introdução\nantes trecho depois');
});

test('seleciona a nota inteira pelo menu e teclado, copia com quebras e alinha os blocos',async t=>{
  const {w,q,text,selectNode,choose,field}=await fixture(t);
  selectNode(text().firstChild,3);
  text().dispatchEvent(new w.KeyboardEvent('keydown',{key:'a',ctrlKey:true,bubbles:true,cancelable:true}));
  assert.equal(w.getSelection().getRangeAt(0).endContainer,text());
  const copy=new w.Event('copy',{bubbles:true,cancelable:true});
  let clipboard;
  Object.defineProperty(copy,'clipboardData',{value:{setData(type,value){assert.equal(type,'text/plain');clipboard=value;}}});
  text().dispatchEvent(copy);
  assert.equal(clipboard,'Introdução\nantes trecho depois');
  selectNode(text().firstChild,3);
  choose('more','command','select-all');
  assert.equal(w.getSelection().getRangeAt(0).startContainer,q('#ed .b-t'));
  choose('paragraph','command','align:center');
  assert.equal(field(),'Introdução [layout-nota:center,auto]\nantes trecho depois [layout-nota:center,auto]');
});

test('edição móvel oculta a navegação e a captura flutuante e acompanha o teclado',async t=>{
  const {w,q}=await fixture(t);
  const css=q('#sc157-note-format').textContent;
  assert.match(css,/@media\(max-width:760px\)\s*\{[^}]+\}\s*html body:has\(#sc138-inline\) :is\(#fab,#sc5-fab,#sc117-fab,#nav-movel\)\{display:none!important\}/);
  const dock=q('#sc138-inline #ed-dock');
  Object.defineProperty(dock,'offsetHeight',{value:100});
  Object.defineProperty(w,'innerHeight',{value:750});
  Object.defineProperty(w,'visualViewport',{configurable:true,value:{height:425,offsetTop:25,scale:1}});
  w.edDockPosicionar();
  assert.equal(dock.style.getPropertyValue('--ed-note-bottom'),'300px');
  assert.equal(dock.style.getPropertyValue('--ed-note-room'),'301px');
  w.visualViewport.height=750;
  w.visualViewport.offsetTop=0;
  w.edDockPosicionar();
  assert.equal(dock.style.getPropertyValue('--ed-note-bottom'),'0px');
});

test('ações do trecho selecionam e copiam todo o texto da nota',async t=>{
  const {w,q,selectNode,text}=await fixture(t);
  let copied;
  Object.defineProperty(w.navigator,'clipboard',{value:{async writeText(value){copied=value;}}});
  selectNode(text().firstChild,0,5);
  await sleep(60);
  q('[data-sc138-select-all]').click();
  assert.equal(w.getSelection().getRangeAt(0).startContainer,q('#ed .b-t'));
  assert.equal(w.getSelection().getRangeAt(0).endContainer,text());
  q('[data-sc138-copy-all]').click();
  assert.equal(copied,'Introdução\nantes trecho depois');
});
