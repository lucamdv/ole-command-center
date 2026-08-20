# Corrigir a auditoria automática (não dispara no horário)

## Diagnóstico confirmado

A configuração está correta no banco: auditoria **ativa, 09:00, seg–sex** e sincronização **ativa, 00:00, seg–sex** (ambas com `last_triggered_at` vazio — nunca dispararam).

O problema está no agendador do banco: ele chama o endpoint a cada 5 minutos, mas **sem o header secreto**. Todas as chamadas das últimas horas retornaram **401 `unauthorized`** (verificado no histórico de respostas HTTP), então nenhum job chegou a ser avaliado.

Também existe um agendamento antigo e redundante que dispara a sincronização da carteira todo dia às 23h (horário de Brasília), independente da tela de Automação.

## O que será feito

1. Recriar o agendamento `ole-automation-scheduler` (a cada 5 min) enviando o header secreto exigido pelo endpoint, para que as chamadas passem a ser autorizadas.
2. Remover o agendamento antigo `policy-sync-daily-23brt`, que duplica a sincronização fora da configuração da tela de Automação.
3. Validar de ponta a ponta: acompanhar as próximas execuções, confirmar retorno `ok: true` e conferir se a auditoria de 09:00 registra `last_triggered_at` / `last_status`.
4. Se a sincronização às 00:00 for indesejada (é o valor padrão salvo), ajustar na tela de Automação — não requer código.

## Detalhes técnicos

- Endpoint `src/routes/api/public/hooks/scheduler.ts` exige `x-hook-secret` igual a `SCHEDULER_HOOK_SECRET` ou `POLICY_SYNC_HOOK_SECRET` e falha fechado (comportamento correto, mantido).
- O comando do cron job 4 monta os headers com `jsonb_build_object('Content-Type','application/json')`, sem o segredo. Será reescrito via `cron.unschedule` + `cron.schedule` incluindo `'x-hook-secret'` com o valor de `POLICY_SYNC_HOOK_SECRET`, aplicado por `supabase--insert` (contém segredo/URL, portanto fora de migração).
- Como o segredo fica no comando do cron, também será avaliado usar `SCHEDULER_HOOK_SECRET` dedicado, criado se ainda não existir.
- Nenhuma mudança na lógica de horário (`src/lib/automation/next-run.ts`) — o cálculo de fuso e a trava de disparo único por dia estão corretos.
