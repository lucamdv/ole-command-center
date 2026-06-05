## Rebrand Excelsior — Olé Copilot

Aplico a identidade visual da Excelsior Seguros (azul #2C2B7C, verde #45B97C, Montserrat + Inter Tight) em toda a plataforma, com co-branding Excelsior + "Olé Copilot" no shell e suporte a tema claro (padrão) e escuro (opcional).

### 1. Tokens & tipografia (`src/styles.css`)
- Substituo a paleta atual por:
  - `--primary` = azul Excelsior `#2C2B7C` (oklch equivalente)
  - `--accent` / `--success` derivados do verde `#45B97C`
  - `--primary-glow` em azul mais claro para hovers/gradientes
  - Charts: chart-1 azul, chart-2 verde, chart-3 azul claro, chart-4 verde escuro, chart-5 cinza-azulado
- Defino tema claro como `:root` padrão (fundo `#FAFAFB`, surfaces brancas, bordas sutis cinza), e tema escuro mantido sob `.dark` (mesma paleta mas com fundo navy quase-preto derivado do azul Excelsior).
- Atualizo `--font-sans` para `"Montserrat"` e adiciono `--font-display` Montserrat / `--font-support` `"Inter Tight"`. Mantenho `--font-mono` JetBrains.
- Gradientes/sombras recalibrados para a nova paleta.

### 2. Carregamento de fontes (`src/routes/__root.tsx`)
- Adiciono `<link>` preconnect + stylesheet do Google Fonts para Montserrat (400/500/600/700) e Inter Tight (400/500/600). Removo Inter antigo se carregado.

### 3. Logos como assets CDN
- Subo `Logo_azul_1.png` e `Logo_branca_1.png` via `lovable-assets` e gero `.asset.json` em `src/assets/`.
- Crio componente `BrandMark` (substituindo o ícone `Activity` no `Sidebar`) que exibe a logo Excelsior (variante azul no tema claro, branca no tema escuro) com o subtítulo "OLÉ COPILOT · Centro de Comando".
- Atualizo `Header` (avatar/identidade) e `command-palette` para a nova marca.

### 4. Theme toggle
- Removo o `dark` hard-coded em `src/components/layout/app-shell.tsx`.
- Adiciono provider simples de tema (localStorage, default `light`) e um botão sol/lua no `Header` ao lado do sino.
- Garante que componentes shadcn (badges, cards, dialogs, charts) renderizam corretamente em ambos os modos via tokens semânticos.

### 5. Ajustes finos de componentes
- Revisão de uso de cores hard-coded nas rotas (`analytics`, `apolices`, `operacao`, `intelligence`, `ferramentas`, etc.) substituindo por tokens semânticos quando encontradas.
- Atualização de gradientes do KPI/cards para azul→verde Excelsior.
- Recharts: cores via tokens `--chart-*` já atualizados; nenhum valor de dado é alterado.

### 6. Verificação
- Build automático + checagem visual no preview em tema claro e escuro (sidebar, header, dashboard, analytics, apólices).

### Não muda
- Lógica de negócio, fórmulas (PIS/COFINS, repasse), dados, rotas, server functions.

### Arquivos principais editados
```
src/styles.css
src/routes/__root.tsx
src/components/layout/app-shell.tsx
src/components/layout/sidebar.tsx
src/components/layout/header.tsx
src/components/brand/brand-mark.tsx        (novo)
src/components/theme/theme-provider.tsx    (novo)
src/components/theme/theme-toggle.tsx      (novo)
src/assets/excelsior-azul.png.asset.json   (novo)
src/assets/excelsior-branca.png.asset.json (novo)
```
