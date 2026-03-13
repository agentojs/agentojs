import { Router } from 'express';
import type { CommerceProvider, StoreInfo, ScopeChecker, WebhookEmitter, Logger } from '@agentojs/core';
import { requireScope } from './middleware/scope-middleware.js';
import { createProductRoutes } from './routes/products.js';
import { createCartRoutes } from './routes/carts.js';
import { createOrderRoutes } from './routes/orders.js';
import { createCheckoutSessionRoutes } from './routes/checkout-sessions.js';
import { createDiscoveryRoutes } from './routes/discovery.js';
import { UcpSessionManager } from './session-manager.js';
import { UcpResponseFormatter } from './response-formatter.js';

export interface UcpRouterOptions {
  provider: CommerceProvider;
  store: StoreInfo;
  scopeChecker?: ScopeChecker;
  webhookEmitter?: WebhookEmitter;
  logger?: Logger;
  /** Base path used for discovery endpoint URLs (default: '') */
  basePath?: string;
}

/**
 * Creates an Express Router with all UCP endpoints mounted.
 *
 * Mounts:
 *   GET  /products, /products/:id, /collections
 *   POST /carts, GET /carts/:id, PATCH /carts/:id, POST /carts/:id/items,
 *        DELETE /carts/:id/items/:itemId, GET /carts/:id/shipping, POST /carts/:id/shipping
 *   POST /checkout-sessions, GET /checkout-sessions/:id, PATCH /checkout-sessions/:id,
 *        POST /checkout-sessions/:id/complete, POST /checkout-sessions/:id/cancel
 *   GET  /orders/:id
 *   GET  /.well-known/ucp
 */
export function createUcpRouter(options: UcpRouterOptions): Router {
  const { provider, store, scopeChecker, webhookEmitter, logger, basePath = '' } = options;
  const router = Router();
  const sessionManager = new UcpSessionManager();
  const formatter = new UcpResponseFormatter();

  // Products — scope: products:read
  router.use(
    '/products',
    requireScope('products:read', scopeChecker),
    createProductRoutes(provider, logger),
  );

  // Collections — scope: products:read (separate from products path)
  router.get(
    '/collections',
    requireScope('products:read', scopeChecker),
    async (_req, res, next) => {
      try {
        const collections = await provider.getCollections();
        res.json({ collections });
      } catch (error) {
        next(error);
      }
    },
  );

  // Carts — scope: cart:write (covers both read and write operations)
  router.use(
    '/carts',
    requireScope('cart:write', scopeChecker),
    createCartRoutes(provider, store, logger),
  );

  // Checkout sessions — scope: checkout:write
  router.use(
    '/checkout-sessions',
    requireScope('checkout:write', scopeChecker),
    createCheckoutSessionRoutes(provider, store, sessionManager, formatter, webhookEmitter, logger),
  );

  // Orders — scope: orders:read
  router.use(
    '/orders',
    requireScope('orders:read', scopeChecker),
    createOrderRoutes(provider, logger),
  );

  // Discovery — no scope required
  router.use(createDiscoveryRoutes(store, basePath, logger));

  return router;
}
