# Auditoria automática: por que ainda não dispara (e teste imediato às 11:05)

## Diagnóstico confirmado agora

- O agendamento do banco foi recriado corretamente: `ole-automation-scheduler`, a cada 5 min, já enviando o header `x-hook-secret` (job 5, execuções `succeeded`).
- Mesmo assim, as chamadas de 13:50 e 13:55 UTC voltaram **401 unauthorized**.
- O endpoint publicado responde 401 (não 500) quando chamado sem header, ou seja: ele **tem um segredo configurado, mas não o mesmo** que o cron está enviando. O `SCHEDULER_HOOK_SECRET` recém-criado ainda não chegou ao runtime publicado — o app em execução continua validando contra o segredo antigo (`POLICY_SYNC_HOOK_SECRET`).
- Configuração atual das tarefas: auditoria **ativa, 10:57, seg–sex** e sincronização **ativa, 00:00, seg–sex**, ambas com `last_triggered_at` vazio.

## O que será feito

1. Publicar o projeto para que o novo segredo do agendador passe a valer no ambiente que o cron chama.
2. Ajustar o horário da auditoria para **11:05 (Brasília)** conforme seu teste.
3. Fazer um disparo de teste imediato (uma chamada única ao endpoint, sem esperar o ciclo de 5 min) e conferir na hora: resposta `ok: true`, `results` com `fired`/motivo, e `last_triggered_at` / `last_status` da auditoria.
4. Conferir também o histórico HTTP do banco para confirmar que as chamadas do cron passaram de 401 para 200.
5. Se a sincronização às 00:00 não for desejada, desligar/ajustar na tela de Automação (sem código).

## Detalhes técnicos

- `src/routes/api/public/hooks/scheduler.ts` valida `x-hook-secret` contra `SCHEDULER_HOOK_SECRET` ou `POLICY_SYNC_HOOK_SECRET` e falha fechado — comportamento correto, sem alteração de código.
- Nenhuma mudança em `src/lib/automation/next-run.ts`: o cálculo de fuso e a trava de disparo único por dia estão corretos.
- Caso o segredo novo ainda não seja visível após a publicação, alternativa imediata: reescrever o comando do cron (`cron.unschedule` + `cron.schedule`) usando um valor de segredo já ativo no runtime, aplicado via ferramenta de insert (contém segredo/URL, portanto fora de migração).
- O teste manual usará `net.http_post` (ou chamada HTTP equivalente) uma única vez; a trava por dia impede disparo duplicado depois.
