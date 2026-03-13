/**
 * @agentojs/express — Types
 *
 * Configuration options for the unified agent middleware.
 */

import type {
  CommerceProvider,
  StoreInfo,
  ScopeChecker,
  WebhookEmitter,
  Logger,
} from '@agentojs/core';

/** Options for the agentMiddleware Express router factory. */
export interface AgentMiddlewareOptions {
  /** Store metadata (slug, name, currency, etc.). */
  store: StoreInfo;
  /** Commerce backend provider (Medusa, WooCommerce, generic, etc.). */
  provider: CommerceProvider;
  /** Optional scope checker for API key authorization. */
  scopeChecker?: ScopeChecker;
  /** Optional webhook emitter for order events. */
  webhookEmitter?: WebhookEmitter;
  /** Optional logger (defaults to ConsoleLogger if not provided). */
  logger?: Logger;
  /** Stripe secret key for ACP payment verification. */
  stripeSecretKey?: string;
  /** Stripe publishable key for ACP payment sessions. */
  stripePublishableKey?: string;
  /** Stripe webhook secret for ACP webhook signature verification. */
  stripeWebhookSecret?: string;
  /** Enable MCP protocol (default: true). */
  enableMcp?: boolean;
  /** Enable UCP protocol (default: true). */
  enableUcp?: boolean;
  /** Enable ACP protocol (default: true). */
  enableAcp?: boolean;
}
