# Studio 11.23 — continuidade da captura

Quando a IA pede um esclarecimento, a interface mantém explicitamente pedido original, pergunta, data de referência e até cinco complementos. O próximo complemento curto é enviado à API como pedido completo, preservando a mensagem literal no histórico. Troca explícita de assunto, cancelamento e reinício deixam de combinar o pedido anterior.

Normalização conservadora de horários em português: onze da manhã, duas da tarde, onze e meia, horas em 24h, meio-dia e meia-noite. Sem período ou indicação inequívoca, horários ambíguos permanecem para a IA esclarecer. Negações, horários inválidos, múltiplos horários e contradições de período não recebem conversão automática. Datas hoje/amanhã/depois de amanhã são ancoradas à mensagem em que foram ditas. Complementos de data preservam o horário já esclarecido.

Respostas curtas que corrigem a última ação enviam orientação de alteração, sem recriar. Atividades pessoais podem ser tarefas com horário e sem duração inventada; pedidos explícitos de eventos continuam sujeitos aos campos e validações existentes.

A interpretação final e as ações continuam dependentes do modelo configurado e passam pela mesma validação e fila durável. Nenhuma chave, permissão, esquema ou arquivo de servidor foi alterado. Compatível com servidor 2026-11-13d.

Testes com respostas simuladas do provedor: diálogo treino amanhã de manhã → pergunta de horário → às onze → criação local de tarefa para amanhã às 11:00; correção para dez; mudança de assunto; reinício; múltiplos esclarecimentos; virada de dia; horários ambíguos, inválidos e negados. Sem chamadas à conta Gemini real do usuário.
