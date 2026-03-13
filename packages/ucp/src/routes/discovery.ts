import { Router } from 'express';
import type { StoreInfo, Logger } from '@agentojs/core';

/**
 * Builds the UCP discovery profile JSON.
 */
function buildProfile(
  store: StoreInfo,
  basePath: string,
): Record<string, unknown> {
  const host = new URL(store.backendUrl).host;
  const merchantId = `gid://${host}/Merchant/${store.slug}`;

  return {
    ucp_version: '1.0',
    merchant: {
      id: merchantId,
      name: store.name,
      description: `AI-commerce API for ${store.name}`,
    },
    capabilities: ['checkout', 'products', 'fulfillment', 'identity'],
    transport_bindings: ['rest'],
    auth: {
      type: 'bearer',
      signing_keys: {
        format: 'jwk',
        keys: [],
      },
    },
    supported_currencies: [store.currency.toLowerCase()],
    supported_countries: [store.country.toUpperCase()],
    payment_handlers: ['stripe'],
    endpoints: {
      products: {
        search: { method: 'GET', path: `${basePath}/products` },
        detail: { method: 'GET', path: `${basePath}/products/:id` },
      },
      collections: {
        list: { method: 'GET', path: `${basePath}/collections` },
      },
      checkout_sessions: {
        create: { method: 'POST', path: `${basePath}/checkout-sessions` },
        read: { method: 'GET', path: `${basePath}/checkout-sessions/:id` },
        update: { method: 'PATCH', path: `${basePath}/checkout-sessions/:id` },
        complete: { method: 'POST', path: `${basePath}/checkout-sessions/:id/complete` },
        cancel: { method: 'POST', path: `${basePath}/checkout-sessions/:id/cancel` },
      },
      carts: {
        create: { method: 'POST', path: `${basePath}/carts` },
        get: { method: 'GET', path: `${basePath}/carts/:id` },
        update: { method: 'PATCH', path: `${basePath}/carts/:id` },
        add_item: { method: 'POST', path: `${basePath}/carts/:id/items` },
        remove_item: { method: 'DELETE', path: `${basePath}/carts/:id/items/:itemId` },
        shipping_options: { method: 'GET', path: `${basePath}/carts/:id/shipping` },
        add_shipping: { method: 'POST', path: `${basePath}/carts/:id/shipping` },
      },
      orders: {
        get: { method: 'GET', path: `${basePath}/orders/:id` },
      },
    },
  };
}

export function createDiscoveryRoutes(
  store: StoreInfo,
  basePath: string,
  logger?: Logger,
): Router {
  const router = Router();

  // GET /.well-known/ucp — UCP discovery profile
  router.get('/.well-known/ucp', (_req, res) => {
    res.json(buildProfile(store, basePath));
  });

  return router;
}
