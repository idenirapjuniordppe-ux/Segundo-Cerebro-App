# Studio 11.20 — ajustes simplificados

Seis grupos recolhíveis: Meu dia; Aparência; Inteligência e automações; Google e conexões; Backup e sincronização; Avançado. Os grupos começam fechados e apenas um fica aberto por vez.

Os controles existentes foram movidos como elementos DOM, mantendo IDs, eventos e valores em edição. Não há salvamento automático de configurações nem alteração das preferências do usuário nesta migração. Temas e acessibilidade, Google Agenda, recuperação, diagnóstico e manutenção permanecem acessíveis. Os atalhos repetidos de exportação e busca no painel de estado ficam ocultos; backups do Drive passam ao grupo de dados. A ajuda de voz foi atualizada para o fluxo atual da captura.

Os painéis internos deixam de usar o recolhimento antigo, evitando duas camadas de abrir/fechar para o mesmo conteúdo. Painéis criados ao entrar em Ajustes também são agrupados.

Interface 2026-11-13p; cache 2026-11-13p-sc11200. Compatível com o servidor 2026-11-13d, sem atualização de Codigo.gs.

Validação: `ajustes.test.cjs` executa a página completa com jsdom e verifica os seis grupos, campos originais sem perdas/duplicações, categorias, eventos, valores não salvos, agrupamento após renderização e ausência de recolhimento antigo. Testes de gestos de tarefas/hábitos e proteção do botão Voltar também passaram.
