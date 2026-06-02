## Problema

A partir da 2ª auditoria, o callback do n8n chega com `{ status: "error" }` sem `error_message`. O frontend só vê "Erro desconhecido no motor n8n." e não temos pistas. A causa raiz mais provável é o uso do **webhook de teste** do n8n, que só aceita 1 execução por clique em *Listen for test event*.

## Mudanças

### 1. `src/routes/api/public/audit-callback.ts`
- Quando `status === "error"` e não houver `error_message`/`error`, montar uma mensagem mais útil: incluir um resumo curto do payload bruto recebido (chaves presentes, primeiros 300 chars), para sempre termos pista do que o n8n mandou.
- Logar `console.error("[audit-callback] n8n returned error", { runId, raw })` para aparecer nos server logs.

### 2. `src/lib/audit.functions.ts` (`runAudit`)
- Se a URL configurada contiver `/webhook-test/`, anexar um aviso no `error_message` quando o callback vier com erro: "Você está usando o webhook de TESTE do n8n — ele só processa 1 execução por clique em *Listen for test event*. Para uso contínuo, troque pelo webhook de produção."
- Implementação: em `runAudit` não dá pra interceptar o callback. Em vez disso, adicionar essa dica diretamente no handler do callback quando detectarmos o padrão (request veio para um run cujo `raw.trigger` foi disparado pelo modo teste). Mais simples: ler `process.env.N8N_AUDIT_WEBHOOK_URL || DEFAULT_WEBHOOK` no próprio callback e detectar `/webhook-test/`.

### 3. UI (`src/routes/index.tsx`)
- No toast/banner de erro da auditoria, exibir `error_message` em monoespaçado e quebrar linhas, para o usuário ver a dica completa em vez de cortar.

## Não vou mexer

- Lógica de polling, estrutura de tabelas, RLS, ou o webhook URL em si (continua o de teste — o usuário pediu explicitamente para manter).

## Como validar

1. Rodar 2 auditorias seguidas no modo teste.
2. Confirmar que a 2ª mostra mensagem explícita sobre o modo teste do n8n + resumo do payload bruto.
3. Verificar logs do servidor (`stack_modern--server-function-logs` filtrando por `audit-callback`).
