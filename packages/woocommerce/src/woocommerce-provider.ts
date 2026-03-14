/**
 * WooCommerceProvider — WooCommerce REST + Store API implementation of CommerceProvider.
 *
 * Uses two WooCommerce APIs:
 * - Store API (wc/store/v1) — products, cart, checkout (unauthenticated / Cart-Token)
 * - REST API (wc/v3) — orders, categories, shipping zones (Basic Auth)
 *
 * Cart identity: WooCommerce uses a JWT Cart-Token (response header).
 * We generate a UUID as the cartId and map it to the real Cart-Token internally.
 *
 * Uses native fetch() — zero runtime dependencies.
 */

import { randomUUID } from 'crypto';
import type {
  CommerceProvider,
  Product,
  ProductVariant,
  ProductImage,
  ProductCategory,
  ProductOption,
  Collection,
  Cart,
  LineItem,
  Address,
  ShippingOption,
  ShippingMethod,
  PaymentSession,
  Order,
  Region,
  PaginatedResponse,
  ProductSearchFilters,
  OrderListFilters,
} from '@agentojs/core';

export interface WooCommerceProviderConfig {
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

export class WooCommerceApiError extends Error {
  constructor(
    public status: number,
    public body: string,
    public url: string,
  ) {
    super(`WooCommerce API error ${status} at ${url}: ${body}`);
    this.name = 'WooCommerceApiError';
  }
}

/** Stored cart state for checkout completion */
interface CartState {
  token: string;
  email: string | null;
  shippingAddress: Address | null;
  billingAddress: Address | null;
  selectedPaymentMethod: string | null;
}

// ─── WooCommerce API Types ──────────────────────────────────────

export interface WcStorePrices {
  price: string;
  regular_price: string;
  sale_price: string;
  currency_code: string;
  currency_minor_unit: number;
}

export interface WcStoreImage {
  id?: number;
  src: string;
  thumbnail?: string;
  alt?: string;
}

export interface WcStoreAttribute {
  id: number;
  name: string;
  terms?: Array<{ name: string }>;
}

export interface WcStoreCategory {
  id: number;
  name: string;
  slug: string;
}

export interface WcStoreProduct {
  id: number;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  sku?: string;
  prices?: WcStorePrices;
  images?: WcStoreImage[];
  categories?: WcStoreCategory[];
  attributes?: WcStoreAttribute[];
  has_options: boolean;
  is_in_stock: boolean;
  is_purchasable: boolean;
  low_stock_remaining: number | null;
}

export interface WcVariation {
  id: number;
  sku?: string;
  price?: string;
  weight?: string;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  stock_quantity: number | null;
  manage_stock: boolean;
  attributes?: Array<{ name: string; option: string }>;
}

export interface WcCartItem {
  key: string;
  id: number;
  name: string;
  short_description?: string;
  quantity: number;
  images?: Array<{ thumbnail?: string }>;
  prices?: {
    price: string;
    currency_code: string;
    currency_minor_unit: number;
  };
  totals?: { line_subtotal: string; line_total: string };
}

export interface WcShippingRate {
  rate_id: string;
  name: string;
  price?: string;
  selected: boolean;
}

export interface WcShippingPackage {
  package_id: number;
  shipping_rates?: WcShippingRate[];
}

export interface WcCartTotals {
  total_items: string;
  total_shipping: string;
  total_tax: string;
  total_discount: string;
  total_price: string;
  currency_code: string;
  currency_minor_unit: number;
}

export interface WcPaymentMethod {
  name: string;
  label: string;
  description?: string;
}

export interface WcCart {
  items?: WcCartItem[];
  totals?: WcCartTotals;
  shipping_rates?: WcShippingPackage[];
  payment_methods?: WcPaymentMethod[];
}

export interface WcAddress {
  first_name?: string;
  last_name?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  email?: string;
  phone?: string;
}

export interface WcLineItem {
  id?: number;
  product_id?: number;
  variation_id?: number;
  name?: string;
  quantity?: number;
  price?: string | number;
  subtotal?: string | number;
  total?: string | number;
}

/** Shape returned by Store API checkout */
export interface WcCheckoutResult {
  order_id: number;
  status: string;
  order_key?: string;
  currency?: string;
  total?: string;
  total_tax?: string;
  shipping_total?: string;
  billing_address?: WcAddress;
  shipping_address?: WcAddress;
  line_items?: WcLineItem[];
  payment_method?: string;
  payment_result?: { payment_status?: string };
}

/** Shape returned by REST API orders */
export interface WcOrder {
  id: number;
  number?: string;
  status: string;
  currency?: string;
  total?: string;
  total_tax?: string;
  shipping_total?: string;
  billing?: WcAddress;
  shipping?: WcAddress;
  line_items?: WcLineItem[];
  payment_method?: string;
}

/** Union for mapOrder — handles both Store API checkout result and REST API order */
export interface WcOrderLike {
  order_id?: number;
  id?: number;
  number?: string;
  status?: string;
  currency?: string;
  total?: string | number;
  total_tax?: string | number;
  shipping_total?: string | number;
  billing?: WcAddress;
  billing_address?: WcAddress;
  shipping?: WcAddress;
  shipping_address?: WcAddress;
  line_items?: WcLineItem[];
  payment_method?: string;
  payment_result?: { payment_status?: string };
}

export interface WcCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export interface WcShippingZone {
  id: number;
  name: string;
  order: number;
}

// ─── WooCommerceProvider ─────────────────────────────────────────

export class WooCommerceProvider implements CommerceProvider {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  /** cartId (UUID) → CartState (Cart-Token JWT + address/email state) */
  private cartStates = new Map<string, CartState>();

  constructor(cfg: WooCommerceProviderConfig) {
    this.baseUrl = cfg.baseUrl.replace(/\/$/, '');
    const credentials = Buffer.from(
      `${cfg.consumerKey}:${cfg.consumerSecret}`,
    ).toString('base64');
    this.authHeader = `Basic ${credentials}`;
  }

  // ─── Internal Helpers ──────────────────────────────────────────

  /** Normalize minor-unit price string (e.g. "1025") to decimal (e.g. 10.25) */
  private toDecimal(minor: string, minorUnit: number): number {
    return parseInt(minor, 10) / Math.pow(10, minorUnit);
  }

  /** Store API fetch — unauthenticated for reads, Cart-Token for writes */
  private async storeApi<T>(
    path: string,
    options: RequestInit = {},
    cartToken?: string,
  ): Promise<{ data: T; headers: Headers }> {
    const url = `${this.baseUrl}/wp-json/wc/store/v1${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (cartToken) {
      headers['Cart-Token'] = cartToken;
    }

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const body = await response.text();
      throw new WooCommerceApiError(response.status, body, url);
    }

    const data = (await response.json()) as T;
    return { data, headers: response.headers };
  }

  /** REST API fetch — requires Consumer Key + Secret (Basic Auth) */
  private async restApi<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}/wp-json/wc/v3${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: this.authHeader,
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const body = await response.text();
      throw new WooCommerceApiError(response.status, body, url);
    }

    return response.json() as Promise<T>;
  }

  /** Map WooCommerce Store API product to internal Product type */
  private mapProduct(
    wc: WcStoreProduct,
    variations: WcVariation[] = [],
  ): Product {
    const minorUnit = wc.prices?.currency_minor_unit ?? 2;
    const currencyCode = wc.prices?.currency_code ?? 'USD';

    const variants: ProductVariant[] =
      variations.length > 0
        ? variations.map((v) => this.mapVariation(v, currencyCode))
        : [
            {
              id: String(wc.id),
              title: 'Default',
              sku: wc.sku ?? null,
              barcode: null,
              prices: wc.prices
                ? [
                    {
                      id: `${wc.id}-price`,
                      amount: this.toDecimal(wc.prices.price, minorUnit),
                      currency_code: currencyCode,
                      min_quantity: null,
                      max_quantity: null,
                    },
                  ]
                : [],
              options: {},
              inventory_quantity:
                wc.low_stock_remaining ?? (wc.is_in_stock ? 99 : 0),
              allow_backorder: false,
              manage_inventory: wc.low_stock_remaining !== null,
              weight: null,
              length: null,
              height: null,
              width: null,
              metadata: {},
            },
          ];

    const options: ProductOption[] = (wc.attributes ?? []).map((attr) => ({
      id: String(attr.id),
      title: attr.name,
      values: attr.terms?.map((t) => t.name) ?? [],
    }));

    const images: ProductImage[] = (wc.images ?? []).map((img, i) => ({
      id: String(img.id ?? i),
      url: img.src,
      metadata: { alt: img.alt ?? '' },
    }));

    const categories: ProductCategory[] = (wc.categories ?? []).map((cat) => ({
      id: String(cat.id),
      name: cat.name,
      handle: cat.slug,
    }));

    return {
      id: String(wc.id),
      title: wc.name,
      description: wc.short_description ?? wc.description ?? '',
      handle: wc.slug,
      thumbnail: images[0]?.url ?? null,
      images,
      variants,
      options,
      collection_id: null,
      categories,
      tags: [],
      status: 'published',
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  private mapVariation(v: WcVariation, currencyCode: string): ProductVariant {
    const price = parseFloat(v.price ?? '0');
    const optionMap: Record<string, string> = {};
    for (const attr of v.attributes ?? []) {
      optionMap[attr.name] = attr.option;
    }
    return {
      id: String(v.id),
      title: Object.values(optionMap).join(' / ') || 'Default',
      sku: v.sku ?? null,
      barcode: null,
      prices: [
        {
          id: `${v.id}-price`,
          amount: price,
          currency_code: currencyCode,
          min_quantity: null,
          max_quantity: null,
        },
      ],
      options: optionMap,
      inventory_quantity:
        v.stock_quantity ?? (v.stock_status === 'instock' ? 99 : 0),
      allow_backorder: v.stock_status === 'onbackorder',
      manage_inventory: v.manage_stock,
      weight: v.weight ? parseFloat(v.weight) : null,
      length: null,
      height: null,
      width: null,
      metadata: {},
    };
  }

  /** Map WooCommerce Store API cart to internal Cart type */
  private mapCart(wc: WcCart, cartId: string): Cart {
    const state = this.cartStates.get(cartId);
    const minorUnit = wc.totals?.currency_minor_unit ?? 2;
    const currencyCode = wc.totals?.currency_code ?? 'USD';

    const items: LineItem[] = (wc.items ?? []).map((item) => ({
      id: item.key,
      cart_id: cartId,
      variant_id: String(item.id),
      product_id: String(item.id),
      title: item.name,
      description: item.short_description ?? '',
      thumbnail: item.images?.[0]?.thumbnail ?? null,
      quantity: item.quantity,
      unit_price: this.toDecimal(item.prices?.price ?? '0', minorUnit),
      subtotal: this.toDecimal(item.totals?.line_subtotal ?? '0', minorUnit),
      total: this.toDecimal(item.totals?.line_total ?? '0', minorUnit),
      metadata: {},
    }));

    const shippingMethods: ShippingMethod[] = [];
    for (const pkg of wc.shipping_rates ?? []) {
      const selected = pkg.shipping_rates?.find((r) => r.selected);
      if (selected) {
        shippingMethods.push({
          id: selected.rate_id,
          shipping_option_id: selected.rate_id,
          name: selected.name,
          price: this.toDecimal(selected.price ?? '0', minorUnit),
        });
      }
    }

    const paymentSessions: PaymentSession[] = (wc.payment_methods ?? []).map(
      (pm) => ({
        id: pm.name,
        provider_id: pm.name,
        status: 'pending' as const,
        data: {},
      }),
    );

    return {
      id: cartId,
      items,
      region_id: 'default',
      currency_code: currencyCode,
      subtotal: this.toDecimal(wc.totals?.total_items ?? '0', minorUnit),
      tax_total: this.toDecimal(wc.totals?.total_tax ?? '0', minorUnit),
      shipping_total: this.toDecimal(
        wc.totals?.total_shipping ?? '0',
        minorUnit,
      ),
      discount_total: this.toDecimal(
        wc.totals?.total_discount ?? '0',
        minorUnit,
      ),
      total: this.toDecimal(wc.totals?.total_price ?? '0', minorUnit),
      shipping_address: state?.shippingAddress ?? null,
      billing_address: state?.billingAddress ?? null,
      email: state?.email ?? null,
      shipping_methods: shippingMethods,
      payment_sessions: paymentSessions,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // ─── Products ──────────────────────────────────────────────────

  async searchProducts(
    filters: ProductSearchFilters,
  ): Promise<PaginatedResponse<Product>> {
    const params = new URLSearchParams();
    if (filters.q) params.set('search', filters.q);
    if (filters.category_id?.length)
      params.set('category', filters.category_id[0]);
    const perPage = filters.limit ?? 20;
    const page = Math.floor((filters.offset ?? 0) / perPage) + 1;
    params.set('per_page', String(perPage));
    params.set('page', String(page));

    const { data: products } = await this.storeApi<WcStoreProduct[]>(
      `/products?${params.toString()}`,
    );

    return {
      data: products.map((p) => this.mapProduct(p)),
      count: products.length,
      offset: filters.offset ?? 0,
      limit: perPage,
    };
  }

  async getProduct(id: string): Promise<Product> {
    const { data: product } = await this.storeApi<WcStoreProduct>(
      `/products/${id}`,
    );

    let variations: WcVariation[] = [];
    if (product.has_options) {
      try {
        variations = await this.restApi<WcVariation[]>(
          `/products/${id}/variations?per_page=100`,
          { headers: {} },
        );
      } catch {
        // Variations unavailable — fall through to simple product
      }
    }

    return this.mapProduct(product, variations);
  }

  async getCollections(): Promise<Collection[]> {
    const categories = await this.restApi<WcCategory[]>(
      '/products/categories?per_page=100',
    );
    return categories
      .filter((cat) => cat.count > 0)
      .map((cat) => ({
        id: String(cat.id),
        title: cat.name,
        handle: cat.slug,
        products: [],
      }));
  }

  async getCollection(id: string): Promise<Collection> {
    const cat = await this.restApi<WcCategory>(`/products/categories/${id}`);
    const { data: products } = await this.storeApi<WcStoreProduct[]>(
      `/products?category=${id}&per_page=50`,
    );
    return {
      id: String(cat.id),
      title: cat.name,
      handle: cat.slug,
      products: products.map((p) => this.mapProduct(p)),
    };
  }

  // ─── Cart ──────────────────────────────────────────────────────

  async createCart(
    _regionId: string,
    items: Array<{ variant_id: string; quantity: number }>,
  ): Promise<Cart> {
    const { headers } = await this.storeApi<WcCart>('/cart');
    const token =
      headers.get('Cart-Token') ?? headers.get('cart-token') ?? '';

    const cartId = randomUUID();
    this.cartStates.set(cartId, {
      token,
      email: null,
      shippingAddress: null,
      billingAddress: null,
      selectedPaymentMethod: null,
    });

    for (const item of items) {
      await this.storeApi<WcCart>(
        '/cart/add-item',
        {
          method: 'POST',
          body: JSON.stringify({
            id: parseInt(item.variant_id, 10),
            quantity: item.quantity,
          }),
        },
        token,
      );
    }

    const { data: cart } = await this.storeApi<WcCart>('/cart', {}, token);
    return this.mapCart(cart, cartId);
  }

  async getCart(cartId: string): Promise<Cart> {
    const state = this.cartStates.get(cartId);
    if (!state)
      throw new WooCommerceApiError(404, 'Cart not found', `/cart/${cartId}`);
    const { data: cart } = await this.storeApi<WcCart>(
      '/cart',
      {},
      state.token,
    );
    return this.mapCart(cart, cartId);
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
    const state = this.cartStates.get(cartId);
    if (!state)
      throw new WooCommerceApiError(404, 'Cart not found', `/cart/${cartId}`);

    if (updates.email) state.email = updates.email;
    if (updates.shipping_address)
      state.shippingAddress = updates.shipping_address;
    if (updates.billing_address)
      state.billingAddress = updates.billing_address;

    if (updates.shipping_address || updates.billing_address) {
      const addr = updates.shipping_address ?? updates.billing_address!;
      const wcAddress = {
        first_name: addr.first_name,
        last_name: addr.last_name,
        address_1: addr.address_1,
        address_2: addr.address_2 ?? '',
        city: addr.city,
        state: addr.province ?? '',
        postcode: addr.postal_code,
        country: addr.country_code,
      };
      await this.storeApi<WcCart>(
        '/cart/update-customer',
        {
          method: 'POST',
          body: JSON.stringify({
            shipping_address: wcAddress,
            billing_address: updates.billing_address
              ? {
                  ...wcAddress,
                  email: updates.email ?? state.email ?? '',
                  phone: addr.phone ?? '',
                }
              : undefined,
          }),
        },
        state.token,
      );
    }

    const { data: cart } = await this.storeApi<WcCart>(
      '/cart',
      {},
      state.token,
    );
    return this.mapCart(cart, cartId);
  }

  async addLineItem(
    cartId: string,
    variantId: string,
    quantity: number,
  ): Promise<Cart> {
    const state = this.cartStates.get(cartId);
    if (!state)
      throw new WooCommerceApiError(404, 'Cart not found', `/cart/${cartId}`);

    await this.storeApi<WcCart>(
      '/cart/add-item',
      {
        method: 'POST',
        body: JSON.stringify({ id: parseInt(variantId, 10), quantity }),
      },
      state.token,
    );

    const { data: cart } = await this.storeApi<WcCart>(
      '/cart',
      {},
      state.token,
    );
    return this.mapCart(cart, cartId);
  }

  async removeLineItem(cartId: string, lineItemId: string): Promise<Cart> {
    const state = this.cartStates.get(cartId);
    if (!state)
      throw new WooCommerceApiError(404, 'Cart not found', `/cart/${cartId}`);

    await this.storeApi<WcCart>(
      '/cart/remove-item',
      {
        method: 'POST',
        body: JSON.stringify({ key: lineItemId }),
      },
      state.token,
    );

    const { data: cart } = await this.storeApi<WcCart>(
      '/cart',
      {},
      state.token,
    );
    return this.mapCart(cart, cartId);
  }

  // ─── Shipping ──────────────────────────────────────────────────

  async getShippingOptions(cartId: string): Promise<ShippingOption[]> {
    const state = this.cartStates.get(cartId);
    if (!state)
      throw new WooCommerceApiError(404, 'Cart not found', `/cart/${cartId}`);

    const { data: cart } = await this.storeApi<WcCart>(
      '/cart',
      {},
      state.token,
    );
    const options: ShippingOption[] = [];
    const minorUnit = cart.totals?.currency_minor_unit ?? 2;

    for (const pkg of cart.shipping_rates ?? []) {
      for (const rate of pkg.shipping_rates ?? []) {
        options.push({
          id: rate.rate_id,
          name: rate.name,
          amount: this.toDecimal(rate.price ?? '0', minorUnit),
          region_id: 'default',
        });
      }
    }

    return options;
  }

  async addShippingMethod(cartId: string, optionId: string): Promise<Cart> {
    const state = this.cartStates.get(cartId);
    if (!state)
      throw new WooCommerceApiError(404, 'Cart not found', `/cart/${cartId}`);

    await this.storeApi<WcCart>(
      '/cart/select-shipping-rate',
      {
        method: 'POST',
        body: JSON.stringify({ package_id: 0, rate_id: optionId }),
      },
      state.token,
    );

    const { data: cart } = await this.storeApi<WcCart>(
      '/cart',
      {},
      state.token,
    );
    return this.mapCart(cart, cartId);
  }

  // ─── Checkout ──────────────────────────────────────────────────

  async createPaymentSessions(cartId: string): Promise<Cart> {
    return this.getCart(cartId);
  }

  async initializePayment(
    _cartId: string,
    _providerId: string,
  ): Promise<PaymentSession> {
    throw new Error('initializePayment not supported for WooCommerce yet');
  }

  async selectPaymentSession(
    cartId: string,
    providerId: string,
  ): Promise<Cart> {
    const state = this.cartStates.get(cartId);
    if (!state)
      throw new WooCommerceApiError(404, 'Cart not found', `/cart/${cartId}`);

    state.selectedPaymentMethod = providerId;
    return this.getCart(cartId);
  }

  async completeCart(cartId: string): Promise<Order> {
    const state = this.cartStates.get(cartId);
    if (!state)
      throw new WooCommerceApiError(404, 'Cart not found', `/cart/${cartId}`);

    const shipping = state.shippingAddress;
    const billing = state.billingAddress ?? state.shippingAddress;

    if (!shipping || !billing) {
      throw new WooCommerceApiError(
        400,
        'Shipping and billing address required for checkout',
        '/checkout',
      );
    }

    const toWcAddr = (addr: Address, email?: string) => ({
      first_name: addr.first_name,
      last_name: addr.last_name,
      address_1: addr.address_1,
      address_2: addr.address_2 ?? '',
      city: addr.city,
      state: addr.province ?? '',
      postcode: addr.postal_code,
      country: addr.country_code,
      ...(email ? { email, phone: addr.phone ?? '' } : {}),
    });

    const body = {
      billing_address: toWcAddr(billing, state.email ?? ''),
      shipping_address: toWcAddr(shipping),
      payment_method: state.selectedPaymentMethod ?? 'cod',
      payment_data: [],
    };

    const { data: result } = await this.storeApi<WcCheckoutResult>(
      '/checkout',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      state.token,
    );

    this.cartStates.delete(cartId);

    return this.mapOrder(result);
  }

  // ─── Orders ────────────────────────────────────────────────────

  async getOrder(orderId: string): Promise<Order> {
    const wc = await this.restApi<WcOrder>(`/orders/${orderId}`);
    return this.mapOrder(wc);
  }

  async listOrders(
    filters: OrderListFilters,
  ): Promise<PaginatedResponse<Order>> {
    const params = new URLSearchParams();
    if (filters.email) params.set('search', filters.email);
    if (filters.status) params.set('status', filters.status);
    params.set('per_page', String(filters.limit ?? 10));
    params.set('offset', String(filters.offset ?? 0));

    const qs = params.toString();
    const wc = await this.restApi<WcOrder[]>(`/orders?${qs}`);
    const orders = wc.map((o) => this.mapOrder(o));

    return {
      data: orders,
      count: orders.length,
      offset: filters.offset ?? 0,
      limit: filters.limit ?? 10,
    };
  }

  private mapOrder(wc: WcOrderLike): Order {
    const total = parseFloat(String(wc.total ?? '0'));
    const shippingTotal = parseFloat(String(wc.shipping_total ?? '0'));
    const taxTotal = parseFloat(String(wc.total_tax ?? '0'));
    const subtotal = total - shippingTotal - taxTotal;

    const statusMap: Record<string, Order['status']> = {
      pending: 'pending',
      processing: 'pending',
      'on-hold': 'pending',
      completed: 'completed',
      cancelled: 'canceled',
      refunded: 'canceled',
      failed: 'canceled',
    };

    const billing = wc.billing_address ?? wc.billing ?? {};
    const shipping = wc.shipping_address ?? wc.shipping ?? {};

    const toAddress = (a: Partial<WcAddress>): Address => ({
      first_name: a.first_name ?? '',
      last_name: a.last_name ?? '',
      address_1: a.address_1 ?? '',
      address_2: a.address_2 ?? null,
      city: a.city ?? '',
      province: a.state ?? null,
      postal_code: a.postcode ?? '',
      country_code: a.country ?? '',
      phone: a.phone ?? null,
    });

    return {
      id: String(wc.order_id ?? wc.id ?? ''),
      display_id: parseInt(
        String(wc.order_id ?? wc.number ?? wc.id ?? '0'),
        10,
      ),
      status: statusMap[wc.status ?? 'pending'] ?? 'pending',
      fulfillment_status: 'not_fulfilled',
      payment_status:
        wc.payment_result?.payment_status === 'success'
          ? 'captured'
          : 'awaiting',
      items: (wc.line_items ?? []).map((li) => ({
        id: String(li.id ?? ''),
        cart_id: '',
        variant_id: String(li.variation_id ?? li.product_id ?? ''),
        product_id: String(li.product_id ?? ''),
        title: li.name ?? '',
        description: '',
        thumbnail: null,
        quantity: li.quantity ?? 1,
        unit_price: parseFloat(String(li.price ?? '0')),
        subtotal: parseFloat(String(li.subtotal ?? '0')),
        total: parseFloat(String(li.total ?? '0')),
        metadata: {},
      })),
      currency_code: wc.currency ?? 'USD',
      subtotal,
      tax_total: taxTotal,
      shipping_total: shippingTotal,
      total,
      email: (billing as WcAddress).email ?? '',
      shipping_address: toAddress(shipping as Partial<WcAddress>),
      fulfillments: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // ─── Regions ───────────────────────────────────────────────────

  async getRegions(): Promise<Region[]> {
    try {
      const zones = await this.restApi<WcShippingZone[]>('/shipping/zones');
      return zones
        .filter((z) => z.id !== 0)
        .map((zone) => ({
          id: String(zone.id),
          name: zone.name,
          currency_code: 'USD',
          countries: [],
        }));
    } catch {
      return [
        {
          id: 'default',
          name: 'Default',
          currency_code: 'USD',
          countries: [],
        },
      ];
    }
  }

  // ─── Health ────────────────────────────────────────────────────

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/wp-json/`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
