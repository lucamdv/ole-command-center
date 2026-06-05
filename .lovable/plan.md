## Objetivo
Deixar o tema claro mais vibrante e legível — sem alterar o tema escuro, sem mexer em lógica/dados.

## Diagnóstico
No `:root` (tema claro) atual:
- `--primary` (azul Excelsior) está em `oklch(0.31 ...)` — bem escuro, ok para texto, mas usado também em backgrounds/gráficos fica "pesado e opaco".
- `--brand-verde` `oklch(0.72 0.16 152)` está pastel demais → cards e barras de gráfico parecem desbotados.
- `--accent` `oklch(0.95 0.03 152)` é quase branco → chips/badges somem.
- `--muted-foreground` `oklch(0.48 ...)` → labels secundárias com baixo contraste.
- `--border` em `0.1` de opacidade → divisórias quase invisíveis.
- `--chart-3..5` (azul soft, verde escuro, cinza-azulado) com baixa saturação → séries do gráfico se misturam.
- Gradientes (`--gradient-primary`, KPI backgrounds, glow) usando tokens pastéis → hero/KPI cards sem punch.

## Mudanças (apenas em `src/styles.css`, bloco `:root`)

1. **Paleta de marca mais saturada no claro**
   - `--brand-azul-soft`: subir chroma (`oklch(0.55 0.20 270)`) — azul mais elétrico para gradientes/charts.
   - `--brand-verde`: aumentar chroma e ajustar lightness (`oklch(0.66 0.20 152)`) — verde mais vivo.
   - `--brand-verde-strong`: `oklch(0.52 0.19 152)` para contraste em texto sobre fundo verde claro.

2. **Accent visível**
   - `--accent`: `oklch(0.92 0.09 152)` (verde claro perceptível, não quase-branco).
   - `--accent-foreground`: `oklch(0.30 0.15 152)`.
   - `--secondary`: `oklch(0.93 0.04 270)` (leve tom azul perceptível).

3. **Contraste de texto/borda**
   - `--muted-foreground`: `oklch(0.42 0.03 260)`.
   - `--border`: `oklch(0.20 0.04 270 / 0.16)`.
   - `--input`: `oklch(0.20 0.04 270 / 0.22)`.
   - `--ring`: opacidade `0.6`.

4. **Charts vibrantes (séries distintas)**
   - `--chart-1`: `oklch(0.45 0.22 270)` — azul vívido (mais claro que primary para destacar em fundo branco).
   - `--chart-2`: `oklch(0.66 0.20 152)` — verde vivo.
   - `--chart-3`: `oklch(0.70 0.18 220)` — ciano.
   - `--chart-4`: `oklch(0.62 0.22 30)` — laranja-coral para contraste real entre séries.
   - `--chart-5`: `oklch(0.55 0.20 310)` — magenta/roxo.

5. **Status mais nítidos**
   - `--success`: `oklch(0.60 0.19 152)`.
   - `--warning`: `oklch(0.72 0.19 70)`.
   - `--destructive`: `oklch(0.58 0.24 25)`.
   - `--info`: `oklch(0.55 0.20 270)`.

6. **Gradientes e glow com mais presença**
   - `--gradient-primary`: do azul vívido (`0.40 0.22 275`) ao verde vivo (`0.66 0.20 152`).
   - `--gradient-glow`: opacidade `0.18`.
   - Background radial do `body` (claro): subir opacidades para `0.10` (azul) e `0.08` (verde).
   - `--shadow-elevated`: aumentar opacidade para `0.22`.

7. **Sidebar (claro)**
   - `--sidebar-accent`: `oklch(0.93 0.04 270)` para hover de item visível.
   - `--sidebar-border`: opacidade `0.12`.

## Fora de escopo
- Tema escuro (mantido como está).
- Nenhuma alteração em componentes, rotas, lógica, cálculos ou dados.
- Sem novos arquivos.

## Verificação
- Abrir `/` e `/analytics` no modo claro: KPI cards, badges, bordas e séries do gráfico devem ficar nitidamente mais vibrantes; texto secundário com contraste claramente maior.
- Alternar para escuro e confirmar que nada mudou.
