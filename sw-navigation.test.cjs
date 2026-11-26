'use strict';
const {readFileSync}=require('node:fs');
const {runInNewContext}=require('node:vm');
const {test}=require('node:test');
const assert=require('node:assert/strict');

const scope='https://example.test/app/';
const worker=readFileSync('sw.js','utf8');

function navigate(path,fetch){
  const handlers={};
  const cached=new Response('App salvo');
  runInNewContext(worker,{
    self:{registration:{scope},location:new URL(scope),addEventListener:(name,fn)=>{handlers[name]=fn;}},
    caches:{open:async()=>({match:async key=>key==='./index.html'?cached:undefined})},
    URL,Request:class extends Request{constructor(r,options){super(r.url,options);}},Response,fetch
  });
  let response;
  const request={url:new URL(path,scope).href,method:'GET',mode:'navigate'};
  handlers.fetch({request,respondWith:value=>{response=value;}});
  return response;
}

test('a abertura usa a cópia offline quando a hospedagem retorna erro 5xx',async()=>{
  const result=await navigate('index.html',async()=>new Response('Indisponível',{status:503}));
  assert.equal(await result.text(),'App salvo');
});

test('erro 404 continua visível e páginas fora da entrada seguem pelo navegador',async()=>{
  const result=await navigate('',async()=>new Response('Página ausente',{status:404}));
  assert.equal(result.status,404);
  assert.equal(navigate('outra-pagina',async()=>new Response('Indisponível',{status:503})),undefined);
});
