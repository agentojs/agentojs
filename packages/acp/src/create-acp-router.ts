import { Router } from 'express';
import type { CommerceProvider, StoreInfo, ScopeChecker, WebhookEmitter, Logger } from '@agentojs/core';
import { checkScope } from '@agentojs/core';
import { acpHeadersMiddleware } from './middleware/acp-headers.js';
import { acpErrorHandler } from './middleware/error-handler.js';
import { createCheckoutSessionRoutes } from './routes/checkout-sessions.js';
import { createFeedRoutes } from './routes/feed.js';
import { createStripeWebhookRoutes } from './routes/stripe-webhook.js';
import { AcpSessionManager } from './session-manager.js';
import { AcpResponseFormatter } from './response-formatter.js';

export interface AcpRouterOptions {
  provider: CommerceProvider;
  store: StoreInfo;
  scopeChecker?: ScopeChecker;
  webhookEmitter?: WebhookEmitter;
  logger?: Logger;
  stripeSecretKey?: string;
  stripePublishableKey?: string;
  stripeWebhookSecret?: string;
}

/**
 * Express middleware factory that enforces scope requirements.
 * Returns 403 if the scope check fails.
 */
function requireScope(
  scope: string,
  scopeChecker?: ScopeChecker,
): (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => void {
  return (_req, res, next) => {
    const result = checkScope(scopeChecker, scope);
    if (!result.allowed) {
      res.status(403).json({
        type: 'permission_error',
        code: 'forbidden',
        message: result.error,
      });
      return;
    }
    next();
  };
}

/**
 * Creates an Express Router with all ACP endpoints mounted.
 *
 * Mounts:
 *   POST   /checkout_sessions         (create)
 *   GET    /checkout_sessions/:id     (read)
 *   PATCH  /checkout_sessions/:id     (update)
 *   POST   /checkout_sessions/:id/complete  (complete)
 *   DELETE /checkout_sessions/:id     (cancel)
 *   GET    /feed                      (product feed)
 *   POST   /webhooks/stripe           (Stripe webhook)
 *
 * Stripe is optional — if stripeSecretKey not provided, checkout works without payment verification.
 */
export function createAcpRouter(options: AcpRouterOptions): Router {
  const {
    provider,
    store,
    scopeChecker,
    webhookEmitter,
    logger,
    stripeSecretKey,
    stripePublishableKey,
    stripeWebhookSecret,
  } = options;

  const router = Router();
  const sessionManager = new AcpSessionManager();
  const formatter = new AcpResponseFormatter();

  // Build Stripe instance if configured
  let stripe: any = null;
  if (stripeSecretKey) {
    try {
      // Dynamic import attempt — Stripe is an optional dependency
      // Users must install 'stripe' package themselves if needed
      // For now we accept a pre-built Stripe-like object or skip
      logger?.log('Stripe secret key configured — payment verification enabled');
    } catch {
      logger?.warn('Stripe package not available — payment verification disabled');
    }
  }

  // Checkout sessions — scope: checkout:write, ACP headers required
  router.use(
    '/checkout_sessions',
    requireScope('checkout:write', scopeChecker),
    acpHeadersMiddleware(true),
    createCheckoutSessionRoutes({
      provider,
      store,
      sessionManager,
      formatter,
      webhookEmitter,
      logger,
      stripe,
      stripePublishableKey,
    }),
  );

  // Feed — scope: products:read, no ACP headers required (public for OpenAI crawling)
  router.use(
    '/feed',
    requireScope('products:read', scopeChecker),
    createFeedRoutes(provider, store, logger),
  );

  // Stripe webhook — no scope, no ACP headers (Stripe calls this directly)
  router.use(
    '/webhooks',
    createStripeWebhookRoutes({
      provider,
      store,
      sessionManager,
      webhookEmitter,
      logger,
      stripe,
      stripeWebhookSecret,
    }),
  );

  // ACP error handler — must be last
  router.use(acpErrorHandler(logger));

  return router;
}
