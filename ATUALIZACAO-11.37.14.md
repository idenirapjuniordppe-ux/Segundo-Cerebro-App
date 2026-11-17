# 2º Cérebro 11.37.14 — melhorias nas ferramentas

Versão de teste sobre a 11.37.13. O workflow executa a suíte na branch de teste sem implantar no GitHub Pages.

- **Hoje e Planner** — fundo neutro para tarefas e classes/legendas distintas para tarefas, compromissos e práticas. Verde, laranja e vermelho sinalizam estado, sem tingir todo o cartão. Se a gravação local for recusada, o Planner conserva o desfazer anterior e não anuncia um encaixe salvo.
- **Notas e Biblioteca** — histórico por nota e conta no aparelho, cópia de recuperação e links por ID, inclusive após renomeação. O cliente compara os campos editados imediatamente antes de enviar uma edição e preserva no histórico conflitos detectados, em vez de sobrescrever silenciosamente. A verificação ainda não é atômica entre dois clientes e não equivale a coedição em tempo real.
- **Agenda e lembretes** — separa fila local, registro salvo, envio, aviso configurado e falha. Uma consulta negada não é tratada como agenda livre. A confirmação da configuração no Google não confirma a entrega no celular.
- **Captura** — valida datas brasileiras e horários explícitos com local na frase. Protege a intenção de guardar uma ideia ou nota e bloqueia ações de agenda ainda acompanhadas de pergunta pendente.
- **Projetos** — mesma contagem de tarefas ativas/concluídas na lista, no detalhe, no mural e no Planner, sem conclusão automática. Canceladas e inativas não entram no total.
- **Hábitos e rotinas** — consistência por dias previstos, pausa e retomada sem perder registros, registro retroativo de práticas e recuperação de ocorrências puladas recentemente.
- **Desempenho** — reutiliza consultas de Agenda e DOM idêntico do Planner, agrupa atualizações por confirmações da fila e deixa cálculos de sugestão sob demanda. Ajustes mostram tempo até exibir os dados, atualizações, consultas e heap JS quando disponível.

## Validação antes de produção

1. Usar uma implantação e uma planilha de teste com a cópia do `Codigo.gs` efetivamente em uso. Não reutilizar dados reais para os cenários automatizados.
2. Editar a mesma nota em dois perfis de navegador, incluindo um perfil offline. Conferir que o conflito detectado aparece no histórico local e que a ação de recuperação cria outra nota. Para garantia contra gravações simultâneas no mesmo instante, validar comparação sob bloqueio no backend.
3. Salvar uma tarefa com horário e um compromisso marcado para Google Agenda. Conferir os respectivos eventos, o horário do aviso e a notificação no Android.
4. Comparar as duas versões no mesmo aparelho, com iluminação, rede, planilha e período de uso equivalentes. Medir abertura e memória e consultar o consumo do aplicativo nos ajustes de bateria do Android. A suíte não mede bateria nem comprova desempenho de produção.
