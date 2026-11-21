'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');

const css=fs.readFileSync('sc-neoglass-v2.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
test('Home anterior e planner aparecem juntos: correção da sobreposição',()=>{
 const oldRule=':is(#v-agenda,#v-hoje).sc148-active>*:not(.sc148-root){display:none!important}';
 assert(html.includes(oldRule),'o aplicativo preserva a regra antiga que escondia a Home');
 assert.match(css,/html\.scng\.sc100-active #v-hoje\.sc148-active > #sc100-home/);
 assert.match(css,/html\.scng\.sc100-active #v-hoje\.sc148-active > #scng-overview/);
 assert.match(css,/html\.scng\.sc100-active #v-hoje\.sc148-active > \.sc148-root/);
 assert.match(css,/display:block!important;visibility:visible!important/);
});
test('Tema Neon realmente substitui o papel de parede claro',()=>{
 assert.match(css,/html\.scng\[data-scng-preset="neon"\] body\{/);
 assert.match(css,/html\.scng\[data-scng-preset="neon"\] body::before/);
 assert.match(css,/#080e1f!important/);
 assert.match(css,/#scng-overview \.scng-hero/);
 assert.match(css,/html\.scng #sc100-home \.sc100-layout/);
});
test('As telas além do cabeçalho recebem o redesign',()=>{
 for(const target of ['#v-organizar','#v-biblioteca','#sc100-home','#scd-box','.sc129-project','#modal-caixa','.sc146-root','.sc148-root','#nav-movel','#scng-fab'])
   assert(css.includes(target),'Faltando '+target);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css,/@media\(min-width:900px\)/);
});
test('Cache de interface muda; contrato com o Apps Script permanece',()=>{
 assert.match(html,/var VERSAO_TELA = '2026-11-20d'/);
 assert.match(sw,/const VERSION='2026-11-20d'/);
 assert.match(sw,/2026-11-21b-neoglass/);
 assert.match(sw,/sc-neoglass-v2.css\?v=2026-11-21b/);
 assert.match(sw,/sc-neoglass.js\?v=2026-11-21b/);
});
test('Nova interface mantém opções de cores sem alterações na planilha',()=>{
 const dom=new JSDOM('<!doctype html><html class="scng sc100-active" data-scng-preset="neon"><body><section id="v-hoje" class="sc148-active"><div id="scng-overview"></div><div id="sc100-home"></div><section class="sc148-root"></section></section></body></html>',{pretendToBeVisual:true});
 const {document}=dom.window;
 for(const x of ['#scng-overview','#sc100-home','.sc148-root'])assert(document.querySelector(x));
 assert.match(css,/data-scng-preset="aurora"/);
 assert.match(css,/data-scng-preset="executive"/);
 dom.window.close();
});
