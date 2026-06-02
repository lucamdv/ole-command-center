
# OLÉ COPILOT — Plano de Construção

Plataforma SaaS enterprise de inteligência operacional para seguros. Tema dark obrigatório, estética premium (Linear/Stripe/Datadog/Ramp), com dados mock realistas prontos para integração futura com Supabase/N8N/APIs.

## Escopo desta entrega (Fase 1 — UI completa com mocks)

Construir toda a experiência visual e navegacional com dados mock estruturados. Sem backend nesta fase — a arquitetura fica preparada para plugar Lovable Cloud depois.

## Sistema de Design

- **Tema:** Dark-only. Sem toggle de tema claro.
- **Tokens (src/styles.css):** mapear a paleta exata para variáveis semânticas em `oklch`:
  - `--background` #090F1F · `--surface` #111827 · `--surface-2` #151E34 · `--card` #1B2745
  - `--foreground` #FFFFFF · `--muted-foreground` #94A3B8
  - `--primary` #4F8CFF · `--success` #22C55E · `--warning` #F59E0B · `--destructive` #EF4444 · `--info` #22D3EE
  - Gradientes sutis, glow no primário, sombras profundas, bordas hairline (1px com baixo alpha).
- **Tipografia:** Inter (UI) + JetBrains Mono (números, IDs, tickers). Tracking apertado em títulos, números tabulares.
- **Motion:** Framer Motion — transições 200–400ms, easing custom, counters animados, skeletons, fade/slide sutis. Sem exageros.

## Estrutura de Rotas (TanStack Router)

```
src/routes/
  __root.tsx                 → shell com Sidebar + Header + <Outlet />
  index.tsx                  → Visão Geral
  operacao.tsx               → Operação
  apolices.tsx               → Lista de apólices
  apolices.$id.tsx           → Detalhe da apólice
  endossos.tsx               → Endossos
  alertas.tsx                → Alertas (SOC-style)
  analytics.tsx              → Analytics estratégico
  intelligence.tsx           → OLÉ Intelligence (IA)
  configuracoes.tsx          → Configurações
```

Cada rota com `head()` próprio (título/description PT-BR).

## Shell Persistente

- **Sidebar fixa** (collapsible icon): logo "OLÉ COPILOT" + subtítulo "Centro de Comando Operacional", 8 itens de menu com ícones Lucide, indicador de rota ativa, rodapé com avatar + status do sistema (dot pulsante verde "Operacional").
- **Header fixo:** busca global com ⌘K (Command Palette via cmdk/shadcn Command), badge de notificações, dropdown de atividades recentes, indicador de sincronização (último sync + spinner sutil), avatar.

## Componentes Proprietários (núcleo do produto)

1. **StatusBar** — barra fina no topo da Visão Geral: status operacional, último sync, execuções hoje, tempo médio, taxa de sucesso, alertas. Tudo com ícones e micro-pulsos.
2. **KPI Card Premium** — não é card shadcn padrão: valor grande mono, sparkline embutido (Recharts), delta colorido, label discreta, hover com gradiente sutil.
3. **Pulso Operacional** — painel hero único combinando: gauge de saúde, fila atual (lista live), volume processado (área chart), taxa de erro (donut), throughput. Layout bento exclusivo, não um grid genérico de gráficos.
4. **Heatmap de Risco** — matriz: linhas = regras de auditoria, colunas = últimas 12 semanas, células com escala de cor (transparente→vermelho), tooltip rico no hover.
5. **Timeline de Endossos** — componente visual vertical proprietário (000000 → 000001 → …): cada nó mostra data, alteração, prêmio, cobertura, status, resultado da auditoria. Conector animado entre nós.
6. **Linha do Tempo de Vigência** — barra horizontal com segmentos por período; GAPs em vermelho destacado, renovações marcadas, sobreposições com hachura.
7. **Tabela de Auditoria expandível** — regra, severidade (badge), descrição, impacto, recomendação; expand inline.

## Telas

- **Visão Geral:** StatusBar + 7 KPIs executivos + Pulso Operacional + Heatmap de Risco.
- **Operação:** centro de monitoramento — processamentos em andamento (lista live), fila, concluídos, falhas, métricas de tempo, alertas críticos. Estilo NOC.
- **Apólices:** tabela densa estilo Linear — busca instant, filtros (status, produto, corretor, conformidade), virtualização visual, atalhos de teclado, row hover.
- **Detalhe da Apólice:** header com número/status/conformidade + grid: dados, coberturas (cards), Timeline de Endossos, Linha do Tempo de Vigência, Tabela de Auditoria.
- **Endossos:** visão consolidada cross-apólice.
- **Alertas:** layout SOC — cada alerta = card de incidente (severidade colorida na borda esquerda), filtros por severidade/origem/status, ações inline.
- **Analytics:** rankings (corretores/produtos/coberturas), tendência de erros, análise financeira, eficiência, distribuição de riscos. Recharts em todos.
- **OLÉ Intelligence:** experiência própria — não é chat genérico. Input central com sugestões de perguntas, resposta estruturada em seções (Resumo Executivo, Causa Raiz, Impacto Financeiro/Operacional, Tendências, Insights, Recomendações, Gráficos). Mock de respostas nesta fase.
- **Configurações:** placeholder estruturado (perfil, notificações, integrações, equipe).

## Dados Mock

`src/lib/mock/` com geradores tipados: apólices (~80), endossos encadeados, coberturas, execuções de auditoria, alertas, séries temporais. Tipos TS exportados servem como contrato para o backend futuro.

## Detalhes Técnicos

- React 19 + TanStack Start + TS strict + Tailwind v4 + shadcn/ui + Framer Motion + Recharts + cmdk.
- Todos os componentes em `src/components/` organizados por domínio: `layout/`, `kpi/`, `pulso/`, `heatmap/`, `timeline/`, `audit/`, `alerts/`, `intelligence/`.
- Hooks utilitários: `useAnimatedCounter`, `useCommandPalette`, `useMockRealtime` (intervalos para simular sync).
- Toasts via `sonner`. Skeletons em todas as listas.
- Sem `useEffect+fetch`; quando houver backend, plugar TanStack Query nos pontos já preparados.

## Fora de escopo desta fase

- Autenticação / Lovable Cloud / banco real.
- IA real no OLÉ Intelligence (mock estruturado primeiro; depois plugamos Lovable AI Gateway).
- Persistência de filtros/usuário.

Posso seguir para implementação?
