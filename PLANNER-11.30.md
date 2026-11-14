# Planner integrado — 11.30

Painel Bento, Dia, Semana e Mês usam as mesmas tarefas/eventos. Concluir, mover e editar preserva a identidade dos registros; hábitos continuam nos registros originais. Caixa de entrada, sessões de metas, rotinas e revisão continuam acessíveis.

## Inteligência

Planejar pendências libera até 50 tarefas sem horário para a automação. A marca interna [planner:auto] permite replanejar; uma data/hora escolhida manualmente retira a marca automática. Eventos, rotinas e blocos em andamento são preservados. Dependências, capacidade diária, limite de encerramento, intervalos, prazos explícitos e agenda Google carregada são respeitados. Pendência sem duração fica sem bloco, a menos que exista duração padrão informada ou três tempos de foco registrados para uma tarefa de mesmo nome, cuja mediana é usada como estimativa. Não existe garantia de compreensão perfeita nem previsão de duração sem evidência.

Comandos locais: “planeje meu dia”, “organize minha semana”, “desfaça o plano”. Conversas de esclarecimento permanecem no interpretador contextual existente. Pedidos pessoais complexos continuam usando o provedor de IA já configurado.

Desfazer guarda o último lote no aparelho e não sobrescreve edição posterior. Pausa automática por 30 minutos após desfazer. A ausência de conexão, agenda externa incompleta ou operação de sincronização em andamento impede o ciclo automático local.

## Google Apps Script — etapa necessária

1. Substitua Codigo.gs pelo arquivo completo Apps-Script/Codigo.gs desta versão.
2. Publique uma nova versão na implantação existente.
3. No editor execute instalarPlannerInteligente uma vez, com a conta dona do script. Autorize as permissões Google se solicitadas. Alternativamente use Planejar → Inteligência → Ativar execução com app fechado após atualizar a implantação.

O gatilho executa aproximadamente a cada hora. Usa a mesma lógica de planejamento e as rotas de sincronização Google existentes; não envia e-mails nem convites. Não instala novos gatilhos duplicados. Lê calendários selecionados e interrompe a alteração se a leitura externa falhar. Confere SEQ sob lock antes de gravar, guarda reversão no servidor e permite desfazer pela tela após recarregar. O botão do app mostra se a função está disponível, e não presume instalação.

A alteração do servidor foi preparada e testada com simulações; a implantação do usuário e os alertas Google reais exigem atualização e verificação na conta do proprietário.

## Verificação

planner.test.cjs: conflitos, intervalos, capacidade, rotinas, eventos de dia inteiro, dependências, prazos, estimativa pelo histórico, tarefas fixas/em andamento, agenda externa incompleta e imutabilidade.
planner-ui.test.cjs: quatro visões, navegação, movimentação canônica, desfazer e proteção contra edição posterior.
Regressões: organizado, captura-compreensao, captura-revisao, agente-pessoal, financas, contraste.
