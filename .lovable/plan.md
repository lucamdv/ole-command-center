## Problema

O n8n está enviando o callback com o formato:

```json
{
  "run_id": "...",
  "status": "error",
  "payload": {
    "data_auditoria": "...",
    "resumo": { "aprovados": 25, "reprovados": 4, "total_processado": 29 },
    "status_geral": "ALERTA",
    "mensagem_geral": "...",
    "apolices_com_erro": [...]
  }
}
```

Os dados de auditoria estão completos, só que **aninhados em `payload`**. Nosso handler valida no nível raiz, não encontra `resumo`/`apolices_com_erro`, e cai no branch de erro por causa do `status: "error"` da raiz (que parece ser um artefato do nó "Respond" do n8n, não um erro real).

## Mudança

### `src/routes/api/public/audit-callback.ts`
Depois do `const candidate = Array.isArray(raw) ? raw[0] : raw;`, fazer **unwrap**:

```ts
// n8n às vezes envelopa o resultado em { run_id, status, payload: {...} }
const unwrapped =
  candidate && typeof candidate === "object" && "payload" in candidate && candidate.payload && typeof candidate.payload === "object"
    ? { run_id: candidate.run_id, ...candidate.payload }
    : candidate;
```

Validar `unwrapped` em vez de `candidate`. Isso resolve o caso atual e também continua funcionando quando o n8n manda no formato plano.

Também: só tratar como erro quando o **payload já desembrulhado** tiver `status === "error"` (ou `error`/`error_message`). O `status: "error"` da raiz original do envelope não conta.

## Não vou mexer

- Schema, polling, UI, ou qualquer outra lógica.

## Validação

1. Rodar uma auditoria.
2. Confirmar no banco que `audit_runs` recebeu `status='success'`, `status_geral='ALERTA'`, e que `audit_findings` ganhou as linhas das apólices reprovadas.
3. UI deve mostrar o resultado normalmente.
