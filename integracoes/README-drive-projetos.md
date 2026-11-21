# Integração Drive nos Projetos — versão de testes

Implementação isolada na branch `integracao-drive-projetos-20261120d`.

A interface depende da API `scDriveProjetosApi` no Google Apps Script; **não ativar em produção** antes da publicação da extensão no Apps Script e validação da autenticação. Esta branch não deve alterar dados reais.

Funcionalidades planejadas: arquivos e subpastas existentes, upload limitado, vínculos, pesquisa, pré-visualização, associação a tarefas e notas, renomeação, movimentação interna, categorização opcional e organização automática opt-in.

Regras: nunca excluir arquivos, nunca tornar documentos públicos, nunca mover conteúdo de outras pastas e nunca criar pasta ao listar um projeto.