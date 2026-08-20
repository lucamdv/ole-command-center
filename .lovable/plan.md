# Corrigir a exportação da carteira (CSV)

## O que está errado hoje

A exportação existe e traz as 49 apólices do banco, mas o arquivo gerado sai fora do padrão que o Excel em português entende, e com muito pouca informação:

- Separador `,` e **sem BOM UTF-8** — no Excel pt-BR tudo cai numa única coluna e os acentos aparecem quebrados (`ApÃ³lice`). Os outros exports da plataforma (alertas, extrator) já usam `;` + BOM; este ficou fora do padrão.
- Números em formato americano (`1234.5`), então o Excel trata prêmio como texto e não soma.
- Datas em formato ISO cru (`2026-08-20T14:03:11.123Z`) em vez de data legível.
- Só 6 colunas — não é de fato "todos os dados da carteira": faltam segurado/CNPJ, vigência, ramo/produto, corretor, moeda do limite, quantidade de endossos.

## O que será feito

1. **Formato do arquivo**: separador `;`, BOM UTF-8, quebra de linha CRLF, prêmios com vírgula decimal e datas em `dd/mm/aaaa` — abre limpo no Excel pt-BR.
2. **Colunas ampliadas** (uma linha por apólice):
   número da apólice, endosso atual, qtd. de endossos, segurado, documento do segurado, corretor, ramo/produto, início e fim de vigência, data de assinatura, prêmio total, moeda, limite máximo da apólice, última atualização.
3. **Sem limite de linhas**: a leitura passa a ser paginada em blocos de 1000, para a exportação continuar completa quando a carteira crescer além do limite padrão da API.
4. **Feedback na tela**: o botão informa o total exportado e avisa claramente quando não há dados, em vez de baixar um arquivo vazio silenciosamente.

## Detalhes técnicos

- `src/lib/settings.functions.ts` → `exportPoliciesCSV`: paginação com `.range()`, montagem das colunas via `translateProposta` (datas, partes, itens, limite) e `computePremioTotal`, formatação pt-BR e `\uFEFF` + `;` + `\r\n`. Contagem de endossos por apólice via agregação em `endorsements`.
- Um helper de CSV (`src/lib/csv.ts`) com escape/formatação numérica e de data, reutilizável pelos outros exports.
- `src/components/settings/dados-tab.tsx`: nome do arquivo mantido (`carteira-AAAA-MM-DD.csv`), toast com contagem e caso vazio tratado.
- Nenhuma mudança de banco de dados; a função continua restrita a administradores.
