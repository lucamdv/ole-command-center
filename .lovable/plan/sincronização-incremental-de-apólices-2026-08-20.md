# Sincronização incremental de apólices

Hoje o webhook do MOTOR OLÉ recebe apenas `run_id`, `callback_url`, `trigger` e `at`, e o motor reprocessa todas as apólices e todos os endossos. A mudança envia, junto com a chamada, o último endosso já presente na plataforma para cada apólice, para o motor devolver somente os endossos novos.

## Novo payload enviado ao motor

```text
{
  "run_id": "<uuid>",
  "callback_url": "https://.../api/public/policy-sync-callback?run_id=<uuid>",
  "trigger": "ole-copilot-policies",
  "at": "2026-08-20T20:00:00.000Z",
  "ultimos_endossos_plataforma": {
    "123456789": 2,
    "987654321": 0
  }
}
```

- Chave: número da apólice como está na plataforma.
- Valor: maior sequencial de endosso já armazenado, como número inteiro (0 = só a apólice base).
- Se a plataforma ainda não tem apólices, o objeto vai vazio (`{}`) — sinal para o motor rodar carga completa.

## Como o número é calculado

Para cada apólice, olhamos o histórico de endossos gravado e usamos o maior sequencial (o mesmo critério já usado hoje para exibir "endosso atual"), convertido de `"000002"` para `2`. Quando não há histórico, usamos o campo de endosso atual da apólice; na falta dos dois, `0`.

## Retorno incremental (parte crítica)

Hoje o callback apaga todos os endossos da apólice e reinsere o histórico completo recebido. Com retorno incremental isso destruiria o histórico existente. Ajustes no callback:

- Remover o `delete` de endossos e passar a gravar por upsert na chave (apólice + número de endosso), assim endossos novos entram e os já existentes são atualizados sem perder nada.
- Calcular a `ordem` de cada endosso a partir do próprio número sequencial, em vez do índice do array recebido (que agora pode conter só os novos).
- `numero_endosso_atual` da apólice passa a ser o maior entre o que já existe no banco e o que veio no payload, para uma resposta parcial nunca rebaixar a apólice.
- Apólices que voltarem sem nenhum endosso novo continuam válidas: atualizamos só `last_sync_run_id`/`updated_at`, sem sobrescrever proposta/prêmio com vazio.
- Contagem de `total_apolices` do run passa a refletir apólices efetivamente atualizadas; runs sem novidade terminam com sucesso e zero atualizações.

## Detalhes técnicos

- `src/lib/policies.functions.ts` → `runPolicySyncImpl`: consulta `policies` + `endorsements` via `supabaseAdmin`, monta o mapa `ultimos_endossos_plataforma` e o inclui no body do `fetch` para `N8N_MOTOR_POLICIES_URL`. Mesmo caminho serve para disparo manual, serverFn protegida e hook do agendador (`/api/public/hooks/policy-sync`), sem mudança nesses chamadores.
- `src/routes/api/public/policy-sync-callback.ts`: troca `delete + insert` por `upsert` com `onConflict: "policy_id,numero_endosso"` (a restrição única já existe no banco), ordem derivada do sequencial, e proteção do `numero_endosso_atual`/proposta contra regressão. Continua aceitando as variações de formato de payload já suportadas.
- Nenhuma migração de banco é necessária.

## Observação

O lado do n8n precisa passar a ler `ultimos_endossos_plataforma` e filtrar os endossos maiores que o valor informado por apólice; a plataforma fica compatível com ambos os comportamentos (payload completo ou incremental).
