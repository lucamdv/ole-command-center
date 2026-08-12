# Limpeza de resíduos: Oléver, Calendário e página Endossos

## Resultado da varredura

**Código da aplicação: limpo.** Não há nenhuma referência restante ao Oléver (nenhum arquivo, rota, import, item de menu ou aba de configurações), nem à ferramenta de Calendário. As ocorrências de "endossos" que existem são todas legítimas (Extrator de Últimos Endossos, histórico de endossos dentro de cada apólice, cartões do dashboard).

**Banco de dados: limpo.** Nenhuma tabela ou função do Oléver/Calendário permanece.

**O que sobrou de fato** (resíduos invisíveis, sem impacto visual):

1. Pacotes instalados que nenhum arquivo usa mais — vinham do chat do Oléver e do editor/arraste do Calendário:
   - `@streamdown/cjk`, `@streamdown/code`, `@streamdown/math`, `@streamdown/mermaid`
   - `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`
   - `@dnd-kit/core`, `@dnd-kit/sortable`
   - `shiki`, `nanoid`
2. A extensão de banco `vector` (pgvector), instalada apenas para a busca semântica do Oléver.
3. A rota `/endossos` existe somente como redirecionamento permanente para `/apolices` (intencional, para não quebrar links antigos) — será mantida.

## Ações propostas

1. Remover os 12 pacotes órfãos listados acima, reduzindo o peso do build.
2. Remover a extensão `vector` do banco (migração), já que nenhuma tabela a usa.
3. Rodar o build para confirmar que nada dependia desses pacotes indiretamente.
4. Manter o redirect `/endossos` → `/apolices`.

## Detalhes técnicos

- Remoção via `bun remove` dos pacotes; nenhuma alteração de código é necessária, pois já não há imports.
- Migração: `DROP EXTENSION IF EXISTS vector;` (a extensão está em `extensions`, sem objetos dependentes).
- Componentes shadcn que permanecem e continuam em uso: `ui/calendar.tsx` (usado pelo filtro de datas do Analytics, via `react-day-picker`), `ui/resizable.tsx`, `ui/carousel.tsx`, `ui/drawer.tsx`, `ui/input-otp.tsx`.
