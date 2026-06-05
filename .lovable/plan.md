## Diagnóstico

Os dois fluxos disparam sem erro mas ficam para sempre em `status="running"` porque o callback do n8n nunca chega de volta nos endpoints `/api/public/audit-callback` e `/api/public/policy-sync-callback`. Causas confirmadas:

1. **Auditoria** está usando o webhook hardcoded `DEFAULT_WEBHOOK = .../webhook-test/...` (modo teste, dispara 1 vez por clique em "Listen for test event") porque o secret `N8N_AUDIT_WEBHOOK_URL` nunca foi configurado.
2. **Apólices** já tem `N8N_MOTOR_POLICIES_URL` setado, mas precisa apontar para a URL de produção que você passou.
3. Em ambos os fluxos, o nó HTTP final do n8n precisa chamar o callback do app com o header `x-callback-secret`, senão o endpoint responde 401 e o run trava em "running" para sempre.

## O que vou fazer no app

1. **Adicionar/atualizar 2 secrets** (via tool de secrets — você confirma os valores no formulário seguro):
   - `N8N_AUDIT_WEBHOOK_URL` = `https://nuvembot.app.n8n.cloud/webhook/c80c897f-9951-43c8-9976-df81c44bce16`
   - `N8N_MOTOR_POLICIES_URL` (update) = `https://nuvembot.app.n8n.cloud/webhook/d51531b9-30dc-4904-a15d-506e7dd9f271`

2. **Remover o `DEFAULT_WEBHOOK` hardcoded** em `src/lib/audit.functions.ts` e `src/lib/policies.functions.ts`. Se o secret estiver faltando, falhar com mensagem clara em vez de cair silenciosamente em `/webhook-test/`.

3. **Marcar runs travados como erro**: rodar uma migração curta que marca como `error` qualquer `audit_runs` e `policy_sync_runs` com `status='running'` mais antigo que 10 min, para destravar a UI ("Sistema Degradado" some quando o último run não está mais running).

4. **Acrescentar logs** no início de cada handler de callback (`audit-callback`, `policy-sync-callback`) com `console.log` do header `x-callback-secret` presente/ausente e do `run_id`, para você conseguir diagnosticar via `server-function-logs` na próxima execução.

## Checklist para você ajustar no n8n

Em CADA workflow (auditoria e MOTOR OLÉ):

1. **Trigger** = nó "Webhook" em modo **Production URL** (não "Test"). O workflow precisa estar **Active** (toggle no canto superior direito).
2. **Responder imediatamente**: no nó Webhook, opção "Respond" = "Immediately" com body `{"ok":true}`. Isso libera o front sem timeout.
3. **Último nó = HTTP Request** chamando o callback do app:
   - **Auditoria**: `POST https://olelifecockpit.lovable.app/api/public/audit-callback?run_id={{ $json.run_id }}`
   - **Apólices**: `POST https://olelifecockpit.lovable.app/api/public/policy-sync-callback?run_id={{ $json.run_id }}`
   - Headers:
     - `Content-Type: application/json`
     - `x-callback-secret: <valor do secret AUDIT_CALLBACK_SECRET>` (o mesmo secret serve para os 2 callbacks)
   - Body: JSON do resultado (formato que o callback já aceita — array de apólices/auditoria; o handler normaliza `payload`, `body`, `dados`, `apolices`, etc.)
4. O `run_id` chega no payload de entrada do workflow (o app envia `{ run_id, callback_url, trigger, at }`). Use `{{ $json.run_id }}` ou `{{ $json.body.run_id }}` dependendo de como o nó Webhook entrega os dados.

## Detalhes técnicos

```text
Arquivos tocados:
- src/lib/audit.functions.ts          (remover DEFAULT_WEBHOOK, exigir secret)
- src/lib/policies.functions.ts       (remover DEFAULT_WEBHOOK, exigir secret)
- src/routes/api/public/audit-callback.ts        (log de diagnóstico)
- src/routes/api/public/policy-sync-callback.ts  (log de diagnóstico)
- supabase migration: UPDATE audit_runs/policy_sync_runs SET status='error',
  error_message='timeout > 10min sem callback', finished_at=now()
  WHERE status='running' AND created_at < now() - interval '10 minutes'
Secrets:
- N8N_AUDIT_WEBHOOK_URL  (add)
- N8N_MOTOR_POLICIES_URL (update)
```

Sem mudança de UI nem de schema. Após implementar, você ajusta os 2 workflows no n8n conforme o checklist e testa um disparo de cada.