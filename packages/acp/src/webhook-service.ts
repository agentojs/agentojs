import type { WebhookEmitter, StoreInfo, Logger } from '@agentojs/core';
import type { AcpWebhookEventType, AcpOrderEventData } from './types.js';

/**
 * AcpWebhookEmitter — Fire-and-forget webhook emitter for ACP order lifecycle events.
 *
 * Delegates to a generic WebhookEmitter function for signing and delivery.
 * Emits to both ACP-specific and generic webhook URLs if configured.
 */
export class AcpWebhookEmitter {
  private readonly emitter: WebhookEmitter;
  private readonly logger?: Logger;

  constructor(emitter: WebhookEmitter, logger?: Logger) {
    this.emitter = emitter;
    this.logger = logger;
  }

  /**
   * Emit an ACP webhook event to the store's configured webhook URLs.
   * Fire-and-forget — never throws, never blocks the caller.
   */
  emitOrderCreated(
    session: { checkoutSessionId: string; orderId: string; permalinkUrl: string },
    store: StoreInfo,
  ): void {
    const data: AcpOrderEventData = {
      type: 'order',
      checkout_session_id: session.checkoutSessionId,
      permalink_url: session.permalinkUrl,
      status: 'created',
      refunds: [],
    };

    this.emitEvent('order_created', data, store);
  }

  /**
   * Emit a generic ACP webhook event.
   */
  emitEvent(
    type: AcpWebhookEventType,
    data: AcpOrderEventData,
    store: StoreInfo,
  ): void {
    // 1. ACP-specific webhook
    if (store.acpWebhookUrl) {
      try {
        this.emitter(
          store.acpWebhookUrl,
          store.acpWebhookSecret ?? null,
          type,
          data as unknown as Record<string, unknown>,
        );
      } catch {
        this.logger?.warn(`Failed to emit ACP webhook for store ${store.slug}`);
      }
    } else {
      this.logger?.debug?.(
        `No acpWebhookUrl configured for store ${store.slug} — skipping ACP webhook`,
      );
    }

    // 2. Generic webhook (sent from all protocols)
    if (store.webhookUrl) {
      try {
        this.emitter(
          store.webhookUrl,
          store.webhookSecret ?? null,
          'checkout.completed',
          {
            protocol: 'acp',
            order_event: type,
            ...data,
          } as unknown as Record<string, unknown>,
        );
      } catch {
        this.logger?.warn(`Failed to emit generic webhook for store ${store.slug}`);
      }
    }
  }
}
