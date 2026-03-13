/**
 * Webhook emitter type for notifying external systems of events.
 */
export type WebhookEmitter = (
  url: string,
  secret: string | null,
  event: string,
  data: Record<string, unknown>,
) => void | Promise<void>;
