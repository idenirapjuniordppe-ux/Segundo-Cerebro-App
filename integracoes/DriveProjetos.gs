/* 2º Cérebro — Google Drive nos Projetos, extensão para Codigo.gs.
   Apenas o dono autenticado pode usar. Não apaga arquivos nem altera permissões. */
var SC_DRIVE_ABA='ProjetoArquivos';
var SC_DRIVE_COLUNAS=['id','projeto_id','arquivo_id','origem','alvo_tipo','alvo_id','criado_em'];
function scDriveId_(s){s=String(s||'');if(!/^[A-Za-z0-9_-]{6,160}$/.test(s))throw Error('Identificador inválido.');return s;}
function scDriveNome_(s){s=String(s||'').trim().slice(0,120);if(!s||/[\\\/\u0000-\u001f]/.test(s)||s==='.'||s==='..')throw Error('Nome inválido.');return s;}
function scDriveProjeto_(id){
 var sh=getSS().getSheetByName(TABELAS.projetos.aba);if(!sh)throw Error('Aba de projetos indisponível.');
 var p=getObjectsFromSheet(sh).filter(function(x){return String(x.id)===String(id);})[0];
 if(!p)throw Error('Projeto não encontrado.');
 var m=String(p.descricao||'').match(/https:\/\/drive\.google\.com\/drive\/folders\/([A-Za-z0-9_-]+)/);
 if(!m)throw Error('Projeto sem pasta vinculada no Drive.');
 return {id:String(p.id),nome:String(p.nome||''),pasta:scDriveId_(m[1])};
}
function scDriveRoot_(p){try{return DriveApp.getFolderById(p.pasta);}catch(e){throw Error('Pasta do projeto inacessível.');}}
function scDriveFolder_(p,id){
 var root=scDriveRoot_(p);if(!id||id===p.pasta)return root;
 var f=DriveApp.getFolderById(scDriveId_(id)),original=f;
 for(var n=0;n<15;n++){if(f.getId()===p.pasta)return original;var parents=f.getParents();if(!parents.hasNext())break;f=parents.next();}
 throw Error('Pasta não pertence ao projeto.');
}
function scDriveFile_(p,id){
 var f=DriveApp.getFileById(scDriveId_(id)),par=f.getParents();
 while(par.hasNext()){try{scDriveFolder_(p,par.next().getId());return f;}catch(e){}}
 throw Error('Arquivo não pertence ao projeto.');
}
function scDriveSheet_(){var ss=getSS(),s=ss.getSheetByName(SC_DRIVE_ABA);if(!s){s=ss.insertSheet(SC_DRIVE_ABA);s.appendRow(SC_DRIVE_COLUNAS);}return s;}
function scDriveLinks_(id){var s=getSS().getSheetByName(SC_DRIVE_ABA);return s?getObjectsFromSheet(s).filter(function(x){return String(x.projeto_id)===String(id);}):[];}
function scDriveMeta_(f,link){return {id:f.getId(),nome:f.getName(),tipo:f.getMimeType(),tamanho:f.getSize(),alterado:f.getLastUpdated().toISOString(),url:f.getUrl(),vinculado:!!link};}
function scDriveRules_(id){try{var j=JSON.parse(PropertiesService.getScriptProperties().getProperty('SC_DRIVE_'+scDriveId_(id))||'null');return {auto:!!(j&&j.auto)};}catch(e){return {auto:false};}}
function scDriveKind_(f){
 var t=String(f.getMimeType()||'').toLowerCase(),name=f.getName().toLowerCase();
 if(t.indexOf('image/')===0)return 'Imagens';
 if(/apostila|aula|estudo|embargos|resumo|exerc[ií]cio|quest[oõ]es|jurisprud[eê]ncia/.test(name))return 'Estudos';
 if(/pdf|document|spreadsheet|presentation|text|word|excel/.test(t))return 'Documentos';
 return 'Outros';
}
function scDriveSub_(root,name){var i=root.getFoldersByName(name);return i.hasNext()?i.next():root.createFolder(name);}
function scDriveOrganize_(p,limit){
 var root=scDriveRoot_(p),iter=root.getFiles(),count=0,seen=0;
 while(iter.hasNext()&&seen++<(limit||60)){var f=iter.next();if(f.isTrashed())continue;f.moveTo(scDriveSub_(root,scDriveKind_(f)));count++;}
 return {movidos:count,parcial:iter.hasNext()};
}
function scDriveSearch_(root,q){
 var stack=[{folder:root,level:0,path:''}],seen={},files=[],n=0;
 while(stack.length&&n<450&&files.length<100){
  var cur=stack.shift(),folder=cur.folder;if(seen[folder.getId()])continue;seen[folder.getId()]=1;
  var fs=folder.getFiles();while(fs.hasNext()&&n++<450){var f=fs.next();if(f.isTrashed()||f.getName().toLocaleLowerCase('pt-BR').indexOf(q)<0)continue;var m=scDriveMeta_(f,false);m.caminho=cur.path||'Pasta principal';files.push(m);if(files.length>=100)break;}
  if(cur.level<6){var subs=folder.getFolders();while(subs.hasNext()&&stack.length<90){var sub=subs.next();stack.push({folder:sub,level:cur.level+1,path:(cur.path?cur.path+' / ':'')+sub.getName()});}}
 }
 return {files:files,partial:!!stack.length||n>=450||files.length>=100};
}
function scDriveList_(p,folderId,query){
 var root=scDriveRoot_(p),folder=scDriveFolder_(p,folderId),q=String(query||'').trim().slice(0,100).toLocaleLowerCase('pt-BR'),folders=[],files=[],n=0;
 var subs=folder.getFolders();while(subs.hasNext()&&n++<100){var sub=subs.next();folders.push({id:sub.getId(),nome:sub.getName()});}
 var found=q?scDriveSearch_(root,q):null;
 if(found)files=found.files;
 else{var it=folder.getFiles();n=0;while(it.hasNext()&&n++<150){var f=it.next();if(!f.isTrashed())files.push(scDriveMeta_(f,false));}}
 var links=scDriveLinks_(p.id),seen={};files.forEach(function(f){seen[f.id]=true;});
 if(folder.getId()===p.pasta)links.filter(function(x){return !x.alvo_tipo;}).slice(0,60).forEach(function(x){
  if(seen[x.arquivo_id])return;
  try{var f=DriveApp.getFileById(x.arquivo_id);if(f.isTrashed()||(q&&f.getName().toLocaleLowerCase('pt-BR').indexOf(q)<0))return;files.push(scDriveMeta_(f,true));seen[f.getId()]=1;}catch(e){}
 });
 folders.sort(function(a,b){return a.nome.localeCompare(b.nome,'pt-BR');});files.sort(function(a,b){return a.nome.localeCompare(b.nome,'pt-BR');});
 return {projeto:p.nome,pastaRaiz:p.pasta,pastaAtual:folder.getId(),nomePasta:folder.getName(),pastas:folders,arquivos:files,vinculos:links.filter(function(x){return !!x.alvo_tipo;}),regras:scDriveRules_(p.id),parcial:!!(found&&found.partial)};
}
function scDriveLink_(p,id,targetType,targetId){
 id=scDriveId_(id);DriveApp.getFileById(id);
 if(targetType){
  if(['tarefas','notas'].indexOf(targetType)<0)throw Error('Alvo inválido.');
  var sh=getSS().getSheetByName(TABELAS[targetType].aba);
  var ok=getObjectsFromSheet(sh).some(function(x){return String(x.id)===String(targetId)&&(targetType==='tarefas'?String(x.projeto)===p.id:String(x.conteudo||'').indexOf('[['+p.nome+']]')>=0);});
  if(!ok)throw Error('Tarefa ou nota não vinculada ao projeto.');
 }
 var s=scDriveSheet_(),rows=getObjectsFromSheet(s);
 if(rows.some(function(x){return x.projeto_id===p.id&&x.arquivo_id===id&&String(x.alvo_tipo||'')===String(targetType||'')&&String(x.alvo_id||'')===String(targetId||'');}))return {repetido:true};
 s.appendRow(['scd_'+Utilities.getUuid(),p.id,id,targetType?'associacao':'link',targetType||'',targetId||'',new Date().toISOString()]);
 return {ok:true};
}
function scDriveUnlink_(p,id){
 var s=getSS().getSheetByName(SC_DRIVE_ABA);if(!s)return {removidos:0};
 var data=s.getDataRange().getValues(),header=data[0],pi=header.indexOf('projeto_id'),fi=header.indexOf('arquivo_id'),ti=header.indexOf('alvo_tipo'),n=0;
 for(var i=data.length-1;i>=1;i--)if(String(data[i][pi])===p.id&&String(data[i][fi])===id&&!String(data[i][ti])){s.deleteRow(i+1);n++;}
 return {removidos:n};
}
function scDriveUpload_(p,a){
 var name=scDriveNome_(a.nome),mime=String(a.mime||'application/octet-stream').slice(0,120);
 if(/\.(exe|sh|bat|ps1|cmd|jar|js|html|svg)$/i.test(name))throw Error('Tipo não permitido.');
 var b64=String(a.base64||'');if(!b64||b64.length>4300000||!/^[A-Za-z0-9+/]*={0,2}$/.test(b64))throw Error('Envio inválido ou acima do limite.');
 var bytes=Utilities.base64Decode(b64);if(bytes.length>3*1048576)throw Error('Máximo de 3 MB por arquivo.');
 var token=String(a.envioId||'');if(token&&!/^[A-Za-z0-9_-]{8,80}$/.test(token))throw Error('Token do envio inválido.');
 var key=token?'SC_D_UP_'+p.id+'_'+token:'',cache=CacheService.getScriptCache();
 if(key){var old=cache.get(key);if(old){try{return scDriveMeta_(DriveApp.getFileById(old),false);}catch(e){}}}
 var dest=scDriveFolder_(p,a.pastaId);
 if(scDriveRules_(p.id).auto)dest=scDriveSub_(scDriveRoot_(p),scDriveKind_({getMimeType:function(){return mime;},getName:function(){return name;}}));
 var created=dest.createFile(Utilities.newBlob(bytes,mime,name));
 if(key)cache.put(key,created.getId(),21600);
 return scDriveMeta_(created,false);
}
function scDriveTrigger_(){
 var name='scDriveProjetosManutencao',exists=ScriptApp.getProjectTriggers().some(function(t){return t.getHandlerFunction()===name;});
 if(!exists)ScriptApp.newTrigger(name).timeBased().everyHours(1).create();
}
function scDriveProjetosManutencao(event){
 if(!chamadaDeGatilho_(event,'scDriveProjetosManutencao'))return;
 var sh=getSS().getSheetByName(TABELAS.projetos.aba),projects=getObjectsFromSheet(sh);
 projects.slice(0,30).forEach(function(p){try{if(scDriveRules_(String(p.id)).auto)scDriveOrganize_(scDriveProjeto_(p.id),40);}catch(e){console.warn('Drive: '+e.message);}});
}
/* API autorizada pelo roteador com autenticação e lock de gravação */
function scDriveProjetosApi(a){
 exigirAcesso();a=a||{};
 var action=String(a.acao||''),p=scDriveProjeto_(a.projetoId),writing=action!=='listar'&&action!=='regras',lock=writing?LockService.getScriptLock():null;
 if(lock&&!lock.tryLock(20000))throw Error('Outra operação está em andamento.');
 try{
  if(action==='listar')return scDriveList_(p,a.pastaId,a.busca);
  if(action==='regras')return scDriveRules_(p.id);
  if(action==='criarPasta'){var f=scDriveFolder_(p,a.pastaId).createFolder(scDriveNome_(a.nome));return {id:f.getId(),nome:f.getName()};}
  if(action==='upload')return scDriveUpload_(p,a);
  if(action==='vincular')return scDriveLink_(p,scDriveId_(a.arquivoId));
  if(action==='desvincular')return scDriveUnlink_(p,scDriveId_(a.arquivoId));
  if(action==='associar')return scDriveLink_(p,scDriveId_(a.arquivoId),String(a.tipo||''),scDriveId_(a.alvoId));
  if(action==='renomear'){var ren=scDriveFile_(p,a.arquivoId);ren.setName(scDriveNome_(a.nome));return scDriveMeta_(ren,false);}
  if(action==='mover'){var file=scDriveFile_(p,a.arquivoId),dest=scDriveFolder_(p,a.destinoId);file.moveTo(dest);return {ok:true};}
  if(action==='organizar')return scDriveOrganize_(p,80);
  if(action==='configurar'){var enabled=a.auto===true;PropertiesService.getScriptProperties().setProperty('SC_DRIVE_'+p.id,JSON.stringify({auto:enabled}));if(enabled)scDriveTrigger_();return {auto:enabled};}
  throw Error('Operação não permitida.');
 }finally{if(lock)lock.releaseLock();}
}