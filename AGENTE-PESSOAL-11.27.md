# Studio 11.27 — agente pessoal, por prioridade

## Implementado nesta entrega
1. Preferências explícitas, sincronizadas na configuração: até20, de300 caracteres. A captura reconhece “Lembre que...” e regras explícitas “Sempre que... trate como nota/tarefa/...”. Não deduz preferências permanentes silenciosamente. Tela para editar/esquecer. O servidor recebe preferências validadas e deve priorizar o pedido atual.
2. Continuidade local: últimas10 interações resumidas, até7dias; até5 são retomadas no contexto após recarga. Controle para desativar e apagar. Não é acesso ao histórico do ChatGPT/Gemini nem memória entre aparelhos. Conversas novas/canceladas não ressuscitam histórico nessa sessão.
3. Desfazer o lote inteiro da captura: diário local de30min, recuperável após recarga; exige que os registros ainda correspondam ao estado produzido. Bloqueia nova execução quando não consegue guardar a reversão. São comandos compensatórios pela fila existente: NÃO é uma transação atômica entre Google Agenda, Tasks e planilha. Falhas externas podem exigir nova sincronização.
4. Dependências entre tarefas via marcadores nas notas, com interface de seleção. Bloqueia conclusão antes das dependências, ciclos e predecessores indisponíveis. Validação no cliente e no novo servidor. Não remove ou conclui dependências automaticamente. Marcadores de dependência são metadados visíveis nas notas.
5. Busca local por assunto: palavras relacionadas/sinônimos e resultado com tipo, título e origem. Não usa embeddings nem representa busca semântica por IA.
6. Revisão de pendências: aguardando resposta, prazo passado, sem data e dependências abertas. Ao concluir, a tarefa deixa automaticamente essa revisão. Não envia mensagens para outras pessoas.
7. Preparação de compromissos: referências explicitamente vinculadas ou com título correspondente, identificadas como possivelmente relacionadas. Cria/reabre uma nota de preparação por compromisso, com perguntas, decisões e ações. Não grava reuniões, não inventa decisões, não consulta e-mail.
8. Possíveis notas duplicadas por título normalizado: comparação lado a lado, união de conteúdo sem resumo destrutivo, arquivamento da segunda. Bloqueia se mudaram durante a revisão, se há subpáginas na nota a arquivar ou se excede limite de48mil caracteres. Histórico existente preserva versões anteriores. Não classifica duplicação semântica automaticamente.
9. Replanejamento assistido: propõe horários para até8 tarefas sem horário, sem dependências abertas e com duração explícita15–240min, nos próximos7dias, com intervalo15min. Não desloca horários fixos. Exige seleção e nova validação antes de aplicar; não presume disponibilidade Google quando o dia não foi carregado.
10. Automação efetiva, limitada e optativa: projeto ativo sem tarefa pendente → tarefa “Definir próxima ação”. Simulação sem gravar, aplicação e opção de manter regra. Executa ao abrir/atualizar o aplicativo; NÃO roda com o app fechado. ID estável evita recriar a mesma tarefa enquanto o registro existir. Execuções registradas localmente, sem afirmar confirmação remota apenas porque saiu da fila.
11. Previsão de assinaturas: cadastro manual de serviço, valor, frequência mensal/anual e próxima renovação. Projeção dos próximos3meses. Não conecta banco, não paga, não cobra e não comprova despesas realizadas.
12. Rastreabilidade nas respostas da captura: oferece abertura dos registros cujo título foi mencionado na resposta. Não afirma que fontes externas foram verificadas ou que a IA necessariamente usou todos esses registros.

## Acesso
Organizar → Tarefas → Assistente, ou Biblioteca → Assistente. Detalhes da tarefa → Dependências e acompanhamento. Editor do evento → Preparar compromisso. Funções anteriores de modelos, notas conectadas, voz do navegador e fontes foram mantidas.

## Atualização necessária
Interface11.27/tela2026-11-14c; servidor2026-11-14c. O GitHub hospeda a interface e o pacote. Para ativar preferências no contexto da IA e validação de dependências no servidor, substitua o Código.gs completo pelo arquivo Apps-Script/Codigo.gs e publique uma nova versão da implantação existente no Google Apps Script. Se usa a interface do Apps Script, substitua também Index.html. As configurações salvas, inclusive chave Gemini, não são substituídas pelo código.

## O que das duas listas ainda depende de integração ou trabalho adicional
- Pesquisa web automática com fontes e importação de páginas: exige um provedor/API no servidor, controle de custos/cotas e validação de fontes. O app não recebeu um mecanismo de pesquisa web nesta entrega.
- Embeddings/RAG e deduplicação semântica: não implementados; busca local não deve ser apresentada como equivalente.
- Gravação/transcrição e resumo automático de reuniões: exige captura de áudio, tratamento de consentimento e provedor configurado. Preparação e checklists funcionam sem isso.
- Outros provedores de IA, voz avançada, edição/geração de imagens e vídeos: não integrados. Permanece o provedor Gemini existente e a leitura em voz do navegador.
- Automações com app fechado, webhooks e sincronização bidirecional completa: exigem servidor/gatilhos próprios; regra local tem execução limitada ao app aberto.
- Ajuste de despesas reais, detecção de reajustes/cobranças duplicadas e conciliação bancária: não implementados; projeção é cadastro manual.
- Campanhas, CRM comercial, postagem de conteúdo, prospecção e disparos de mensagens: não adicionados a um organizador pessoal sem contas e fluxos definidos.
- Rollback de hospedagem, prévias por PR e CI obrigatório: não implementados como novos serviços; permanece versionamento e publicação GitHub existentes. Testes foram executados antes da publicação.

## Validação
agente-pessoal.test.cjs cobre preferências/contexto, ciclos e conclusão com dependências no cliente e servidor, busca relacionada, preparação, união/arquivamento, simulação/idempotência da regra, projeção, desfazer em lote recuperado, falta de espaço e planejamento de tarefas flexíveis. Regressões existentes de captura/continuidade/timeout, notas, organização, produtividade, alertas Google e contraste. Todos com dados e serviços simulados. Entrega de notificações, comportamento real da IA com a conta configurada e voz em Android não validados nesta entrega.
