import { Router } from 'express';
import type { CommerceProvider, StoreInfo, WebhookEmitter, Logger } from '@agentojs/core';
import { AcpSessionManager } from '../session-manager.js';
import { AcpWebhookEmitter } from '../webhook-service.js';

export interface StripeWebhookOptions {
  provider: CommerceProvider;
  store: StoreInfo;
  sessionManager: AcpSessionManager;
  webhookEmitter?: WebhookEmitter;
  logger?: Logger;
  /**
   * Stripe instance for webhook signature verification.
   * If not provided, webhook endpoint returns 400.
   */
  stripe?: {
    webhooks: {
      constructEvent(
        payload: Buffer | string,
        signature: string,
        secret: string,
      ): { type: string; id: string; data: { object: { id: string; status?: string } } };
    };
  };
  stripeWebhookSecret?: string;
}

export function createStripeWebhookRoutes(
  options: StripeWebhookOptions,
): Router {
  const {
    provider,
    store,
    sessionManager,
    webhookEmitter,
    logger,
    stripe,
    stripeWebhookSecret,
  } = options;

  const router = Router();
  const acpWebhook = webhookEmitter
    ? new AcpWebhookEmitter(webhookEmitter, logger)
    : undefined;

  // POST /stripe — Stripe webhook handler
  router.post('/stripe', async (req, res, next) => {
    try {
      if (!stripe || !stripeWebhookSecret) {
        res.status(400).json({
          type: 'invalid_request',
          code: 'invalid',
          message: 'Stripe is not configured',
        });
        return;
      }

      const signature = req.headers['stripe-signature'] as string;
      if (!signature) {
        res.status(400).json({
          type: 'invalid_request',
          code: 'invalid',
          message: 'Missing stripe-signature header',
        });
        return;
      }

      let event: { type: string; id: string; data: { object: { id: string; status?: string } } };
      try {
        event = stripe.webhooks.constructEvent(
          req.body as Buffer,
          signature,
          stripeWebhookSecret,
        );
      } catch {
        logger?.warn('Invalid Stripe webhook signature');
        res.status(400).json({
          type: 'invalid_request',
          code: 'invalid',
          message: 'Invalid webhook signature',
        });
        return;
      }

      logger?.log(`Stripe ACP webhook: ${event.type} (${event.id})`);

      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object;
          const result = sessionManager.findByPaymentIntentId(paymentIntent.id);
          if (!result) {
            logger?.warn(`No ACP session found for PaymentIntent ${paymentIntent.id}`);
            break;
          }

          const { id: sessionId, session } = result;

          // Skip terminal statuses
          if (session.status === 'completed' || session.status === 'canceled') {
            logger?.log(`Session ${sessionId} already ${session.status}, skipping`);
            break;
          }

          // Try to complete the cart and create order
          try {
            const order = await provider.completeCart(session.cartId);
            sessionManager.updateSession(sessionId, { status: 'completed' });
            logger?.log(`ACP session ${sessionId} auto-completed via webhook -> order ${order.id}`);

            // Fire webhook
            const permalinkUrl = `${store.backendUrl || ''}/orders/${order.id}`;
            acpWebhook?.emitOrderCreated(
              {
                checkoutSessionId: sessionId,
                orderId: order.id,
                permalinkUrl,
              },
              store,
            );
          } catch (error) {
            // Mark completed even if cart completion fails — payment was successful
            sessionManager.updateSession(sessionId, { status: 'completed' });
            logger?.warn(
              `Session ${sessionId} marked completed but cart completion failed: ${error instanceof Error ? error.message : 'unknown'}`,
            );
          }
          break;
        }
        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object;
          const result = sessionManager.findByPaymentIntentId(paymentIntent.id);
          if (!result) {
            logger?.warn(`No ACP session found for failed PaymentIntent ${paymentIntent.id}`);
          } else {
            logger?.warn(`Payment failed for session ${result.id} (PaymentIntent: ${paymentIntent.id})`);
          }
          break;
        }
        default:
          logger?.log(`Unhandled Stripe event: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
