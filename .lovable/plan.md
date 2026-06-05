## Plano

1. **Corrigir a regra contábil da Excelsior**
   - Trocar o cálculo atual para seguir exatamente a regra informada:
     ```text
     Receita Excelsior = 8.333,33 + Prêmio Direto - PIS/COFINS
     ```
   - Remover do gráfico o uso de “prêmio retido 10%” e qualquer divisão Olé/Munich/Impostos que não seja necessária para a visão da Excelsior.
   - Manter a base mensal por **mês de pagamento/vencimento da parcela**.

2. **Reestruturar os dados mensais do gráfico**
   - Para cada mês, retornar os campos contábeis visíveis da Excelsior:
     - `carregamentoExcelsior`: sempre `8.333,33`
     - `premioDireto`: soma dos prêmios pagos no mês
     - `pisCofins`: dedução calculada pela regra vigente
     - `excelsiorLiquido`: total final
   - Preservar meses sem prêmio pago, ainda aplicando o carregamento fixo.

3. **Refazer o gráfico para ficar mais claro e mais dinâmico visualmente**
   - Substituir a área quase plana por um gráfico composto:
     - barras empilhadas para `Carregamento` e `Prêmio Direto`
     - barra/linha negativa ou destaque visual para `PIS/COFINS`
     - linha principal para `Total Excelsior`
   - Ajustar tooltip para mostrar a conta mês a mês: `8.333,33 + prêmio direto - PIS/COFINS = total`.
   - Atualizar título/subtítulo para deixar explícito que o gráfico mostra **somente a parte da Excelsior**.

4. **Validar visual e consistência**
   - Conferir se o gráfico aparece em `/analytics`, se os valores mensais batem com a fórmula e se a variação do prêmio direto fica perceptível mesmo com o carregamento fixo alto.