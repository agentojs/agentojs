/**
 * Configuration types for @agentojs/generic.
 */

// ─── Endpoints ────────────────────────────────────────────────────

export interface GenericEndpointsMap {
  /** GET products list (default: /products) */
  products?: string;
  /** GET single product (default: /products/:id) */
  product?: string;
  /** GET collections list (default: /collections) */
  collections?: string;
  /** GET single collection (default: /collections/:id) */
  collection?: string;
  /** POST create cart (default: /carts) */
  createCart?: string;
  /** GET cart by id (default: /carts/:id) */
  getCart?: string;
  /** PATCH update cart (default: /carts/:id) */
  updateCart?: string;
  /** POST add line item (default: /carts/:id/line-items) */
  addLineItem?: string;
  /** DELETE remove line item (default: /carts/:id/line-items/:lineItemId) */
  removeLineItem?: string;
  /** GET shipping options (default: /shipping-options) */
  shippingOptions?: string;
  /** POST add shipping method (default: /carts/:id/shipping-methods) */
  addShippingMethod?: string;
  /** POST complete cart (default: /carts/:id/complete) */
  completeCart?: string;
  /** GET order (default: /orders/:id) */
  getOrder?: string;
  /** GET orders list (default: /orders) */
  orders?: string;
  /** GET regions (default: /regions) */
  regions?: string;
  /** GET health check (default: /health) */
  health?: string;
}

// ─── Field Mapping ────────────────────────────────────────────────

export interface GenericFieldMap {
  product?: Record<string, string>;
  cart?: Record<string, string>;
  order?: Record<string, string>;
}

// ─── Backend Config ───────────────────────────────────────────────

export interface GenericRESTBackendConfig {
  baseUrl: string;
  apiKey: string;
  /** Header name for the API key (default: Authorization with Bearer prefix) */
  apiKeyHeader?: string;
  /** Custom endpoint paths (merged with defaults) */
  endpointsMap?: GenericEndpointsMap;
  /** Custom field mappings for response transformation */
  fieldMap?: GenericFieldMap;
}
