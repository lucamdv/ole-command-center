# Remoção do Oléver, do Calendário e da página Endossos

Três remoções completas, sem deixar resquícios. O **Extrator de Últimos Endossos** e o histórico de endossos dentro de Apólices continuam intactos.

## 1. Oléver (assistente de IA)

- Remover a página `/intelligence` e o item "Oléver" da barra lateral e da paleta de comandos.
- Remover a rota de chat da IA, o motor de busca semântica (RAG) e a memória do assistente.
- Remover da tela de Configurações → Dados: o bloco "Inteligência do Oléver" (reindexar), o botão de limpar conversas e os contadores de threads/mensagens.
- Banco: apagar as tabelas `oliver_threads`, `oliver_messages`, `oliver_knowledge`, `oliver_memory` e a função de busca semântica.

## 2. Ferramenta Calendário

- Remover a página `/ferramentas/calendario`, todos os componentes de calendário (mês/semana/dia/lista, diálogo de atividade, filtros) e o processador de lembretes.
- Remover o cartão "Calendário" da tela de Ferramentas (fica só o Extrator de Endossos).
- Banco: apagar as tabelas `calendar_activities`, `calendar_attachments`, `calendar_notifications`, `calendar_reminders`, `calendar_saved_views` e remover o bucket de anexos do calendário.
- Remover o segredo do webhook de lembretes (não será mais usado).

## 3. Página "Endossos"

- Excluir a rota `/endossos` e o link "Endossos" da paleta de comandos.
- Se essa rota estiver publicada, redirecionar `/endossos` para `/apolices` para não quebrar links antigos.
- Nada muda na visão de endossos dentro de cada apólice (`/apolices/:id`).

## Detalhes técnicos

Arquivos removidos:
`src/routes/_authenticated/intelligence.tsx`, `src/routes/api/oliver-chat.ts`, `src/lib/oliver.functions.ts`, `src/lib/oliver-rag.server.ts`, `src/routes/_authenticated/ferramentas.calendario.tsx`, `src/components/calendar/*`, `src/lib/calendar.functions.ts`, `src/lib/calendar/*`, `src/routes/api/public/calendar-reminders-tick.ts`, `src/routes/_authenticated/endossos.tsx`.

Arquivos editados: `src/components/layout/sidebar.tsx`, `src/components/layout/command-palette.tsx`, `src/routes/_authenticated/ferramentas.index.tsx`, `src/components/settings/dados-tab.tsx`, `src/lib/settings.functions.ts` (remover `purgeOliver` e contadores do Oléver).

Dependências: `ai`/SDK do chat e `rrule` saem do projeto se não houver outro uso — isso também reduz o tamanho do bundle, que hoje está estourando a memória no build.

Banco (uma migração): `DROP TABLE` das 4 tabelas do Oléver e das 5 do calendário (com `CASCADE` para triggers/índices), `DROP FUNCTION match_oliver_knowledge`. `src/integrations/supabase/types.ts` é regerado automaticamente. `src/components/ui/calendar.tsx` permanece (usado pelo filtro de datas do Analytics).

Verificação final: busca por "oliver/oléver", "calendar" e "/endossos" no código, mais build e navegação nas telas afetadas.
