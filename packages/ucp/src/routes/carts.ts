import { Router } from 'express';
import type { CommerceProvider, StoreInfo, Logger, Address } from '@agentojs/core';

export function createCartRoutes(
  provider: CommerceProvider,
  store: StoreInfo,
  logger?: Logger,
): Router {
  const router = Router();

  // POST / — create cart
  router.post('/', async (req, res, next) => {
    try {
      const { region_id, items } = req.body;

      // Resolve region
      let regionId = region_id || store.regionId || '';
      if (!regionId) {
        const regions = await provider.getRegions();
        if (regions.length > 0) {
          regionId = regions[0].id;
        }
      }

      if (!regionId) {
        res.status(400).json({
          error: 'No region available. Provide region_id or configure a default region on the store.',
        });
        return;
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'Items array is required and must not be empty.' });
        return;
      }

      const cartItems = items.map((i: { variant_id: string; quantity: number }) => ({
        variant_id: i.variant_id,
        quantity: i.quantity,
      }));

      const cart = await provider.createCart(regionId, cartItems);
      res.status(201).json({ cart });
    } catch (error) {
      next(error);
    }
  });

  // GET /:id — get cart
  router.get('/:id', async (req, res, next) => {
    try {
      const cart = await provider.getCart(req.params.id);
      res.json({ cart });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('404') || error.message.includes('not found'))
      ) {
        res.status(404).json({ error: `Cart '${req.params.id}' not found` });
        return;
      }
      next(error);
    }
  });

  // PATCH /:id — update cart (email, addresses)
  router.patch('/:id', async (req, res, next) => {
    try {
      const { email, shipping_address, billing_address } = req.body;
      const cart = await provider.updateCart(req.params.id, {
        email,
        shipping_address: shipping_address as Address | undefined,
        billing_address: billing_address as Address | undefined,
      });
      res.json({ cart });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('404') || error.message.includes('not found'))
      ) {
        res.status(404).json({ error: `Cart '${req.params.id}' not found` });
        return;
      }
      next(error);
    }
  });

  // POST /:id/items — add item to cart
  router.post('/:id/items', async (req, res, next) => {
    try {
      const { variant_id, quantity } = req.body;
      const cart = await provider.addLineItem(req.params.id, variant_id, quantity);
      res.status(201).json({ cart });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('404') || error.message.includes('not found'))
      ) {
        res.status(404).json({ error: `Cart '${req.params.id}' not found` });
        return;
      }
      next(error);
    }
  });

  // DELETE /:id/items/:itemId — remove item from cart
  router.delete('/:id/items/:itemId', async (req, res, next) => {
    try {
      const cart = await provider.removeLineItem(req.params.id, req.params.itemId);
      res.json({ cart });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('404') || error.message.includes('not found'))
      ) {
        res.status(404).json({
          error: `Cart '${req.params.id}' or item '${req.params.itemId}' not found`,
        });
        return;
      }
      next(error);
    }
  });

  // GET /:id/shipping — get shipping options
  router.get('/:id/shipping', async (req, res, next) => {
    try {
      const shippingOptions = await provider.getShippingOptions(req.params.id);
      res.json({ shipping_options: shippingOptions });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('404') || error.message.includes('not found'))
      ) {
        res.status(404).json({ error: `Cart '${req.params.id}' not found` });
        return;
      }
      next(error);
    }
  });

  // POST /:id/shipping — add shipping method
  router.post('/:id/shipping', async (req, res, next) => {
    try {
      const { option_id } = req.body;
      const cart = await provider.addShippingMethod(req.params.id, option_id);
      res.json({ cart });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('404') || error.message.includes('not found'))
      ) {
        res.status(404).json({ error: `Cart '${req.params.id}' not found` });
        return;
      }
      next(error);
    }
  });

  return router;
}
