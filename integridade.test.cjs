'use strict';
// Teste adicional sem efeitos na conta: não faz POST nem cria lembretes reais.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const src = fs.readFileSync('index.html','utf8');
const transport = fs.readFileSync('pwa-transport.js','utf8');
const worker = fs.readFileSync('sw.js','utf8');
let scripts = 0;
for (const match of src.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
  if (match[1].trim()) { new vm.Script(match[1]); scripts++; }
}
new vm.Script(transport);
new vm.Script(worker);
assert(scripts > 30, 'Scripts de interface incompletos');
assert(src.includes("VERSAO_STUDIO = '11.37.14'"), 'Versão incorreta');
assert(src.includes('sc166Vincular'), 'Falta isolamento da conta');
assert(src.includes('sc166Bootstrap'), 'Falta validação de sessão/cache');
assert(src.includes('sc166QuarentenaKey'), 'Quarentena sem isolamento por conta');
assert(src.includes('sc166_conversao_tarefa'), 'Conversão sem confirmação de servidor');
assert(src.includes('sc166Serie(t)'), 'Recorrência sem origem única');
assert(src.includes("'sc148-idea-'"), 'Ideias não persistidas separadamente');
assert(!src.includes('Sem hora, ele vem no horário padrão do dia'), 'Mensagem de lembrete contraditória');
assert(transport.includes('scPwaSessionMarker'), 'Sessão sem vínculo do cache');
assert(worker.includes("VERSION='2026-11-17f'"), 'Versões do cache não correspondem');
console.log('PASS: sintaxe de scripts e controles de integridade 11.37.14');
