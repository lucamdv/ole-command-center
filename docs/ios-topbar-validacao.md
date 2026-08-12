# Validação da top bar em iOS (PWA standalone)

Data: 12/08/2026 · Rota testada: `/analytics` (sessão autenticada)
Método: Chromium headless com viewport/DPR de cada aparelho + simulação do recorte de
sistema (`safe-area-inset-top`) como camada que intercepta toques na faixa superior.
Para cada botão da top bar foi feito hit-test (`elementFromPoint` no centro do alvo) e
medida a altura tocável.

## Resultado por dispositivo

| Dispositivo (iOS) | Viewport | Inset simulado | Altura da top bar | Clique bloqueado? |
|---|---|---|---|---|
| iPhone SE (15–18) | 375×667 @2x | 20px | 76px | Não |
| iPhone 11 / XR (15+) | 414×896 @2x | 48px | 104px | Não |
| iPhone 13 / 13 Pro (16) | 390×844 @3x | 47px | 103px | Não |
| iPhone 14 Pro (17, Dynamic Island) | 393×852 @3x | 59px | 115px | Não |
| iPhone 15 Pro Max (18) | 430×932 @3x | 59px | 115px | Não |
| iPhone 16 Pro (18) | 402×874 @3x | 62px | 118px | Não |
| iPhone 17 Pro (26, Dynamic Island) | 402×874 @3x | 62px | 118px | Não |
| iPhone 17 Pro Max (26) | 440×956 @3x | 62px | 118px | Não |
| iPad mini (iPadOS 17) | 744×1133 @2x | 24px | 80px | Não |
| iPad Pro 11 (iPadOS 18) | 834×1194 @2x | 24px | 80px | Não |

Nenhum dispositivo apresentou clique bloqueado pela Dynamic Island / notch: em todos os
casos os botões ficam integralmente abaixo da faixa reservada pelo sistema.

## Lista de pendências para priorização

Não há mais falha de clique por causa da ilha. Restam melhorias de ergonomia de toque:

1. **Alvos de 36px de altura** (abaixo dos 44px recomendados pela Apple) — Tema,
   Notificações e Sair, em todos os iPhones e iPads testados. Risco de toque impreciso,
   não de bloqueio.
2. **Busca oculta em tablets** (iPad mini e iPad Pro): o botão dedicado de busca mobile
   não aparece; o campo de busca completo só surge a partir de `sm`. Verificar se é o
   comportamento desejado no iPad mini em retrato.
3. **Menu hambúrguer ausente no iPad Pro 11** (largura ≥ `md`): navegação depende da
   sidebar; confirmar se está adequado em multitarefa/Split View, onde a largura cai.

## Como reproduzir

Script: `/tmp/browser/ios-topbar/check_topbar.py` (Playwright). Ele injeta o inset
simulado e imprime o hit-test em JSON, com capturas em
`/tmp/browser/ios-topbar/screenshots/`.
