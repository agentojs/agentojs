/**
 * createAgent — Convenience Factory
 *
 * Creates a fully configured Express app with all protocol endpoints mounted.
 * Dynamically imports @agentojs/express to avoid a hard dependency.
 *
 * Usage:
 * ```ts
 * import { createAgent } from '@agentojs/core';
 *
 * const agent = await createAgent({
 *   store: { slug: 'my-store', name: 'My Store', currency: 'usd', country: 'us', backendUrl: 'https://...' },
 *   provider: myCommerceProvider,
 * });
 * await agent.start(3000);
 * ```
 */

import type {
  CommerceProvider,
  StoreInfo,
  ScopeChecker,
  WebhookEmitter,
  Logger,
} from './index.js';

/** Options for createAgent, extending AgentMiddlewareOptions with server config. */
export interface AgentOptions {
  /** Store metadata. */
  store: StoreInfo;
  /** Commerce backend provider. */
  provider: CommerceProvider;
  /** Optional scope checker. */
  scopeChecker?: ScopeChecker;
  /** Optional webhook emitter. */
  webhookEmitter?: WebhookEmitter;
  /** Optional logger. */
  logger?: Logger;
  /** Stripe secret key for ACP. */
  stripeSecretKey?: string;
  /** Stripe publishable key for ACP. */
  stripePublishableKey?: string;
  /** Stripe webhook secret for ACP. */
  stripeWebhookSecret?: string;
  /** Enable MCP (default: true). */
  enableMcp?: boolean;
  /** Enable UCP (default: true). */
  enableUcp?: boolean;
  /** Enable ACP (default: true). */
  enableAcp?: boolean;
  /** Server port (default: 3000). */
  port?: number;
  /** CORS origins to allow. */
  cors?: string[];
  /** Enable GET /health endpoint (default: true). */
  healthCheck?: boolean;
}

/** Return type of createAgent. */
export interface AgentInstance {
  /** The underlying Express application (for advanced configuration). */
  app: import('express').Express;
  /** Start listening on the configured port. */
  start(port?: number): Promise<void>;
}

/**
 * Creates a fully configured Express app with all protocol endpoints.
 *
 * Requires `@agentojs/express` and `express` to be installed as peer dependencies.
 * Uses dynamic import to avoid hard dependency from core on express.
 */
export async function createAgent(options: AgentOptions): Promise<AgentInstance> {
  const {
    port: defaultPort = 3000,
    cors: corsOrigins,
    healthCheck = true,
    ...middlewareOptions
  } = options;

  // Dynamic imports — express and @agentojs/express are optional peer deps
  const expressModule = await import('express');
  const express = expressModule.default ?? expressModule;
  const { agentMiddleware } = await import('@agentojs/express');

  const app = express();

  // CORS headers
  if (corsOrigins && corsOrigins.length > 0) {
    app.use((_req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
      const origin = _req.headers.origin;
      if (origin && corsOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-session-id, idempotency-key, request-id, api-version, openai-ephemeral-user-id');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      if (_req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }
      next();
    });
  }

  // Health check
  if (healthCheck) {
    app.get('/health', (_req: import('express').Request, res: import('express').Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  }

  // Mount all protocols
  app.use(agentMiddleware(middlewareOptions));

  return {
    app,
    start(port?: number): Promise<void> {
      const listenPort = port ?? defaultPort;
      return new Promise((resolve) => {
        app.listen(listenPort, () => {
          options.logger?.log(`AgentOJS server listening on port ${listenPort}`);
          resolve();
        });
      });
    },
  };
}
