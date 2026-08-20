# Refinamento visual e de layout da plataforma

Objetivo: interface mais corporativa, com enquadramento consistente, hierarquia clara e leitura de dados mais confortável — sem mudar regras de negócio, cálculos ou backend.

Direção travada (escolhas feitas): paleta Excelsior refinada (azul #2C2B7C base, #4B49B8 realce, fundo claro #F5F6FA, verde #1BA97A apenas para status), tipografia atual mantida com escala e pesos revistos, layout em blocos tipo bento, densidade equilibrada.

## 1. Sistema visual (base para tudo)

- Superfícies em 3 níveis bem definidos (fundo da página, cartão, cartão elevado) com bordas hairline mais discretas e sombra suave única — hoje há mistura de sombras/bordas com pesos diferentes.
- Verde deixa de ser cor decorativa: passa a significar apenas "positivo/saudável". Azul assume os acentos de navegação e destaque.
- Escala tipográfica única: título de página, título de seção, rótulo de métrica, número de métrica, corpo, legenda — aplicada igual em todas as páginas (hoje cada página define tamanhos próprios).
- Números sempre em tabular, com alinhamento à direita em tabelas.
- Raio de canto e espaçamentos padronizados em um único ritmo (4/8/12/16/24).

## 2. Enquadramento e cabeçalho de página

- Container com largura máxima e respiro uniformes; fim das variações de padding entre páginas.
- Padrão de cabeçalho de página reutilizável: título, linha de contexto, e área de ações à direita (botões, filtros) que quebra corretamente em telas menores.
- Barra de topo com hierarquia mais calma: busca, status de sincronização, notificações, tema e usuário com pesos visuais separados por divisores em vez de tudo com o mesmo destaque.
- Sidebar: rótulos de seção mais discretos, item ativo com barra de indicação à esquerda em vez de ponto pulsante, ícones alinhados em grade fixa.

## 3. KPIs e blocos (bento)

- Cartão de KPI padronizado: rótulo pequeno em cima, número grande, variação/meta embaixo, faixa de status fina na lateral. Mesmo componente em Auditoria, Operação e Analytics.
- Agrupamento em bento: KPIs de cadência (diário/semanal/mensal/anual) dentro de blocos titulados, com o indicador mais importante ocupando célula maior.
- Estados vazios e de carregamento com o mesmo desenho em toda a plataforma (skeleton no formato do cartão, não spinner solto).

## 4. Gráficos

- Paleta de séries reordenada para contraste real entre séries vizinhas e legibilidade no claro e no escuro.
- Grid mais leve, eixos com menos marcas, tooltip único padronizado (título, valor formatado, unidade).
- Altura dos gráficos por porte de tela e cabeçalho de gráfico padronizado (título + subtítulo + ação de exportar no mesmo lugar sempre).

## 5. Tabelas e listas

- Um só estilo de tabela: cabeçalho fixo, linhas zebradas suaves, hover claro, colunas numéricas à direita, badges de status com o mesmo tamanho e peso.
- Badges e chips (urgência, origem, reincidência, tags de motivo) unificados em um único conjunto de variantes.
- Densidade equilibrada: altura de linha confortável no desktop, cartões empilhados no celular (mantendo o comportamento responsivo já existente).

## 6. Formulários, diálogos e configurações

- Diálogos/drawers com cabeçalho, corpo com rolagem e rodapé de ações fixo, todos com a mesma largura por tipo.
- Campos com rótulo acima, altura uniforme e mensagens de erro no mesmo lugar.
- Abas de Configurações com aparência de segmento (pílula) em vez de sublinhado fino, e cada aba com cartões de seção titulados.

## Páginas incluídas

Auditoria (início), Operação, Analytics, Alertas, Apólices (lista e detalhe), Endosso, Ferramentas e Extrator de Endossos, Configurações (todas as abas), Usuários, Login e página de convite.

## Detalhes técnicos

- Tokens, escala tipográfica e utilitários novos em `src/styles.css` (`@theme inline` + `@utility`); nenhuma cor fixa nos componentes.
- Novos componentes de apresentação: `page-header`, `section-card`, `stat-tile`, `chart-frame`, `data-table` (casca de estilo), reutilizados nas rotas; `kpi-card`, `layout/header.tsx`, `layout/sidebar.tsx` e os componentes de gráfico/tabela existentes são ajustados, não reescritos.
- Sem alteração em hooks, server functions, migrations, cálculos de KPI ou filtros de exceção/resolução.
- Verificação com Playwright em 1920x1080, 1366x768, 820x1180 e 390x844, em tema claro e escuro, com prints das telas principais.
