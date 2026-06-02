O problema não está mais no botão em si: o fluxo n8n enviado ainda está configurado com um contrato diferente do app.

Pontos encontrados no JSON do n8n:
- O callback do n8n envia o header `x-audit-secret`, mas o app espera `x-callback-secret`.
- O payload final do n8n não inclui `run_id`, e o endpoint do app precisa desse ID para atualizar a auditoria criada ao clicar no botão.
- O Webhook do n8n não está configurado para responder imediatamente; por isso o app pode interpretar falhas do fluxo como falha no disparo.
- A URL atual ainda é `/webhook-test/...`, que só funciona quando o n8n está em “Listen for test event”.

Plano de correção:

1. Ajustar o app para aceitar o fluxo atual do n8n com tolerância
   - Aceitar tanto `x-callback-secret` quanto `x-audit-secret` no callback.
   - Aceitar `run_id` vindo no corpo ou, se faltar, recuperar do payload original do webhook quando possível.
   - Melhorar a mensagem de erro quando o callback chegar sem `run_id`, explicando exatamente o campo faltante.

2. Ajustar o payload enviado pelo app ao n8n
   - Continuar enviando `run_id`, `callback_url`, `resumo`, `apolices_com_erro` e metadados de execução.
   - Garantir compatibilidade com expressões do n8n como `$('Webhook').item.json.body.callback_url`.
   - Evitar que o n8n leia `resumo.reprovados` de um objeto inexistente.

3. Ajustar o callback para o formato real do relatório n8n
   - Persistir corretamente `resumo.aprovados`, `resumo.reprovados`, `resumo.total_processado`.
   - Persistir `apolices_com_erro[].erros[]` em `audit_findings`.
   - Tratar payload parcial/erro sem quebrar a UI.

4. Recomendar ajuste manual no n8n após a correção do app
   - No nó `HTTP Request`, trocar o header para `x-callback-secret` ou manter `x-audit-secret` se o app passar a aceitar ambos.
   - Adicionar `run_id: {{ $('Webhook').item.json.body.run_id }}` no JSON final enviado ao callback, caso o app não consiga inferir.
   - Para uso contínuo, ativar o workflow e usar `/webhook/...` em vez de `/webhook-test/...`.

5. Validar depois da implementação
   - Clicar em “Rodar Auditoria”.
   - Confirmar que a chamada inicial retorna `running` sem toast de erro imediato.
   - Confirmar que o callback atualiza `audit_runs` para `success` ou `error` com mensagem clara.
   - Confirmar que a tela sai do estado vazio quando houver resultado válido.