import { Router } from 'express';
import { randomUUID } from 'crypto';
import type { CommerceProvider, StoreInfo, WebhookEmitter, Logger, Address } from '@agentojs/core';
import type { AcpFulfillmentAddress } from '../types.js';
import { AcpSessionManager } from '../session-manager.js';
import { AcpResponseFormatter } from '../response-formatter.js';
import { AcpWebhookEmitter } from '../webhook-service.js';

/**
 * Maps an ACP fulfillment address to the internal Address type.
 */
function mapAcpAddressToInternal(addr: AcpFulfillmentAddress): Address {
  const nameParts = (addr.name || '').split(' ');
  return {
    first_name: nameParts[0] || '',
    last_name: nameParts.slice(1).join(' ') || '',
    address_1: addr.line_one,
    address_2: addr.line_two || null,
    city: addr.city,
    province: addr.state || null,
    postal_code: addr.postal_code,
    country_code: addr.country.toLowerCase(),
    phone: addr.phone_number || null,
  };
}

export interface CheckoutSessionsOptions {
  provider: CommerceProvider;
  store: StoreInfo;
  sessionManager: AcpSessionManager;
  formatter: AcpResponseFormatter;
  webhookEmitter?: WebhookEmitter;
  logger?: Logger;
  /** Stripe instance for payment verification (optional) */
  stripe?: {
    paymentIntents: {
      retrieve(id: string): Promise<{ status: string }>;
    };
  };
  stripePublishableKey?: string;
}

/**
 * Attempts to initialize payment via CommerceProvider when session becomes ready_for_payment.
 */
async function tryInitializePayment(
  checkoutId: string,
  session: { cartId: string; paymentMethod?: unknown },
  provider: CommerceProvider,
  sessionManager: AcpSessionManager,
  publishableKey: string,
  logger?: Logger,
): Promise<void> {
  if (session.paymentMethod) return;

  try {
    const paymentSession = await provider.initializePayment(
      session.cartId,
      'pp_stripe_stripe',
    );

    const paymentIntentId =
      (paymentSession.data?.payment_intent_id as string) ??
      (paymentSession.data?.id as string) ??
      '';
    const clientSecret =
      (paymentSession.data?.client_secret as string) ?? '';

    if (paymentIntentId && clientSecret) {
      sessionManager.updateSession(checkoutId, {
        paymentMethod: {
          type: 'stripe',
          payment_intent_id: paymentIntentId,
          client_secret: clientSecret,
          publishable_key: publishableKey,
        },
      });
    }
  } catch (error) {
    logger?.warn(
      `Payment initialization skipped for session ${checkoutId}: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
  }
}

export function createCheckoutSessionRoutes(
  options: CheckoutSessionsOptions,
): Router {
  const {
    provider,
    store,
    sessionManager,
    formatter,
    webhookEmitter,
    logger,
    stripe,
    stripePublishableKey = '',
  } = options;

  const router = Router();
  const acpWebhook = webhookEmitter
    ? new AcpWebhookEmitter(webhookEmitter, logger)
    : undefined;

  // POST / — create checkout session
  router.post('/', async (req, res, next) => {
    try {
      const { items, buyer, fulfillment_address } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          type: 'invalid_request',
          code: 'invalid',
          message: 'Items array is required and must not be empty.',
        });
        return;
      }

      // Resolve region
      let regionId = store.regionId || '';
      if (!regionId) {
        const regions = await provider.getRegions();
        if (regions.length > 0) {
          regionId = regions[0].id;
        }
      }

      if (!regionId) {
        res.status(400).json({
          type: 'invalid_request',
          code: 'invalid',
          message: 'No region available. Configure a default region on the store.',
        });
        return;
      }

      // Map ACP items format (id = variant_id)
      const cartItems = items.map((i: { id: string; quantity: number }) => ({
        variant_id: i.id,
        quantity: i.quantity,
      }));

      const cart = await provider.createCart(regionId, cartItems);
      const sessionId = randomUUID();

      sessionManager.createSession(sessionId, cart.id, store.slug);

      // Store buyer info if provided
      if (buyer) {
        sessionManager.updateSession(sessionId, { buyer });
      }

      // If fulfillment address provided, update cart and fetch shipping options
      let shippingOptions;
      if (fulfillment_address) {
        const internalAddress = mapAcpAddressToInternal(fulfillment_address);

        await provider.updateCart(cart.id, {
          email: buyer?.email,
          shipping_address: internalAddress,
          billing_address: internalAddress,
        });

        sessionManager.updateSession(sessionId, {
          fulfillmentAddress: fulfillment_address,
        });

        shippingOptions = await provider.getShippingOptions(cart.id);
      } else if (buyer?.email) {
        await provider.updateCart(cart.id, { email: buyer.email });
      }

      // Recalculate session status
      const newStatus = sessionManager.recalculateStatus(sessionId);

      // Initialize payment when session becomes ready_for_payment
      if (newStatus === 'ready_for_payment') {
        const currentSession = sessionManager.getSession(sessionId)!;
        await tryInitializePayment(
          sessionId, currentSession, provider, sessionManager,
          stripePublishableKey, logger,
        );
      }

      const updatedCart = await provider.getCart(cart.id);
      const updatedSession = sessionManager.getSession(sessionId)!;

      logger?.log(`ACP checkout session ${sessionId} created (cart ${cart.id})`);

      res.status(201).json(
        formatter.buildCheckoutSession(
          sessionId, updatedSession, updatedCart, shippingOptions, store,
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  // GET /:id — read checkout session
  router.get('/:id', async (req, res, next) => {
    try {
      const session = sessionManager.getSession(req.params.id);
      if (!session) {
        res.status(404).json({
          type: 'invalid_request',
          code: 'not_found',
          message: `Checkout session ${req.params.id} not found`,
        });
        return;
      }

      const cart = await provider.getCart(session.cartId);

      let shippingOptions;
      if (session.fulfillmentAddress) {
        shippingOptions = await provider.getShippingOptions(session.cartId);
      }

      res.json(
        formatter.buildCheckoutSession(
          req.params.id, session, cart, shippingOptions, store,
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  // PATCH /:id — update checkout session
  router.patch('/:id', async (req, res, next) => {
    try {
      const session = sessionManager.getSession(req.params.id);
      if (!session) {
        res.status(404).json({
          type: 'invalid_request',
          code: 'not_found',
          message: `Checkout session ${req.params.id} not found`,
        });
        return;
      }

      const cartId = session.cartId;
      const { buyer, items, fulfillment_address, fulfillment_option_id } = req.body;

      // Update buyer info
      if (buyer) {
        const mergedBuyer = { ...session.buyer, ...buyer };
        sessionManager.updateSession(req.params.id, { buyer: mergedBuyer });

        if (buyer.email) {
          await provider.updateCart(cartId, { email: buyer.email });
        }
      }

      // Update fulfillment address
      if (fulfillment_address) {
        const internalAddress = mapAcpAddressToInternal(fulfillment_address);

        await provider.updateCart(cartId, {
          shipping_address: internalAddress,
          billing_address: internalAddress,
        });

        sessionManager.updateSession(req.params.id, {
          fulfillmentAddress: fulfillment_address,
        });
      }

      // Update items — recreate cart line items
      if (items) {
        const currentCart = await provider.getCart(cartId);
        for (const item of currentCart.items) {
          await provider.removeLineItem(cartId, item.id);
        }
        for (const item of items) {
          await provider.addLineItem(cartId, item.id, item.quantity);
        }
      }

      // Add shipping method if fulfillment_option_id provided
      if (fulfillment_option_id) {
        await provider.addShippingMethod(cartId, fulfillment_option_id);
        sessionManager.updateSession(req.params.id, {
          fulfillmentOptionId: fulfillment_option_id,
        });
      }

      // Recalculate status
      const newStatus = sessionManager.recalculateStatus(req.params.id);

      // Initialize payment when session becomes ready_for_payment
      if (newStatus === 'ready_for_payment') {
        const currentSession = sessionManager.getSession(req.params.id)!;
        await tryInitializePayment(
          req.params.id, currentSession, provider, sessionManager,
          stripePublishableKey, logger,
        );
      }

      const updatedCart = await provider.getCart(cartId);
      const updatedSession = sessionManager.getSession(req.params.id)!;

      let shippingOptions;
      if (updatedSession.fulfillmentAddress) {
        shippingOptions = await provider.getShippingOptions(cartId);
      }

      logger?.log(`ACP checkout session ${req.params.id} updated`);

      res.json(
        formatter.buildCheckoutSession(
          req.params.id, updatedSession, updatedCart, shippingOptions, store,
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  // POST /:id/complete — complete checkout
  router.post('/:id/complete', async (req, res, next) => {
    try {
      const session = sessionManager.getSession(req.params.id);
      if (!session) {
        res.status(404).json({
          type: 'invalid_request',
          code: 'not_found',
          message: `Checkout session ${req.params.id} not found`,
        });
        return;
      }

      // 405 if already completed or canceled
      if (session.status === 'completed' || session.status === 'canceled') {
        res.status(405).json({
          type: 'invalid_request',
          code: 'method_not_allowed',
          message: `Checkout session is already '${session.status}'. Cannot complete.`,
        });
        return;
      }

      // 400 if not ready for payment
      if (session.status !== 'ready_for_payment') {
        const cart = await provider.getCart(session.cartId);
        const updatedSession = sessionManager.getSession(req.params.id)!;
        const response = formatter.buildCheckoutSession(
          req.params.id, updatedSession, cart, undefined, store,
        );
        response.messages = formatter.buildMessages([
          {
            code: 'missing',
            content: 'Checkout is not ready for payment. Ensure buyer email, fulfillment address, and shipping method are set.',
          },
        ]);
        res.status(400).json(response);
        return;
      }

      // Update buyer info if provided in complete request
      const { buyer } = req.body || {};
      if (buyer) {
        const mergedBuyer = { ...session.buyer, ...buyer };
        sessionManager.updateSession(req.params.id, { buyer: mergedBuyer });
        if (buyer.email) {
          await provider.updateCart(session.cartId, { email: buyer.email });
        }
      }

      // Verify Stripe payment if payment_intent exists in session
      const currentSession = sessionManager.getSession(req.params.id)!;
      if (currentSession.paymentMethod?.payment_intent_id && stripe) {
        try {
          const intent = await stripe.paymentIntents.retrieve(
            currentSession.paymentMethod.payment_intent_id,
          );
          if (intent.status !== 'succeeded') {
            res.status(400).json({
              type: 'payment_error',
              code: 'payment_not_confirmed',
              message: 'Payment has not been confirmed yet',
            });
            return;
          }
        } catch (error) {
          logger?.warn(
            `Failed to verify PaymentIntent: ${error instanceof Error ? error.message : 'unknown'}`,
          );
        }
      }

      // Initialize payment session
      await provider.initializePayment(session.cartId, 'pp_stripe_stripe');

      // Attempt to complete the cart (create order)
      try {
        const order = await provider.completeCart(session.cartId);

        sessionManager.updateSession(req.params.id, { status: 'completed' });
        logger?.log(
          `ACP checkout session ${req.params.id} completed -> order ${order.id}`,
        );

        const cart = await provider.getCart(session.cartId).catch(() => null);
        const updatedSession = sessionManager.getSession(req.params.id)!;

        const response = formatter.buildCheckoutSession(
          req.params.id, updatedSession, cart || ({} as any), undefined, store,
        );
        const permalinkUrl = `${store.backendUrl || ''}/orders/${order.id}`;
        response.order = {
          id: order.id,
          checkout_session_id: req.params.id,
          permalink_url: permalinkUrl,
        };

        // Fire webhook
        if (acpWebhook) {
          acpWebhook.emitOrderCreated(
            {
              checkoutSessionId: req.params.id,
              orderId: order.id,
              permalinkUrl,
            },
            store,
          );
        }

        res.status(201).json(response);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const lowerMessage = message.toLowerCase();

        // Payment declined
        if (
          lowerMessage.includes('payment') ||
          lowerMessage.includes('authorized') ||
          lowerMessage.includes('not allowed') ||
          lowerMessage.includes('declined')
        ) {
          logger?.warn(`ACP checkout session ${req.params.id} payment declined: ${message}`);

          const cart = await provider.getCart(session.cartId);
          const currentSession = sessionManager.getSession(req.params.id)!;
          const response = formatter.buildCheckoutSession(
            req.params.id, currentSession, cart, undefined, store,
          );
          response.messages = formatter.buildMessages([
            { code: 'payment_declined', content: `Payment could not be processed: ${message}` },
          ]);
          res.json(response);
          return;
        }

        // Out of stock
        if (
          lowerMessage.includes('stock') ||
          lowerMessage.includes('inventory') ||
          lowerMessage.includes('unavailable')
        ) {
          logger?.warn(`ACP checkout session ${req.params.id} out of stock: ${message}`);

          const cart = await provider.getCart(session.cartId);
          const currentSession = sessionManager.getSession(req.params.id)!;
          const response = formatter.buildCheckoutSession(
            req.params.id, currentSession, cart, undefined, store,
          );
          response.messages = formatter.buildMessages([
            { code: 'out_of_stock', content: message },
          ]);
          res.json(response);
          return;
        }

        throw error;
      }
    } catch (error) {
      next(error);
    }
  });

  // DELETE /:id — cancel checkout session
  router.delete('/:id', async (req, res, next) => {
    try {
      const session = sessionManager.getSession(req.params.id);
      if (!session) {
        res.status(404).json({
          type: 'invalid_request',
          code: 'not_found',
          message: `Checkout session ${req.params.id} not found`,
        });
        return;
      }

      // 405 if already completed or canceled
      if (session.status === 'completed' || session.status === 'canceled') {
        res.status(405).json({
          type: 'invalid_request',
          code: 'method_not_allowed',
          message: `Checkout session is already '${session.status}'. Cannot cancel.`,
        });
        return;
      }

      sessionManager.updateSession(req.params.id, { status: 'canceled' });

      const cart = await provider.getCart(session.cartId).catch(() => null);
      const updatedSession = sessionManager.getSession(req.params.id)!;

      logger?.log(`ACP checkout session ${req.params.id} canceled`);

      res.json(
        formatter.buildCheckoutSession(
          req.params.id, updatedSession, cart || ({} as any), undefined, store,
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
