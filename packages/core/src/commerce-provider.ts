/**
 * CommerceProvider — abstract interface for e-commerce providers.
 *
 * AI protocol adapters inject this interface — they never
 * know which concrete provider (Medusa, WooCommerce, etc.) is behind it.
 */

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
} from './types.js';

export interface CommerceProvider {
  // ─── Products ───────────────────────────────────────────────────
  searchProducts(
    filters: ProductSearchFilters,
  ): Promise<PaginatedResponse<Product>>;
  getProduct(id: string): Promise<Product>;
  getCollections(): Promise<Collection[]>;
  getCollection(id: string): Promise<Collection>;

  // ─── Cart ───────────────────────────────────────────────────────
  createCart(
    regionId: string,
    items: Array<{ variant_id: string; quantity: number }>,
  ): Promise<Cart>;
  getCart(cartId: string): Promise<Cart>;
  updateCart(
    cartId: string,
    updates: {
      email?: string;
      shipping_address?: Address;
      billing_address?: Address;
      metadata?: Record<string, unknown>;
    },
  ): Promise<Cart>;
  addLineItem(
    cartId: string,
    variantId: string,
    quantity: number,
  ): Promise<Cart>;
  removeLineItem(cartId: string, lineItemId: string): Promise<Cart>;

  // ─── Shipping ───────────────────────────────────────────────────
  getShippingOptions(cartId: string): Promise<ShippingOption[]>;
  addShippingMethod(cartId: string, optionId: string): Promise<Cart>;

  // ─── Checkout ───────────────────────────────────────────────────
  createPaymentSessions(cartId: string): Promise<Cart>;
  selectPaymentSession(cartId: string, providerId: string): Promise<Cart>;
  initializePayment(
    cartId: string,
    providerId: string,
  ): Promise<PaymentSession>;
  completeCart(cartId: string): Promise<Order>;

  // ─── Orders ─────────────────────────────────────────────────────
  getOrder(orderId: string): Promise<Order>;
  listOrders(filters: OrderListFilters): Promise<PaginatedResponse<Order>>;

  // ─── Regions ────────────────────────────────────────────────────
  getRegions(): Promise<Region[]>;

  // ─── Health ─────────────────────────────────────────────────────
  healthCheck(): Promise<boolean>;
}
