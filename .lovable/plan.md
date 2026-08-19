# Corrigir tempo em aberto e reincidência por endosso

## O que está errado hoje

O histórico de um problema é agrupado só por **apólice + tipo de erro**, ignorando o endosso. Nos dois alertas da tela:

- `PROPORÇÃO DE PRÊMIO DIRETO INCORRETA` — endosso 000003, detectado em 17, 18 e 19/ago; mas existe um registro antigo do **mesmo tipo no endosso 000000** (27/jul), e é ele que puxa "23 d em aberto" e "5ª auditoria".
- `SOMA DE INTERMEDIAÇÃO INCORRETA` — endosso 000003, também desde 17/ago, sem histórico antigo, por isso "2 d / 3ª auditoria".

Ou seja: as duas foram achadas na mesma auditoria, mas uma herdou a idade de um endosso diferente.

## Regra correta

- **Identidade do problema:** apólice + tipo de erro + **endosso**.
- **Tempo em aberto / contagem de auditorias:** apenas auditorias **consecutivas** em que essa tripla apareceu (se sumiu no meio, o episódio recomeça).
- **Reincidência:** o mesmo tipo de erro já ter ocorrido **naquela apólice em outro endosso (mais antigo)**. Isso passa a ser uma marca própria — "reincidente na apólice" — e não afeta mais a idade nem a contagem de auditorias do incidente atual.

Com isso, os dois alertas do exemplo mostram "2 d em aberto · 3ª auditoria", e o de Prêmio Direto ganha a tag de reincidente na apólice (já ocorrido no endosso 000000 em 27/jul).

## Escalonamento

- Sobe nível por auditorias consecutivas e por dias em aberto (como hoje), agora com os valores corretos por endosso.
- Reincidência na apólice continua influenciando a urgência, mas como um degrau próprio e explícito ("já ocorreu em endosso anterior"), configurável na aba Metas junto às demais regras.

## Onde aparece

- **Linha do alerta:** "Nª auditoria" e "X d em aberto" passam a ser do episódio atual daquele endosso; badge extra "reincidente na apólice" quando houver histórico em outro endosso.
- **Painel de detalhe:** mostra o episódio atual (desde quando, quantas auditorias seguidas) e uma seção de histórico na apólice listando os endossos anteriores com o mesmo tipo de erro e suas datas.
- **Filtro "somente reincidentes"** passa a usar a nova definição (mesmo tipo em endosso anterior da apólice) em vez de "apareceu em mais de uma auditoria".
- **Exportação CSV** ganha as colunas de endosso, auditorias consecutivas e reincidência na apólice.

## Detalhes técnicos

- `src/lib/audit-recurrence.functions.ts`: chave passa a ser `apolice||tipo_erro||endosso`; datas continuam ancoradas em `audit_runs.created_at` (não no `created_at` da linha); `firstSeenAt` = início da sequência consecutiva; novos campos `endosso`, `policyHistory` (outros endossos com o mesmo tipo na apólice, com primeira/última data) e `recorrenteNaApolice`.
- `src/lib/audit/alert-view.ts`: `keyOf(apolice, tipo, endosso)`; `AlertItem` expõe `recorrenteNaApolice` e `policyHistory`; `daysOpen` segue por dia de calendário.
- `src/lib/audit/escalation.ts`: novo gatilho opcional `policyRecurrenceBump` em `EscalationRules` (default ligado), substituindo o uso de `occurrences` total para esse efeito.
- `src/hooks/use-escalation-rules.ts` e `src/components/settings/metas-tab.tsx`: expor o novo gatilho.
- `src/hooks/use-urgency-overrides.ts`: overrides manuais passam a ser gravados na chave com endosso, com leitura compatível das chaves antigas (sem endosso) para não perder ajustes já feitos.
- `src/components/alertas/incident-row.tsx`, `incident-detail.tsx`, `src/lib/audit/export-alerts.ts` e `src/routes/_authenticated/alertas.tsx`: exibição, filtro e exportação.
- Exceções (`audit_ignores`) e resoluções seguem com o escopo atual (apólice + tipo, com endosso quando informado) — sem mudança de banco.
