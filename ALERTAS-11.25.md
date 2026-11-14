# Studio 11.25 — alertas Google

## Instalação necessária no Google Apps Script
1. Substitua Código.gs pelo arquivo completo Apps-Script/Codigo.gs.
2. Se usa também a interface hospedada no Apps Script, substitua Index.html pelo arquivo completo Apps-Script/Index.html.
3. Salve e publique em Implantar → Gerenciar implantações → Editar → Nova versão → Implantar, mantendo a implantação/URL existente.
4. Autorize o acesso ao Google Agenda se o Google solicitar. O código usa a API REST Calendar por UrlFetchApp com o token do próprio Apps Script; não exige chave Gemini, API key ou serviço avançado Calendar. Se o projeto usa manifesto com escopos explícitos, precisa de https://www.googleapis.com/auth/calendar e https://www.googleapis.com/auth/script.external_request. Em caso de HTTP403 por API desativada, habilite Google Calendar API no projeto Cloud vinculado; o app não pode habilitá-la sozinho.
5. Teste um lembrete futuro e confira o estado no app e o evento no Google Agenda. A confirmação do Google não comprova entrega da notificação pelo Android.

## Mudanças
- Lembretes 0–40320 minutos pela API Calendar, com leitura de confirmação; -1 desativa; vazio em eventos preserva o padrão da agenda. A API CalendarApp documenta mínimo de 5 minutos para addPopupReminder.
- IDs do evento e da agenda são preservados antes de configurar o alerta; reenvio reutiliza o vínculo. Recuperação por tag evita duplicar eventos com vínculo perdido, quando o marcador existe. Se a criação for aceita mas a resposta/tag se perder antes de persistir, a transação não é atômica: ainda exige conferência. Não há garantia de exatamente uma criação em falhas extremas.
- Tarefas novas usam a agenda de destino; vínculos antigos continuam na agenda original. Exclusão/arquivamento consultam a agenda salva.
- Datas dos eventos e alertas são interpretadas explicitamente no fuso do Apps Script; configure America/Recife no projeto para sua rotina. Não altera configurações da sua conta Google.
- Captura orientada a converter pedidos de aviso e antecedência; ausência de pedido continua sem lembrete. Interpretação depende do provedor e não foi validada com chamada real à IA nesta revisão.
- Estado discreto nos detalhes, falhas visíveis e reenvio manual. Sem agendamento periódico, sem criação automática de alertas para hábitos/metas/notas e sem migração em massa de dados existentes.
- Novas colunas adicionadas automaticamente ao gravar, preservando colunas existentes.

## Validação
alertas.test.cjs: aviso0, aviso30, desativação, valor inválido, divergência na confirmação, HTTP429 sem expor token, preservação de IDs, reenvio sem nova criação, conclusão remove aviso, sintaxe e compatibilidade. Organizar e notas: regressões aprovadas. São testes com serviços simulados; nenhum evento foi criado na conta do usuário durante estes testes.

## Fontes oficiais
https://developers.google.com/apps-script/reference/calendar/calendar-event
https://developers.google.com/workspace/calendar/api/v3/reference/events
https://developers.google.com/workspace/calendar/api/concepts/reminders
https://developers.google.com/workspace/tasks/reference/rest/v1/tasks
