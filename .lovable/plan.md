## Objetivo

Permitir que o operador "ignore" achados específicos da auditoria (um erro específico de uma apólice, ou uma apólice inteira), de forma persistente. Em execuções futuras, esses itens ficam ocultos do relatório. As decisões podem ser revertidas em **Configurações → Exceções de Auditoria**.

## Escopo das exceções

Três níveis, todos por usuário autenticado (`auth.uid()`):

1. **Apólice + tipo de erro** — oculta um achado específico naquela apólice (ex.: apólice `123.456` + `ENDOSSO_SEM_VIGENCIA`).
2. **Apólice inteira** — oculta todos os achados daquela apólice.
3. *(opcional, fora deste escopo)* tipo de erro global — não incluído agora para evitar mascarar problemas em massa.

Não vamos mexer no n8n: o motor continua retornando tudo. O filtro é aplicado na leitura (`getLatestAudit`) e a UI já recebe a lista filtrada — assim o histórico bruto fica preservado para auditoria.

## Mudanças

### 1. Banco (migration)

Nova tabela `public.audit_ignores`:

- `user_id uuid` → `auth.uid()`
- `scope text` → `'apolice'` ou `'apolice_tipo'`
- `apolice text` (obrigatório)
- `tipo_erro text` (null quando `scope='apolice'`)
- `motivo text` (opcional — anotação do operador)
- `created_at`
- Unique `(user_id, apolice, coalesce(tipo_erro,''))`
- RLS: usuário só lê/escreve as próprias linhas; GRANT para `authenticated` + `service_role`.

### 2. Server functions — `src/lib/audit-ignores.functions.ts` (novo)

Todas com `requireSupabaseAuth` (RLS aplica):

- `listAuditIgnores()` — lista do usuário.
- `addAuditIgnore({ apolice, tipo_erro?, motivo? })` — upsert.
- `removeAuditIgnore({ id })` — delete.

### 3. `getLatestAudit` (filtragem)

Após carregar `findings`, busca os ignores do usuário e remove achados que casem com `apolice` (scope apólice) ou `apolice + tipo_erro` (scope par). Também recalcula `aprovados`/`reprovados`/`total_processado` exibidos derivando de findings filtrados — mantemos os números do `run` originais como `raw` mas expomos os ajustados em `LatestAudit.run` (campo novo opcional `adjusted: true`).

### 4. UI — diálogo de achados (`findings-list-dialog.tsx`)

- Botão **"Ignorar"** (ícone EyeOff) em cada `FindingBullet` e em cada linha da tabela → abre confirm rápido (popover/AlertDialog) com escolha:
  - "Ignorar **este erro** nesta apólice"
  - "Ignorar **todos os erros** desta apólice"
  - Campo opcional "Motivo".
- Botão **"Ignorar apólice"** no header de cada grupo.
- Ao confirmar: chama `addAuditIgnore`, invalida `['audit']` no React Query, mostra toast com ação **"Desfazer"** (chama `removeAuditIgnore`).
- Banner sutil no topo do diálogo quando há ignores ativos: `"X exceções aplicadas — gerenciar em Configurações"`.

### 5. Configurações — nova aba **"Exceções"**

`src/routes/_authenticated/configuracoes.tsx` ganha aba `Exceções` (ícone `EyeOff`), e novo componente `src/components/settings/excecoes-tab.tsx`:

- Tabela: Apólice · Tipo de erro (ou "Todos") · Motivo · Criado em · Ação `Remover`.
- Busca por apólice/tipo.
- Botão "Remover" → confirma → `removeAuditIgnore` → invalida queries de audit.
- Estado vazio amigável.

### 6. Hook — `src/hooks/use-audit-ignores.ts`

`useAuditIgnores()` (lista), `useAddAuditIgnore()`, `useRemoveAuditIgnore()` com invalidações encadeadas (`['audit-ignores']` + `['audit']`).

## Fora de escopo

- Não muda o fluxo n8n nem o callback.
- Não muda `audit_findings` no banco (filtro é em runtime).
- Compartilhamento entre usuários (exceções são por usuário). Se preferir global por workspace, ajusto.

## Detalhes técnicos

- Filtro é feito server-side em `getLatestAudit` para que o PDF / export reflitam o mesmo conteúdo.
- A reconta de `aprovados/reprovados` considera apólices que ficaram **sem** findings após o filtro como aprovadas (incrementa aprovados, decrementa reprovados).
- `unique (user_id, apolice, coalesce(tipo_erro,''))` evita duplicatas; `addAuditIgnore` faz upsert idempotente.
- O toast "Desfazer" usa `sonner` com `action`.
