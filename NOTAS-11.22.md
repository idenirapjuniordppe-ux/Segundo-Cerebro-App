# Studio 11.22 — Notas conectadas

Biblioteca com favoritas, fixadas, recentes (últimas páginas abertas neste aparelho), busca em conteúdo e trechos com destaque. As páginas abrem na leitura com subpáginas e referências preservadas. Opções avançadas em menu recolhível.

Tocar no texto inicia o editor em blocos existente dentro da página. Alterações são guardadas após uma pausa de 650 ms pela mesma fila durável do app. O editor permanece montado durante o salvamento. Concluir edição volta à leitura. Campos completos, parentagem, duas colunas e exportação continuam disponíveis no menu. Checklists podem ser marcadas durante a leitura.

Trecho selecionado oferece negrito, destaque, link e criar tarefa. A tarefa preserva o texto e a referência estável à nota em notas, sem atribuir data/horário automaticamente. Mesmo trecho na mesma nota não cria duplicata enquanto a tarefa existe. A nota mostra as tarefas relacionadas.

Rascunhos locais são recuperáveis; alteração concorrente do conteúdo bloqueia a sobrescrita automática. O limite de 48 mil caracteres permanece. Atualização automática do PWA fica suspensa durante a edição.

Sem alteração da API ou das tabelas. Servidor 2026-11-13d compatível com a tela 2026-11-13u. Testes: notas.test.cjs, organizado.test.cjs, ajustes.test.cjs e agenda-navegacao.test.cjs. A conferência visual usa dados fictícios, sem acesso às notas reais do usuário.
