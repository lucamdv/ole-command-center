/**
 * Modo do webhook n8n por usuário (preferência local, não afeta outros users).
 * - "production": usa o caminho /webhook/ (fluxo ativo do n8n)
 * - "test": usa o caminho /webhook-test/ (requer "Listen for test event" no n8n)
 */
export type WebhookMode = "test" | "production";

export const WEBHOOK_MODE_KEY = "ole.webhook.mode.v1";
export const DEFAULT_WEBHOOK_MODE: WebhookMode = "production";

export function resolveWebhookUrl(url: string, mode?: WebhookMode | null): string {
  if (!mode) return url;
  if (mode === "production") return url.replace("/webhook-test/", "/webhook/");
  return url.includes("/webhook-test/") ? url : url.replace("/webhook/", "/webhook-test/");
}
