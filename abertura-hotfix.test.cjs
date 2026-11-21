const {test}=require('node:test'), assert=require('node:assert/strict'),{readFileSync}=require('node:fs'),{Script}=require('node:vm');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=readFileSync('index.html','utf8'), transport=readFileSync('pwa-transport.js','utf8'), worker=readFileSync('sw.js','utf8');
for(const x of [transport,worker,...Array.from(html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi),m=>m[1])])new Script(x);
function app(t,mode){
 const reads=[],writes=[],errors=[],delays=[];
 const vv=new VirtualConsole();vv.on('jsdomError',e=>{if(/unhandled/.test(e.type))errors.push(e.detail||e);});
 const bridge=(ok,fail)=>new Proxy({}, {get:(_,name)=>{
  if(name==='withSuccessHandler')return cb=>bridge(cb,fail);
  if(name==='withFailureHandler')return cb=>bridge(ok,cb);
  if(name==='getDados')return()=>reads.push({ok,fail});
  if(name==='enviarComando')return cmd=>writes.push(cmd);
  return()=>{};
 }});
 const dom=new JSDOM(html,{url:'https://app.example/',pretendToBeVisual:true,runScripts:'dangerously',virtualConsole:vv,beforeParse(w){
  w.scrollTo=()=>{};w.matchMedia=()=>({matches:false,addListener(){},addEventListener(){}});w.HTMLCanvasElement.prototype.getContext=()=>null;
  const set=w.setTimeout.bind(w);w.setTimeout=(fn,ms,...a)=>{delays.push(ms);return set(fn,ms,...a);};
  w.requestAnimationFrame=fn=>set(()=>fn(w.performance.now()),16);w.cancelAnimationFrame=w.clearTimeout.bind(w);
  w.google={script:{run:bridge()}};
  if(mode==='pwa'){w.__PWA=true;w.scPwaConfigurado=()=>false;}
 }});
 const w=dom.window;t.after(()=>{w.close();assert.deepEqual(errors,[]);});
 const ready=w.document.readyState==='loading'?new Promise(r=>w.document.addEventListener('DOMContentLoaded',r,{once:true})):Promise.resolve();
 return {w,reads,writes,delays,ready};
}
test('fresh PWA does not request records or show a data-loading error before configuration',async t=>{
 const {w,reads,ready}=app(t,'pwa');await ready;
 assert.equal(reads.length,0);
 assert(w.document.getElementById('carregando').classList.contains('hidden'));
});
test('startup accepts the current supported server without scheduling title, area or reminder rewrites',async t=>{
 const {w,reads,writes,delays,ready}=app(t);await ready;
 assert.equal(reads.length,1);
 reads[0].ok({versaoServidor:'2026-11-20d',usuario:'fixture@example.test',config:{},notas:[],tarefas:[{id:'id1',titulo:'Comprar café',status:'aberta'}],eventos:[],habitos:[],registros:[]});
 assert.equal(w.sc123VersoesCompativeis(w.VERSAO_TELA,'2026-11-20d'),true);
 assert.equal(w.sc123VersoesCompativeis(w.VERSAO_TELA,'unexpected'),false);
 assert.equal(delays.includes(6000),false);
 assert.equal(writes.length,0);
 assert.match(w.document.getElementById('sc59-version').textContent,/Google Apps Script/);
});
test('new storage cache is coherent with the shell and versioned transport',()=>{
 const version=/var VERSAO_TELA = '([^']+)'/.exec(html)[1];
 assert(worker.includes("VERSION='"+version+"'"));const transportTag=/pwa-transport\.js\?v=([^"]+)/.exec(html)[1];
 assert(worker.includes('pwa-transport.js?v='+transportTag));
 assert(transport.includes('scPwaConfigurado'));
 assert(transport.includes("ls('g',K_CFG)!==next"));
});
