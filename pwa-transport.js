(function(){
'use strict';
var K_CFG='sc_pwa_cfg_v1', K_TOK='sc_pwa_tok_v1', K_SESSAO='sc_pwa_sessao_v1';
var sessao='', encerrando=false, loginEmCurso=false, trocarConta=false;
var cfg=null, tok='', tokExp=0, esperando=[], gisPronto=false, gisCarregando=false, ovl=null, timerRef=0;
var avisoDispensado=false; // aviso de reconexão não bloqueante
function ls(op,k,v){ try{ if(op==='g') return (k===K_TOK?sessionStorage:localStorage).getItem(k); if(op==='s') (k===K_TOK?sessionStorage:localStorage).setItem(k,v); else (k===K_TOK?sessionStorage:localStorage).removeItem(k); }catch(e){} return null; }
function clienteValido(v){return /^[0-9]+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i.test(String(v||''));}
function urlValida(v){return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(String(v||''));}
function lerCfg(){ try{ cfg=JSON.parse(ls('g',K_CFG)||'null');if(!cfg||!urlValida(cfg.url)||!clienteValido(cfg.cid))cfg=null; }catch(e){ cfg=null; } }
function idResumo(cid){var v=String(cid||'');return v ? '…'+v.slice(-26) : 'não configurado';}
function trocarConfiguracao(){
  encerrarConexao(function(){
    gisPronto=false;var antiga=cfg;cfg=null;
    telaConfig('Confira o ID com o botão de copiar do Google Cloud. A troca não apaga tarefas, notas nem operações pendentes.',antiga);
  });
}
function diagnostico(){return ['Origem da PWA: '+location.origin,'Caminho: '+location.pathname,'ID OAuth em uso: '+idResumo(cfg&&cfg.cid),'Endereço Apps Script: '+(cfg?cfg.url:'não configurado'),'Contexto: '+(window.matchMedia&&matchMedia('(display-mode: standalone)').matches?'PWA instalada':'navegador'),'Versão transporte: 2026-11-09c'].join('\n');}
window.scPwaDiagnostico=diagnostico;
window.scPwaEditarConexao=trocarConfiguracao;
function hashCfg(){
  var h=location.hash||''; if(h.length<3) return;
  var p={}; h.slice(1).split('&').forEach(function(x){ var i=x.indexOf('='); if(i>0) p[x.slice(0,i)]=decodeURIComponent(x.slice(i+1)); });
  if(p.u && p.c){ ls('s',K_CFG,JSON.stringify({url:p.u.trim(),cid:p.c.trim()})); ls('r',K_TOK); try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){} }
}
function jwtExp(t){ try{ var b=t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'); return JSON.parse(atob(b)).exp*1000||0; }catch(e){ return 0; } }
function googleValido(){ return !!tok && tokExp-Date.now()>90000; }
function tokenValido(){ return !!sessao || googleValido(); }
function carregarSessao(){
  try{
    var s=JSON.parse(ls('g',K_SESSAO)||'null');
    if(s && cfg && s.url===cfg.url && s.cid===cfg.cid && /^[a-f0-9]{64}$/.test(s.segredo)) sessao=s.segredo;
  }catch(e){}
}
function limparCredenciais(){
  sessao='';tok='';tokExp=0;
  clearTimeout(timerRef);ls('r',K_SESSAO);ls('r',K_TOK);
}
function encerrarConexao(aoEncerrar){
  if(encerrando||loginEmCurso) return;
  encerrando=true;
  var pedido=sessao ? enviarApi({fn:'pwaRevogarSessao',sessao:sessao}) : Promise.resolve(true);
  pedido.then(function(){
    limparCredenciais();esconderAviso();fechaOvl();
    try {if(window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect();} catch(e){}
    falharEspera('Sessão encerrada.');
    avisoDispensado=false;
    encerrando=false;aoEncerrar();
  },function(){
    encerrando=false;alert('Não foi possível encerrar a sessão no servidor. Conecte-se à internet e tente novamente.');
  });
}
window.scPwaDesconectar=function(){encerrarConexao(function(){mostrarLoginSeNecessario();});};
window.scPwaTrocarConta=function(){encerrarConexao(function(){trocarConta=true;gisPronto=false;telaLogin('Escolha a conta Google autorizada.');});};
function carregarTok(){ var t=ls('g',K_TOK); if(t){ var e=jwtExp(t); if(e-Date.now()>90000){ tok=t; tokExp=e; } } }

/* ── tela de configuração / entrada ── */
var CSS='position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.96);color:#e2e8f0;display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,sans-serif';
function fechaOvl(){ if(ovl&&ovl.parentNode) ovl.parentNode.removeChild(ovl); ovl=null; }
function esconderAviso(){var b=document.getElementById('pw-connection-notice');if(b)b.remove();}
function mostrarAviso(msg){
  if(tokenValido()||avisoDispensado||document.getElementById('pw-connection-notice'))return;
  var b=document.createElement('div');b.id='pw-connection-notice';
  b.setAttribute('role','status');
  b.style.cssText='position:fixed;left:12px;right:12px;bottom:calc(85px + env(safe-area-inset-bottom,0px));z-index:9998;max-width:540px;margin:auto;border:1px solid #cbd5e1;background:#f8fafc;color:#24334d;border-radius:13px;padding:10px 12px;box-shadow:0 6px 25px #0002;font:13px system-ui,sans-serif;display:flex;gap:9px;align-items:center';
  b.innerHTML='<span style="flex:1">'+escH(msg||'Conta Google desconectada. Suas alterações locais continuam disponíveis.')+'</span><button type="button" id="pw-connect" style="background:#4f46e5;color:white;border:0;border-radius:9px;padding:10px;font-weight:700;white-space:nowrap">Entrar</button><button type="button" id="pw-later" title="Fechar aviso" aria-label="Fechar aviso" style="border:0;background:transparent;color:#475569;font-size:19px;padding:5px">×</button>';
  document.body.appendChild(b);
  b.querySelector('#pw-connect').onclick=function(){esconderAviso();telaLogin();};
  b.querySelector('#pw-later').onclick=function(){avisoDispensado=true;esconderAviso();};
}
function acessoInicial(){
 var c=document.getElementById('carregando');
 if(!c||c.classList.contains('hidden')||c.querySelector('#pw-login-first'))return;
 c.innerHTML='<div style="max-width:380px;margin:16vh auto 0;padding:22px;text-align:center;background:#fff;border:1px solid #e5e7eb;border-radius:18px;color:#233148;font-family:system-ui,sans-serif"><h2 style="font-size:20px;margin:0 0 8px">2º Cérebro</h2><p style="font-size:14px;line-height:1.6;color:#64748b">Para carregar seus dados neste aparelho, conecte a conta Google uma vez. Quando houver uma sessão válida, o aplicativo tentará recuperá-la automaticamente.</p><button type="button" id="pw-login-first" style="padding:12px 20px;margin-top:12px;border:0;border-radius:10px;color:white;background:#4f46e5;font-weight:700">Entrar com Google</button></div>';
 c.querySelector('#pw-login-first').onclick=function(){telaLogin();};
}
window.scPwaAbrirLogin=function(){telaLogin();};
window.scPwaAutenticado=function(){return !!tokenValido();};
function novoOvl(html){ fechaOvl(); ovl=document.createElement('div'); ovl.style.cssText=CSS; ovl.innerHTML='<div style="max-width:420px;width:100%;background:#1e293b;border-radius:16px;padding:22px;box-shadow:0 10px 40px #0008">'+html+'</div>'; document.body.appendChild(ovl); return ovl; }
function telaConfig(msg,anterior){
  var o=novoOvl('<h2 style="margin:0 0 6px;font-size:20px">2° Cérebro</h2><p style="margin:0 0 14px;font-size:14px;opacity:.8">Conecte este aplicativo à implantação oficial do seu Google Apps Script.</p>'+(msg?'<p style="color:#fca5a5;font-size:13px">'+msg+'</p>':'')+
   '<label style="font-size:12px;opacity:.8">Endereço do Apps Script (termina em /exec)</label><input id="pw-u" style="width:100%;box-sizing:border-box;margin:4px 0 12px;padding:10px;border-radius:8px;border:1px solid #475569;background:#0f172a;color:#fff;font-size:14px">'+
   '<label style="font-size:12px;opacity:.8">ID do cliente OAuth do tipo Aplicativo da Web (termina em .apps.googleusercontent.com)</label><input id="pw-c" style="width:100%;box-sizing:border-box;margin:4px 0 14px;padding:10px;border-radius:8px;border:1px solid #475569;background:#0f172a;color:#fff;font-size:14px">'+
   '<p style="font-size:12px;opacity:.86;margin:0 0 12px"><b>Origem deste aparelho:</b> <code>'+escH(location.origin)+'</code><br>Configure exatamente essa origem no Google Cloud (sem o caminho do repositório).</p>'+ 
   '<button id="pw-ok" style="width:100%;padding:12px;border:0;border-radius:10px;background:#6366f1;color:#fff;font-size:15px;font-weight:600">Salvar e continuar</button>'+
   '<p style="font-size:12px;opacity:.82;line-height:1.5;margin:12px 0 0">Erro 401 invalid_client? No Google Cloud, crie/verifique um cliente OAuth do tipo <b>Aplicativo da Web</b>, copie o ID completo e autorize a origem HTTPS exata do GitHub Pages. Um ID inexistente ou apagado não pode ser corrigido pelo aplicativo. Nenhuma tarefa será apagada ao trocar esses dados.</p>');
  if(anterior){o.querySelector('#pw-u').value=anterior.url||'';o.querySelector('#pw-c').value=anterior.cid||'';}
  o.querySelector('#pw-ok').onclick=function(){
    var u=o.querySelector('#pw-u').value.trim(), c=o.querySelector('#pw-c').value.trim();
    if(!urlValida(u)||!clienteValido(c)){ telaConfig('Confira os campos: URL /exec e ID OAuth real do tipo Aplicativo da Web (formato 123456-abc.apps.googleusercontent.com).',{url:u,cid:c}); return; }
    if(!cfg||cfg.cid!==c||cfg.url!==u)ls('r',K_TOK);ls('s',K_CFG,JSON.stringify({url:u,cid:c})); location.reload();
  };
}
function telaLogin(msg){
  var o=novoOvl('<h2 style="margin:0 0 6px;font-size:20px">Entrar no 2º Cérebro</h2><p style="font-size:13px;opacity:.86;margin:0 0 10px">'+escH(msg||'Confirme abaixo o cliente OAuth usado neste celular antes de entrar.')+'</p>'+ 
    '<p style="font-size:12px;opacity:.82;overflow-wrap:anywhere"><b>Origem:</b> '+escH(location.origin)+'<br><b>OAuth:</b> '+escH(idResumo(cfg&&cfg.cid))+'</p>'+ 
    '<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input id="pw-manter" type="checkbox"> Manter conectado neste dispositivo</label>'+
    '<div id="pw-g" style="display:flex;justify-content:center;min-height:44px;margin:15px 0"></div>'+ 
    '<button id="pw-edit" type="button" style="display:block;width:100%;padding:11px;background:#334155;color:#fff;border:1px solid #64748b;border-radius:10px">Trocar / corrigir ID OAuth</button>'+ 
    '<button id="pw-diag" type="button" style="margin-top:9px;width:100%;padding:9px;background:transparent;color:#a5b4fc;border:1px solid #64748b;border-radius:10px">Copiar diagnóstico (sem token)</button>'+ 
    '<p style="font-size:12px;opacity:.8;line-height:1.5;margin-top:12px">Se aparecer 401 invalid_client, o cliente salvo neste navegador pode ser antigo ou não autorizado para a origem indicada. Não apague os dados do app.</p>');
  o.querySelector('#pw-edit').onclick=trocarConfiguracao;
  o.querySelector('#pw-diag').onclick=function(){ var d=diagnostico();if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(d).then(function(){alert('Diagnóstico copiado.');},function(){alert(d);});else alert(d);};
  iniciarGis(function(){if(ovl!==o)return;try{google.accounts.id.renderButton(o.querySelector('#pw-g'),{theme:'filled_blue',size:'large',text:'signin_with',locale:'pt-BR'});}catch(e){o.querySelector('#pw-g').textContent='Falha ao exibir login Google: '+e.message;}});
}
function iniciarGis(cb){
  if(gisPronto){cb&&cb();return;}
  if(gisCarregando){setTimeout(function(){iniciarGis(cb);},250);return;}
  if(window.google&&google.accounts&&google.accounts.id){configGis();cb&&cb();return;}
  gisCarregando=true;
  var s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;
  s.onload=function(){gisCarregando=false;try{configGis();cb&&cb();}catch(e){if(esperando.length)mostrarLoginSeNecessario('Erro ao iniciar login automático. Entre manualmente.');}};
  s.onerror=function(){gisCarregando=false;if(esperando.length)mostrarLoginSeNecessario('Sem conexão com Google. Verifique sua internet.'); if(ovl){var g=ovl.querySelector('#pw-g');if(g)g.textContent='Não foi possível carregar o Google Identity Services.';}};
  document.head.appendChild(s);
}
function configGis(){
  if(gisPronto) return; gisPronto=true;
  google.accounts.id.initialize({ client_id:cfg.cid, callback:aoEntrar, use_fedcm_for_button:true, button_auto_select:!trocarConta });
}
function aoEntrar(resp){
  var t=resp&&resp.credential;
  if(!t || loginEmCurso || encerrando || !ovl || !ovl.querySelector('#pw-manter')) return;
  tok=t;tokExp=jwtExp(t);
  if(!googleValido()){tok='';tokExp=0;return;}
  ls('s',K_TOK,t);
  loginEmCurso=true;
  function concluir(){
    loginEmCurso=false;esconderAviso();fechaOvl();
    if(!sessao) agendarRenovacao();
    var l=esperando;esperando=[];l.forEach(function(f){f.ok();});
  }
  if(!ovl.querySelector('#pw-manter').checked){concluir();return;}
  var segredo;
  try{
    segredo=Array.from(crypto.getRandomValues(new Uint8Array(32)),function(n){return n.toString(16).padStart(2,'0');}).join('');
  }catch(e){concluir();alert('O navegador não conseguiu salvar a sessão.');return;}
  var destino=cfg;
  enviarApi({fn:'pwaCriarSessao',idToken:t,novoSegredo:segredo}).then(function(){
    sessao=segredo;
    var gravado=JSON.stringify({url:destino.url,cid:destino.cid,segredo:segredo});
    ls('s',K_SESSAO,gravado);
    tok='';tokExp=0;ls('r',K_TOK);
    if(ls('g',K_SESSAO)!==gravado) alert('Este navegador não permitiu guardar a sessão após fechar o app.');
    concluir();
  },function(){
    concluir();
    alert('Não foi possível manter a conexão salva. Confira se a implantação do Apps Script está atualizada.');
  });
}
function agendarRenovacao(){
  clearTimeout(timerRef);
  timerRef=setTimeout(function(){
    if(!googleValido()){tok='';tokExp=0;ls('r',K_TOK);}
  },Math.max(0,tokExp-Date.now()-90000));
}
function mostrarLoginSeNecessario(msg){
  // Não abrir automaticamente uma janela sobre a tela a cada inicialização.
  // Se há cache local, exibe aviso discreto; sem cache, mostra um acesso inicial.
  if(tokenValido() || !cfg || ovl) return;
  var c=document.getElementById('carregando');
  if(c&&!c.classList.contains('hidden')) acessoInicial();
  else mostrarAviso('Conecte o Google para sincronizar. Dados locais preservados.');
}
function falharEspera(m){ var l=esperando; esperando=[]; l.forEach(function(f){ f.err(new Error(m)); }); }
var telaMostrada=false, etapa='iniciando';
function escH(t){ return String(t).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function mostrarPresa(txt){
  var c=document.getElementById('carregando'); if(!c||c.classList.contains('hidden')) return;
  var b='border:0;border-radius:10px;padding:11px 16px;margin:4px;font-size:14px;font-weight:600;color:#fff;background:#6366f1';
  c.innerHTML='<div style="max-width:420px;margin:0 auto;padding:40px 16px;text-align:center;font-family:system-ui,sans-serif"><p style="font-size:16px;font-weight:700;color:#334155;margin:0">O app ainda não abriu</p><p style="font-size:13px;color:#64748b;margin:10px 0 18px;word-break:break-word">'+escH(txt)+'</p>'+
   '<button style="'+b+'" onclick="location.reload()">Tentar de novo</button><button style="'+b+';background:#475569" onclick="limparApp()">Reiniciar arquivos offline</button><br><button style="'+b+';background:#94a3b8" onclick="trocarEnd()">Trocar endereço</button></div>';
}
function limparApp(){
  ls('r',K_TOK);
  var fim=function(){ location.reload(); };
  try{ var p=[]; if(navigator.serviceWorker) p.push(navigator.serviceWorker.getRegistrations().then(function(rs){ return Promise.all(rs.map(function(r){ return r.unregister(); })); })); if(window.caches) p.push(caches.keys().then(function(ks){ return Promise.all(ks.map(function(k){ return caches.delete(k); })); })); Promise.all(p).then(fim,fim); setTimeout(fim,3000); }catch(e){ fim(); }
}
function trocarEnd(){trocarConfiguracao();}
window.addEventListener('error',function(e){ setTimeout(function(){ mostrarPresa('Erro no app: '+(e&&e.message||'desconhecido')+' (etapa: '+etapa+'). Mande este texto para o suporte.'); },600); });
window.addEventListener('unhandledrejection',function(e){ setTimeout(function(){ mostrarPresa('Erro: '+((e&&e.reason&&e.reason.message)||e.reason||'desconhecido')+' (etapa: '+etapa+')'); },600); });
setTimeout(function(){ var cc=document.getElementById('carregando'); if(ovl||(cc&&cc.querySelector('button'))) return; var d={login:'esperando o login do Google',servidor:'esperando resposta do Apps Script',resposta:'processando a resposta',iniciando:'iniciando a tela'}; mostrarPresa('Continua '+(d[etapa]||etapa)+' (versão '+(typeof VERSAO_TELA!=='undefined'?VERSAO_TELA:'?')+').'); },12000);
function garantirToken(){
  return new Promise(function(ok,err){
    etapa='login';
    if(!cfg){err(new Error('App ainda não configurado.'));return;}
    if(tokenValido()){ok();return;}
    esperando.push({ok:ok,err:err});
    if(esperando.length===1) mostrarLoginSeNecessario();
    setTimeout(function(){var i=esperando.findIndex(function(f){return f.ok===ok;});if(i>=0){esperando.splice(i,1);err(new Error('Login pendente. Toque em Entrar com Google.'));}},90000);
  });
}

/* ── ponte google.script.run → POST no Apps Script ── */
function enviarApi(corpo){
  return Promise.resolve().then(function(){
    etapa='servidor';
    var ac=window.AbortController?new AbortController():null, tm=ac?setTimeout(function(){ ac.abort(); },40000):0;
    return fetch(cfg.url,{method:'POST',redirect:'follow',signal:ac?ac.signal:undefined,headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(corpo)}).then(function(r){ clearTimeout(tm); return r; },function(e){ clearTimeout(tm); throw new Error(e&&e.name==='AbortError'?'O servidor não respondeu em 40 s.':'Sem conexão com o servidor (possível bloqueio CORS ou redirecionamento do Apps Script).'); });
  }).then(function(r){ etapa='resposta'; return r.text(); }).then(function(t){
    var j; try{ j=JSON.parse(t); }catch(e){ throw new Error('Resposta inesperada do servidor (confira se a implantação pública está na versão nova).'); }
    if(j&&j.ok) return j.r;
    var e=j&&j.erro;
    var m={nao_autenticado:'Login recusado: use a conta Google dona do sistema.',expirado:'Sessão expirada.',api_nao_configurada:'Servidor sem OAUTH_CLIENT_ID / ALLOWED_EMAIL. Veja o guia de instalação.',muitas_tentativas:'Muitas tentativas. Espere 1 minuto.',funcao_invalida:'Função não permitida.',verificacao_indisponivel:'Google indisponível para validar o login. Tente de novo.',operacao_indeterminada:(j&&j.msg)||'Operação exige conferência manual no Apps Script antes de reenviar.',falha:(j&&j.msg)||'Falha no servidor.'}[e]||'Erro no servidor.';
    var err=new Error(m);err.codigo=e;throw err;
  });
}
function chamar(fn,args,tentou){
  return garantirToken().then(function(){
    if(encerrando) throw new Error('Sessão em encerramento.');
    var usada=sessao, googleUsado=tok;
    return enviarApi({fn:fn,args:args,idToken:googleUsado,sessao:usada}).catch(function(e){
      var invalida=usada ? e.codigo==='sessao_encerrada' : ['nao_autenticado','expirado'].includes(e.codigo);
      if(!invalida) throw e;
      if((usada && sessao===usada) || (!usada && !sessao && tok===googleUsado)) limparCredenciais();
      avisoDispensado=false;
      if(tentou){ mostrarLoginSeNecessario(); throw e; }
      return chamar(fn,args,true);
    });
  });
}
window.addEventListener('storage',function(e){
  if(e.key===K_SESSAO && sessao && !e.newValue){sessao='';tok='';tokExp=0;ls('r',K_TOK);avisoDispensado=false;mostrarLoginSeNecessario();}
});
function construtor(ok,fail){
  var base={ withSuccessHandler:function(f){ return construtor(f,fail); }, withFailureHandler:function(f){ return construtor(ok,f); }, withUserObject:function(){ return construtor(ok,fail); } };
  return new Proxy(base,{ get:function(t,p){
    if(p in t) return t[p];
    if(typeof p!=='string') return undefined;
    return function(){ var a=Array.prototype.slice.call(arguments);
      chamar(p,a).then(function(r){ if(ok) ok(r); },function(e){ if(fail) fail(e instanceof Error?e:new Error(String(e))); });
    };
  }});
}

lerCfg(); carregarSessao(); carregarTok();
window.google=window.google||{}; window.google.script={ run:construtor(null,null) };
window.__PWA=true;
function iniciar(){if(!cfg){telaConfig();return;}if(!sessao && googleValido())agendarRenovacao();else if(!tokenValido())mostrarLoginSeNecessario();}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',iniciar); else iniciar();
if(!cfg){ window.google.script.run=construtor(null,null); }

})();
