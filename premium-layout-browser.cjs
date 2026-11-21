'use strict';
// Browser de verdade: testa CSS legado + correção, não uma prévia desenhada.
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
const html=fs.readFileSync('index.html','utf8');
const styles=[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(m=>m[1]).join('\n');
const premium=fs.readFileSync('sc-botoes-compactos.css','utf8');
const plugin=fs.readFileSync('sc-botoes-compactos.js','utf8');
const fixture='<!doctype html><html lang="pt-BR" class="sc126 sc11-active sc100-active" data-sc-theme="minimal"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+
  '*,*::before,*::after{box-sizing:border-box}.flex{display:flex}.min-h-screen{min-height:100vh}body{margin:0;min-width:0}main{width:100%;min-width:0}#test-content{height:140px;background:white;border:1px solid #dedeea;border-radius:18px;padding:20px}'+
  styles+'</style><style>'+premium+'</style></head><body><div class="flex min-h-screen"><main><div id="topo"><div><input id="captura" placeholder="Converse ou peça algo"></div></div><div class="max-w-6xl"><section id="v-hoje" class="vista sc148-active"><section class="sc148-root"><div class="sc148-head"><h2>Hoje</h2></div><div id="test-content">Conteúdo do painel Hoje</div></section></section></div></main></div>'+
  '<nav id="nav-movel" class="fixed bottom-0 inset-x-0"><button class="nav-m" data-sc126-route="hoje" aria-current="page">Hoje</button><button class="nav-m" data-sc126-route="organizar" aria-current="false">Organizar</button><button class="nav-m" data-sc126-route="biblioteca" aria-current="false">Biblioteca</button></nav></body></html>';

(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try {
    let checked=0;
    for(const theme of ['minimal','glass','editorial','neural','executive']){
      for(const width of [360,390,768,1099,1100,1440,1705]){
        const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
        try{
          await page.setContent(fixture,{waitUntil:'domcontentloaded'});
          await page.evaluate(theme=>{
            document.documentElement.dataset.scTheme=theme;
            document.documentElement.classList.toggle('dark',['neural','executive'].includes(theme));
          },theme);
          await page.addScriptTag({content:plugin});
          await page.waitForSelector('#sc183-sidebar',{state:'attached'});
          const info=await page.evaluate(()=>{
            const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
            const display=id=>getComputedStyle(document.getElementById(id)).display;
            const aside=document.getElementById('sc183-sidebar');
            const nav=document.getElementById('nav-movel');
            return {aside:rect('sc183-sidebar'),mobile:rect('nav-movel'),main:document.querySelector('main').getBoundingClientRect().toJSON(),
              content:rect('test-content'),asideDisplay:display('sc183-sidebar'),navDisplay:display('nav-movel'),
              navChildren:nav.querySelectorAll('[data-sc126-route]').length,
              sideChildren:aside.querySelectorAll('.sc183-sideitem').length,
              documentWidth:document.documentElement.scrollWidth,
              viewport:innerWidth};
          });
          assert.equal(info.navChildren,3,'Navegação original intacta: '+theme+' '+width);
          assert.equal(info.sideChildren,3,'Atalhos da sidebar: '+theme+' '+width);
          assert(info.documentWidth<=width+3,'Transbordamento horizontal: '+theme+' '+width+' '+JSON.stringify(info));
          if(width>=1100){
            assert.notEqual(info.asideDisplay,'none','Sidebar desktop oculta: '+theme+' '+width);
            assert.equal(info.navDisplay,'none','Navegação móvel sobreposta no desktop: '+theme+' '+width);
            assert(info.aside.width>=210&&info.aside.width<=235,'Sidebar excedeu largura segura: '+theme+' '+width+' '+JSON.stringify(info));
            assert(info.aside.x>=12&&info.aside.right<=250,'Sidebar fora do canto esquerdo: '+theme+' '+width);
            assert(info.content.x>=250,'Conteúdo encoberto pela sidebar: '+theme+' '+width+' '+JSON.stringify(info));
            assert(info.aside.right+8<=info.main.x,'Sidebar cruzou região principal: '+theme+' '+width+' '+JSON.stringify(info));
          }else{
            assert.equal(info.asideDisplay,'none','Sidebar desktop aparecendo no celular/tablet: '+theme+' '+width);
            assert.notEqual(info.navDisplay,'none','Barra inferior não visível: '+theme+' '+width);
            assert(info.mobile.right<=width+2,'Barra inferior além da tela: '+theme+' '+width);
            assert(info.mobile.x>=-2,'Barra inferior deslocada à esquerda: '+theme+' '+width);
          }
          checked++;
          if(theme==='minimal'&&(width===390||width===1440)){
            fs.mkdirSync('artefacts',{recursive:true});
            await page.screenshot({path:path.join('artefacts','premium-corrigido-'+width+'.png'),fullPage:true});
          }
          if(width===1440&&theme==='minimal'){
            await page.evaluate(()=>document.getElementById('nav-movel').innerHTML='<button class="nav-m" data-sc126-route="biblioteca" aria-current="page">Biblioteca</button>');
            await page.waitForFunction(()=>document.querySelector('#sc183-sidebar .sc183-sideitem.active')?.dataset.sc126Route==='biblioteca');
            assert.equal(await page.locator('#sc183-sidebar').count(),1,'Sidebar duplicada ao re-render');
          }
        }finally{await page.close();}
      }
    }
    console.log('PASS: '+checked+' viewport/tema (5 temas x 7 larguras), sem sobreposição nem rolagem lateral; rerender verificado.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
