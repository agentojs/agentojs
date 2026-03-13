import { Router } from 'express';
import { randomUUID } from 'crypto';
import type { CommerceProvider, StoreInfo, WebhookEmitter, Logger, Address } from '@agentojs/core';
import type { UcpFulfillmentAddress } from '../types.js';
import { UcpSessionManager } from '../session-manager.js';
import { UcpResponseFormatter } from '../response-formatter.js';

/**
 * Maps a UCP fulfillment address DTO to the internal Address type.
 */
function mapUcpAddressToInternal(addr: UcpFulfillmentAddressDto): Address {
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

/**
 * Maps a UCP fulfillment address DTO to the session's UcpFulfillmentAddress.
 */
function mapDtoToSessionAddress(addr: UcpFulfillmentAddressDto): UcpFulfillmentAddress {
  return {
    line_one: addr.line_one,
    line_two: addr.line_two,
    city: addr.city,
    state: addr.state,
    country: addr.country,
    postal_code: addr.postal_code,
    name: addr.name,
    phone_number: addr.phone_number,
  };
}

interface UcpFulfillmentAddressDto {
  name?: string;
  line_one: string;
  line_two?: string;
  city: string;
  state?: string;
  country: string;
  postal_code: string;
  phone_number?: string;
}

export function createCheckoutSessionRoutes(
  provider: CommerceProvider,
  store: StoreInfo,
  sessionManager: UcpSessionManager,
  formatter: UcpResponseFormatter,
  webhookEmitter?: WebhookEmitter,
  logger?: Logger,
): Router {
  const router = Router();

  // POST / — create checkout session
  router.post('/', async (req, res, next) => {
    try {
      const { items, buyer, fulfillment } = req.body;

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
          error: 'No region available. Configure a default region on the store.',
        });
        return;
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'Items array is required.' });
        return;
      }

      // Map UCP items format (id = variant_id)
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
      if (fulfillment?.address) {
        const internalAddress = mapUcpAddressToInternal(fulfillment.address);

        await provider.updateCart(cart.id, {
          email: buyer?.email,
          shipping_address: internalAddress,
          billing_address: internalAddress,
        });

        sessionManager.updateSession(sessionId, {
          fulfillmentAddress: mapDtoToSessionAddress(fulfillment.address),
        });

        shippingOptions = await provider.getShippingOptions(cart.id);
      } else if (buyer?.email) {
        await provider.updateCart(cart.id, { email: buyer.email });
      }

      const updatedCart = await provider.getCart(cart.id);
      const updatedSession = sessionManager.getSession(sessionId)!;

      logger?.log(`UCP checkout session ${sessionId} created (cart ${cart.id})`);

      res.status(201).json(
        formatter.formatCart(sessionId, updatedSession, updatedCart, store, shippingOptions),
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
        res.status(404).json({ error: `Checkout session ${req.params.id} not found` });
        return;
      }

      const cart = await provider.getCart(session.cartId);

      let shippingOptions;
      if (session.fulfillmentAddress) {
        shippingOptions = await provider.getShippingOptions(session.cartId);
      }

      res.json(
        formatter.formatCart(req.params.id, session, cart, store, shippingOptions),
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
        res.status(404).json({ error: `Checkout session ${req.params.id} not found` });
        return;
      }

      const cartId = session.cartId;
      const { buyer, fulfillment, items } = req.body;

      // Update buyer info
      if (buyer) {
        const mergedBuyer = { ...session.buyer, ...buyer };
        sessionManager.updateSession(req.params.id, { buyer: mergedBuyer });

        if (buyer.email) {
          await provider.updateCart(cartId, { email: buyer.email });
        }
      }

      // Update fulfillment address
      if (fulfillment?.address) {
        const internalAddress = mapUcpAddressToInternal(fulfillment.address);

        await provider.updateCart(cartId, {
          shipping_address: internalAddress,
          billing_address: internalAddress,
        });

        sessionManager.updateSession(req.params.id, {
          fulfillmentAddress: mapDtoToSessionAddress(fulfillment.address),
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

      // Add shipping method if fulfillment method_id provided
      if (fulfillment?.method_id) {
        await provider.addShippingMethod(cartId, fulfillment.method_id);
        sessionManager.updateSession(req.params.id, {
          fulfillmentMethodId: fulfillment.method_id,
        });
      }

      // Get updated cart + shipping options
      const updatedCart = await provider.getCart(cartId);
      const updatedSession = sessionManager.getSession(req.params.id)!;

      let shippingOptions;
      if (updatedSession.fulfillmentAddress) {
        shippingOptions = await provider.getShippingOptions(cartId);
      }

      logger?.log(`UCP checkout session ${req.params.id} updated`);

      res.json(
        formatter.formatCart(req.params.id, updatedSession, updatedCart, store, shippingOptions),
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
        res.status(404).json({ error: `Checkout session ${req.params.id} not found` });
        return;
      }

      // 405 if already completed or canceled
      if (session.status === 'completed' || session.status === 'canceled') {
        res.status(405).json({
          error: `Checkout session is already '${session.status}'. Cannot complete.`,
        });
        return;
      }

      // 400 if not ready for complete
      if (!sessionManager.isReadyForComplete(req.params.id)) {
        const cart = await provider.getCart(session.cartId);
        const currentSession = sessionManager.getSession(req.params.id)!;
        const response = formatter.formatCart(req.params.id, currentSession, cart, store);
        response.messages = formatter.buildMessages([
          {
            code: 'missing',
            content: 'Checkout is not ready for completion. Ensure buyer email, fulfillment address, and shipping method are set.',
          },
        ]);
        res.status(400).json(response);
        return;
      }

      // Initialize payment
      await provider.initializePayment(session.cartId, 'pp_stripe_stripe');

      // Attempt to complete the cart (create order)
      try {
        const order = await provider.completeCart(session.cartId);

        sessionManager.updateSession(req.params.id, { status: 'completed' });
        logger?.log(`UCP checkout session ${req.params.id} completed → order ${order.id}`);

        const cart = await provider.getCart(session.cartId).catch(() => null);
        const updatedSession = sessionManager.getSession(req.params.id)!;

        const response = formatter.formatCheckoutSession(
          req.params.id,
          updatedSession,
          cart || ({} as any),
          store,
          order.id,
        );

        // Fire webhook
        if (store.webhookUrl && webhookEmitter) {
          webhookEmitter(
            store.webhookUrl,
            store.webhookSecret || null,
            'checkout.completed',
            {
              protocol: 'ucp',
              order_id: order.id,
              checkout_session_id: req.params.id,
              permalink_url: `${store.backendUrl || ''}/orders/${order.id}`,
              store_slug: store.slug,
            },
          );
        }

        res.status(201).json(response);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const lowerMessage = message.toLowerCase();

        // Payment failure → requires_escalation
        if (
          lowerMessage.includes('payment') ||
          lowerMessage.includes('authorized') ||
          lowerMessage.includes('not allowed') ||
          lowerMessage.includes('declined')
        ) {
          logger?.warn(`UCP checkout session ${req.params.id} payment failed: ${message}`);

          sessionManager.updateSession(req.params.id, { status: 'requires_escalation' });

          const cart = await provider.getCart(session.cartId);
          const currentSession = sessionManager.getSession(req.params.id)!;
          const response = formatter.formatCart(req.params.id, currentSession, cart, store);
          response.messages = formatter.buildMessages([
            { code: 'payment_failed', content: `Payment could not be processed: ${message}` },
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
          logger?.warn(`UCP checkout session ${req.params.id} out of stock: ${message}`);

          sessionManager.updateSession(req.params.id, { status: 'requires_escalation' });

          const cart = await provider.getCart(session.cartId);
          const currentSession = sessionManager.getSession(req.params.id)!;
          const response = formatter.formatCart(req.params.id, currentSession, cart, store);
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

  // POST /:id/cancel — cancel checkout session
  router.post('/:id/cancel', async (req, res, next) => {
    try {
      const session = sessionManager.getSession(req.params.id);
      if (!session) {
        res.status(404).json({ error: `Checkout session ${req.params.id} not found` });
        return;
      }

      // 405 if already completed or canceled
      if (session.status === 'completed' || session.status === 'canceled') {
        res.status(405).json({
          error: `Checkout session is already '${session.status}'. Cannot cancel.`,
        });
        return;
      }

      sessionManager.updateSession(req.params.id, { status: 'canceled' });

      const cart = await provider.getCart(session.cartId).catch(() => null);
      const updatedSession = sessionManager.getSession(req.params.id)!;

      logger?.log(`UCP checkout session ${req.params.id} canceled`);

      res.json(
        formatter.formatCart(req.params.id, updatedSession, cart || ({} as any), store),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
