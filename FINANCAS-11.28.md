# Finanças — Studio 11.28

## Nova organização
- Resumo mensal: saldo liquidado (recebidos menos pagos), saldo previsto (todos os lançamentos do mês), a pagar e a receber. Valores não são saldo bancário e não incluem saldo inicial de contas.
- Navegação por mês. Filtros de situação/movimento e busca por descrição, categoria, área ou observação. Os filtros alteram a lista; o resumo continua sendo do mês inteiro.
- Lançamentos pagos e recebidos NÃO ficam riscados, apagados ou esmaecidos. Pendentes aparecem primeiro; liquidados ficam em grupo expansível. Data de exibição em dia/mês/ano.
- Registros liquidados com data futura são sinalizados como “Data futura”; o saldo é por mês do lançamento. O app não conhece a data efetiva bancária da liquidação.
- Ações “Marcar pago” e “Marcar recebido” somente registram a situação no sistema, com opção de desfazer. Não movimentam dinheiro.
- Cadastro único para inclusão/edição, categorias sugeridas, valor brasileiro validado e proteção para não substituir registro que mudou durante edição.
- Orçamento por categoria e mês, incluindo novas categorias. Compara o limite com despesas pagas e pendentes. Categoria é texto livre; diferenças de grafia podem formar categorias distintas.
- Repetir mensalmente por até12 lançamentos ou dividir um valor total em até12 parcelas. Centavos distribuídos sem alterar o total; datas respeitam o último dia de cada mês. Só o primeiro lançamento pode receber o estado pago/recebido escolhido; os seguintes ficam pendentes.
- São previsões finitas gravadas na lista, não um agendador de geração contínua. Editar/excluir afeta apenas o lançamento escolhido, não uma série inteira.
- Possíveis duplicatas por descrição normalizada, data, movimento e valor exatos. Exige revisão antes de cadastrar repetido; não remove dados automaticamente.
- Categorias/orçamento e detalhes recolhidos para manter a tela compacta.
- CSV do mês completo, com centavos formatados, separador ponto e vírgula e proteção contra fórmulas em texto. Arquivo contém dados financeiros; exportação ocorre apenas quando solicitada pelo usuário.
- Acesso direto ao cadastro manual de assinaturas já existente. Ele continua separado dos lançamentos financeiros e não cria lançamentos automaticamente.

## Compatibilidade
Interface/tela2026-11-14d, Studio11.28.0. Código.gs não foi alterado nesta entrega; usa a tabela financeira e o armazenamento de configurações existentes. No GitHub, a interface e o cache são publicados juntos. Quem usa a tela do Google Apps Script deve atualizar apenas Index.html e publicar uma nova versão da implantação; não precisa trocar Código.gs por causa desta atualização.

## Verificação
financas.test.cjs: valores pt-BR e ponto decimal, rejeição de entradas inválidas e limite de valor, distribuição exata de parcelas, datas de fim de mês e ano bissexto, cópias futuras pendentes, saldo liquidado/projetado, categorias seguras, navegação integrada sem risco sobre pagamentos, baixa rápida, fila em lote, proteção de edição concorrente, duplicação e CSV.
Regressões de notas, captura, organização, produtividade e assistente pessoal; contraste dos cinco temas. Prévia real em viewport móvel com dados fictícios; resumo e cadastro sem transbordamento horizontal. Não conecta bancos, não faz pagamentos e não importa extratos nesta entrega. Não foi alterado nenhum lançamento da conta do usuário durante o desenvolvimento.
