# Regra correta de "inconsistência resolvida"

## O problema hoje

Existem duas contagens paralelas e inconsistentes:

- No painel da auditoria, "Inconsistências resolvidas" = (achados que estavam na auditoria anterior e não estão na atual) + (resoluções manuais recentes).
- No Analytics, "Inconsistências resolvidas" = apenas as resoluções manuais registradas na tabela.

Consequências: os dois números divergem, as resoluções automáticas (erro sumiu sozinho) não alimentam o KPI de tempo de resolução por tipo de problema, e resoluções já reabertas continuam somando.

## Regra que passa a valer

Uma inconsistência conta como resolvida quando:

1. Alguém marca como resolvida manualmente na lista de achados; ou
2. Ela estava presente na auditoria anterior e não aparece mais na auditoria atual (resolução automática).

E nunca conta como resolvida quando:

- O problema está cadastrado como exceção (ignorado) — sair da auditoria seguinte não gera resolução;
- A resolução foi reaberta porque o problema voltou a aparecer (a reabertura já existe e continua valendo).

Identidade do problema passa a ser apólice + tipo de erro + endosso em todo o fluxo de resolução, igual à tela de Alertas (hoje o cálculo ignora o endosso, então um erro que muda de endosso pode ser contado como resolvido).

## Como fica na tela

- Auditoria: "Inconsistências resolvidas" mostra o total do ciclo (manuais + automáticas), com detalhe no rodapé do card: "X manuais · Y automáticas".
- Analytics: o mesmo total, e o tempo médio/mediano por tipo de problema passa a incluir as resoluções automáticas (tempo = primeira detecção → auditoria em que o problema desapareceu).
- Alertas, aba de resolvidos: as resoluções automáticas aparecem na lista marcadas como "resolvido automaticamente".

## Detalhes técnicos

**Banco**
- `audit_resolutions`: nova coluna `origem text not null default 'manual'` (`'manual' | 'auto'`) e `endosso` passa a integrar a chave lógica.
- Substituir o índice único parcial atual por `(apolice, tipo_erro, coalesce(endosso,''))` com `reopened_at is null`, garantindo idempotência por endosso.

**Callback da auditoria (`src/routes/api/public/audit-callback.ts`)**
Após inserir os achados da run atual, em uma etapa nova:
1. Carrega os achados da run bem-sucedida anterior.
2. Carrega `audit_ignores` e monta os conjuntos de exceção (`buildIgnoreSets`).
3. Para cada achado da run anterior que **não** está na run atual, **não** é exceção e **não** tem resolução ativa: insere `audit_resolutions` com `origem='auto'`, `resolved_at = data da run atual`, `resolved_by = null`, `first_seen_at` = menor `created_at` da run em que a chave apareceu primeiro (via `audit_findings` + `audit_runs`).
4. A reabertura existente passa a comparar a chave com endosso e vale para resoluções manuais e automáticas.

**KPIs (`src/lib/kpis.functions.ts`, `src/lib/kpis/derive.ts`)**
- Remover `resolvidas` do diff em `deriveDaily` (deixa de ser fonte de verdade) e passar a contar linhas de `audit_resolutions` com `resolved_at` desde a run anterior, separadas em `resolvidasManuais` e `resolvidasAuto`; `daily.resolvidas` = soma.
- `deriveResolutionTimes` recebe manuais + automáticas e ignora linhas com `reopened_at` preenchido no total geral, mantendo o histórico por tipo.
- O filtro de achados abertos continua usando exceções + resoluções ativas, agora com chave por endosso (`resolution-filter.ts` e `ignore-filter.ts` ganham a variante com endosso).

**UI**
- `src/routes/_authenticated/index.tsx`: hint do card com manuais/automáticas.
- `src/routes/_authenticated/analytics.tsx`: total unificado e legenda ajustada.
- `src/components/alertas/resolved-tab.tsx` e `incident-detail.tsx`: badge de origem (manual/automática).
