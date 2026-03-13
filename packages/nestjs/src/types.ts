/**
 * @agentojs/nestjs — Types
 *
 * Configuration options for the AgentOJS NestJS module.
 */

import type {
  CommerceProvider,
  StoreInfo,
  ScopeChecker,
  WebhookEmitter,
  Logger,
} from '@agentojs/core';
import type { InjectionToken, ModuleMetadata, OptionalFactoryDependency } from '@nestjs/common';

/** Options for AgentOJSModule.register(). */
export interface AgentOJSModuleOptions {
  /** Store metadata (slug, name, currency, etc.). */
  store: StoreInfo;
  /** Commerce backend provider (Medusa, WooCommerce, generic, etc.). */
  provider: CommerceProvider;
  /** Base path for protocol routes (default: '/ai'). */
  basePath?: string;
  /** Optional scope checker for API key authorization. */
  scopeChecker?: ScopeChecker;
  /** Optional webhook emitter for order events. */
  webhookEmitter?: WebhookEmitter;
  /** Optional logger. */
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

/** Options for AgentOJSModule.registerAsync(). */
export interface AgentOJSAsyncModuleOptions extends Pick<ModuleMetadata, 'imports'> {
  /** Factory function returning AgentOJSModuleOptions. */
  useFactory: (...args: unknown[]) => AgentOJSModuleOptions | Promise<AgentOJSModuleOptions>;
  /** Dependencies to inject into the factory function. */
  inject?: (InjectionToken | OptionalFactoryDependency)[];
}
