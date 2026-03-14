/**
 * GenericRESTProvider — adapter for arbitrary REST APIs (car dealers, wholesalers, etc.).
 *
 * Connects to any REST API that serves product/catalog data. Methods that
 * require e-commerce primitives (carts, checkout, payment) throw
 * GenericProviderNotImplementedError when the remote API does not support them.
 */

import type { CommerceProvider } from '@agentojs/core';
import type {
  Product,
  Cart,
  Order,
  Collection,
  Region,
  ShippingOption,
  PaymentSession,
  PaginatedResponse,
  ProductSearchFilters,
  OrderListFilters,
  Address,
} from '@agentojs/core';
import type { GenericEndpointsMap, GenericRESTProviderConfig } from './types.js';
import { GenericFieldMapper } from './generic-field-mapper.js';

// ─── Defaults ────────────────────────────────────────────────────

const DEFAULT_ENDPOINTS: Required<GenericEndpointsMap> = {
  products: '/products',
  product: '/products/:id',
  collections: '/collections',
  collection: '/collections/:id',
  createCart: '/carts',
  getCart: '/carts/:id',
  updateCart: '/carts/:id',
  addLineItem: '/carts/:id/line-items',
  removeLineItem: '/carts/:id/line-items/:lineItemId',
  shippingOptions: '/shipping-options',
  addShippingMethod: '/carts/:id/shipping-methods',
  completeCart: '/carts/:id/complete',
  getOrder: '/orders/:id',
  orders: '/orders',
  regions: '/regions',
  health: '/health',
};

// ─── Errors ──────────────────────────────────────────────────────

export class GenericProviderNotImplementedError extends Error {
  constructor(method: string) {
    super(
      `Generic REST provider does not support "${method}". ` +
        `Configure the remote API to provide this endpoint, or use a specialized provider (medusa, woocommerce).`,
    );
    this.name = 'GenericProviderNotImplementedError';
  }
}

// ─── Implementation ──────────────────────────────────────────────

export class GenericRESTProvider implements CommerceProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly apiKeyHeader: string;
  private readonly endpoints: Required<GenericEndpointsMap>;
  private readonly mapper: GenericFieldMapper;

  constructor(config: GenericRESTProviderConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.apiKeyHeader = config.apiKeyHeader ?? 'Authorization';
    this.endpoints = { ...DEFAULT_ENDPOINTS, ...config.endpointsMap };
    this.mapper = new GenericFieldMapper(config.fieldMap);
  }

  // ─── HTTP helper ────────────────────────────────────────────────

  private async fetch<T>(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      params?: Record<string, string>;
    } = {},
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;

    // Replace path params (:id, :lineItemId, etc.)
    if (options.params) {
      for (const [key, value] of Object.entries(options.params)) {
        url = url.replace(`:${key}`, encodeURIComponent(value));
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.apiKey) {
      if (this.apiKeyHeader === 'Authorization') {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      } else {
        headers[this.apiKeyHeader] = this.apiKey;
      }
    }

    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `Generic REST API error: ${response.status} ${response.statusText} — ${text}`,
      );
    }

    return (await response.json()) as T;
  }

  private resolveEndpoint(
    key: keyof GenericEndpointsMap,
    params?: Record<string, string>,
  ): { path: string; params?: Record<string, string> } {
    return { path: this.endpoints[key], params };
  }

  // ─── Products ───────────────────────────────────────────────────

  async searchProducts(
    filters: ProductSearchFilters,
  ): Promise<PaginatedResponse<Product>> {
    const qs = new URLSearchParams();
    if (filters.q) qs.set('q', filters.q);
    if (filters.limit) qs.set('limit', String(filters.limit));
    if (filters.offset) qs.set('offset', String(filters.offset));
    if (filters.category_id?.length)
      filters.category_id.forEach((id) => qs.append('category_id', id));
    if (filters.collection_id?.length)
      filters.collection_id.forEach((id) => qs.append('collection_id', id));

    const queryString = qs.toString();
    const path = `${this.endpoints.products}${queryString ? `?${queryString}` : ''}`;

    const raw = await this.fetch<
      | { products: unknown[]; count?: number; offset?: number; limit?: number }
      | { data: unknown[]; total?: number; count?: number; offset?: number; limit?: number }
      | unknown[]
    >(path);

    // Handle various response shapes
    let items: unknown[];
    let count: number;
    let offset: number;
    let limit: number;

    if (Array.isArray(raw)) {
      items = raw;
      count = raw.length;
      offset = filters.offset ?? 0;
      limit = filters.limit ?? raw.length;
    } else if ('products' in raw) {
      items = raw.products;
      count = raw.count ?? items.length;
      offset = raw.offset ?? filters.offset ?? 0;
      limit = raw.limit ?? filters.limit ?? items.length;
    } else if ('data' in raw) {
      items = raw.data;
      count = raw.total ?? raw.count ?? items.length;
      offset = raw.offset ?? filters.offset ?? 0;
      limit = raw.limit ?? filters.limit ?? items.length;
    } else {
      items = [];
      count = 0;
      offset = 0;
      limit = 0;
    }

    return {
      data: items.map((item) => this.mapper.mapProduct(item)),
      count,
      offset,
      limit,
    };
  }

  async getProduct(id: string): Promise<Product> {
    const { path, params } = this.resolveEndpoint('product', { id });
    const raw = await this.fetch<unknown>(path, { params });

    // Handle { product: {...} } or direct object
    const data =
      raw && typeof raw === 'object' && 'product' in raw
        ? (raw as Record<string, unknown>).product
        : raw;

    return this.mapper.mapProduct(data);
  }

  async getCollections(): Promise<Collection[]> {
    const raw = await this.fetch<
      | { collections: unknown[] }
      | { data: unknown[] }
      | unknown[]
    >(this.endpoints.collections);

    const items = Array.isArray(raw)
      ? raw
      : 'collections' in raw
        ? raw.collections
        : 'data' in raw
          ? raw.data
          : [];

    return items.map((item) => this.mapCollection(item));
  }

  async getCollection(id: string): Promise<Collection> {
    const { path, params } = this.resolveEndpoint('collection', { id });
    const raw = await this.fetch<unknown>(path, { params });

    const data =
      raw && typeof raw === 'object' && 'collection' in raw
        ? (raw as Record<string, unknown>).collection
        : raw;

    return this.mapCollection(data);
  }

  // ─── Cart ───────────────────────────────────────────────────────

  async createCart(
    regionId: string,
    items: Array<{ variant_id: string; quantity: number }>,
  ): Promise<Cart> {
    const raw = await this.fetch<unknown>(this.endpoints.createCart, {
      method: 'POST',
      body: { region_id: regionId, items },
    });

    return this.mapper.mapCart(raw);
  }

  async getCart(cartId: string): Promise<Cart> {
    const { path, params } = this.resolveEndpoint('getCart', { id: cartId });
    const raw = await this.fetch<unknown>(path, { params });

    const data =
      raw && typeof raw === 'object' && 'cart' in raw
        ? (raw as Record<string, unknown>).cart
        : raw;

    return this.mapper.mapCart(data);
  }

  async updateCart(
    cartId: string,
    updates: {
      email?: string;
      shipping_address?: Address;
      billing_address?: Address;
      metadata?: Record<string, unknown>;
    },
  ): Promise<Cart> {
    const { path, params } = this.resolveEndpoint('updateCart', {
      id: cartId,
    });
    const raw = await this.fetch<unknown>(path, {
      method: 'PATCH',
      body: updates,
      params,
    });

    const data =
      raw && typeof raw === 'object' && 'cart' in raw
        ? (raw as Record<string, unknown>).cart
        : raw;

    return this.mapper.mapCart(data);
  }

  async addLineItem(
    cartId: string,
    variantId: string,
    quantity: number,
  ): Promise<Cart> {
    const { path, params } = this.resolveEndpoint('addLineItem', {
      id: cartId,
    });
    const raw = await this.fetch<unknown>(path, {
      method: 'POST',
      body: { variant_id: variantId, quantity },
      params,
    });

    return this.mapper.mapCart(raw);
  }

  async removeLineItem(cartId: string, lineItemId: string): Promise<Cart> {
    const { path, params } = this.resolveEndpoint('removeLineItem', {
      id: cartId,
      lineItemId,
    });
    const raw = await this.fetch<unknown>(path, {
      method: 'DELETE',
      params,
    });

    return this.mapper.mapCart(raw);
  }

  // ─── Shipping ───────────────────────────────────────────────────

  async getShippingOptions(cartId: string): Promise<ShippingOption[]> {
    const qs = `?cart_id=${encodeURIComponent(cartId)}`;
    const raw = await this.fetch<
      | { shipping_options: unknown[] }
      | { data: unknown[] }
      | unknown[]
    >(`${this.endpoints.shippingOptions}${qs}`);

    const items = Array.isArray(raw)
      ? raw
      : 'shipping_options' in raw
        ? raw.shipping_options
        : 'data' in raw
          ? raw.data
          : [];

    return items.map((item) => this.mapToShippingOption(item));
  }

  async addShippingMethod(cartId: string, optionId: string): Promise<Cart> {
    const { path, params } = this.resolveEndpoint('addShippingMethod', {
      id: cartId,
    });
    const raw = await this.fetch<unknown>(path, {
      method: 'POST',
      body: { option_id: optionId },
      params,
    });

    return this.mapper.mapCart(raw);
  }

  // ─── Checkout ───────────────────────────────────────────────────

  async createPaymentSessions(cartId: string): Promise<Cart> {
    throw new GenericProviderNotImplementedError(
      `createPaymentSessions(${cartId})`,
    );
  }

  async selectPaymentSession(
    cartId: string,
    providerId: string,
  ): Promise<Cart> {
    throw new GenericProviderNotImplementedError(
      `selectPaymentSession(${cartId}, ${providerId})`,
    );
  }

  async initializePayment(
    cartId: string,
    providerId: string,
  ): Promise<PaymentSession> {
    throw new GenericProviderNotImplementedError(
      `initializePayment(${cartId}, ${providerId})`,
    );
  }

  async completeCart(cartId: string): Promise<Order> {
    const { path, params } = this.resolveEndpoint('completeCart', {
      id: cartId,
    });
    const raw = await this.fetch<unknown>(path, {
      method: 'POST',
      params,
    });

    return this.mapper.mapOrder(raw);
  }

  // ─── Orders ─────────────────────────────────────────────────────

  async getOrder(orderId: string): Promise<Order> {
    const { path, params } = this.resolveEndpoint('getOrder', { id: orderId });
    const raw = await this.fetch<unknown>(path, { params });

    const data =
      raw && typeof raw === 'object' && 'order' in raw
        ? (raw as Record<string, unknown>).order
        : raw;

    return this.mapper.mapOrder(data);
  }

  async listOrders(
    filters: OrderListFilters,
  ): Promise<PaginatedResponse<Order>> {
    const queryParams = new URLSearchParams();
    if (filters.email) queryParams.set('email', filters.email);
    if (filters.status) queryParams.set('status', filters.status);
    queryParams.set('limit', String(filters.limit ?? 10));
    queryParams.set('offset', String(filters.offset ?? 0));

    const qs = queryParams.toString();
    const raw = await this.fetch<
      | { orders: unknown[]; count?: number; total?: number }
      | { data: unknown[]; count?: number; total?: number }
      | unknown[]
    >(`${this.endpoints.orders}?${qs}`);

    let items: unknown[];
    let total: number;
    if (Array.isArray(raw)) {
      items = raw;
      total = raw.length;
    } else if ('orders' in raw) {
      items = raw.orders;
      total = raw.count ?? raw.total ?? raw.orders.length;
    } else if ('data' in raw) {
      items = raw.data;
      total = raw.count ?? raw.total ?? raw.data.length;
    } else {
      items = [];
      total = 0;
    }

    return {
      data: items.map((item) => this.mapper.mapOrder(item)),
      count: total,
      offset: filters.offset ?? 0,
      limit: filters.limit ?? 10,
    };
  }

  // ─── Regions ────────────────────────────────────────────────────

  async getRegions(): Promise<Region[]> {
    try {
      const raw = await this.fetch<
        | { regions: unknown[] }
        | { data: unknown[] }
        | unknown[]
      >(this.endpoints.regions);

      const items = Array.isArray(raw)
        ? raw
        : 'regions' in raw
          ? raw.regions
          : 'data' in raw
            ? raw.data
            : [];

      return items.map((item) => this.mapToRegion(item));
    } catch {
      // Many generic APIs don't have a regions concept — return a sensible default
      return [
        {
          id: 'default',
          name: 'Default',
          currency_code: 'USD',
          countries: [{ iso_2: 'US', name: 'United States' }],
        },
      ];
    }
  }

  // ─── Health ─────────────────────────────────────────────────────

  async healthCheck(): Promise<boolean> {
    try {
      await this.fetch<unknown>(this.endpoints.health);
      return true;
    } catch {
      return false;
    }
  }

  // ─── Simple mappers (collection, shipping, region) ─────────────

  private s(val: unknown, fallback = ''): string {
    if (val == null) return fallback;
    return String(val);
  }

  private n(val: unknown, fallback = 0): number {
    if (val == null) return fallback;
    const n = Number(val);
    return isNaN(n) ? fallback : n;
  }

  private mapCollection(raw: unknown): Collection {
    const obj = (raw ?? {}) as Record<string, unknown>;
    const rawProducts = obj.products as unknown[] | undefined;

    return {
      id: this.s(obj.id || obj.collection_id),
      title: this.s(obj.title || obj.name),
      handle: this.s(obj.handle || obj.slug),
      products: Array.isArray(rawProducts)
        ? rawProducts.map((p) => this.mapper.mapProduct(p))
        : [],
    };
  }

  private mapToShippingOption(raw: unknown): ShippingOption {
    const obj = (raw ?? {}) as Record<string, unknown>;
    return {
      id: this.s(obj.id || obj.option_id),
      name: this.s(obj.name || obj.title),
      amount: this.n(obj.amount || obj.price),
      region_id: this.s(obj.region_id, 'default'),
    };
  }

  private mapToRegion(raw: unknown): Region {
    const obj = (raw ?? {}) as Record<string, unknown>;
    const rawCountries = obj.countries as unknown[] | undefined;

    return {
      id: this.s(obj.id || obj.region_id),
      name: this.s(obj.name),
      currency_code: this.s(obj.currency_code || obj.currency, 'usd'),
      countries: Array.isArray(rawCountries)
        ? rawCountries.map((c) => {
            const cObj = (c ?? {}) as Record<string, unknown>;
            return {
              iso_2: this.s(cObj.iso_2 || cObj.code),
              name: this.s(cObj.name),
            };
          })
        : [],
    };
  }
}
