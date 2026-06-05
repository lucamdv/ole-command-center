## Plano

1. **Centralizar os dados do gráfico no cálculo oficial**
   - Garantir que a série mensal usada pelo gráfico venha de `computeRepasse`, onde PIS/COFINS = 4,65% sobre as comissões Olé + Nomad.
   - Evitar qualquer cálculo visual separado que trate PIS/COFINS como percentual do carregamento ou do prêmio bruto total.

2. **Corrigir a representação do gráfico**
   - Ajustar o gráfico de Receita Excelsior para deixar claro que:
     - `Carregamento` é sempre US$ 8.333,33.
     - `Prêmio Direto` é entrada positiva.
     - `PIS/COFINS` é dedução calculada sobre `(Prêmio Direto − IOF) × 55%`.
     - `Total Excelsior` é `Carregamento + Prêmio Direto − PIS/COFINS`.
   - Se necessário, transformar a barra de PIS/COFINS em valor negativo/visual de abatimento para não parecer receita adicional.

3. **Atualizar textos e tooltip**
   - Atualizar subtítulo/legenda/tooltip para mencionar explicitamente: `PIS/COFINS = 4,65% sobre comissões Olé + Nomad`.
   - Exibir no tooltip os componentes úteis para validação: prêmio direto, IOF, base de comissão Olé+Nomad e PIS/COFINS.

4. **Validar a coerência dos totais**
   - Conferir que totais e média do card usam o mesmo `excelsiorLiquido` calculado pela regra oficial.
   - Verificar visualmente que o gráfico fica dinâmico e que a dedução de PIS/COFINS acompanha os meses com prêmio direto.