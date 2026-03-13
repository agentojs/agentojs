/**
 * ShopifyProvider — Shopify Storefront API implementation of CommerceProvider.
 *
 * Wraps Shopify's Storefront GraphQL API to provide typed access to products,
 * carts, checkout, and orders. Uses native fetch() — zero runtime dependencies.
 */

import type {
  CommerceProvider,
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

import type {
  ShopifyGraphQLResponse,
  ShopifyProduct,
  ShopifyCollection,
  ShopifyCart,
} from './types.js';

import {
  mapProduct,
  mapCollection,
  mapCart,
  mapDeliveryOption,
} from './mappers.js';

export class ShopifyApiError extends Error {
  constructor(
    public status: number,
    public body: string,
    public url: string,
  ) {
    super(`Shopify API error ${status}: ${body} (${url})`);
    this.name = 'ShopifyApiError';
  }
}

export interface ShopifyProviderConfig {
  storeDomain: string;
  storefrontAccessToken: string;
  apiVersion?: string;
}

// ─── GraphQL Queries ──────────────────────────────────────────────────

const PRODUCT_FIELDS = `
  id title description handle productType tags vendor
  createdAt updatedAt
  featuredImage { id url altText width height }
  images(first: 10) { edges { node { id url altText width height } cursor } pageInfo { hasNextPage hasPreviousPage } }
  variants(first: 50) { edges { node {
    id title sku barcode
    price { amount currencyCode }
    compareAtPrice { amount currencyCode }
    availableForSale quantityAvailable
    weight weightUnit
    selectedOptions { name value }
  } cursor } pageInfo { hasNextPage hasPreviousPage } }
  options { id name values }
  collections(first: 5) { edges { node { id title handle } cursor } pageInfo { hasNextPage hasPreviousPage } }
`;

const SEARCH_PRODUCTS_QUERY = `
  query SearchProducts($first: Int!, $query: String, $productType: String) {
    products(first: $first, query: $query, productType: $productType) {
      edges {
        node { ${PRODUCT_FIELDS} }
        cursor
      }
      pageInfo { hasNextPage hasPreviousPage }
    }
  }
`;

const GET_PRODUCT_QUERY = `
  query GetProduct($id: ID!) {
    node(id: $id) {
      ... on Product { ${PRODUCT_FIELDS} }
    }
  }
`;

const GET_COLLECTIONS_QUERY = `
  query GetCollections($first: Int!) {
    collections(first: $first) {
      edges {
        node {
          id title handle description
          image { id url altText width height }
          products(first: 0) { edges { node { id } cursor } pageInfo { hasNextPage hasPreviousPage } }
        }
        cursor
      }
    }
  }
`;

const GET_COLLECTION_QUERY = `
  query GetCollection($id: ID!) {
    node(id: $id) {
      ... on Collection {
        id title handle description
        image { id url altText width height }
        products(first: 50) {
          edges { node { ${PRODUCT_FIELDS} } cursor }
          pageInfo { hasNextPage hasPreviousPage }
        }
      }
    }
  }
`;

const SHOP_QUERY = `query { shop { name } }`;

// ─── Cart Queries (used in US-SHOP-002) ────────────────────────────────

const CART_FIELDS = `
  id checkoutUrl createdAt updatedAt
  lines(first: 50) { edges { node {
    id quantity
    merchandise { ... on ProductVariant {
      id title
      product { id title description featuredImage { id url altText width height } }
      price { amount currencyCode }
    }}
    cost { totalAmount { amount currencyCode } subtotalAmount { amount currencyCode } }
  } cursor } pageInfo { hasNextPage hasPreviousPage } }
  cost {
    totalAmount { amount currencyCode }
    subtotalAmount { amount currencyCode }
    totalTaxAmount { amount currencyCode }
  }
  buyerIdentity {
    email countryCode
    deliveryAddressPreferences { ... on MailingAddress {
      address1 address2 city provinceCode zip countryCode
    }}
  }
  deliveryGroups(first: 10) { edges { node {
    id
    deliveryOptions { handle title estimatedCost { amount currencyCode } }
    selectedDeliveryOption { handle title estimatedCost { amount currencyCode } }
  } cursor } pageInfo { hasNextPage hasPreviousPage } }
`;

const CART_CREATE_MUTATION = `
  mutation CartCreate($lines: [CartLineInput!]) {
    cartCreate(input: { lines: $lines }) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

const CART_QUERY = `
  query GetCart($id: ID!) {
    cart(id: $id) { ${CART_FIELDS} }
  }
`;

const CART_LINES_ADD_MUTATION = `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

const CART_LINES_REMOVE_MUTATION = `
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

const CART_BUYER_IDENTITY_UPDATE_MUTATION = `
  mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

const CART_SELECTED_DELIVERY_OPTIONS_UPDATE_MUTATION = `
  mutation CartSelectedDeliveryOptionsUpdate($cartId: ID!, $selectedDeliveryOptions: [CartSelectedDeliveryOptionInput!]!) {
    cartSelectedDeliveryOptionsUpdate(cartId: $cartId, selectedDeliveryOptions: $selectedDeliveryOptions) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

// ─── Provider ─────────────────────────────────────────────────────────

export class ShopifyProvider implements CommerceProvider {
  private readonly storeDomain: string;
  private readonly token: string;
  private readonly apiVersion: string;

  constructor(cfg: ShopifyProviderConfig) {
    this.storeDomain = cfg.storeDomain;
    this.token = cfg.storefrontAccessToken;
    this.apiVersion = cfg.apiVersion ?? '2025-01';
  }

  private async graphql<T>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    const url = `https://${this.storeDomain}/api/${this.apiVersion}/graphql.json`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': this.token,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new ShopifyApiError(response.status, body, url);
    }

    const json = (await response.json()) as ShopifyGraphQLResponse<T>;
    if (json.errors?.length) {
      throw new ShopifyApiError(
        200,
        json.errors.map((e) => e.message).join('; '),
        url,
      );
    }

    return json.data;
  }

  // ─── Products ───────────────────────────────────────────────────

  async searchProducts(
    filters: ProductSearchFilters,
  ): Promise<PaginatedResponse<Product>> {
    const first = filters.limit ?? 20;
    const queryParts: string[] = [];
    if (filters.q) queryParts.push(filters.q);
    if (filters.tags?.length) {
      for (const tag of filters.tags) {
        queryParts.push(`tag:${tag}`);
      }
    }

    const data = await this.graphql<{
      products: { edges: Array<{ node: ShopifyProduct }>; pageInfo: { hasNextPage: boolean } };
    }>(SEARCH_PRODUCTS_QUERY, {
      first,
      query: queryParts.length > 0 ? queryParts.join(' ') : null,
      productType: null,
    });

    const products = data.products.edges.map((e) => mapProduct(e.node));
    return {
      data: products,
      count: products.length,
      offset: filters.offset ?? 0,
      limit: first,
    };
  }

  async getProduct(id: string): Promise<Product> {
    const data = await this.graphql<{ node: ShopifyProduct | null }>(
      GET_PRODUCT_QUERY,
      { id },
    );

    if (!data.node) {
      throw new ShopifyApiError(
        404,
        `Product not found: ${id}`,
        `https://${this.storeDomain}/api/${this.apiVersion}/graphql.json`,
      );
    }

    return mapProduct(data.node);
  }

  // ─── Collections ────────────────────────────────────────────────

  async getCollections(): Promise<Collection[]> {
    const data = await this.graphql<{
      collections: { edges: Array<{ node: ShopifyCollection }> };
    }>(GET_COLLECTIONS_QUERY, { first: 50 });

    return data.collections.edges.map((e) => mapCollection(e.node));
  }

  async getCollection(id: string): Promise<Collection> {
    const data = await this.graphql<{ node: ShopifyCollection | null }>(
      GET_COLLECTION_QUERY,
      { id },
    );

    if (!data.node) {
      throw new ShopifyApiError(
        404,
        `Collection not found: ${id}`,
        `https://${this.storeDomain}/api/${this.apiVersion}/graphql.json`,
      );
    }

    return mapCollection(data.node);
  }

  // ─── Cart ───────────────────────────────────────────────────────

  async createCart(
    _regionId: string,
    items: Array<{ variant_id: string; quantity: number }>,
  ): Promise<Cart> {
    const lines = items.map((i) => ({
      merchandiseId: i.variant_id,
      quantity: i.quantity,
    }));

    const data = await this.graphql<{
      cartCreate: { cart: ShopifyCart; userErrors: Array<{ message: string }> };
    }>(CART_CREATE_MUTATION, { lines });

    if (data.cartCreate.userErrors.length > 0) {
      throw new ShopifyApiError(
        400,
        data.cartCreate.userErrors.map((e) => e.message).join('; '),
        `https://${this.storeDomain}/api/${this.apiVersion}/graphql.json`,
      );
    }

    return mapCart(data.cartCreate.cart);
  }

  async getCart(cartId: string): Promise<Cart> {
    const data = await this.graphql<{ cart: ShopifyCart | null }>(CART_QUERY, {
      id: cartId,
    });

    if (!data.cart) {
      throw new ShopifyApiError(
        404,
        `Cart not found: ${cartId}`,
        `https://${this.storeDomain}/api/${this.apiVersion}/graphql.json`,
      );
    }

    return mapCart(data.cart);
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
    const buyerIdentity: Record<string, unknown> = {};
    if (updates.email) buyerIdentity.email = updates.email;
    if (updates.shipping_address) {
      buyerIdentity.deliveryAddressPreferences = [
        {
          deliveryAddress: {
            address1: updates.shipping_address.address_1,
            address2: updates.shipping_address.address_2 ?? undefined,
            city: updates.shipping_address.city,
            provinceCode: updates.shipping_address.province ?? undefined,
            zip: updates.shipping_address.postal_code,
            countryCode: updates.shipping_address.country_code.toUpperCase(),
          },
        },
      ];
    }

    const data = await this.graphql<{
      cartBuyerIdentityUpdate: {
        cart: ShopifyCart;
        userErrors: Array<{ message: string }>;
      };
    }>(CART_BUYER_IDENTITY_UPDATE_MUTATION, { cartId, buyerIdentity });

    if (data.cartBuyerIdentityUpdate.userErrors.length > 0) {
      throw new ShopifyApiError(
        400,
        data.cartBuyerIdentityUpdate.userErrors
          .map((e) => e.message)
          .join('; '),
        `https://${this.storeDomain}/api/${this.apiVersion}/graphql.json`,
      );
    }

    return mapCart(data.cartBuyerIdentityUpdate.cart);
  }

  async addLineItem(
    cartId: string,
    variantId: string,
    quantity: number,
  ): Promise<Cart> {
    const data = await this.graphql<{
      cartLinesAdd: {
        cart: ShopifyCart;
        userErrors: Array<{ message: string }>;
      };
    }>(CART_LINES_ADD_MUTATION, {
      cartId,
      lines: [{ merchandiseId: variantId, quantity }],
    });

    if (data.cartLinesAdd.userErrors.length > 0) {
      throw new ShopifyApiError(
        400,
        data.cartLinesAdd.userErrors.map((e) => e.message).join('; '),
        `https://${this.storeDomain}/api/${this.apiVersion}/graphql.json`,
      );
    }

    return mapCart(data.cartLinesAdd.cart);
  }

  async removeLineItem(cartId: string, lineItemId: string): Promise<Cart> {
    const data = await this.graphql<{
      cartLinesRemove: {
        cart: ShopifyCart;
        userErrors: Array<{ message: string }>;
      };
    }>(CART_LINES_REMOVE_MUTATION, { cartId, lineIds: [lineItemId] });

    if (data.cartLinesRemove.userErrors.length > 0) {
      throw new ShopifyApiError(
        400,
        data.cartLinesRemove.userErrors.map((e) => e.message).join('; '),
        `https://${this.storeDomain}/api/${this.apiVersion}/graphql.json`,
      );
    }

    return mapCart(data.cartLinesRemove.cart);
  }

  // ─── Shipping ───────────────────────────────────────────────────

  async getShippingOptions(cartId: string): Promise<ShippingOption[]> {
    const data = await this.graphql<{ cart: ShopifyCart | null }>(CART_QUERY, {
      id: cartId,
    });

    if (!data.cart) return [];

    const options: ShippingOption[] = [];
    for (const group of data.cart.deliveryGroups.edges) {
      for (const opt of group.node.deliveryOptions) {
        options.push(mapDeliveryOption(opt));
      }
    }
    return options;
  }

  async addShippingMethod(cartId: string, optionId: string): Promise<Cart> {
    // Get delivery groups first to find the group ID
    const cartData = await this.graphql<{ cart: ShopifyCart }>(CART_QUERY, {
      id: cartId,
    });
    const groupId = cartData.cart.deliveryGroups.edges[0]?.node.id;
    if (!groupId) {
      throw new ShopifyApiError(
        400,
        'No delivery groups available',
        `https://${this.storeDomain}/api/${this.apiVersion}/graphql.json`,
      );
    }

    const data = await this.graphql<{
      cartSelectedDeliveryOptionsUpdate: {
        cart: ShopifyCart;
        userErrors: Array<{ message: string }>;
      };
    }>(CART_SELECTED_DELIVERY_OPTIONS_UPDATE_MUTATION, {
      cartId,
      selectedDeliveryOptions: [
        { deliveryGroupId: groupId, deliveryOptionHandle: optionId },
      ],
    });

    if (data.cartSelectedDeliveryOptionsUpdate.userErrors.length > 0) {
      throw new ShopifyApiError(
        400,
        data.cartSelectedDeliveryOptionsUpdate.userErrors
          .map((e) => e.message)
          .join('; '),
        `https://${this.storeDomain}/api/${this.apiVersion}/graphql.json`,
      );
    }

    return mapCart(data.cartSelectedDeliveryOptionsUpdate.cart);
  }

  // ─── Checkout ───────────────────────────────────────────────────

  async createPaymentSessions(cartId: string): Promise<Cart> {
    // Shopify handles payment natively — return the cart as-is
    return this.getCart(cartId);
  }

  async selectPaymentSession(
    cartId: string,
    _providerId: string,
  ): Promise<Cart> {
    // No-op for Shopify — payment is handled via checkoutUrl
    return this.getCart(cartId);
  }

  async initializePayment(
    cartId: string,
    _providerId: string,
  ): Promise<PaymentSession> {
    const cart = await this.getCart(cartId);
    return {
      id: cartId,
      provider_id: 'shopify',
      status: 'pending',
      data: { checkoutUrl: cart.metadata.checkoutUrl },
    };
  }

  async completeCart(cartId: string): Promise<Order> {
    // Shopify handles cart completion natively via checkoutUrl.
    // The Storefront API doesn't support server-side cart completion.
    const cart = await this.getCart(cartId);
    throw new ShopifyApiError(
      400,
      `Cart completion is handled by Shopify checkout. Redirect to: ${cart.metadata.checkoutUrl}`,
      `https://${this.storeDomain}/api/${this.apiVersion}/graphql.json`,
    );
  }

  // ─── Orders ─────────────────────────────────────────────────────

  async getOrder(_orderId: string): Promise<Order> {
    throw new ShopifyApiError(
      501,
      'Order lookup requires Shopify Admin API access. The Storefront API does not support order queries.',
      `https://${this.storeDomain}/api/${this.apiVersion}/graphql.json`,
    );
  }

  async listOrders(
    _filters: OrderListFilters,
  ): Promise<PaginatedResponse<Order>> {
    throw new ShopifyApiError(
      501,
      'Order listing requires Shopify Admin API access. The Storefront API does not support order queries.',
      `https://${this.storeDomain}/api/${this.apiVersion}/graphql.json`,
    );
  }

  // ─── Regions ────────────────────────────────────────────────────

  async getRegions(): Promise<Region[]> {
    // Shopify doesn't have a regions concept in Storefront API.
    // Return a single default region.
    return [
      {
        id: 'default',
        name: 'Default',
        currency_code: 'usd',
        countries: [],
      },
    ];
  }

  // ─── Health ─────────────────────────────────────────────────────

  async healthCheck(): Promise<boolean> {
    try {
      await this.graphql<{ shop: { name: string } }>(SHOP_QUERY);
      return true;
    } catch {
      return false;
    }
  }
}
