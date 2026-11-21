/* 2º Cérebro: módulo Drive Projetos — revisão isolada */
(function(){
'use strict';
var S={id:'',folder:'',root:'',stack:[],query:'',data:null,selected:'',busy:false};
var get=id=>document.getElementById(id);
var esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
var valid=id=>/^[A-Za-z0-9_-]{6,160}$/.test(String(id||''));
function call(action,p={}){
 return new Promise((resolve,reject)=>{
  if(!window.google||!google.script||!google.script.run){reject(Error('Conta Google desconectada.'));return;}
  try{google.script.run.withSuccessHandler(r=>r&&r.erro?reject(Error(r.erro)):resolve(r)).withFailureHandler(reject).scDriveProjetosApi(Object.assign({acao:action,projetoId:S.id},p));}
  catch(e){reject(e);}
 });
}
function status(s,error){var t=get('scd-status');if(t){t.textContent=String(s||'');t.classList.toggle('scd-error',!!error);}}
function busy(b){S.busy=b;document.querySelectorAll('#scd-box button').forEach(x=>x.disabled=b);}
function shell(id){return '<section id="scd-box" class="scd-box" data-scd-project="'+esc(id)+'"><h3>📁 Arquivos do projeto</h3><p id="scd-status" role="status">Consultando o Google Drive…</p><div id="scd-body"></div></section>';}
function mime(f){var t=String(f.tipo||'').toLowerCase();return t.includes('pdf')?'📕':t.startsWith('image/')?'🖼️':t.includes('sheet')?'📊':t.includes('document')?'📄':'📎';}
function url(u){try{var x=new URL(u);return x.protocol==='https:'&&['drive.google.com','docs.google.com'].includes(x.hostname)?x.href:'';}catch(e){return '';}}
function paint(){
 var d=S.data,root=get('scd-body');if(!d||!root)return;
 root.innerHTML='<div class="scd-toolbar"><button data-scd="upload">↑ Adicionar arquivo</button><button data-scd="link">↗ Vincular existente</button><button data-scd="newfolder">＋ Nova pasta</button><button data-scd="reload">⟳ Atualizar</button></div>'+
 '<div class="scd-search"><input id="scd-query" aria-label="Pesquisar arquivos" placeholder="Pesquisar neste projeto" value="'+esc(S.query)+'"><button data-scd="search">Buscar</button></div>'+
 '<div class="scd-trail"><button data-scd="root">Pasta principal</button>'+(S.stack.length?'<button data-scd="back">‹ Voltar</button>':'')+' <span>'+esc(d.nomePasta)+'</span></div>'+
 '<div class="scd-folders">'+(d.pastas||[]).map(x=>'<button class="scd-folder" data-scd="folder" data-id="'+esc(x.id)+'">📁 <span>'+esc(x.nome)+'</span></button>').join('')+'</div>'+
 '<div class="scd-files">'+((d.arquivos||[]).map(x=>'<div class="scd-file"><span>'+mime(x)+'</span><span class="scd-name"><strong>'+esc(x.nome)+'</strong><small>'+(Number(x.tamanho)>0?(Number(x.tamanho)/1048576).toFixed(1)+' MB':'Drive')+(x.vinculado?' · Vinculado':'')+'</small></span><button data-scd="preview" data-id="'+esc(x.id)+'" title="Visualizar">◉</button><button data-scd="open" data-url="'+esc(x.url)+'" title="Abrir no Drive">↗</button><button data-scd="menu" data-id="'+esc(x.id)+'" title="Ações">⋯</button></div>').join('')||'<p>Nenhum arquivo nesta pasta.</p>')+'</div>'+
 '<div class="scd-bottom"><button data-scd="organize">Organizar agora</button><button data-scd="auto">⚙ Organização automática: '+(d.regras&&d.regras.auto?'ligada':'desligada')+'</button></div><div id="scd-menu"></div><div id="scd-preview"></div><input id="scd-file" type="file" hidden>';
}
async function load(){
 status('Consultando o Google Drive…');
 try{var d=await call('listar',{pastaId:S.folder,busca:S.query});if(!get('scd-box')||get('scd-box').dataset.scdProject!==S.id)return;if(!d||!Array.isArray(d.pastas)||!Array.isArray(d.arquivos))throw Error('Resposta inesperada do servidor.');S.data=d;S.folder=d.pastaAtual;S.root=d.pastaRaiz;paint();status(d.arquivos.length+' arquivo(s) encontrado(s).'+(d.parcial?' Resultado parcial.':''));}
 catch(e){status(/function|não permitida|not found|inválid/i.test(String(e.message||e))?'O módulo Drive ainda não foi ativado no Apps Script. Seus arquivos foram preservados.':e.message||String(e),true);}
}
function mount(id){S={id:String(id),folder:'',root:'',stack:[],query:'',data:null,selected:'',busy:false};load();}
function selected(){return S.data&&S.data.arquivos.find(x=>x.id===S.selected);}
async function run(a,p={},confirmar){if(confirmar&&!confirm(confirmar))return;busy(true);try{await call(a,p);await load();}catch(e){status(e.message||String(e),true);}finally{busy(false);}}
function menu(id){var f=S.data&&S.data.arquivos.find(x=>x.id===id),m=get('scd-menu');if(!f||!m)return;S.selected=id;m.innerHTML='<div class="scd-menu"><strong>'+esc(f.nome)+'</strong><button data-scd="assoc">Vincular a tarefa ou nota</button>'+(f.vinculado?'<button data-scd="unlink">Desvincular</button>':'<button data-scd="rename">Renomear</button><button data-scd="move">Mover</button>')+'<button data-scd="closemenu">Fechar</button></div>';}
function associar(){var p=(window.D&&D.projetos||[]).find(x=>String(x.id)===S.id),m=get('scd-menu');if(!p||!m)return;var tasks=(D.tarefas||[]).filter(x=>String(x.projeto)===S.id),notes=(D.notas||[]).filter(x=>String(x.conteudo||'').includes('[['+p.nome+']]'));m.innerHTML='<div class="scd-menu"><select id="scd-target">'+tasks.map(x=>'<option value="tarefas|'+esc(x.id)+'">Tarefa · '+esc(x.titulo)+'</option>').join('')+notes.map(x=>'<option value="notas|'+esc(x.id)+'">Nota · '+esc(x.titulo)+'</option>').join('')+'</select><button data-scd="saveassoc">Associar</button><button data-scd="closemenu">Cancelar</button></div>';}
function mover(){var m=get('scd-menu');if(!m)return;m.innerHTML='<div class="scd-menu"><select id="scd-dest">'+(S.data.pastas||[]).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nome)+'</option>').join('')+'</select><button data-scd="savemove">Mover</button><button data-scd="closemenu">Cancelar</button></div>';}
function driveId(s){var m=String(s||'').match(/(?:\/file\/d\/|\/folders\/|[?&]id=|\/document\/d\/|\/spreadsheets\/d\/)([A-Za-z0-9_-]{6,160})/);return valid(m&&m[1])?m[1]:valid(s)?s:'';}
function upload(){var input=get('scd-file');if(!input)return;input.onchange=function(){var f=input.files&&input.files[0];if(!f)return;if(f.size>3*1048576){status('Para arquivos maiores que 3 MB, envie no Drive e vincule pelo endereço.',true);return;}if(!confirm('Enviar "'+f.name+'" para o projeto?'))return;var r=new FileReader();r.onload=function(){run('upload',{pastaId:S.folder,nome:f.name,mime:f.type||'application/octet-stream',base64:String(r.result).split(',')[1],envioId:'e'+Date.now()+Math.random().toString(36).slice(2)});};r.onerror=()=>status('Falha na leitura do arquivo.',true);r.readAsDataURL(f);};input.click();}
function preview(id){var f=S.data&&S.data.arquivos.find(x=>x.id===id);if(!f||!valid(id))return;var box=get('scd-preview');box.innerHTML='<div class="scd-preview"><strong>'+esc(f.nome)+'</strong><button data-scd="closepreview">×</button><iframe loading="lazy" title="Prévia do arquivo" referrerpolicy="no-referrer" src="https://drive.google.com/file/d/'+encodeURIComponent(id)+'/preview"></iframe><p>Se não abrir, <button data-scd="open" data-url="'+esc(url(f.url))+'">abrir no Drive</button>.</p></div>';}
function action(b){if(S.busy)return;var a=b.dataset.scd,id=b.dataset.id;
 if(a==='folder'){S.stack.push(S.folder);S.folder=id;S.query='';return load();}
 if(a==='back'){S.folder=S.stack.pop()||S.root;S.query='';return load();}
 if(a==='root'){S.stack=[];S.folder=S.root;S.query='';return load();}
 if(a==='reload')return load();if(a==='search'){S.query=get('scd-query').value.trim();return load();}
 if(a==='preview')return preview(id);if(a==='closepreview'){get('scd-preview').innerHTML='';return;}
 if(a==='open'){var u=url(b.dataset.url);return u?window.open(u,'_blank','noopener,noreferrer'):status('Link inválido.',true);}
 if(a==='menu')return menu(id);if(a==='closemenu'){get('scd-menu').innerHTML='';return;}
 if(a==='upload')return upload();if(a==='newfolder'){var n=prompt('Nome da subpasta:');if(n)return run('criarPasta',{nome:n,pastaId:S.folder});}
 if(a==='link'){var x=prompt('Cole o link do Google Drive:');if(!x)return;var fileId=driveId(x);return fileId?run('vincular',{arquivoId:fileId}):status('Link inválido.',true);}
 if(a==='rename'){var f=selected();if(!f)return;var n=prompt('Novo nome:',f.nome);if(n)return run('renomear',{arquivoId:f.id,nome:n});}
 if(a==='move')return mover();if(a==='savemove')return run('mover',{arquivoId:S.selected,destinoId:get('scd-dest').value},'Mover dentro do projeto?');
 if(a==='unlink')return run('desvincular',{arquivoId:S.selected},'Desvincular sem excluir o arquivo do Drive?');
 if(a==='assoc')return associar();if(a==='saveassoc'){var z=(get('scd-target')?.value||'').split('|');if(z.length===2)return run('associar',{arquivoId:S.selected,tipo:z[0],alvoId:z[1]});}
 if(a==='organize')return run('organizar',{},'Organizar arquivos ainda soltos nas subpastas do projeto?');
 if(a==='auto')return run('configurar',{auto:!S.data.regras.auto},'Alterar a organização automática deste projeto?');
}
document.addEventListener('click',e=>{var b=e.target.closest('[data-scd]');if(b&&b.closest('#scd-box')){e.preventDefault();e.stopPropagation();action(b);}},true);
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target&&e.target.id==='scd-query'){e.preventDefault();S.query=e.target.value.trim();load();}});
var css=document.createElement('style');css.textContent=[
'.scd-box{border:1px solid var(--tc-line,#d2dbea);border-radius:17px;padding:12px;max-width:100%;overflow:hidden;background:var(--tc-card,#fff);color:var(--tc-text,#1b2b45)}',
'.scd-box button{border:1px solid #bfccdb;border-radius:9px;padding:8px;min-height:36px;background:var(--tc-card,#fff);color:inherit}.scd-box button:focus-visible{outline:3px solid #9cc2ed}.scd-box button:disabled{opacity:.5}',
'.scd-toolbar,.scd-bottom{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.scd-toolbar button:first-child{background:#315c8a;color:#fff}',
'.scd-search{display:flex;gap:7px}.scd-search input{flex:1;min-width:0;border:1px solid #cbd5e1;border-radius:9px;padding:10px;background:var(--tc-card,#fff);color:inherit}',
'.scd-trail{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0}.scd-folders{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}.scd-folder{display:flex;gap:6px;min-width:0}.scd-folder span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
'.scd-file{display:flex;align-items:center;gap:7px;border:1px solid #d7dfeb;border-radius:11px;padding:7px;margin:7px 0;min-width:0}.scd-name{flex:1;min-width:0;overflow-wrap:anywhere}.scd-name strong,.scd-name small{display:block}.scd-name small{font-size:.76em;color:var(--tc-muted,#66748a)}.scd-file button{padding:5px;min-width:32px}',
'.scd-menu{display:flex;flex-wrap:wrap;gap:7px;border:1px solid #b7c5d8;border-radius:10px;padding:9px}.scd-menu strong,.scd-menu select{width:100%}.scd-preview{border:1px solid #cbd5e1;padding:8px;border-radius:11px;margin-top:12px}.scd-preview iframe{width:100%;height:min(60vh,550px);border:0}',
'#scd-status.scd-error{color:#ae1c37}@media(max-width:560px){.scd-toolbar{display:grid;grid-template-columns:1fr 1fr}.scd-toolbar button{font-size:.83em;padding:6px}.scd-folders{grid-template-columns:1fr 1fr}.scd-box{padding:9px}.scd-file{gap:4px}.scd-file button{min-width:28px;padding:3px}}'
].join('');document.head.appendChild(css);
window.SCDrive={shell:shell,mount:mount,refresh:load,api:call};
})();