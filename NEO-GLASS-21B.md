# Neo Glass 2026-11-21b — correção do redesign

## Atualização
- **Interface visual:** Neo Glass 2026-11-21b.
- **Protocolo da tela/Apps Script:** 2026-11-20d (inalterado).
- **Cache da PWA:** segundo-cerebro-2026-11-21b-neoglass.
- **Testes automatizados:** 87 aprovados, 0 falhas (execução GitHub 44907398041).

## O que foi corrigido
1. O planner legado estava escondendo os painéis de tarefas, prioridades e agenda da Home. A camada CSS nova os exibe sem remover as funções antigas.
2. Neon Night passa a ser a proposta padrão para usuários sem preferência Neo Glass anteriormente salva. Ajustes → Aparência mantém Aurora, Executive e a opção de seguir o tema original.
3. Contraste, transparência, cartões, componentes do planejador, Projetos, Biblioteca, Finanças, arquivos no Drive, janelas e navegação receberam uma segunda camada de estilos.
4. A API do Apps Script não foi alterada nesta atualização de design; a discrepância de versões do servidor precisa ser resolvida separadamente.

## Backups de código
- Versão anterior ao redesign: branch `backup-pre-redesign-2026-11-21` (2026-11-20d).
- Primeira versão Neo Glass: branch `backup-neoglass-v1-2026-11-21` (2026-11-21a).

## Como verificar
Abra o 2º Cérebro no GitHub Pages após a atualização do cache; no tema Neon Night, a Home deve mostrar saudação, três indicadores, tarefas e agenda logo abaixo e a área do planejamento. Também confira Organizar, Biblioteca, Finanças e um Projeto.

Se ainda aparecer visual antigo, reabra a página no navegador. Não limpe o armazenamento local nem force exclusão da PWA.
