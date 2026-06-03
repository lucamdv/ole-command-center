## Diagnóstico

Hoje as telas `/apolices/$id` e `/apolices/$id/endossos/$num` tentam extrair campos com nomes genéricos (`segurado`, `tomador`, `corretor`, `produto`, `coberturas`) que **não existem** no JSON real do MOTOR OLÉ. O payload segue o padrão Excelsior/PIPE (igual ao HTML anexado), com chaves como `partes[]`, `itens[]`, `datas`, `pagamento.parcelas`, `cotacao_moeda`, `id_produto`, `codigo_grupo_susep_principal`, `numero_proposta_seguradora`. Como nenhuma dessas chaves é reconhecida, tudo cai no `JsonExplorer` cru — daí a sensação de "nada aparece".

Outro ponto: o número do documento (30 dígitos) termina em `000000` quando é a **apólice mãe** e em um sequencial (`000001`, `000002`, …) quando é **endosso**. Hoje exibimos `000000` como se fosse só "Endosso 0", sem dizer ao usuário que aquilo é a emissão original.

## O que vou construir

### 1. Camada de tradução do JSON (`src/lib/excelsior/translate.ts` — novo)

Funções puras que recebem `proposta` (o JSON do endosso) e devolvem objetos tipados, prontos para render:

- `parseDocumento(numero)` → `{ tipo: "APOLICE" | "ENDOSSO", sequencial: string, apoliceBase: string }` baseado nos últimos 6 dígitos.
- `parseDados(proposta)` → nº proposta seguradora, proposta origem, produto, SUSEP grupo/ramo, sistema origem (mapeando código→nome via tabela: `1009 → Olé`, `1000 → Excelsior Seguros`, etc., copiada do `<datalist sistemas-origem>` do HTML), subscritor, resultado subscrição, emissão condicionada a pagamento.
- `parseDatas(proposta.datas)` → início/fim vigência, assinatura, conclusão subscrição, registro/protocolo origem.
- `parsePartes(proposta.partes)` → array de `{ papel, tipo, nome, tipoPessoa, documentos[], endereco, contatos[] }`. Reaproveita as chaves vistas no HTML: SEGURADORA/CONTRATADO, ADMINISTRADORA/INTERMEDIARIO, SEGURADO/CONTRATANTE, BENEFICIARIO. Documentos vêm de `pessoa.documentos[]` (CPF, CNPJ, etc.).
- `parseItens(proposta.itens)` → para cada item: tipo objeto (Pessoa/…), dados do segurado (sexo, ocupação, renda, fumante), coberturas (nome, vigência, limites, beneficiários com parentesco e %), composição de prêmio agrupada por natureza (PREMIO, IOF, INTERMEDIACAO, CUSTOS).
- `parsePagamento(proposta.pagamento)` → parcelas com nº, vencimento, valor BRL/USD, agente cobrador, composição.
- `parseCotacao(proposta.cotacao_moeda)` → moeda, taxa, data PTAX.
- `parseLimite(proposta.limite_maximo_apolice)` → limite máximo da apólice (USD + BRL).

Tudo defensivo (`?? null`, arrays vazios) — campos ausentes simplesmente não renderizam.

### 2. Componentes de card (`src/components/apolice/` — novos)

- `<DadosGeraisCard />` — nº apólice + tag APÓLICE/ENDOSSO, nº proposta, produto, SUSEP, sistema origem, subscritor.
- `<VigenciaCard />` — timeline curta com datas.
- `<PartesList />` — accordion por parte (papel/tipo + nome no header; endereço, documentos e contatos no corpo). Reusa o `Accordion` da UI lib.
- `<ItensCoberturas />` — um card por item com sub-cards de coberturas, beneficiários (com %) e tabela de composição de prêmio.
- `<PagamentoCard />` — tabela de parcelas + totais.
- `<CotacaoMoedaCard />` — só aparece quando a moeda da cobertura ≠ BRL.
- `<RawJsonFallback />` — usa o `JsonExplorer` atual, colapsado, no fim da página, com nota "Dados brutos do MOTOR OLÉ".

### 3. Reescrita das rotas

- `src/routes/apolices.$id.tsx`: header com `parseDocumento` (badge "APÓLICE 056902025…"), depois `DadosGerais`, `Vigencia`, `Partes`, `ItensCoberturas`, `Pagamento`, lista de endossos (já existe — só ajustar para mostrar "ENDOSSO 000001" em vez de "0") e `RawJsonFallback`.
- `src/routes/apolices.$id.endossos.$num.tsx`: mesmos cards, mas com badge "ENDOSSO 000001 da apólice 05690…" e link de volta para a apólice mãe. Hoje só mostra `JsonExplorer` — vai virar uma página completa.

### 4. Listagem `/apolices`

Pequeno ajuste para usar `parseDocumento` no número exibido (badge APÓLICE) e mostrar o **nome do segurado** (vindo de `partes[]` onde `papel=SEGURADO`) na coluna principal — hoje só aparece o número.

## Sobre o payload do n8n

O JSON atual **já tem tudo** que precisamos para os cards acima — confirmei lendo um endosso real do banco (`itens[].coberturas[].beneficiarios`, `partes[].pessoa.documentos`, `pagamento.parcelas`, etc. estão presentes). **Nenhuma mudança no fluxo n8n é necessária** para esta entrega.

Único ponto de atenção que pode aparecer durante a implementação: o campo `partes[].pessoa` (nome, endereço, contatos) — preciso confirmar a forma exata. Se vier achatado em `partes[].nome` em vez de `partes[].pessoa.nome`, ajusto o parser; não muda o plano.

## Detalhes técnicos

- Sem alterações de schema no banco — a `proposta` jsonb já guarda o payload completo.
- Sem alterações no callback `policy-sync-callback.ts`.
- Tabela de tradução de `sistema_origem` fica em `src/lib/excelsior/codes.ts` (mapeamento código→label do `<datalist>` do HTML anexado: 1000 Excelsior, 1001 OnPoint, 1002 Azos, 1003 Justos, 1004 Ebix, 1009 Olé, 1010 Editor de Propostas, 1011 RCP, 1012 Residência - Poupex/Proseg, 1013 Faturamento DEHAB, 1014 Yolo Coliving, 1030 Automações PIPE).
- `extractKnown`/`KNOWN_KEYS` atuais em `apolices.$id.tsx` são removidos.
- Tipagem: novo `src/lib/excelsior/types.ts` com as shapes do JSON Excelsior usadas pelo parser.
