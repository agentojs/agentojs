/**
 * agentMiddleware — Express Router Factory
 *
 * Creates a single Express Router that mounts all three protocols:
 *   /mcp — MCP (Model Context Protocol) via StreamableHTTP
 *   /ucp — UCP (Universal Checkout Protocol) via REST
 *   /acp — ACP (Agent Commerce Protocol) via REST
 *
 * Each protocol can be individually enabled/disabled via options.
 */

import { Router, json } from 'express';
import type { AgentMiddlewareOptions } from './types.js';
import { createMcpHandler } from './mcp-handler.js';
import { createUcpRouter } from '@agentojs/ucp';
import { createAcpRouter } from '@agentojs/acp';

/**
 * Creates an Express Router that mounts all enabled protocol endpoints.
 *
 * Usage:
 * ```ts
 * import express from 'express';
 * import { agentMiddleware } from '@agentojs/express';
 *
 * const app = express();
 * app.use(agentMiddleware({ store, provider }));
 * ```
 */
export function agentMiddleware(options: AgentMiddlewareOptions): Router {
  const {
    store,
    provider,
    scopeChecker,
    webhookEmitter,
    logger,
    stripeSecretKey,
    stripePublishableKey,
    stripeWebhookSecret,
    enableMcp = true,
    enableUcp = true,
    enableAcp = true,
  } = options;

  const router = Router();

  // MCP — StreamableHTTP (POST/GET/DELETE /mcp)
  if (enableMcp) {
    router.use(
      '/mcp',
      json(),
      createMcpHandler(
        { store, provider, scopeChecker, webhookEmitter, logger },
        logger,
      ),
    );
    logger?.log('MCP protocol enabled at /mcp');
  }

  // UCP — REST (GET/POST/PATCH/DELETE /ucp/*)
  if (enableUcp) {
    router.use(
      '/ucp',
      json(),
      createUcpRouter({
        provider,
        store,
        scopeChecker,
        webhookEmitter,
        logger,
        basePath: '/ucp',
      }),
    );
    logger?.log('UCP protocol enabled at /ucp');
  }

  // ACP — REST (POST/GET/PATCH/DELETE /acp/*)
  if (enableAcp) {
    router.use(
      '/acp',
      json(),
      createAcpRouter({
        provider,
        store,
        scopeChecker,
        webhookEmitter,
        logger,
        stripeSecretKey,
        stripePublishableKey,
        stripeWebhookSecret,
      }),
    );
    logger?.log('ACP protocol enabled at /acp');
  }

  return router;
}
