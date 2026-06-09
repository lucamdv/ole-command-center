## Problema

Quando a auditoria é disparada pela preview, o backend monta o `callback_url` usando o host do request (`id-preview--{id}.lovable.app`). Esse host pertence ao iframe da sandbox e responde **302** para POSTs externos no `/api/public/*` — então o n8n entrega o callback no destino errado e o resultado nunca chega ao banco.

As URLs estáveis `project--{id}-dev.lovable.app` (preview) e `project--{id}.lovable.app` (produção) respondem corretamente (401 sem secret, 200 com).

## Mudança

Em `src/lib/audit.functions.ts`, simplificar a montagem do `callbackUrl` para nunca usar `reqHost`:

1. Remover o import dinâmico de `@tanstack/react-start/server` e o uso de `getRequestHost` / `getRequestHeader` / `proto` / `isLocal`.
2. Calcular `base` em ordem de prioridade:
   - `process.env.PUBLIC_APP_URL` (override manual, ex. domínio final)
   - `PRODUCTION_PUBLIC_URL` quando `process.env.NODE_ENV === "production"`
   - senão `PREVIEW_PUBLIC_URL`
3. Manter o restante intacto: `callbackUrl = `${base}/api/public/audit-callback?run_id=${runId}`` é enviado no body para o n8n, que já reposta com `x-callback-secret`.

## Por que isso resolve

- A URL `project--{id}-dev.lovable.app` é estável, pública, acessível pelo n8n na nuvem, e serve o build de preview com as rotas `/api/public/*` reais.
- A `id-preview--…` é específica da sandbox de edição e tem auth no meio, por isso o POST do n8n cai em 302.
- Em produção, `NODE_ENV=production` faz cair em `project--{id}.lovable.app` (= `olelifecockpit.lovable.app` via alias) que também é estável.

## Fora de escopo

- Sem mudanças no fluxo n8n, no schema, no handler do callback, ou na UI.
- O secret `AUDIT_CALLBACK_SECRET` continua sendo validado no `/api/public/audit-callback`.

## Validação

Após aplicar, rodar a auditoria pela preview. Esperado:
- `audit_runs` muda de `running` → `success` (ou `error` com detalhes do n8n) em até alguns minutos.
- Logs do callback (`[audit-callback] hit run_id=…`) aparecem nos server logs.
