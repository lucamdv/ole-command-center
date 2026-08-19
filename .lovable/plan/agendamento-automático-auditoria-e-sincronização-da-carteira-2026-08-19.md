# Agendamento automático: Auditoria e Sincronização da Carteira

Configurar horários diários (independentes) para disparar automaticamente a auditoria e a sincronização da carteira, com countdown acima de cada botão. O disparo manual continua funcionando.

## O que será entregue

### 1. Nova aba "Automação" em Configurações (admin)
Dois blocos independentes — **Auditoria** e **Sincronização da Carteira** — cada um com:
- Liga/desliga o agendamento
- Horário do disparo (HH:MM)
- Dias da semana (padrão: todos)
- Fuso horário fixo America/Sao_Paulo (exibido)
- Informação do último disparo automático e do próximo horário previsto

### 2. Countdown acima dos botões
- Acima do botão "Rodar Auditoria" (tela da auditoria) e do botão "Sincronizar carteira" (tela de apólices): "Próxima auditoria automática em 03:41:12" com o horário-alvo.
- Quando o agendamento estiver desligado: "Agendamento automático desativado" com link para Configurações.
- O countdown é apenas informativo; o disparo real acontece no servidor, mesmo com o navegador fechado.

### 3. Disparo automático no servidor
Um agendador do banco chama, a cada 5 minutos, um endpoint interno que:
- lê a configuração de cada job;
- verifica se o horário do dia já passou e se ainda não houve disparo automático hoje;
- dispara o webhook correspondente (mesma lógica dos botões) e registra o disparo.

Isso garante: no máximo um disparo automático por dia por job, sem duplicidade mesmo com execuções sobrepostas.

## Detalhes técnicos

**Banco (migração)**
- Tabela `public.automation_schedules`: `job` (chave: `audit` | `policy_sync`), `enabled`, `run_at_time` (time), `weekdays` (int[] 0-6), `timezone` (default `America/Sao_Paulo`), `last_triggered_at`, `last_status`, `last_error`, `updated_at` (trigger `touch_updated_at`).
- Duas linhas iniciais (`audit`, `policy_sync`) desativadas com horário padrão 08:00.
- GRANT: `SELECT` para `authenticated` (para o countdown), escrita apenas via `service_role`; RLS habilitada, política de leitura para autenticados, escrita bloqueada no cliente (as gravações passam por server function admin).
- Job pg_cron a cada 5 min chamando `POST /api/public/hooks/scheduler` com header `x-hook-secret` (reusa `POLICY_SYNC_HOOK_SECRET`), via `supabase--insert` (não migração, pois contém URL/segredo).

**Rota pública**
- `src/routes/api/public/hooks/scheduler.ts`: valida `x-hook-secret`, calcula o "dia local" em `America/Sao_Paulo`, e para cada job habilitado e vencido (e cujo `last_triggered_at` não é do dia local corrente) faz o disparo. Update condicional de `last_triggered_at` funciona como trava (single-flight). Chama `runPolicySyncImpl()` e uma nova `runAuditImpl()` extraída de `runAudit` em `src/lib/audit.functions.ts` (sem alterar o comportamento do disparo manual).

**Server functions** (`src/lib/automation.functions.ts`)
- `getAutomationSchedules` (autenticado) — usado pelo countdown.
- `updateAutomationSchedule` (admin, via `assertAdmin`) — salva horário/dias/enabled.

**Frontend**
- `src/hooks/use-automation.ts`: query dos agendamentos (staleTime 60s) + cálculo do próximo horário no fuso configurado.
- `src/components/automation/next-run-countdown.tsx`: countdown por segundo (tick único com `setInterval`, respeitando `prefers-reduced-motion` para atualizar por minuto em telas pequenas).
- Inserido acima de `RunAuditButton` e do botão de sincronizar em `src/routes/_authenticated/apolices.index.tsx`.
- `src/components/settings/automacao-tab.tsx` + nova entrada em `src/routes/_authenticated/configuracoes.tsx` (adminOnly).
