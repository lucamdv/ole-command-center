## Plano

1. **Corrigir a origem do valor exibido**
   - Ajustar o cálculo usado pela lista de apólices e pelo cabeçalho da apólice para usar o mesmo total que aparece corretamente em **Pagamento / Parcelas**.
   - Em vez de somar apenas linhas filtradas como `DIRETO`, o prêmio total será a soma de todas as linhas de `composicao_premio_parcela` via `valor_premio`, igual ao total de cada parcela.

2. **Manter moeda e precisão atuais**
   - Continuar exibindo na moeda original do JSON, sem conversão para Real.
   - Manter 4 casas decimais na formatação.

3. **Aplicar nos pontos afetados**
   - Tela principal de apólices: coluna **Prêmio total**.
   - Topo da apólice individual: bloco **Prêmio total**.
   - Os endossos continuarão usando o mesmo cálculo consistente.

## Detalhe técnico

O ajuste principal será em `src/lib/excelsior/translate.ts`, na função `computePremioTotal`, removendo o filtro `tipo_premio === "DIRETO"` para somar o mesmo conjunto que `parsePagamento` já usa nas parcelas.