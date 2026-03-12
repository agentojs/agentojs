/**
 * MedusaBackend — Medusa.js v2 REST API implementation of CommerceBackend.
 *
 * Wraps Medusa's Store API to provide typed access to products, carts,
 * checkout, and orders. Uses native fetch() — zero runtime dependencies.
 */

import type {
  CommerceBackend,
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

export class MedusaApiError extends Error {
  constructor(
    public status: number,
    public body: string,
    public url: string,
  ) {
    super(`Medusa API error ${status}: ${body} (${url})`);
    this.name = 'MedusaApiError';
  }
}

export interface MedusaBackendConfig {
  backendUrl: string;
  apiKey: string;
  regionId?: string;
}

export class MedusaBackend implements CommerceBackend {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly regionId: string;
  private cachedRegionId: string | null = null;

  constructor(cfg: MedusaBackendConfig) {
    this.baseUrl = cfg.backendUrl;
    this.apiKey = cfg.apiKey;
    this.regionId = cfg.regionId || '';
  }

  private async resolveRegionId(): Promise<string> {
    if (this.regionId) return this.regionId;
    if (this.cachedRegionId) return this.cachedRegionId;

    const regions = await this.getRegions();
    if (regions.length > 0) {
      this.cachedRegionId = regions[0].id;
      return this.cachedRegionId;
    }

    return '';
  }

  private async fetch<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}/store${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { 'x-publishable-api-key': this.apiKey } : {}),
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const body = await response.text();
      throw new MedusaApiError(response.status, body, url);
    }

    return response.json() as Promise<T>;
  }

  // ─── Products ───────────────────────────────────────────────────

  async searchProducts(
    filters: ProductSearchFilters,
  ): Promise<PaginatedResponse<Product>> {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.category_id?.length)
      filters.category_id.forEach((id) => params.append('category_id[]', id));
    if (filters.collection_id?.length)
      filters.collection_id.forEach((id) =>
        params.append('collection_id[]', id),
      );
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.offset) params.set('offset', String(filters.offset));

    const regionId = await this.resolveRegionId();
    if (regionId) {
      params.set('region_id', regionId);
      params.set('fields', '+variants.calculated_price');
    }

    const qs = params.toString();
    const result = await this.fetch<{
      products: Product[];
      count: number;
      offset: number;
      limit: number;
    }>(`/products${qs ? `?${qs}` : ''}`);

    return {
      data: result.products,
      count: result.count,
      offset: result.offset,
      limit: result.limit,
    };
  }

  async getProduct(id: string): Promise<Product> {
    const params = new URLSearchParams();
    const regionId = await this.resolveRegionId();
    if (regionId) {
      params.set('region_id', regionId);
      params.set('fields', '+variants.calculated_price');
    }
    const qs = params.toString();
    const result = await this.fetch<{ product: Product }>(
      `/products/${id}${qs ? `?${qs}` : ''}`,
    );
    return result.product;
  }

  // ─── Collections ────────────────────────────────────────────────

  async getCollections(): Promise<Collection[]> {
    const result = await this.fetch<{ collections: Collection[] }>(
      '/collections',
    );
    return result.collections;
  }

  async getCollection(id: string): Promise<Collection> {
    const result = await this.fetch<{ collection: Collection }>(
      `/collections/${id}`,
    );
    return result.collection;
  }

  // ─── Cart ───────────────────────────────────────────────────────

  async createCart(
    regionId: string,
    items: Array<{ variant_id: string; quantity: number }>,
  ): Promise<Cart> {
    const result = await this.fetch<{ cart: Cart }>('/carts', {
      method: 'POST',
      body: JSON.stringify({ region_id: regionId, items }),
    });
    return result.cart;
  }

  async getCart(cartId: string): Promise<Cart> {
    const result = await this.fetch<{ cart: Cart }>(`/carts/${cartId}`);
    return result.cart;
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
    const result = await this.fetch<{ cart: Cart }>(`/carts/${cartId}`, {
      method: 'POST',
      body: JSON.stringify(updates),
    });
    return result.cart;
  }

  async addLineItem(
    cartId: string,
    variantId: string,
    quantity: number,
  ): Promise<Cart> {
    const result = await this.fetch<{ cart: Cart }>(
      `/carts/${cartId}/line-items`,
      {
        method: 'POST',
        body: JSON.stringify({ variant_id: variantId, quantity }),
      },
    );
    return result.cart;
  }

  async removeLineItem(cartId: string, lineItemId: string): Promise<Cart> {
    const result = await this.fetch<{ cart: Cart }>(
      `/carts/${cartId}/line-items/${lineItemId}`,
      { method: 'DELETE' },
    );
    return result.cart;
  }

  // ─── Shipping ───────────────────────────────────────────────────

  async getShippingOptions(cartId: string): Promise<ShippingOption[]> {
    const result = await this.fetch<{ shipping_options: ShippingOption[] }>(
      `/shipping-options?cart_id=${cartId}`,
    );
    return result.shipping_options;
  }

  async addShippingMethod(cartId: string, optionId: string): Promise<Cart> {
    const result = await this.fetch<{ cart: Cart }>(
      `/carts/${cartId}/shipping-methods`,
      {
        method: 'POST',
        body: JSON.stringify({ option_id: optionId }),
      },
    );
    return result.cart;
  }

  // ─── Checkout ───────────────────────────────────────────────────

  async createPaymentSessions(cartId: string): Promise<Cart> {
    const result = await this.fetch<{ cart: Cart }>(
      `/carts/${cartId}/payment-sessions`,
      { method: 'POST' },
    );
    return result.cart;
  }

  async selectPaymentSession(
    cartId: string,
    providerId: string,
  ): Promise<Cart> {
    const result = await this.fetch<{ cart: Cart }>(
      `/carts/${cartId}/payment-sessions`,
      {
        method: 'POST',
        body: JSON.stringify({ provider_id: providerId }),
      },
    );
    return result.cart;
  }

  async initializePayment(
    cartId: string,
    providerId: string,
  ): Promise<PaymentSession> {
    // 1. Check if cart already has a payment collection
    const cart = await this.fetch<{ cart: { payment_collection?: { id: string } } }>(
      `/carts/${cartId}?fields=payment_collection.id`,
    );
    let pcId = cart.cart.payment_collection?.id;

    // 2. If no payment collection, create one
    if (!pcId) {
      const pcResult = await this.fetch<{
        payment_collection: { id: string };
      }>('/payment-collections', {
        method: 'POST',
        body: JSON.stringify({ cart_id: cartId }),
      });
      pcId = pcResult.payment_collection.id;
    }

    // 3. Create payment session — Medusa v2 returns payment_collection with sessions array
    const result = await this.fetch<{
      payment_collection: {
        payment_sessions: Array<{
          id: string;
          provider_id: string;
          status: string;
          amount: number;
          currency_code: string;
          data: Record<string, unknown>;
        }>;
      };
    }>(`/payment-collections/${pcId}/payment-sessions`, {
      method: 'POST',
      body: JSON.stringify({ provider_id: providerId }),
    });

    const ps = result.payment_collection.payment_sessions[0];
    if (!ps) {
      throw new MedusaApiError(400, 'No payment session returned', `/payment-collections/${pcId}`);
    }
    return {
      id: ps.id,
      provider_id: ps.provider_id,
      status: ps.status === 'authorized' ? 'authorized' : 'pending',
      data: {
        ...ps.data,
        amount: ps.amount,
        currency_code: ps.currency_code,
      },
    };
  }

  async completeCart(cartId: string): Promise<Order> {
    const result = await this.fetch<{ type: string; order: Order; data?: Order }>(
      `/carts/${cartId}/complete`,
      { method: 'POST' },
    );
    return result.order || result.data;
  }

  // ─── Orders ─────────────────────────────────────────────────────

  async getOrder(orderId: string): Promise<Order> {
    const result = await this.fetch<{ order: Order }>(`/orders/${orderId}`);
    return result.order;
  }

  async listOrders(
    filters: OrderListFilters,
  ): Promise<PaginatedResponse<Order>> {
    const params = new URLSearchParams();
    if (filters.email) params.set('email', filters.email);
    if (filters.status) params.set('status', filters.status);
    params.set('limit', String(filters.limit ?? 10));
    params.set('offset', String(filters.offset ?? 0));

    const qs = params.toString();
    const result = await this.fetch<{
      orders: Order[];
      count: number;
      offset: number;
      limit: number;
    }>(`/orders?${qs}`);

    return {
      data: result.orders,
      count: result.count,
      offset: result.offset,
      limit: result.limit,
    };
  }

  // ─── Regions ────────────────────────────────────────────────────

  async getRegions(): Promise<Region[]> {
    const result = await this.fetch<{ regions: Region[] }>('/regions');
    return result.regions;
  }

  // ─── Health ─────────────────────────────────────────────────────

  async healthCheck(): Promise<boolean> {
    try {
      await fetch(`${this.baseUrl}/health`);
      return true;
    } catch {
      return false;
    }
  }
}
