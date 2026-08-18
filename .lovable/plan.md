# Marcar inconsistência como resolvida + KPI de tempo de resolução

## O que muda para você

Na lista de achados da auditoria, ao lado do botão de ignorar, cada problema passa a ter um botão **"Resolvido"**. Ao clicar:

- O problema é registrado como resolvido, com data/hora e quem resolveu.
- Ele sai da lista de achados abertos (com opção "Desfazer" no toast).
- Alimenta o KPI **Inconsistências resolvidas** e o novo KPI **Tempo médio de resolução**.

Se o mesmo problema (apólice + tipo de erro) voltar a aparecer numa auditoria futura, ele **reabre automaticamente** e volta a contar como aberto — o tempo da resolução anterior fica no histórico.

O tempo de resolução é contado da **primeira detecção** daquele problema em qualquer auditoria até o momento em que foi marcado como resolvido.

## Onde os KPIs aparecem

- **Tela da auditoria:** o card "Inconsistências resolvidas" passa a somar as resoluções manuais; novo card **"Tempo médio de resolução"** (em horas/dias) com o resumo geral.
- **Tela de Analytics:** nova seção **"Tempo de resolução por tipo de problema"** — tabela com tipo de erro, quantidade resolvida, tempo médio e tempo mediano (ex.: "Divergência de vigência — média 2d 4h").

## Detalhes técnicos

**Banco (nova tabela `audit_resolutions`)**
- Campos: `apolice`, `tipo_erro`, `endosso`, `run_id` (run em que foi resolvido), `first_seen_at` (primeira detecção), `resolved_at`, `resolved_by`, `motivo`, `reopened_at`.
- Índice único parcial em (`apolice`, `tipo_erro`) para resoluções ativas (`reopened_at IS NULL`), garantindo idempotência.
- GRANTs para `authenticated` e `service_role`; RLS ativa: leitura para autenticados, criação pelo próprio usuário, remoção/edição pelo criador ou admin (mesmo padrão de `audit_ignores`).

**Server functions (`src/lib/audit-resolutions.functions.ts`)**
- `listAuditResolutions` — resoluções ativas + histórico.
- `resolveFinding` — calcula `first_seen_at` como o menor `created_at` em `audit_findings` para a chave apólice+tipo (via cliente admin), insere a resolução.
- `unresolveFinding` — desfaz (delete) a resolução ativa.
- `getResolutionTimeStats` — agrega tempo de resolução por `tipo_erro` (contagem, média, mediana) e total geral.

**Reabertura automática**
- No callback da auditoria (`src/routes/api/public/audit-callback.ts`), após gravar os achados da nova run: toda resolução ativa cuja chave apólice+tipo reaparecer recebe `reopened_at = now()`, deixando de filtrar o achado e de contar como resolvida em aberto.

**Filtragem de achados**
- Novo helper em `src/lib/audit/resolution-filter.ts` (análogo a `ignore-filter.ts`) que remove achados com resolução ativa. Aplicado nas mesmas trilhas do filtro de exceções: `audit.functions.ts` (últimos achados/gráficos), `kpis.functions.ts` e o indicador de saúde do sistema — para que resolvidos não contem como abertos.

**KPIs**
- `src/lib/kpis/derive.ts`: novo tipo `ResolutionTimeStat` e helpers puros de média/mediana em horas.
- `src/lib/kpis.functions.ts`: `daily.resolvidas` passa a somar as resoluções manuais do dia; adiciona `resolutionTime` (geral + por tipo) ao retorno de `getOperationKpis`.

**UI**
- `src/components/audit/findings-list-dialog.tsx`: botão "Resolvido" (ícone de check) ao lado de "Ignorar" nas visões Agrupado e Tabela, com hook `use-audit-resolutions.ts` (mutação + toast com Desfazer + invalidação das queries de audit/kpis/system-status).
- `src/routes/_authenticated/index.tsx`: novo card de tempo médio de resolução.
- `src/routes/_authenticated/analytics.tsx`: seção/tabela de tempo médio por tipo de problema.
