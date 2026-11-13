# Studio 11.19 — organização da prévia

Interface 2026-11-13k; cache 2026-11-13k-sc11190. Mantém o contrato com o servidor 2026-11-13d; não requer atualizar Codigo.gs.

## Mudanças

- Três abas estáveis: Hoje, Organizar e Biblioteca. A rotina anterior de cinco abas deixa de substituir a nova navegação após mutações do DOM.
- Botão flutuante antigo desativado. Captura única, histórico integrado ao campo e cabeçalho compacto com busca e ajustes.
- Hoje com data compacta, até três prioridades, hábitos previstos e concluídas do dia recolhidas. O filtro de contexto oculto é redefinido para Tudo.
- Projetos com progresso das tarefas, próximas ações e acesso a tarefas, notas, agenda e metas relacionadas. Concluídas ficam recolhidas.
- Vínculos usam IDs já existentes e referências explícitas [[Nome do projeto]]; metas também são relacionadas pelas tarefas do projeto. A criação contextual preserva essas referências no campo já suportado pelo servidor.
- Biblioteca com busca por palavras, contagem correta de subpáginas (pagina_pai) e arquivar/restaurar notas. O arquivamento usa a etiqueta #arquivado, sincronizada pela fila existente, sem excluir conteúdo.
- Status único distingue aguardando conexão, atualização, fila pendente, falha, quarentena e alterações salvas. Não declara Salvo antes da primeira sincronização.
- Preservados os cinco fundos, temas, configurações e ferramentas avançadas.

## Verificação

`organizado.test.cjs` inicializa a página completa com registros fictícios e espera os observadores executarem. Confere estabilidade da navegação, ausência do botão antigo, relacionamentos, concluídas, busca/subpáginas, arquivamento/restauração pela fila e estado de sincronização. `navigation.cjs` preserva as verificações anteriores. Ambos usam jsdom; não chamam a IA nem o servidor.

Execução: instalar jsdom e rodar `node organizado.test.cjs` e `node navigation.cjs`. A variável opcional SC_TEST_JSDOM permite indicar uma instalação já existente. Scripts inline e service worker também passam pela verificação de sintaxe.
