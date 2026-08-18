# KPIs da Operação — novos indicadores e reorganização

Adicionar os KPIs das tabelas 5.1–5.4 que **já são calculáveis** com os dados existentes (auditoria, carteira, endossos), organizados **por cadência**, com metas/alertas **configuráveis** em Configurações.

## O que entra agora (calculável)

### Diários — tela principal da Auditoria
- **Inconsistências novas detectadas** — achados da última run (exceções sempre excluídas), com alerta quando ficam acima da média móvel das últimas runs.
- **Ocorrências críticas em aberto** — achados de nível ERRO presentes na run mais recente. Meta: zero.
- **Ocorrências resolvidas desde a run anterior** — achados que deixaram de aparecer (mede reação da operação; substitui o "tempo até 1ª resposta", que não tem fonte).

### Semanais — Analytics
- **Taxa de reincidência** — % de achados repetidos (mesma apólice + mesmo tipo de erro já visto em run anterior) vs. novos. Alerta acima da meta (padrão 15%).
- **Apólices reincidentes na semana** — quantas voltaram a falhar.

### Mensais — Analytics
- **Taxa de reincidência consolidada do mês** + **média móvel de 3 meses** (alerta quando a média sobe).
- **Contratos ativos vs. capacidade operacional** — carteira com vigência ativa contra a capacidade configurada (padrão ~100), com alerta ao aproximar de 2x.
- **Volume de emissões do mês** (apólices + endossos) reaproveitando o agregado já existente.

### Anuais — Analytics
- **Crescimento da carteira no ano** — nº de contratos e prêmio emitido, comparando com o ano anterior.
- **Redução ano a ano de incidentes críticos** — achados de nível ERRO por ano.

## O que fica de fora (sem fonte de dados hoje)
Tempo até a 1ª resposta, % resolvidas dentro do SLA, contratos inadimplentes/suspensos, Mapa de Repasse/Borderaux gerado sem retrabalho e no prazo, nº de interações manuais/ad-hoc, cobertura de RCA, horas manuais, % de processos automatizados e eficiência por contrato. Nenhum desses aparece na tela — para habilitá-los seria preciso um registro operacional (RCA/SLA/envios), que fica para um próximo passo.

## Reorganização das telas

**Auditoria (`/`)** — os cartões atuais viram duas faixas:
1. *Estado da última auditoria*: Apólices Auditadas, Conformidade da Carteira, Saúde Operacional, Velocidade Operacional.
2. *KPIs diários*: Inconsistências novas, Críticas em aberto, Resolvidas desde a run anterior, Apólices em Risco, Regras Críticas Acionadas.

**Analytics (`/analytics`)** — seções com cabeçalho por cadência (**Semanais · Mensais · Anuais**) acima dos gráficos existentes, respeitando o filtro de datas atual e a preferência de ocultar cartões sem dado suficiente.

Cada cartão passa a mostrar a meta e um selo de status (dentro da meta / atenção / fora da meta) conforme os limites configurados.

## Metas configuráveis
Nova aba **Metas de KPI** em Configurações, com os valores das imagens como padrão e edição por indicador: reincidência máx. 15%, críticas em aberto = 0, capacidade operacional ~100 contratos, sensibilidade do pico de inconsistências (desvio sobre a média móvel), crescimento anual esperado.

## Detalhes técnicos
- `src/lib/kpis.functions.ts` — server fn `getOperationKpis` (protegida, admin client interno) que lê `audit_runs` + `audit_findings` das últimas N runs, aplica o filtro de `audit_ignores` já existente e agrega reincidência/críticas/resolvidas por run, mês e ano; carteira ativa e prêmio reaproveitam a lógica de `analytics.functions.ts` (vigência via `proposta.datas`).
- `src/lib/kpis/derive.ts` — cálculos puros (chave `apolice|tipo_erro`, média móvel, deltas ano a ano) para ficarem testáveis e fora do arquivo de server fns.
- `src/hooks/use-operation-kpis.ts` — `queryOptions` + `useQuery`, mesmo padrão de `use-analytics.ts`.
- `src/hooks/use-kpi-targets.ts` + `src/components/settings/metas-tab.tsx` — metas persistidas em `localStorage` no mesmo padrão de `use-settings.ts`/preferências de gráficos.
- `KpiCard` ganha props opcionais `target` e `status` (sem alterar chamadas existentes); grids seguem `grid-cols-2 md:grid-cols-4` com `min-w-0`/`truncate` para o mobile.
- Nenhuma migração de banco e nenhuma mudança nas integrações n8n.
