## Resumo

1. **Identificar tipo de documento** (APÓLICE / ENDOSSO A / ENDOSSO B / ENDOSSO C) a partir da chave `endosso_X` no JSON e exibir como badge.
2. **Visualização dedicada para endossos B e C** (cancelamento/alteração), mostrando os campos `motivo_endosso`, `descricao_motivo_endosso`, `numero_endosso_cancelado`, `pagamento`, no padrão da referência (PIPE).
3. **Mostrar o último número de endosso** na tabela de apólices em `/apolices`.

---

## Mudanças

### 1. `src/lib/excelsior/translate.ts`
- Estender `DocumentoInfo` com `tipoEndosso: "A" | "B" | "C" | null`.
- `unwrapProposta` passa a retornar também `tipoEndosso` (lê a letra de `endosso_A|B|C`) e um objeto `cancelamento` quando o envelope for `endosso_B` ou `endosso_C`:
  ```
  cancelamento: {
    motivo: string | null,
    descricaoMotivo: string | null,
    numeroEndossoCancelado: string | null,
    pagamento: string | null,
  }
  ```
- `parseDocumento(numero, tipoEndosso?)` recebe a letra opcional e a propaga em `DocumentoInfo`.
- `translateProposta` expõe `cancelamento` e `tipoEndosso` no retorno.

### 2. `src/components/apolice/cards.tsx`
- `DocumentoHeader`: novo badge com texto e cor por tipo:
  - APÓLICE → primary
  - ENDOSSO A → warning (alteração)
  - ENDOSSO B → indigo/violet (alteração de cancelamento)
  - ENDOSSO C → destructive (cancelamento)
- Novo card `CancelamentoCard` exibindo motivo, endosso cancelado, pagamento e descrição (full‑width), mesma estética dos demais cards.
- Pequeno helper `EndossoBadge` reutilizável.

### 3. `src/routes/apolices.$id.endossos.$num.tsx`
- Para endossos B e C: substitui o aviso `EndossoSemDadosAviso` por:
  - `DadosGeraisCard` (subset relevante: sistema, subscritor, resultado, propostas)
  - `CancelamentoCard` (motivo + descrição + endosso cancelado + pagamento)
  - `DatasCard`
  - Sem `Partes / Itens / Pagamento / Limite` (não vêm em B/C).
- Endossos A continuam com o fluxo atual (wrapper vazio + datas).
- Badge no header reflete o tipo correto.

### 4. `src/routes/apolices.$id.index.tsx`
- Tabela "Endossos no histórico": cada linha mostra o badge do tipo (APÓLICE / ENDOSSO A/B/C), derivado de `unwrapProposta(e.proposta).tipoEndosso`.

### 5. `src/routes/apolices.index.tsx` + `src/lib/policies.functions.ts`
- Corrigir a coluna "Endosso atual" — hoje sempre `0`.
- Em `getPolicies`, trocar `endorsements(id)` por `endorsements(numero_endosso, ordem)`. Calcular no servidor:
  - `endorsements_count`
  - `numero_endosso_atual` = endosso com maior `ordem` (normalizado em 6 dígitos).
- Tabela passa a exibir esse valor (`000003` por exemplo) em vez do `0` herdado do MOTOR.

### Notas técnicas
- Nenhuma migration: tudo é derivado do JSON já persistido.
- A correção do "endosso atual" é apenas presentational/serverFn; o campo do DB segue como vem do MOTOR (não vamos sobrescrever no callback).
- Sem mudanças em design tokens — usa `--primary`, `--warning`, `--destructive` e adiciona um token semântico opcional para o tipo B (ou usa `accent`).
