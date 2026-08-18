# Exceções com motivo obrigatório e tags de motivo

## O que muda

1. **Formulário ao criar exceção** — hoje o botão "Ignorar" abre apenas um `confirm()` e grava a exceção sem motivo. Passa a abrir um diálogo com:
   - resumo do que será ignorado (apólice, e o tipo de erro quando aplicável);
   - lista de tags de motivo prontas (chips coloridos) — clicar seleciona;
   - campo de texto para motivo personalizado (até 500 caracteres);
   - botão "Registrar exceção" **desabilitado** até que haja uma tag selecionada ou um texto preenchido. Não é possível salvar sem motivo.
   - Se uma tag for escolhida e nada mais for digitado, o motivo salvo é o nome da tag.

2. **Tags de motivo (nome + cor) nas Configurações** — nova seção na aba "Exceções":
   - tabela/lista das tags com nome, cor e contagem de uso;
   - criar tag (nome + seletor de cor a partir de uma paleta de tokens do design system, com opção de cor livre);
   - renomear, trocar cor e excluir tag;
   - tags são **compartilhadas por toda a equipe** (salvas no banco). Criar/editar/excluir tags fica restrito a admin; todos podem selecionar as tags ao registrar exceções.
   - Semente inicial com tags comuns (ex.: "Regra de negócio", "Erro do motor", "Aprovado pelo cliente", "Duplicidade", "Em análise").

3. **Vale para as duas telas** — o mesmo diálogo e as mesmas tags são usados em:
   - Auditoria → diálogo de achados ("Ignorar apólice" e "Ignorar" por erro);
   - Ferramentas → Extrator de Últimos Endossos ("Ignorar" por apólice).

4. **Exibição** — nas listas de exceções (aba Configurações e extrator), o motivo aparece como chip colorido quando vem de uma tag, e como texto quando é personalizado. A edição do motivo existente também passa a oferecer as tags.

## Detalhes técnicos

- **Banco**: nova tabela `public.exception_reason_tags` (`name` único, `color` texto validado como hex, `created_by`, timestamps + trigger `touch_updated_at`), com GRANTs (`select` para authenticated, all para service_role), RLS: leitura por authenticated, escrita apenas por admin via `has_role`. Adiciono `reason_tag_id uuid null references exception_reason_tags(id) on delete set null` em `audit_ignores` e em `endorsement_exceptions`, mantendo `motivo` como texto (snapshot do motivo final). Migração inclui os INSERTs das tags iniciais.
- **Server fns**: novo `src/lib/exception-tags.functions.ts` (`listExceptionReasonTags`, `addExceptionReasonTag`, `updateExceptionReasonTag`, `removeExceptionReasonTag` — escrita com `assertAdmin`). `addAuditIgnore` / `updateAuditIgnore` e `addEndorsementException` / `updateEndorsementException` passam a aceitar `reason_tag_id` e a **rejeitar motivo vazio** (validação Zod: `motivo` obrigatório quando não há `reason_tag_id`).
- **Hooks**: `src/hooks/use-exception-tags.ts` com React Query + invalidação; `use-audit-ignores.ts` e `use-endorsement-extraction.ts` atualizados para os novos campos.
- **UI**: componente reutilizável `src/components/exceptions/ignore-reason-dialog.tsx` (Dialog + chips de tag + textarea + validação) usado por `findings-list-dialog.tsx` e `ferramentas.extrator-endossos.tsx`; `src/components/settings/reason-tags-manager.tsx` renderizado dentro de `excecoes-tab.tsx`.
- Cores das tags renderizadas via `style` com o hex salvo (dado dinâmico do usuário), com contraste de texto calculado; o restante da UI segue os tokens semânticos existentes.
