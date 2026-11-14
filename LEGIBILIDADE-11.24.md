# Studio 11.24 — revisão de leitura dos cinco temas

- Paleta central por tema, alinhando variáveis antigas de Hoje, Agenda, Notas, Ajustes, modais e navegação.
- Imagem mantida em tela inteira; brilho e saturação ajustados numa camada isolada, sem aplicar filtros aos textos ou controles.
- Cartões com 97% de opacidade (98% no Editorial), campos e modais com superfícies uniformes; cabeçalhos, etiquetas e mensagens protegidos da imagem.
- Textos secundários, botões, placeholders, links, foco, bordas de controles e checklists revisados. Concluídas permanecem riscadas sem opacidade geral que apague o texto.
- Não altera cores de formatação escolhidas pelo usuário dentro das notas.

## Contraste das combinações testadas

O teste usa extremos preto e branco atrás das superfícies translúcidas. Verifica texto principal, secundário, cabeçalho, campos, placeholder, seleção, link, botão, concluído e cores semânticas. Mínimos obtidos:

| Tema | Menor razão entre os pares de texto testados |
|---|---|
| Neural Night | 6,06:1 |
| Minimal Premium | 5,32:1 |
| Glass Focus | 4,84:1 |
| Executive Dark | 6,92:1 |
| Editorial | 5,08:1 |

Controles e foco: pelo menos 3:1 nos pares testados. Esses valores não constituem auditoria completa de acessibilidade de todos os conteúdos possíveis; cores personalizadas pelo usuário não são substituídas. Conferência no navegador com as telas reais renderizadas e dados fictícios verificou as cores efetivas, as notas e as caixas de seleção nos cinco temas.

Sem mudança na API, autenticação, registros ou preferências. Tela 2026-11-13x; servidor 2026-11-13d continua compatível. Atualizar index.html e sw.js juntos. Testes: node contraste.test.cjs e testes existentes de organização/notas.
