# Cobrança nas telas de apólices e endossos

Adicionar informações de cobrança (status de pagamento, situação de emissão, quitação e vencimento) às telas de apólice e endosso, com uma tag visível de status no topo de cada apólice.

## O que verifiquei na planilha

- 234 linhas, uma por **endosso** (não por apólice), com `numero_apolice`, `numero_endosso` (30 dígitos), `numero_proposta`, `status_pagamento`, `situacao_emissao`, `data_quitacao`, `data_vencimento`.
- Combinações presentes: 132 `Total|Ativa`, 70 `Aberta|Cancelada`, 32 `Aberta|Ativa`. Não há linha `Parcial` — a tag PARCIAL fica implementada para quando aparecer.
- As 49 apólices da planilha existem todas no banco. O `numero_endosso` da planilha corresponde aos **6 últimos dígitos** do número usado no banco (ex.: `...000006` → `000006`), então a ligação é por (`numero_apolice`, últimos 6 dígitos).

## Regra da tag

Calculada por linha de cobrança e exibida:

- `status_pagamento = Total` → **PAGO** (verde)
- `status_pagamento = Parcial` → **PARCIAL** (amarelo)
- `status_pagamento = Aberta` + `situacao_emissao = Ativa` → **ABERTA** (ciano)
- `status_pagamento = Aberta` + `situacao_emissao = Cancelada` → **CANCELADA** (vermelho)

Na tela da **apólice**, a tag exibida é a do registro de cobrança de **maior sequencial de endosso** (a cobrança vigente). Quando a apólice não tem nenhum registro, nenhuma tag é exibida (sem "desconhecido" poluindo a tela).

## Banco de dados

Nova tabela `public.policy_billing`:

- `numero_apolice`, `numero_endosso` (6 dígitos), `numero_proposta`
- `status_pagamento`, `situacao_emissao`, `data_quitacao` (timestamp, pode ser vazio), `data_vencimento` (data)
- chave única (`numero_apolice`, `numero_endosso`) para permitir reenvio sem duplicar
- leitura liberada para usuários autenticados; escrita apenas pelo servidor/admin
- carga inicial: as 234 linhas da planilha inseridas diretamente

## Telas

**Apólice (`/apolices/$id`)**
- Tag de status no cabeçalho, ao lado do número da apólice.
- Nova seção **"Cobrança"** com: status de pagamento, situação da emissão, número da proposta, data de vencimento e data de quitação — mais a lista de cobranças por endosso (tabela compacta com tag por linha).

**Endosso (`/apolices/$id/endossos/$num`)**
- Novo card **"Cobrança"** com a tag e os quatro campos daquele endosso específico; se não houver registro, mostra aviso discreto de "sem dados de cobrança".

**Carteira (`/apolices`)**
- Tag de status na linha de cada apólice, para o status ser visível já na listagem.

## Detalhes técnicos

- Migração cria a tabela com GRANTs e RLS; a carga dos 234 registros vai por inserção de dados (não por migração).
- Novo `src/lib/billing.functions.ts` com server functions autenticadas: cobranças por apólice e mapa de status vigente para a listagem.
- Nova helper `src/lib/billing/status.ts` com a derivação da tag (única fonte da regra) e o componente `BillingBadge` + `CobrancaCard` em `src/components/apolice/cards.tsx`, usando tokens semânticos de cor existentes (verde/amarelo/ciano/vermelho do design system, sem cores hardcoded).
- Hook `src/hooks/use-billing.ts` no padrão dos hooks atuais (react-query).
