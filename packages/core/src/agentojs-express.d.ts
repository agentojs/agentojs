/**
 * Type declaration for dynamic import of @agentojs/express.
 * This avoids a circular build dependency (core ← express → core).
 * At runtime, @agentojs/express must be installed as a peer dependency.
 */
declare module '@agentojs/express' {
  import type { Router } from 'express';

  interface AgentMiddlewareOptions {
    store: import('./store-info.js').StoreInfo;
    provider: import('./commerce-provider.js').CommerceProvider;
    scopeChecker?: import('./scope-checker.js').ScopeChecker;
    webhookEmitter?: import('./webhook-emitter.js').WebhookEmitter;
    logger?: import('./logger.js').Logger;
    stripeSecretKey?: string;
    stripePublishableKey?: string;
    stripeWebhookSecret?: string;
    enableMcp?: boolean;
    enableUcp?: boolean;
    enableAcp?: boolean;
  }

  export function agentMiddleware(options: AgentMiddlewareOptions): Router;
}
