## Objetivo

Elevar a plataforma a um padrão visual executivo/corporativo — denso em informação, hierárquico e intuitivo — mantendo o dashboard principal (`/`) alimentado pelos resultados reais das auditorias n8n. Demais abas continuam com mocks. Ajustes pontuais de identidade: usuário, nome do assistente de IA e nova aba "Ferramentas".

## Mudanças de navegação e identidade (rápidas)

- **Sidebar (`src/components/layout/sidebar.tsx`)**
  - Renomear "OLÉ Intelligence" → **Oléver** (manter ícone Sparkles, rota `/intelligence`).
  - Adicionar item **Ferramentas** logo abaixo de Oléver (ícone `Wrench`, rota `/ferramentas`).
  - Trocar bloco do usuário rodapé: iniciais `LM`, nome **Luca Monteiro**, cargo "Operações · Admin".
- **Header / Command palette**: se exibirem o nome do usuário, atualizar para Luca Monteiro.
- **Nova rota** `src/routes/ferramentas.tsx`: placeholder executivo ("Em construção") com título, descrição curta, ícone e cartão indicando que ferramentas operacionais serão lançadas em breve. Sem lógica.
- **Rota `/intelligence`**: atualizar `head.title` e H1 para "Oléver" (subtítulo: "Assistente de IA da operação OLÉ"). Conteúdo permanece mock.

## Redesign executivo da Visão Geral (`/`)

A página atual já tem todos os blocos certos; o trabalho é **elevar a apresentação** para um padrão de cockpit corporativo, sem mexer na lógica de dados (continuamos usando `useLatestAudit`, `useAuditHistory`, `deriveKpis`, etc.).

### Diretrizes visuais

- **Hero executivo**: faixa superior com saudação contextual ("Bom dia, Luca"), data/hora, badge de status do sistema, badge da última auditoria, e ações principais (Ver lista, Exportar PDF, Rodar auditoria) alinhadas à direita em um cluster coeso.
- **Tipografia hierárquica**: títulos de seção com kicker em maiúsculas + número grande tabular + subtítulo curto. Reforçar uso de `tabular-nums` em todos os KPIs.
- **Cartões KPI premium**: refinar `KpiCard` para incluir ícone, delta colorido com seta, sparkline mais limpa e divisor sutil. Adicionar 2 KPIs executivos adicionais na linha principal (total: 6): **Tempo desde última auditoria** e **Score de saúde operacional** (derivado de aprovação - risco).
- **Banner consolidado**: transformar em "Sumário Executivo" — 3 colunas (Status geral · Mensagem · Próxima ação recomendada), com borda colorida conforme severidade.
- **Layout em bento**: reorganizar blocos abaixo dos KPIs em grid bento (12 colunas) que combina:
  - Pulso Operacional (tendência) — 8 col
  - Severidade + mini-stats empilhados — 4 col
  - Heatmap de risco — 12 col (largura total, com legenda de intensidade)
  - Top apólices afetadas — 6 col / Ranking de regras — 6 col
  - Linha do tempo por mês — 12 col
- **Acabamento**: bordas mais sutis (`border-border/60`), sombras `shadow-elevated`, fundos com leve gradiente (`from-surface to-surface-2`), divisores `bg-border` em grids bento, hover states discretos, animações `pulse-dot` reservadas para indicadores ao vivo.
- **Densidade**: padding consistente (`p-5`), spacing `gap-3` em KPIs e `gap-6` entre seções, max-width já configurado em `app-shell`.
- **Microcopy executiva**: substituir labels técnicos por linguagem de negócio ("Conformidade da carteira", "Apólices em risco", "Regras críticas acionadas", "Velocidade operacional").

### Arquivos tocados no redesign

- `src/routes/index.tsx` — reorganização de layout, novo hero, grid bento, novos KPIs derivados.
- `src/components/kpi/kpi-card.tsx` — variante visual mais refinada (ícone opcional, delta com seta, sparkline polida). Manter API retrocompatível.
- `src/components/layout/header.tsx` — saudação personalizada com nome Luca (se ainda não houver).
- `src/styles.css` — adicionar (se faltar) tokens para gradientes sutis e sombras executivas; sem mudar paleta base.

## Escopo explicitamente fora

- Sem alterar `src/lib/audit/*` (lógica de derivação permanece).
- Sem mexer nas demais rotas (`/apolices`, `/endossos`, `/alertas`, `/analytics`, `/operacao`, `/configuracoes`) além de ajustes triviais se o nome do usuário aparecer.
- Sem novo backend, sem migrações.

## Resultado esperado

Dashboard com cara de cockpit C-level: hero claro, 6 KPIs executivos com sparklines, bento layout coeso, heatmap em destaque, microcopy de negócio. Sidebar com Luca Monteiro, Oléver e nova aba Ferramentas (placeholder).
