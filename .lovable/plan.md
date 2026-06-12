
# Calendário Inteligente de Atividades

Ferramenta nova em `/ferramentas/calendario`, acessada como card dentro da página Ferramentas. Uso individual (escopo por `user_id` via RLS), entregue completo: visualizações, recorrência, anexos, notificações in-app + e-mail, filtros salvos, dashboard de indicadores.

## 1. Banco de dados (uma migration)

Tabelas em `public`, todas com `user_id uuid` + RLS scoped a `auth.uid()` + GRANTs para `authenticated` e `service_role`.

- **calendar_activities** — `title`, `description` (rich text JSON), `start_at`, `end_at`, `all_day`, `status` (enum `not_started|in_progress|waiting_approval|done|cancelled`), `priority` (enum `low|medium|high|critical`), `category`, `project`, `client`, `tags text[]`, `color`, `recurrence_rule text` (RFC 5545 RRULE), `recurrence_until`, `recurrence_count`, `parent_activity_id uuid` (instância gerada de uma série), `series_exception jsonb` (overrides), `completed_at`.
- **calendar_attachments** — `activity_id`, `file_path` (storage), `file_name`, `mime_type`, `size_bytes`, `is_link bool`, `external_url`.
- **calendar_reminders** — `activity_id`, `offset_minutes int` (15, 60, 1440, 0 = na hora, custom), `channels text[]` (`in_app`, `email`), `sent_at`, `next_trigger_at` (indexado, usado pelo cron).
- **calendar_saved_views** — `name`, `filters jsonb` (responsáveis, status, prioridade, tags, período, etc.), `view_mode` (month/week/day/list), `is_favorite`.
- **calendar_notifications** — `activity_id`, `title`, `body`, `read_at`, `kind` (`reminder|due_soon|overdue`).
- Storage bucket privado `calendar-attachments` com policy "owner can read/write own folder" (`user_id/...`).
- pg_cron a cada 1 min chamando `/api/public/calendar-reminders-tick` (apikey = anon) que busca `calendar_reminders` com `next_trigger_at <= now()`, cria `calendar_notifications` e dispara e-mail via Lovable Emails.

## 2. Server functions (`src/lib/calendar.functions.ts`)

Todas com `requireSupabaseAuth`, escopadas ao `userId`:
- `listActivities({from, to, filters})` — expande recorrência no range usando `rrule` (lib npm) e mescla overrides.
- `getActivity(id)`, `createActivity`, `updateActivity` (com modo `this | this_and_future | all` para séries), `deleteActivity` (mesmos modos), `moveActivity(id, newStart, newEnd)` (drag-and-drop).
- `listAttachments`, `addAttachment` (upload assinado), `addLink`, `removeAttachment`.
- `listSavedViews`, `saveView`, `deleteView`, `setFavoriteView`.
- `listNotifications`, `markNotificationRead`, `markAllRead`.
- `getDashboardMetrics({from, to})` — total/pendentes/em andamento/concluídas/atrasadas/taxa de conclusão/próximos vencimentos.

## 3. Rota pública (cron)

`src/routes/api/public/calendar-reminders-tick.ts` — POST, valida `apikey` header = `SUPABASE_PUBLISHABLE_KEY`, processa lembretes vencidos, recalcula `next_trigger_at` para séries recorrentes, dispara e-mail via Lovable Emails (template "Lembrete: {título}").

## 4. UI (`src/routes/_authenticated/ferramentas.calendario.tsx`)

Estrutura em árvore de componentes em `src/components/calendar/`:

```text
calendar/
  CalendarShell.tsx           ← layout: header (KPIs + filtros + view-switcher) | sidebar mini-cal + saved views | main
  KpiStrip.tsx                ← 7 cards de métricas (animados, design tokens)
  ViewSwitcher.tsx            ← Mês / Semana / Dia / Lista + setas + "Hoje"
  FilterBar.tsx               ← chips combináveis + "Salvar visão"
  MonthView.tsx               ← grid 7x6, indicadores de tarefas, +N more, click→Quick Create, drop target
  WeekView.tsx                ← timeline horizontal, slots de 30min, drag-resize
  DayView.tsx                 ← timeline vertical detalhada, "now line"
  ListView.tsx                ← tabela ordenável/agrupável (status, prioridade, data)
  ActivityCard.tsx            ← bloco visual draggable c/ cor por prioridade
  ActivityTooltip.tsx         ← hover preview (status/prioridade/horário)
  QuickCreatePopover.tsx      ← duplo-click ou tecla N
  ActivityDialog.tsx          ← modal completo (tabs: Detalhes / Recorrência / Anexos / Lembretes)
  RichTextEditor.tsx          ← Tiptap (já compatível com a stack)
  RecurrenceEditor.tsx        ← UI para RRULE (diária/semanal/mensal/anual + custom: dia da semana, dia do mês, intervalo, até X, N ocorrências)
  AttachmentsPanel.tsx        ← upload (botão + drag-drop), preview, download, link externo
  RemindersPanel.tsx          ← presets (na hora/15min/1h/24h) + custom + canais (in-app/e-mail)
  SavedViewsList.tsx          ← favoritas + ações
  NotificationsBell.tsx       ← no header, com badge não lidas (já existente, integrado)
  KeyboardShortcuts.tsx       ← N / F / Esc / setas
```

Bibliotecas: `rrule` (recorrência), `@dnd-kit/core` (drag-drop), `@tiptap/react` + `@tiptap/starter-kit` (rich text), `date-fns` (já presente).

Estilo: 100% via design tokens (`bg-surface`, `border-border`, `text-primary` etc.). Microanimações sutis (transitions Tailwind). Dark mode automático (já configurado).

## 5. Notificações por e-mail (Lovable Emails)

- Verifico status do domínio antes de implementar; se não houver, mostro o setup dialog primeiro.
- `scaffold_transactional_email` para gerar a rota de envio.
- Template React Email "ReminderEmail" com título, horário, descrição (texto), link para `/ferramentas/calendario?activity=<id>`.

## 6. Integração na navegação

- `src/routes/_authenticated/ferramentas.tsx` vira hub: lista cards de ferramentas, com "Calendário Inteligente" ativo apontando para `/ferramentas/calendario`. Cards "em construção" continuam como placeholders.
- Nenhuma mudança no sidebar global.

## 7. Detalhes técnicos importantes

- **Recorrência**: `recurrence_rule` armazena RRULE; `listActivities` expande no servidor para o range pedido. Overrides (instância movida/editada) ficam em linhas filhas com `parent_activity_id` + `series_exception.original_start`.
- **Performance**: índices em `(user_id, start_at)`, `(user_id, end_at)`, `(user_id, status)`. Paginação na ListView. Query keys do TanStack Query incluem range visível.
- **Atalhos**: hook global `useKeyboardShortcuts` ativo só dentro da rota do calendário.
- **Permissões**: tudo `auth.uid() = user_id`. Bucket de anexos com folder prefix do user id.

## Arquivos afetados

- **create** migration `*_calendar_module.sql` (tabelas + RLS + GRANTs + bucket + cron)
- **create** `src/lib/calendar.functions.ts`
- **create** `src/routes/api/public/calendar-reminders-tick.ts`
- **create** `src/routes/_authenticated/ferramentas.calendario.tsx`
- **create** `src/components/calendar/*` (≈15 componentes acima)
- **create** `src/lib/calendar/rrule-utils.ts`, `src/lib/calendar/filters.ts`
- **create** template React Email para lembrete (via scaffold)
- **modify** `src/routes/_authenticated/ferramentas.tsx` (hub com card clicável)
- **deps** `bun add rrule @dnd-kit/core @dnd-kit/sortable @tiptap/react @tiptap/starter-kit @tiptap/pm`

## Fora do escopo desta entrega

- Equipes/clientes/projetos modelados (campos livres por enquanto, como combinado).
- Push notifications web (só in-app + e-mail).
- Compartilhamento de visões salvas com outros usuários (uso individual).
