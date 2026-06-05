Ajustar o cálculo do gráfico de Receita Excelsior para seguir exatamente a planilha anexada de maio.

Ponto identificado:
- A planilha de maio tem prêmio total pago de US$ 1.861,00.
- O PIS/COFINS está correto como US$ 47,41: `4,65% × ((prêmio total − IOF) × 55%)`.
- O erro está no gráfico somando o prêmio bruto inteiro como componente da Excelsior.
- Na planilha, o componente de “Prêmio Direto Seguradora e Resseguradora” é apenas `40% do prêmio líquido de IOF`, não 100% do prêmio pago.
- Por isso o total correto de maio é aproximadamente US$ 9.027,49:
  - Carregamento Excelsior: US$ 8.333,33
  - Prêmio direto seguradora/resseguradora: US$ 741,57
  - PIS/COFINS: -US$ 47,41
  - Total: US$ 9.027,49

Plano de implementação:
1. Atualizar `computeRepasse` para refletir a fórmula da planilha:
   - `premioTotalPago = prêmio bruto pago no mês`
   - `iof = premioTotalPago × 0,38%`
   - `premioLiquidoIof = premioTotalPago − iof`
   - `comissoesOleNomad = premioLiquidoIof × 55%`
   - `pisCofins = comissoesOleNomad × 4,65%`
   - `feeExcelsior = premioLiquidoIof × 5%`
   - `fixoSuplementar = 8.333,33 − feeExcelsior`
   - `carregamentoExcelsior = feeExcelsior + fixoSuplementar`, mantendo US$ 8.333,33
   - `premioDiretoSeguradoraResseguradora = premioLiquidoIof − comissoesOleNomad − feeExcelsior`, equivalente a 40% do líquido de IOF
   - `totalRepasseExcelsior = carregamentoExcelsior + premioDiretoSeguradoraResseguradora − pisCofins`

2. Ajustar os campos usados pelo gráfico:
   - Renomear/explicitar o campo do prêmio no gráfico para não representar o prêmio bruto inteiro.
   - Usar o componente calculado de 40% líquido de IOF na barra de “Prêmio Direto”.
   - Manter PIS/COFINS como dedução negativa.
   - Manter a linha de total usando o total do repasse corrigido.

3. Atualizar tooltip e subtítulo do gráfico:
   - Mostrar prêmio total pago, IOF, prêmio líquido de IOF, comissões Olé + Nomad, PIS/COFINS, carregamento Excelsior, prêmio direto seguradora/resseguradora e total.
   - Deixar explícito que o valor do gráfico deve bater com o “Total do Repasse à Excelsior” da planilha.

4. Validar contra maio:
   - Com `premioTotalPago = 1.861,00`, o cálculo deve retornar total próximo de `US$ 9.027,49`, igual à planilha anexada.