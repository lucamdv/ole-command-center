## Bug

Na página de detalhe do endosso (`/apolices/$id/endossos/$num`):

1. O `DocumentoHeader` recebe `endo.numero_apolice` (que termina em `000000`) e por isso o badge fica "APÓLICE" e o número grande mostra o número da apólice base.
2. O breadcrumb mostra "Endosso 000000" pela mesma razão — `parseDocumento` deduz o sequencial a partir desse número, que é o da apólice.

## Correção

Usar o número real do documento do endosso, que vem dentro do envelope como `numero_documento_seguradora` (ex.: `…0001`). É mais confiável que reconstruir a string a partir de `numero_apolice + numero_endosso`.

### 1. `src/lib/excelsior/translate.ts`
- `unwrapProposta` já tem acesso ao `envelope` — passar a expor também `numeroDocumento: string | null` lendo `envelope.numero_documento_seguradora` (com fallback para `envelope.numero_apolice_seguradora`).
- `translateProposta` retorna o novo campo `numeroDocumento`.

### 2. `src/routes/apolices.$id.endossos.$num.tsx`
- Em vez de `parseDocumento(endo.numero_apolice, t.tipoEndosso)`, usar:
  - `parseDocumento(t.numeroDocumento ?? endo.numero_apolice, t.tipoEndosso)` quando houver `numeroDocumento`.
  - Fallback: reconstruir `endo.numero_apolice.slice(0,-6) + normalizeEndossoNum(num)` se o envelope não trouxer o campo.
- Assim `documento.sequencial` passa a ser o sequencial correto (ex.: `000001`) e o badge passa a refletir o tipo de endosso (A/B/C).
- O breadcrumb e o número grande do header automaticamente passam a mostrar o número correto.

### Notas
- Sem mudança em DB, em tipos de coluna ou em sync.
- Não afeta a página da apólice base (lá o `numero_apolice` termina em `000000` mesmo).
