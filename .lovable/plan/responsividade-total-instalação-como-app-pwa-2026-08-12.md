# Responsividade total + instalação como app (PWA)

Objetivo: a plataforma ficar confortável em celular, tablet, notebook e monitor grande, e poder ser instalada na tela inicial do celular como app.

## 1. Navegação mobile (hoje o menu simplesmente desaparece)

A barra lateral está oculta abaixo de 768px e não existe substituto — no celular não há como navegar.

- Botão de menu no cabeçalho (visível só em telas pequenas) que abre a navegação em painel deslizante (Sheet), com os mesmos itens, seção de Administração, perfil e indicador de saúde do sistema.
- Fechar automaticamente ao trocar de página.
- Área de toque mínima de 44px nos itens.
- Em tablets/notebooks estreitos (768–1279px) a sidebar fica em modo compacto com ícones e rótulo em tooltip; a partir de 1280px volta ao formato atual.

## 2. Cabeçalho

- Em telas pequenas: campo de busca vira botão de lupa, indicador de "Sync" e nome/cargo do usuário ficam ocultos, ações essenciais (notificações, tema, sair) permanecem.
- Painel de notificações passa a ocupar a largura da tela em mobile (hoje é fixo em 380px e estoura), com botão de fechar e altura limitada.

## 3. Conteúdo das páginas

- Container do conteúdo com padding progressivo (menor no celular) e respeito à área segura do iPhone (notch/barra inferior).
- Grades de KPIs e cartões: 1 coluna no celular, 2 no tablet, 3–4 no notebook/desktop (hoje há grades fixas que quebram).
- Títulos e números grandes com escala responsiva.
- Gráficos: altura reduzida no celular, legendas e eixos simplificados, sem overflow horizontal da página.
- Tabelas longas (Apólices, Auditoria, Extrator de Endossos, Usuários, Alertas): rolagem horizontal contida com cabeçalho fixo em telas médias, e em celular as linhas viram cartões empilhados com os campos principais + ação de abrir detalhe.
- Filtros e barras de ação (incluindo o filtro de datas do Analytics e as abas de Configurações) passam a quebrar linha e rolar horizontalmente sem cortar conteúdo.
- Diálogos/modais: largura total menos margens no celular, com rolagem interna.
- Tela de login e página de convite centralizadas e confortáveis em telas pequenas.

## 4. Instalação como app (PWA)

Escopo: instalável na tela inicial com ícone, nome e barra de status na cor da marca. Sem modo offline (não foi pedido; evita cache preso e telas brancas).

- `public/manifest.webmanifest` com nome "Olé Copilot", nome curto, `display: standalone`, cor de tema/fundo, orientação livre e ícones 192/512 (normal e maskable) gerados a partir da logo atual.
- Tags no `<head>`: manifest, theme-color (claro/escuro), apple-touch-icon, apple-mobile-web-app-capable e title de status bar.
- Sem service worker, sem cache offline.

## Detalhes técnicos

- Ajustes concentrados em `src/components/layout/app-shell.tsx`, `sidebar.tsx`, `header.tsx` (novo `mobile-nav.tsx` usando `@/components/ui/sheet`), `src/routes/__root.tsx` (head tags + `viewport-fit=cover`), `src/styles.css` (utilitários de safe-area e escala tipográfica), e classes responsivas nas rotas em `src/routes/_authenticated/*` e componentes de tabela/gráfico.
- Sem mudanças de banco, de server functions ou de regras de negócio.
- Verificação com Playwright em 390x844 (celular), 820x1180 (tablet), 1366x768 (notebook) e 1920x1080, com prints das telas principais.
