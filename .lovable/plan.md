# Alertas: reincidência, escalonamento de urgência e histórico de resolvidos

A página Alertas passa a ser um centro de operações completo: além dos incidentes abertos da última auditoria, ela mostra há quantas auditorias cada problema persiste, escala a urgência automaticamente conforme o tempo sem solução, e ganha uma aba de histórico dos erros já resolvidos.

## 1. Reincidência e idade do incidente

Para cada problema (apólice + tipo de erro) a plataforma passa a calcular, a partir do histórico de auditorias:

- Em quantas auditorias ele já apareceu (ex.: tag "3ª auditoria").
- Data da primeira detecção e dias em aberto.
- Se já foi resolvido antes e voltou (tag "reaberto").

Cada incidente na lista recebe uma tag de reincidência. Incidentes que aparecem pela primeira vez recebem a tag "novo".

## 2. Urgência que escala com o tempo

A severidade exibida deixa de ser fixa: parte da severidade natural do tipo de erro e sobe de nível conforme a persistência. Níveis: baixa → média → alta → crítica.

Regras de escalonamento (configuráveis):

- Sobe um nível a partir de N auditorias consecutivas com o problema aberto (padrão: 3).
- Sobe um nível a partir de N dias em aberto (padrão: 7).
- Sobe um nível extra em caso de reabertura (problema marcado como resolvido que voltou).
- Nível máximo permitido pelo escalonamento automático (padrão: crítica).

Tudo isso vira uma nova seção "Escalonamento de alertas" na aba **Metas de KPI** das Configurações (mesmo padrão de preferências já existente), com botão de restaurar padrões.

## 3. Histórico de erros resolvidos

Nova aba na página Alertas:

- **Abertos** — incidentes da última auditoria (visão atual, melhorada).
- **Resolvidos** — histórico vindo dos registros de resolução: apólice, tipo, quem resolveu, quando, motivo, tempo até a resolução, e marcação de "reaberto" quando voltou a aparecer.
- **Exceções** — incidentes ignorados, com motivo/tag, para dar visibilidade do que está fora dos números (extra).

Na aba Resolvidos é possível desfazer a resolução (reabrir), aproveitando a ação já existente.

## 4. Mais informações por incidente e melhorias de visualização

- Clique no incidente abre um painel de detalhe (drawer) com: dados completos do achado (endosso, vigência, motivo, detalhe técnico), linha do tempo de aparições por auditoria, primeira detecção, dias em aberto, histórico de resoluções/exceções daquele par apólice+tipo, e ações rápidas (resolver, ignorar com motivo, abrir a apólice).
- Cabeçalho com tiles por urgência (4 níveis) + tile de "reincidentes" e "novos".
- Filtros adicionais: urgência, tipo, apenas reincidentes, apenas reabertos, faixa de idade (novo / 1-7 dias / +7 dias), e ordenação (urgência, idade, reincidência, apólice).
- Agrupamento opcional por apólice, para ver todos os problemas de um contrato juntos.
- Seleção múltipla com ações em lote: resolver ou ignorar vários incidentes de uma vez (extras).
- Exportação CSV da visão filtrada (extra).
- Estados de carregamento/vazio e responsividade mobile mantidos no padrão atual.

## Detalhes técnicos

- Nova server fn `getFindingRecurrence` em `src/lib/audit.functions.ts` (ou arquivo novo `src/lib/audit-recurrence.functions.ts`): agrega `audit_findings` por `apolice + tipo_erro` sobre as últimas N runs de sucesso, retornando `{ key, runs: string[], firstSeenAt, lastSeenAt, occurrences, reopened }`. Aplica os mesmos filtros de exceções/resoluções já usados (`ignore-filter`, `resolution-filter`).
- Lógica pura de escalonamento em `src/lib/audit/escalation.ts`: `escalate(baseSeverity, { occurrences, daysOpen, reopened }, rules)` → `Urgency`, com `DEFAULT_ESCALATION_RULES`.
- Preferências em `src/hooks/use-escalation-rules.ts`, seguindo o padrão de `use-kpi-targets.ts` (localStorage + listeners), renderizadas em `src/components/settings/metas-tab.tsx`.
- Hooks novos em `src/hooks/use-audit-recurrence.ts`; histórico de resolvidos reutiliza `useAuditResolutions` e `useUnresolveFinding`; exceções reutilizam `use-audit-ignores`.
- `src/routes/_authenticated/alertas.tsx` é reescrita em componentes menores sob `src/components/alertas/` (tiles, filtros, linha do incidente, drawer de detalhe, aba de resolvidos, aba de exceções), mantendo `VirtualList` para performance.
- Sem mudanças de banco de dados: tudo derivado das tabelas existentes (`audit_findings`, `audit_runs`, `audit_resolutions`, `audit_ignores`, `exception_reason_tags`).
