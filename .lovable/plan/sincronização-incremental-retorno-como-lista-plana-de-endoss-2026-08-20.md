# Sincronização incremental: retorno como lista plana de endossos

## Situação atual verificada

- **Envio (Lovable ➔ n8n): já está no formato pedido.** `runPolicySyncImpl` já consulta o banco e injeta `ultimos_endossos_plataforma` como dicionário `{ numero_apolice: inteiro }`, usando o número completo da apólice como está no banco (ex.: `056902026000213910031585000000`) e o maior sequencial de endosso já salvo (0 quando só existe a apólice base). Nenhuma mudança necessária aqui.
- **Retorno (n8n ➔ Lovable): precisa mudar.** O callback ainda espera um array de apólices com `historico_endossos` aninhado, calcula "endosso atual" a partir desse histórico e faz upsert da apólice antes dos endossos. Com a lista plana de endossos, essa lógica não se aplica.

## O que será feito no callback

Reescrever a ingestão em `/api/public/policy-sync-callback` para tratar `dados` como uma lista plana de endossos:

1. Para cada item de `dados`, ler `numero_apolice_seguradora` e `numero_endosso_seguradora`.
2. Normalizar o endosso: agora chega como inteiro (`22`) e será convertido para o formato de 6 dígitos usado no banco (`000022`), mantendo compatibilidade com strings zero-padded.
3. Localizar a apólice pelo `numero_apolice` (a chave relacional). Se ela não existir ainda, criar o registro mínimo para não descartar o endosso.
4. Gravar cada endosso por upsert em (apólice + número de endosso), com `ordem` derivada do próprio sequencial, `premio_liquido` e `proposta` do item.
5. Atualizar a apólice afetada: `numero_endosso_atual` passa a ser o maior entre o valor já salvo e os endossos recebidos (nunca rebaixa), além de `premio_liquido`/`proposta` do maior endosso novo e `last_sync_run_id`.
6. Registrar no run: `total_apolices` = número de apólices distintas efetivamente atualizadas. Payload vazio (nenhuma novidade) termina o run com sucesso e zero atualizações.

## Compatibilidade

O callback continuará aceitando o formato antigo (array de apólices com `historico_endossos`) — se um item trouxer `historico_endossos`, ele é expandido para a mesma lista plana antes da gravação. Assim, um n8n ainda não atualizado não quebra a sincronização.

## Detalhes técnicos

- `src/lib/policies.functions.ts`: `PolicySyncCallbackSchema` aceita `total_endossos_novos` (além do `total_apolices` atual) e `numero_endosso_seguradora` como número ou string.
- `src/routes/api/public/policy-sync-callback.ts`: substitui o laço por apólice por um laço de endossos agrupados por `numero_apolice_seguradora`; mantém o desembrulho tolerante do payload (`payload`/`body`/`json`, array cru, chaves alternativas) e a verificação do segredo `x-callback-secret`.
- Sem migração de banco: a restrição única `policy_id, numero_endosso` já existe.
- Nenhuma mudança de UI.
