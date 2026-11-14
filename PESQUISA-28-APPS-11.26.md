# 2º Cérebro 11.26 — pesquisa e melhorias
Pesquisa de fontes oficiais em 14/11/2026. A imagem contém 28 produtos. Algumas categorias da imagem são simplificações: Firecrawl fornece extração de conteúdo; GitHub, Vercel e Netlify são infraestrutura de desenvolvimento/publicação, e não organizadores pessoais.

## Pesquisa dos 28 produtos e aplicação
| Produto | Recurso observado | Aplicação ao 2º Cérebro |
|---|---|---|
| [ChatGPT](https://help.openai.com/pt-br/articles/10169521-projects-in-chatgpt) | Projetos com contexto e arquivos | Modelo de projeto com contexto e preferências; busca da captura passa a considerar conteúdo das notas no ranqueamento. Não é memória equivalente à do ChatGPT. |
| [Claude](https://support.anthropic.com/en/articles/9517075-what-are-projects) | Espaços de projeto e conhecimento | Modelo para objetivos, contexto e critério de conclusão. |
| [Gemini](https://gemini.google/overview/deep-research/) | Pesquisa estruturada | Modelo de pesquisa separa pergunta, fontes, evidências e dúvidas. Não adiciona Deep Research ao app. |
| [Perplexity](https://www.perplexity.ai/pt/hub/blog/a-student-s-guide-to-using-perplexity-spaces) | Pesquisa ligada à base de conhecimento | Referências com endereço e data de consulta; sem busca web automática. |
| [Cursor](https://cursor.com/docs/agent/overview) | Agente com checkpoints | Reutilizados autosave/rascunhos existentes e ação reversível para criação em lote; teste de nota alterada bloqueia execução obsoleta. Não há um novo sistema de checkpoints. |
| [GitHub](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments) | Controle de versão e publicação | Código versionado e testes de regressão antes da publicação. |
| [Vercel](https://vercel.com/docs/instant-rollback) | Rollback de publicação | Mantido histórico GitHub; não migra hospedagem nem cria rollback automático. |
| [Netlify](https://docs.netlify.com/deploy/deploy-types/deploy-previews/) | Prévia antes de publicar | Conferência da interface real com dados fictícios em ambiente local. Sem contratar Netlify. |
| [n8n](https://github.com/n8n-io/n8n-docs/blob/main/docs/build/flow-logic/handle-errors-gracefully.md) | Execuções e tratamento de falhas | Aproveitada fila persistente existente; nova conversão de checklist valida contexto antes de gravar. Não instala n8n. |
| [Make](https://help.make.com/filtering?pc=scottworld) | Condições entre etapas | Apenas itens não concluídos, não duplicados e selecionados viram tarefas. |
| [Zapier](https://help.zapier.com/hc/en-us/articles/8496276332557-Add-conditions-to-Zap-workflows-with-filters) | Gatilho, filtro e ação | Fluxo nota → seleção de ações → tarefas vinculadas. Executado pelo usuário; não é agendador em segundo plano. |
| [Firecrawl](https://www.firecrawl.dev/scrape) | Conteúdo web estruturado | Registro estruturado da fonte, endereço e data. Não importa páginas nem faz scraping. |
| [Higgsfield](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-cinema-studio) | Produção a partir de briefing e referências | Modelo de conteúdo: objetivo, público, roteiro e referências. Não gera vídeo. |
| [CapCut](https://www.capcut.com/help/how-to-recognise-subtitles) | Fluxo de edição e legendas | Checklist de revisão de áudio e legendas no modelo de conteúdo; não transcreve vídeos. |
| [Instagram](https://about.fb.com/news/2024/10/best-practices-education-hub-creators-instagram/) | Objetivos e análise de resultados | Campo de resultados observados no modelo de conteúdo; preenchimento manual. |
| [Fish Audio](https://github.com/fishaudio/docs/blob/main/llms.txt) | Texto para voz | Leitura em voz alta usando voz do navegador, sem integração Fish Audio ou clonagem de voz. Depende do suporte do aparelho. |
| [Meta Ads](https://developers.facebook.com/docs/graph-api/reference/adcampaigngroup/?locale=pt_BR) | Objetivo de campanha e medição | Objetivo explícito nos modelos; não compra nem publica anúncios. |
| [Instantly](https://help.instantly.ai/en/articles/6602310-analytics-report) | Sequências e resultados | Checklist sequencial e ações extraídas de notas; sem disparo de e-mails ou métricas de campanhas. |
| [Apollo](https://knowledge.apollo.io/hc/en-us/articles/4409237165837-Sequences-Overview) | Próximas ações e tarefas | Conversão de ações de reuniões em tarefas com referência à origem. Sem prospecção de contatos. |
| [Google Maps](https://developers.google.com/maps/documentation/urls/get-started) | Rotas por URLs multiplataforma | Preservado recurso de localização/rotas existente. Nenhuma coleta de localização em segundo plano. |
| [HighLevel](https://help.gohighlevel.com/support/solutions/articles/155000002288-workflows-overview) | Fluxos e pipelines | Reutilizados projetos/tarefas relacionados e nova extração em lote; sem CRM adicional. |
| [Fathom](https://www.fathom.ai/overview) | Reuniões com decisões e ações | Modelo de reunião e extração de checklists explícitos. Não grava reuniões nem promete resumo automático. |
| [Calendly](https://calendly.com/help/how-to-use-buffers) | Disponibilidade e intervalos | Consulta de horários com intervalo0/15/30 minutos e revalidação antes de preencher nova tarefa. Não publica agenda externa. |
| [Google Meet](https://support.google.com/meet/answer/14754931?co=GENIE.Platform%3DAndroid&hl=en) | Notas de reunião | Modelo para participantes, decisões, ações e referências; sem entrar em reuniões. |
| [Stripe](https://docs.stripe.com/api/subscriptions?api-version=2024-06-20) | Assinaturas recorrentes | Modelo de revisão de assinaturas/despesas. Não processa pagamentos nem cria cobranças. |
| [Notion](https://www.notion.com/help/database-templates) | Modelos reutilizáveis | Cinco modelos disponíveis em Biblioteca → Modelos e ferramentas. |
| [Obsidian](https://obsidian.md/help/plugins/backlinks) | Backlinks e conhecimento conectado | Sugestões de menções sem vínculo e ligação explícita por [[título]], aproveitando backlinks existentes. Ambiguidade de títulos é bloqueada. |
| [Google Drive](https://support.google.com/drive/answer/2375091?hl=en) | Arquivos organizados e favoritos | Referências a arquivos por URL e exportação Markdown; favoritos já existentes preservados. Não muda compartilhamento. |

## O que foi efetivamente acrescentado
- Biblioteca: um acesso compacto a cinco modelos e consulta de disponibilidade.
- Notas: Ferramentas dentro das opções da página; checklist em lote com seleção, origem e desfazer; notas relacionadas; referências; exportação Markdown; ouvir/parar voz do navegador.
- Organizar/Tarefas: Horários livres, com duração15–240min, intervalo0/15/30, tarefas com horário, eventos e cache Google já carregado; dia inteiro e eventos atravessando meia-noite bloqueiam intervalos. Agenda Google habilitada mas sem cache do dia impede sugerir horário como disponível.
- Consulta não reserva horário; escolher preenche o editor de tarefa, ainda exige salvar. Não garante conflitos de calendários/dados que não foram carregados, nem expande séries recorrentes externas por conta própria.
- Captura ranqueia também texto das notas, mantendo os limites de contexto existentes. Isso não implementa integração com outros provedores de IA.
- Correção descoberta nos testes: salvar tarefas preserva o ID no objeto original, necessário para relações e desfazer de ações em lote.

## Compatibilidade e validação
Interface11.26, tela2026-11-14b; servidor de alertas11.25/2026-11-14a continua o mesmo. As melhorias desta versão são de interface. Não é necessária uma nova alteração do servidor para estas funções, mas as correções de alertas11.25 continuam dependendo da publicação do servidor entregue anteriormente.
Testes com jsdom e dados fictícios: modelos, tarefas em lote e duplicações, ausência de datas inventadas, IDs duráveis, vínculos, URLs, intervalos, dia inteiro, meia-noite, datas inválidas, cacheGoogle incompleto e nota alterada durante a prévia. Regressões de notas, organização e contraste. Voz e entrega de notificações não validadas em aparelho real.
