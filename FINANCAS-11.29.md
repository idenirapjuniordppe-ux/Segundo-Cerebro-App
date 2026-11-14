# Finanças Essencial — 11.29

Saldo em conta agora em destaque; detalhes de cálculo e previsão recolhidos. Filtros ficam sob demanda e pendências do mês aparecem em uma linha compacta.

A conta precisa de saldo inicial e data de referência. O saldo atual soma ao inicial os movimentos pagos/recebidos dessa data até hoje, incluindo meses anteriores, excluindo pendências e datas futuras. Trocar o mês da lista não muda o saldo atual. Sem saldo inicial, a tela solicita cadastro e não apresenta o resultado mensal como dinheiro em conta. Não há integração bancária automática.

Use saldo anterior aos movimentos da data escolhida. Para começar pelo saldo atual do banco, escolha hoje e desconte/adicione os movimentos já lançados hoje ao informar o valor inicial. Aceita saldo negativo.

Interface e service worker publicados juntos; servidor inalterado. Configuração usa SALVAR_CONFIG existente. Testes: histórico, saldo inicial, troca de mês, futuro/pendências, filtros e regressões de finanças.
