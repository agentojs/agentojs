// @agentojs/core — Core types and CommerceProvider interface

export type {
  Product,
  ProductVariant,
  Price,
  ProductImage,
  ProductOption,
  ProductCategory,
  ProductTag,
  Collection,
  Cart,
  LineItem,
  Address,
  ShippingMethod,
  ShippingOption,
  PaymentSession,
  Order,
  Fulfillment,
  TrackingLink,
  FulfillmentItem,
  Region,
  Country,
  PaginatedResponse,
  ProductSearchFilters,
  OrderListFilters,
} from './types.js';

export type { CommerceProvider } from './commerce-provider.js';

// v0.3.0 — StoreInfo, ScopeChecker, Logger, Currency Utils
export type { StoreInfo } from './store-info.js';
export type { ScopeChecker } from './scope-checker.js';
export { checkScope } from './scope-checker.js';
export type { WebhookEmitter } from './webhook-emitter.js';
export type { Logger } from './logger.js';
export { ConsoleLogger } from './logger.js';
export {
  getCurrencyDecimals,
  toMinorUnits,
  fromMinorUnits,
  formatPrice,
} from './currency.js';

// v0.3.0 — createAgent convenience factory
export type { AgentOptions, AgentInstance } from './create-agent.js';
export { createAgent } from './create-agent.js';
