## Diagnóstico

Para a apólice `056902026000213910016500000000` o payload do MOTOR OLÉ traz:

```text
dados[i] = {
  numero_apolice: "0569…0000",
  numero_endosso: "0",
  data_emissao:   "2026-05-07T12:52:01.579-03:00",   ← emissão REAL da apólice
  historico_endossos: [
    { numero_endosso_seguradora: "000000", proposta: { datas, itens, partes, … } },   ← apólice
    { proposta: { endosso_A: { data_emissao: "2026-06-05T07:01:31.999-03:00", … } } } ← endosso A
  ]
}
```

Dois bugs no `src/routes/api/public/policy-sync-callback.ts`:

1. `currentEndNum = pickEnd(apolice)` devolve `"0"` (top-level), mas o item da apólice no `historico_endossos` tem `numero_endosso_seguradora = "000000"`. O `historico.find(...)` falha, cai no fallback `historico[length-1]` e **persiste o envelope do endosso A como `proposta` da apólice**. É por isso que a tela da apólice mostra a data do endosso (05/06/2026 07:01) em vez da emissão real (07/05/2026 12:52).
2. O `data_emissao` da apólice vive no objeto top-level (`dados[i].data_emissao`) e nunca é gravado — `parseDatas` só lê `env.data_emissao`, que não existe quando a "proposta" da apólice é a proposta direta.

Há também um efeito colateral: `numero_endosso_atual` da apólice é gravado como `"0"` em vez de `"000000"`.

## Mudanças

### 1. `src/routes/api/public/policy-sync-callback.ts`
- Normalizar comparações de endosso com `normalizeEndossoNum` (em `src/lib/excelsior/translate.ts`) — `"0"`, `"000000"`, `0` viram a mesma chave.
- Reescrever a seleção do `currentEndo`:
  - Se `pickEnd(apolice)` normalizado for `000000` → escolher o item de `historico_endossos` cujo `numero_endosso_seguradora` normalizado seja `000000` (a apólice em si).
  - Caso contrário → buscar pela igualdade normalizada; só cair no `length-1` se nada bater (com `console.warn`).
- Antes do `upsert` da `policies`, mesclar no `proposta` salvo o `data_emissao` top-level: `proposta = { ...currentEndo.proposta, data_emissao: apolice.data_emissao }` (só quando o `currentEndo` é a apólice base, para não sobrescrever envelope de endosso).
- Gravar `numero_endosso_atual = normalizeEndossoNum(pickEnd(apolice))` (sempre 6 dígitos).

### 2. `src/lib/excelsior/translate.ts` (`parseDatas`)
- Acrescentar fallback: `dataEmissao = asStr(env?.data_emissao) ?? asStr(p.data_emissao)`.
  Isso cobre tanto o caso "proposta da apólice com `data_emissao` mesclado" quanto futuras variações em que o n8n entregue a chave direto na proposta.

### 3. Backfill via migration
Migration única que reprocessa o último `policy_sync_runs.raw` com `status='success'` para regravar `policies.proposta` e `numero_endosso_atual` corretos (sem precisar disparar o n8n de novo). Algoritmo idêntico ao do callback corrigido, em PL/pgSQL ou via `do $$ ... $$` com `jsonb`.

Se preferir, posso pular a migration e só esperar o próximo run — me avisa no chat.

## Validação

Após aplicar:
- `select proposta->>'data_emissao', numero_endosso_atual from policies where numero_apolice='0569…0000';`
  deve retornar `2026-05-07T12:52:01…` e `000000`.
- Abrir `/apolices/0569…0000` → campo "Data de emissão" mostra **07/05/2026 12:52**.
- Abrir o endosso `0001` da mesma apólice → continua mostrando **05/06/2026 07:01** (vem do envelope, intacto).

## Fora de escopo

Não vou mexer no resto da tradução (partes, coberturas, pagamento) — esse problema específico é só o pareamento da proposta da apólice + `data_emissao`. Se você notar outro campo errado em outra apólice, me manda exemplo que eu trato em separado.
