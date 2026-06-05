## Objetivo
1. Substituir notificações simuladas por **notificações reais** derivadas dos dados de operação (auditoria, sincronização, achados críticos, apólices novas/atualizadas).
2. Tornar `Configurações` **100% funcional** em 4 áreas: Perfil & Preferências (local), Notificações (toggles), Integrações (status real dos webhooks), Dados & Retenção (purgar/exportar).

---

## 1) Notificações reais

### Fonte (sem nova tabela)
Derivar notificações sob demanda das tabelas existentes via um único server fn `getNotifications` (limite 50, últimas 7 dias):

- **`audit_runs`** (status ∈ success/error) → 1 notificação por run
  - `success` + reprovados=0 → severidade `low`
  - `success` + reprovados>0 → `high` (texto: "X de Y apólices com inconsistências")
  - `error` → `critical` (texto: error_message)
- **`policy_sync_runs`** (status ∈ success/error) → 1 notificação por run
  - sucesso → `info` ("Carteira sincronizada — N apólices")
  - erro → `critical`
- **`audit_findings`** filtrando `tipo_erro` em lista crítica (gap_vigencia, duplicidade, sobreposicao) das **últimas 3 runs** → 1 notificação por finding crítico (`high`)
- **`policies`** com `updated_at` > `lastSeenAt` (vindo do cliente via param) → 1 notificação agregada ("N apólices atualizadas desde sua última visita")

Cada item tem `id` estável (ex.: `audit:{run_id}`, `sync:{run_id}`, `finding:{finding_id}`, `policies_updated:{lastSeenAt}`) → usado para o estado read/unread.

### Estado read/dismissed (cliente)
- `localStorage`: `ole.notif.read` = `string[]` de ids lidos, `ole.notif.dismissed` = ids dispensados, `ole.notif.lastSeenAt` = ISO timestamp.
- "Marcar todas como lidas" / "Limpar" continuam funcionais; "Limpar" só esconde (adiciona em `dismissed`), nunca apaga banco.
- Toggles por tipo (de `Configurações > Notificações`) filtram o que aparece.

### Frontend
- Trocar `useNotifications` para usar TanStack Query (`queryKey: ["notifications", lastSeenAt]`) + `refetchInterval: 30s`.
- Remover totalmente o seed/SAMPLE_EVENTS/setInterval de simulação.
- Manter UI atual do header (badge unread, marcar lidas, dispensar, limpar).

### Arquivos
- **Novo** `src/lib/notifications.functions.ts` — `getNotifications` server fn.
- **Edit** `src/hooks/use-notifications.ts` — passa a consumir o server fn + localStorage só para read/dismissed/toggles.

---

## 2) Configurações 100% funcional

Rota `/configuracoes` vira layout com **abas** (Perfil · Notificações · Integrações · Dados). Cada aba é um componente.

### 2a. Perfil & Preferências (local)
Persistido em `localStorage` via `useSettings` hook, contexto disponibilizado no `AppShell`:
- Nome do operador (default "Luca Monteiro") → reflete no Header (chip avatar + saudação).
- E-mail (rótulo informativo).
- Fuso horário (select com fusos BR + UTC) → usado em `formatDateTime`/`relativeTime` futuras chamadas (passamos via param onde já é usado).
- Idioma (pt-BR / en-US) — por ora apenas armazena; UI permanece pt-BR (label "em breve" se en-US).
- Tema (light/dark/system) — integra ao `ThemeProvider` existente.

### 2b. Notificações
Toggles persistidos em localStorage (`ole.notif.prefs`):
- `auditoria_concluida` (default on)
- `auditoria_erro` (default on)
- `sync_carteira` (default on)
- `achados_criticos` (default on)
- `apolices_atualizadas` (default on)
- `som` (default off) — toca um beep curto WebAudio em notificações `critical`/`high` novas.
- Botão "Resetar histórico de leitura" limpa `read`/`dismissed`.

### 2c. Integrações
Cards reais para cada webhook + status de execução, consumindo um novo server fn `getIntegrationsStatus`:
- **MOTOR OLÉ (sincronização)**: ✅/⚠️/❌ se `N8N_MOTOR_POLICIES_URL` está set, último `policy_sync_runs` (status, finished_at, total_apolices, error_message), botão **"Testar conexão"** → server fn `pingMotorPolicies` (faz `HEAD`/`POST` leve só para checar HTTP 2xx, sem disparar workflow real — envia body `{ ping: true }`).
- **N8N Auditoria**: idem, com `N8N_AUDIT_WEBHOOK_URL` e último `audit_runs` + `pingAuditWebhook`.
- **Callback de auditoria**: mostra `AUDIT_CALLBACK_SECRET` configurado (sim/não), e exibe a URL pública de callback para copiar.
- Link "Gerenciar secrets" abre painel de backend (presentation tag).

### 2d. Dados & Retenção
Ações reais via server fns admin (`supabaseAdmin`):
- **Contadores ao vivo**: nº de threads do Olíver, mensagens, audit_runs, audit_findings, policies, endorsements.
- **Limpar histórico do Olíver** (apaga `oliver_threads` + `oliver_messages`) com diálogo de confirmação.
- **Limpar histórico de auditoria > 90 dias** (apaga `audit_runs` com `created_at < now() - interval '90 days'` e cascateia findings via FK — verificar; se não houver FK on delete, apagar findings primeiro).
- **Exportar carteira (CSV)** — server fn que retorna CSV das `policies` (numero_apolice, premio_liquido, segurado, updated_at), download via `URL.createObjectURL`.
- **Exportar auditoria (JSON)** — última run completa.

### Arquivos
- **Edit** `src/routes/configuracoes.tsx` — vira layout com Tabs (shadcn).
- **Novos**
  - `src/components/settings/perfil-tab.tsx`
  - `src/components/settings/notificacoes-tab.tsx`
  - `src/components/settings/integracoes-tab.tsx`
  - `src/components/settings/dados-tab.tsx`
  - `src/hooks/use-settings.ts` (perfil + prefs notif + som)
  - `src/lib/settings.functions.ts` — `getIntegrationsStatus`, `pingAuditWebhook`, `pingMotorPolicies`, `getDataCounters`, `purgeOliver`, `purgeOldAudits`, `exportPoliciesCSV`, `exportLatestAuditJSON`.
- **Edit** `src/components/layout/header.tsx` — usa nome do operador de `useSettings`.

---

## Detalhes técnicos relevantes

- Server fns admin: `supabaseAdmin` importado dentro do handler (regra do template).
- Sem novas tabelas, sem migrations.
- `getNotifications` calcula `time` no servidor com base em `created_at`; cliente só formata como "há X min".
- "Apólices atualizadas" usa `lastSeenAt` enviado pelo cliente; o badge fica zero após abrir o painel (mark all read também atualiza `lastSeenAt = now`).
- `pingAuditWebhook` / `pingMotorPolicies` enviam body `{ ping: true, source: "ole-config-test" }` com timeout 8s — o usuário deve garantir que o workflow n8n trate `ping=true` como no-op; documentamos isso no card. Alternativa: apenas verificar HTTP 200/204; se 4xx/5xx, mostrar status.
- Toggles de notificação aplicam filtro no cliente (não no server fn) para evitar acoplar prefs a sessão.
- Tema: já existe `ThemeProvider`; aba Perfil só consome `useTheme`.

## Fora de escopo
- Auth/multi-usuário, Equipe, Segurança/MFA, sessões.
- Edição de webhooks pelo usuário (continuam em secrets).
- Persistência server-side de prefs (sem auth, fica em localStorage).

## Verificação
- Header: badge reflete eventos reais; ao rodar uma auditoria (ou simular um insert em `audit_runs`), a notificação aparece em ≤30s.
- Configurações: cada aba funciona end-to-end — alterar nome reflete no header; toggle de notificação filtra o painel; "Testar conexão" mostra resultado real; "Limpar Olíver" zera contagem.
