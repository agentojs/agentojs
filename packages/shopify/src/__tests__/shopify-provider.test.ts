import { describe, it, expect, vi, afterEach } from 'vitest';
import { ShopifyProvider, ShopifyApiError } from '../shopify-provider.js';
import type { ShopifyProviderConfig } from '../shopify-provider.js';

const STORE_DOMAIN = 'my-store.myshopify.com';
const TOKEN = 'shpat_test_123';

function makeConfig(overrides?: Partial<ShopifyProviderConfig>): ShopifyProviderConfig {
  return { storeDomain: STORE_DOMAIN, storefrontAccessToken: TOKEN, ...overrides };
}

function mockGraphQL(data: unknown, options?: { status?: number; ok?: boolean; errors?: Array<{ message: string }> }) {
  const status = options?.status ?? 200;
  const ok = options?.ok ?? true;
  const responseData = options?.errors
    ? { data, errors: options.errors }
    : { data };

  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(responseData),
    text: () => Promise.resolve(JSON.stringify(responseData)),
  });
}

// ─── Shopify Response Factories ─────────────────────────────────

function makeShopifyProduct(overrides?: Record<string, unknown>) {
  return {
    id: 'gid://shopify/Product/1',
    title: 'Test T-Shirt',
    description: 'A great shirt',
    handle: 'test-t-shirt',
    productType: 'Shirts',
    tags: ['summer', 'cotton'],
    vendor: 'TestVendor',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
    featuredImage: { id: 'img_1', url: 'https://cdn.shopify.com/img1.jpg', altText: 'Shirt', width: 800, height: 600 },
    images: {
      edges: [{ node: { id: 'img_1', url: 'https://cdn.shopify.com/img1.jpg', altText: 'Shirt', width: 800, height: 600 }, cursor: 'c1' }],
      pageInfo: { hasNextPage: false, hasPreviousPage: false },
    },
    variants: {
      edges: [{
        node: {
          id: 'gid://shopify/ProductVariant/1',
          title: 'Small / Black',
          sku: 'TSH-S-BLK',
          barcode: null,
          price: { amount: '29.99', currencyCode: 'USD' },
          compareAtPrice: null,
          availableForSale: true,
          quantityAvailable: 42,
          weight: 0.3,
          weightUnit: 'KILOGRAMS',
          selectedOptions: [{ name: 'Size', value: 'Small' }, { name: 'Color', value: 'Black' }],
        },
        cursor: 'vc1',
      }],
      pageInfo: { hasNextPage: false, hasPreviousPage: false },
    },
    options: [
      { id: 'opt_1', name: 'Size', values: ['Small', 'Medium', 'Large'] },
      { id: 'opt_2', name: 'Color', values: ['Black', 'White'] },
    ],
    collections: {
      edges: [{ node: { id: 'gid://shopify/Collection/1', title: 'Summer', handle: 'summer' }, cursor: 'cc1' }],
      pageInfo: { hasNextPage: false, hasPreviousPage: false },
    },
    ...overrides,
  };
}

function makeShopifyCartLine(overrides?: Record<string, unknown>) {
  return {
    id: 'gid://shopify/CartLine/1',
    quantity: 2,
    merchandise: {
      id: 'gid://shopify/ProductVariant/1',
      title: 'Small / Black',
      product: {
        id: 'gid://shopify/Product/1',
        title: 'Test T-Shirt',
        description: 'A great shirt',
        featuredImage: { id: 'img_1', url: 'https://cdn.shopify.com/img1.jpg', altText: 'Shirt', width: 800, height: 600 },
      },
      price: { amount: '29.99', currencyCode: 'USD' },
    },
    cost: {
      totalAmount: { amount: '59.98', currencyCode: 'USD' },
      subtotalAmount: { amount: '59.98', currencyCode: 'USD' },
    },
    ...overrides,
  };
}

function makeShopifyCart(overrides?: Record<string, unknown>) {
  return {
    id: 'gid://shopify/Cart/1',
    checkoutUrl: 'https://my-store.myshopify.com/cart/c/abc123',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    lines: {
      edges: [{ node: makeShopifyCartLine(), cursor: 'lc1' }],
      pageInfo: { hasNextPage: false, hasPreviousPage: false },
    },
    cost: {
      totalAmount: { amount: '59.98', currencyCode: 'USD' },
      subtotalAmount: { amount: '59.98', currencyCode: 'USD' },
      totalTaxAmount: { amount: '4.80', currencyCode: 'USD' },
    },
    buyerIdentity: {
      email: null,
      countryCode: null,
      deliveryAddressPreferences: null,
    },
    deliveryGroups: {
      edges: [],
      pageInfo: { hasNextPage: false, hasPreviousPage: false },
    },
    ...overrides,
  };
}

function makeShopifyCollection(overrides?: Record<string, unknown>) {
  return {
    id: 'gid://shopify/Collection/1',
    title: 'Summer Collection',
    handle: 'summer-collection',
    description: 'Summer styles',
    image: null,
    products: {
      edges: [],
      pageInfo: { hasNextPage: false, hasPreviousPage: false },
    },
    ...overrides,
  };
}

describe('ShopifyProvider', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('constructor creates instance', () => {
    const provider = new ShopifyProvider(makeConfig());
    expect(provider).toBeInstanceOf(ShopifyProvider);
  });

  // ─── Health Check ─────────────────────────────────────────────

  describe('healthCheck', () => {
    it('returns true when shop query succeeds', async () => {
      globalThis.fetch = mockGraphQL({ shop: { name: 'My Store' } });
      const provider = new ShopifyProvider(makeConfig());
      expect(await provider.healthCheck()).toBe(true);
    });

    it('returns false when server is unreachable', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
      const provider = new ShopifyProvider(makeConfig());
      expect(await provider.healthCheck()).toBe(false);
    });

    it('sends correct headers', async () => {
      const fetchMock = mockGraphQL({ shop: { name: 'My Store' } });
      globalThis.fetch = fetchMock;

      const provider = new ShopifyProvider(makeConfig());
      await provider.healthCheck();

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe(`https://${STORE_DOMAIN}/api/2025-01/graphql.json`);
      expect(opts.method).toBe('POST');
      const headers = opts.headers as Record<string, string>;
      expect(headers['X-Shopify-Storefront-Access-Token']).toBe(TOKEN);
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('uses custom apiVersion', async () => {
      const fetchMock = mockGraphQL({ shop: { name: 'My Store' } });
      globalThis.fetch = fetchMock;

      const provider = new ShopifyProvider(makeConfig({ apiVersion: '2024-10' }));
      await provider.healthCheck();

      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain('/api/2024-10/');
    });
  });

  // ─── Products ─────────────────────────────────────────────────

  describe('searchProducts', () => {
    it('returns mapped products', async () => {
      const fetchMock = mockGraphQL({
        products: {
          edges: [{ node: makeShopifyProduct(), cursor: 'c1' }],
          pageInfo: { hasNextPage: false },
        },
      });
      globalThis.fetch = fetchMock;

      const provider = new ShopifyProvider(makeConfig());
      const result = await provider.searchProducts({ q: 'shirt', limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('gid://shopify/Product/1');
      expect(result.data[0].title).toBe('Test T-Shirt');
      expect(result.data[0].handle).toBe('test-t-shirt');
      expect(result.count).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('passes query string to GraphQL', async () => {
      const fetchMock = mockGraphQL({
        products: { edges: [], pageInfo: { hasNextPage: false } },
      });
      globalThis.fetch = fetchMock;

      const provider = new ShopifyProvider(makeConfig());
      await provider.searchProducts({ q: 'hoodie' });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.variables.query).toBe('hoodie');
    });

    it('includes tags in query', async () => {
      const fetchMock = mockGraphQL({
        products: { edges: [], pageInfo: { hasNextPage: false } },
      });
      globalThis.fetch = fetchMock;

      const provider = new ShopifyProvider(makeConfig());
      await provider.searchProducts({ tags: ['summer', 'sale'] });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.variables.query).toContain('tag:summer');
      expect(body.variables.query).toContain('tag:sale');
    });

    it('maps variants correctly', async () => {
      const fetchMock = mockGraphQL({
        products: {
          edges: [{ node: makeShopifyProduct(), cursor: 'c1' }],
          pageInfo: { hasNextPage: false },
        },
      });
      globalThis.fetch = fetchMock;

      const provider = new ShopifyProvider(makeConfig());
      const result = await provider.searchProducts({});

      const variant = result.data[0].variants[0];
      expect(variant.id).toBe('gid://shopify/ProductVariant/1');
      expect(variant.title).toBe('Small / Black');
      expect(variant.sku).toBe('TSH-S-BLK');
      expect(variant.prices[0].amount).toBe(2999); // $29.99 in cents
      expect(variant.prices[0].currency_code).toBe('usd');
      expect(variant.options).toEqual({ Size: 'Small', Color: 'Black' });
      expect(variant.inventory_quantity).toBe(42);
    });

    it('maps images correctly', async () => {
      const fetchMock = mockGraphQL({
        products: {
          edges: [{ node: makeShopifyProduct(), cursor: 'c1' }],
          pageInfo: { hasNextPage: false },
        },
      });
      globalThis.fetch = fetchMock;

      const provider = new ShopifyProvider(makeConfig());
      const result = await provider.searchProducts({});

      expect(result.data[0].thumbnail).toBe('https://cdn.shopify.com/img1.jpg');
      expect(result.data[0].images).toHaveLength(1);
      expect(result.data[0].images[0].url).toBe('https://cdn.shopify.com/img1.jpg');
    });

    it('maps tags correctly', async () => {
      const fetchMock = mockGraphQL({
        products: {
          edges: [{ node: makeShopifyProduct(), cursor: 'c1' }],
          pageInfo: { hasNextPage: false },
        },
      });
      globalThis.fetch = fetchMock;

      const provider = new ShopifyProvider(makeConfig());
      const result = await provider.searchProducts({});

      expect(result.data[0].tags).toHaveLength(2);
      expect(result.data[0].tags[0].value).toBe('summer');
      expect(result.data[0].tags[1].value).toBe('cotton');
    });
  });

  describe('getProduct', () => {
    it('returns mapped product by ID', async () => {
      const fetchMock = mockGraphQL({ node: makeShopifyProduct() });
      globalThis.fetch = fetchMock;

      const provider = new ShopifyProvider(makeConfig());
      const product = await provider.getProduct('gid://shopify/Product/1');

      expect(product.id).toBe('gid://shopify/Product/1');
      expect(product.title).toBe('Test T-Shirt');

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.variables.id).toBe('gid://shopify/Product/1');
    });

    it('throws ShopifyApiError when product not found (null node)', async () => {
      globalThis.fetch = mockGraphQL({ node: null });
      const provider = new ShopifyProvider(makeConfig());

      await expect(
        provider.getProduct('gid://shopify/Product/999'),
      ).rejects.toThrow(ShopifyApiError);

      try {
        await provider.getProduct('gid://shopify/Product/999');
      } catch (err) {
        const e = err as ShopifyApiError;
        expect(e.status).toBe(404);
        expect(e.body).toContain('Product not found');
      }
    });
  });

  // ─── Collections ──────────────────────────────────────────────

  describe('getCollections', () => {
    it('returns mapped collections', async () => {
      const fetchMock = mockGraphQL({
        collections: {
          edges: [
            { node: makeShopifyCollection(), cursor: 'c1' },
            { node: makeShopifyCollection({ id: 'gid://shopify/Collection/2', title: 'Winter', handle: 'winter' }), cursor: 'c2' },
          ],
        },
      });
      globalThis.fetch = fetchMock;

      const provider = new ShopifyProvider(makeConfig());
      const collections = await provider.getCollections();

      expect(collections).toHaveLength(2);
      expect(collections[0].id).toBe('gid://shopify/Collection/1');
      expect(collections[0].title).toBe('Summer Collection');
      expect(collections[1].title).toBe('Winter');
    });
  });

  describe('getCollection', () => {
    it('returns single collection with products', async () => {
      const collectionWithProducts = makeShopifyCollection({
        products: {
          edges: [{ node: makeShopifyProduct(), cursor: 'p1' }],
          pageInfo: { hasNextPage: false, hasPreviousPage: false },
        },
      });
      globalThis.fetch = mockGraphQL({ node: collectionWithProducts });

      const provider = new ShopifyProvider(makeConfig());
      const collection = await provider.getCollection('gid://shopify/Collection/1');

      expect(collection.id).toBe('gid://shopify/Collection/1');
      expect(collection.products).toHaveLength(1);
      expect(collection.products[0].title).toBe('Test T-Shirt');
    });

    it('throws ShopifyApiError when collection not found', async () => {
      globalThis.fetch = mockGraphQL({ node: null });
      const provider = new ShopifyProvider(makeConfig());

      await expect(
        provider.getCollection('gid://shopify/Collection/999'),
      ).rejects.toThrow(ShopifyApiError);
    });
  });

  // ─── Error Handling ───────────────────────────────────────────

  describe('error handling', () => {
    it('throws ShopifyApiError on non-ok HTTP response', async () => {
      globalThis.fetch = mockGraphQL({}, { status: 401, ok: false });
      const provider = new ShopifyProvider(makeConfig());

      await expect(provider.searchProducts({})).rejects.toThrow(ShopifyApiError);
    });

    it('includes status and url in error', async () => {
      globalThis.fetch = mockGraphQL({}, { status: 403, ok: false });
      const provider = new ShopifyProvider(makeConfig());

      try {
        await provider.getCollections();
        expect.fail('should have thrown');
      } catch (err) {
        const e = err as ShopifyApiError;
        expect(e.status).toBe(403);
        expect(e.url).toContain(STORE_DOMAIN);
      }
    });

    it('throws on GraphQL errors in response', async () => {
      globalThis.fetch = mockGraphQL(
        null,
        { errors: [{ message: 'Access denied' }] },
      );
      const provider = new ShopifyProvider(makeConfig());

      await expect(provider.searchProducts({})).rejects.toThrow(ShopifyApiError);
    });

    it('network error returns false for healthCheck', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
      const provider = new ShopifyProvider(makeConfig());

      expect(await provider.healthCheck()).toBe(false);
    });
  });

  // ─── Regions ──────────────────────────────────────────────────

  describe('getRegions', () => {
    it('returns default region', async () => {
      const provider = new ShopifyProvider(makeConfig());
      const regions = await provider.getRegions();

      expect(regions).toHaveLength(1);
      expect(regions[0].id).toBe('default');
      expect(regions[0].currency_code).toBe('usd');
    });
  });

  // ─── Orders (not supported) ───────────────────────────────────

  describe('getOrder', () => {
    it('throws 501 not implemented', async () => {
      const provider = new ShopifyProvider(makeConfig());
      await expect(provider.getOrder('order_1')).rejects.toThrow(ShopifyApiError);

      try {
        await provider.getOrder('order_1');
      } catch (err) {
        expect((err as ShopifyApiError).status).toBe(501);
      }
    });
  });

  describe('listOrders', () => {
    it('throws 501 not implemented', async () => {
      const provider = new ShopifyProvider(makeConfig());
      await expect(provider.listOrders({})).rejects.toThrow(ShopifyApiError);
    });
  });

  // ─── Cart ─────────────────────────────────────────────────────

  describe('createCart', () => {
    it('creates cart with line items', async () => {
      const cart = makeShopifyCart();
      globalThis.fetch = mockGraphQL({ cartCreate: { cart, userErrors: [] } });
      const provider = new ShopifyProvider(makeConfig());

      const result = await provider.createCart('default', [
        { variant_id: 'gid://shopify/ProductVariant/1', quantity: 2 },
      ]);

      expect(result.id).toBe('gid://shopify/Cart/1');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].quantity).toBe(2);
      expect(result.items[0].variant_id).toBe('gid://shopify/ProductVariant/1');
      expect(result.total).toBe(5998);
      expect(result.metadata.checkoutUrl).toBe('https://my-store.myshopify.com/cart/c/abc123');
    });

    it('sends correct merchandiseId in mutation', async () => {
      const fetchMock = mockGraphQL({ cartCreate: { cart: makeShopifyCart(), userErrors: [] } });
      globalThis.fetch = fetchMock;
      const provider = new ShopifyProvider(makeConfig());

      await provider.createCart('default', [
        { variant_id: 'gid://shopify/ProductVariant/42', quantity: 1 },
      ]);

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.variables.lines[0].merchandiseId).toBe('gid://shopify/ProductVariant/42');
      expect(body.variables.lines[0].quantity).toBe(1);
    });

    it('throws on userErrors', async () => {
      globalThis.fetch = mockGraphQL({
        cartCreate: { cart: null, userErrors: [{ message: 'Invalid variant' }] },
      });
      const provider = new ShopifyProvider(makeConfig());

      await expect(
        provider.createCart('default', [{ variant_id: 'bad', quantity: 1 }]),
      ).rejects.toThrow(ShopifyApiError);
    });

    it('creates empty cart', async () => {
      const emptyCart = makeShopifyCart({
        lines: { edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: false } },
        cost: {
          totalAmount: { amount: '0.00', currencyCode: 'USD' },
          subtotalAmount: { amount: '0.00', currencyCode: 'USD' },
          totalTaxAmount: null,
        },
      });
      globalThis.fetch = mockGraphQL({ cartCreate: { cart: emptyCart, userErrors: [] } });
      const provider = new ShopifyProvider(makeConfig());

      const result = await provider.createCart('default', []);
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getCart', () => {
    it('returns mapped cart', async () => {
      globalThis.fetch = mockGraphQL({ cart: makeShopifyCart() });
      const provider = new ShopifyProvider(makeConfig());

      const result = await provider.getCart('gid://shopify/Cart/1');
      expect(result.id).toBe('gid://shopify/Cart/1');
      expect(result.currency_code).toBe('usd');
      expect(result.subtotal).toBe(5998);
      expect(result.tax_total).toBe(480);
    });

    it('throws 404 when cart not found', async () => {
      globalThis.fetch = mockGraphQL({ cart: null });
      const provider = new ShopifyProvider(makeConfig());

      try {
        await provider.getCart('gid://shopify/Cart/999');
        expect.fail('should have thrown');
      } catch (err) {
        const e = err as ShopifyApiError;
        expect(e.status).toBe(404);
        expect(e.body).toContain('Cart not found');
      }
    });

    it('maps buyer identity email', async () => {
      const cart = makeShopifyCart({
        buyerIdentity: {
          email: 'test@example.com',
          countryCode: 'US',
          deliveryAddressPreferences: null,
        },
      });
      globalThis.fetch = mockGraphQL({ cart });
      const provider = new ShopifyProvider(makeConfig());

      const result = await provider.getCart('gid://shopify/Cart/1');
      expect(result.email).toBe('test@example.com');
      expect(result.region_id).toBe('US');
    });

    it('maps shipping address from delivery preferences', async () => {
      const cart = makeShopifyCart({
        buyerIdentity: {
          email: 'test@example.com',
          countryCode: 'US',
          deliveryAddressPreferences: [{
            address1: '123 Main St',
            address2: 'Apt 4',
            city: 'New York',
            provinceCode: 'NY',
            zip: '10001',
            countryCode: 'US',
          }],
        },
      });
      globalThis.fetch = mockGraphQL({ cart });
      const provider = new ShopifyProvider(makeConfig());

      const result = await provider.getCart('gid://shopify/Cart/1');
      expect(result.shipping_address).not.toBeNull();
      expect(result.shipping_address!.address_1).toBe('123 Main St');
      expect(result.shipping_address!.city).toBe('New York');
      expect(result.shipping_address!.postal_code).toBe('10001');
    });
  });

  describe('updateCart', () => {
    it('updates buyer email', async () => {
      const fetchMock = mockGraphQL({
        cartBuyerIdentityUpdate: { cart: makeShopifyCart({ buyerIdentity: { email: 'new@example.com', countryCode: null, deliveryAddressPreferences: null } }), userErrors: [] },
      });
      globalThis.fetch = fetchMock;
      const provider = new ShopifyProvider(makeConfig());

      const result = await provider.updateCart('gid://shopify/Cart/1', { email: 'new@example.com' });
      expect(result.email).toBe('new@example.com');

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.variables.buyerIdentity.email).toBe('new@example.com');
    });

    it('updates shipping address', async () => {
      const fetchMock = mockGraphQL({
        cartBuyerIdentityUpdate: { cart: makeShopifyCart(), userErrors: [] },
      });
      globalThis.fetch = fetchMock;
      const provider = new ShopifyProvider(makeConfig());

      await provider.updateCart('gid://shopify/Cart/1', {
        shipping_address: {
          first_name: 'John',
          last_name: 'Doe',
          address_1: '456 Oak Ave',
          address_2: null,
          city: 'Chicago',
          province: 'IL',
          postal_code: '60601',
          country_code: 'us',
          phone: null,
        },
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      const addr = body.variables.buyerIdentity.deliveryAddressPreferences[0].deliveryAddress;
      expect(addr.address1).toBe('456 Oak Ave');
      expect(addr.city).toBe('Chicago');
      expect(addr.countryCode).toBe('US');
    });

    it('throws on userErrors', async () => {
      globalThis.fetch = mockGraphQL({
        cartBuyerIdentityUpdate: { cart: null, userErrors: [{ message: 'Invalid email' }] },
      });
      const provider = new ShopifyProvider(makeConfig());

      await expect(
        provider.updateCart('gid://shopify/Cart/1', { email: 'bad' }),
      ).rejects.toThrow(ShopifyApiError);
    });
  });

  describe('addLineItem', () => {
    it('adds line item to cart', async () => {
      const cart = makeShopifyCart();
      globalThis.fetch = mockGraphQL({ cartLinesAdd: { cart, userErrors: [] } });
      const provider = new ShopifyProvider(makeConfig());

      const result = await provider.addLineItem('gid://shopify/Cart/1', 'gid://shopify/ProductVariant/1', 3);
      expect(result.id).toBe('gid://shopify/Cart/1');
    });

    it('sends correct mutation variables', async () => {
      const fetchMock = mockGraphQL({ cartLinesAdd: { cart: makeShopifyCart(), userErrors: [] } });
      globalThis.fetch = fetchMock;
      const provider = new ShopifyProvider(makeConfig());

      await provider.addLineItem('gid://shopify/Cart/1', 'gid://shopify/ProductVariant/99', 5);

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.variables.cartId).toBe('gid://shopify/Cart/1');
      expect(body.variables.lines[0].merchandiseId).toBe('gid://shopify/ProductVariant/99');
      expect(body.variables.lines[0].quantity).toBe(5);
    });

    it('throws on userErrors', async () => {
      globalThis.fetch = mockGraphQL({
        cartLinesAdd: { cart: null, userErrors: [{ message: 'Out of stock' }] },
      });
      const provider = new ShopifyProvider(makeConfig());

      await expect(
        provider.addLineItem('gid://shopify/Cart/1', 'bad', 1),
      ).rejects.toThrow(ShopifyApiError);
    });
  });

  describe('removeLineItem', () => {
    it('removes line item from cart', async () => {
      const emptyCart = makeShopifyCart({
        lines: { edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: false } },
        cost: {
          totalAmount: { amount: '0.00', currencyCode: 'USD' },
          subtotalAmount: { amount: '0.00', currencyCode: 'USD' },
          totalTaxAmount: null,
        },
      });
      globalThis.fetch = mockGraphQL({ cartLinesRemove: { cart: emptyCart, userErrors: [] } });
      const provider = new ShopifyProvider(makeConfig());

      const result = await provider.removeLineItem('gid://shopify/Cart/1', 'gid://shopify/CartLine/1');
      expect(result.items).toHaveLength(0);
    });

    it('sends correct lineIds', async () => {
      const fetchMock = mockGraphQL({ cartLinesRemove: { cart: makeShopifyCart(), userErrors: [] } });
      globalThis.fetch = fetchMock;
      const provider = new ShopifyProvider(makeConfig());

      await provider.removeLineItem('gid://shopify/Cart/1', 'gid://shopify/CartLine/42');

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.variables.cartId).toBe('gid://shopify/Cart/1');
      expect(body.variables.lineIds).toEqual(['gid://shopify/CartLine/42']);
    });

    it('throws on userErrors', async () => {
      globalThis.fetch = mockGraphQL({
        cartLinesRemove: { cart: null, userErrors: [{ message: 'Line not found' }] },
      });
      const provider = new ShopifyProvider(makeConfig());

      await expect(
        provider.removeLineItem('gid://shopify/Cart/1', 'bad'),
      ).rejects.toThrow(ShopifyApiError);
    });
  });

  // ─── Shipping ─────────────────────────────────────────────────

  describe('getShippingOptions', () => {
    it('returns shipping options from delivery groups', async () => {
      const cart = makeShopifyCart({
        deliveryGroups: {
          edges: [{
            node: {
              id: 'dg_1',
              deliveryOptions: [
                { handle: 'standard', title: 'Standard Shipping', estimatedCost: { amount: '5.99', currencyCode: 'USD' } },
                { handle: 'express', title: 'Express Shipping', estimatedCost: { amount: '12.99', currencyCode: 'USD' } },
              ],
              selectedDeliveryOption: null,
            },
            cursor: 'dg_c1',
          }],
          pageInfo: { hasNextPage: false, hasPreviousPage: false },
        },
      });
      globalThis.fetch = mockGraphQL({ cart });
      const provider = new ShopifyProvider(makeConfig());

      const options = await provider.getShippingOptions('gid://shopify/Cart/1');
      expect(options).toHaveLength(2);
      expect(options[0].id).toBe('standard');
      expect(options[0].name).toBe('Standard Shipping');
      expect(options[0].amount).toBe(599);
      expect(options[1].id).toBe('express');
      expect(options[1].amount).toBe(1299);
    });

    it('returns empty array when no delivery groups', async () => {
      globalThis.fetch = mockGraphQL({ cart: makeShopifyCart() });
      const provider = new ShopifyProvider(makeConfig());

      const options = await provider.getShippingOptions('gid://shopify/Cart/1');
      expect(options).toHaveLength(0);
    });

    it('returns empty array when cart not found', async () => {
      globalThis.fetch = mockGraphQL({ cart: null });
      const provider = new ShopifyProvider(makeConfig());

      const options = await provider.getShippingOptions('gid://shopify/Cart/999');
      expect(options).toHaveLength(0);
    });
  });

  describe('addShippingMethod', () => {
    it('selects delivery option on cart', async () => {
      // First call: get cart to find delivery group ID
      // Second call: update selected delivery option
      const cartWithGroups = makeShopifyCart({
        deliveryGroups: {
          edges: [{
            node: {
              id: 'dg_1',
              deliveryOptions: [
                { handle: 'standard', title: 'Standard', estimatedCost: { amount: '5.99', currencyCode: 'USD' } },
              ],
              selectedDeliveryOption: null,
            },
            cursor: 'dg_c1',
          }],
          pageInfo: { hasNextPage: false, hasPreviousPage: false },
        },
      });

      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true, status: 200,
          json: () => Promise.resolve({ data: { cart: cartWithGroups } }),
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: true, status: 200,
          json: () => Promise.resolve({ data: { cartSelectedDeliveryOptionsUpdate: { cart: cartWithGroups, userErrors: [] } } }),
          text: () => Promise.resolve(''),
        });
      globalThis.fetch = fetchMock;
      const provider = new ShopifyProvider(makeConfig());

      const result = await provider.addShippingMethod('gid://shopify/Cart/1', 'standard');
      expect(result.id).toBe('gid://shopify/Cart/1');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('throws when no delivery groups available', async () => {
      globalThis.fetch = mockGraphQL({ cart: makeShopifyCart() }); // empty deliveryGroups
      const provider = new ShopifyProvider(makeConfig());

      await expect(
        provider.addShippingMethod('gid://shopify/Cart/1', 'standard'),
      ).rejects.toThrow('No delivery groups available');
    });
  });

  // ─── Checkout ─────────────────────────────────────────────────

  describe('createPaymentSessions', () => {
    it('returns cart as-is (Shopify handles payment natively)', async () => {
      globalThis.fetch = mockGraphQL({ cart: makeShopifyCart() });
      const provider = new ShopifyProvider(makeConfig());

      const result = await provider.createPaymentSessions('gid://shopify/Cart/1');
      expect(result.id).toBe('gid://shopify/Cart/1');
    });
  });

  describe('selectPaymentSession', () => {
    it('returns cart as-is (no-op for Shopify)', async () => {
      globalThis.fetch = mockGraphQL({ cart: makeShopifyCart() });
      const provider = new ShopifyProvider(makeConfig());

      const result = await provider.selectPaymentSession('gid://shopify/Cart/1', 'stripe');
      expect(result.id).toBe('gid://shopify/Cart/1');
    });
  });

  describe('initializePayment', () => {
    it('returns PaymentSession with checkoutUrl', async () => {
      globalThis.fetch = mockGraphQL({ cart: makeShopifyCart() });
      const provider = new ShopifyProvider(makeConfig());

      const session = await provider.initializePayment('gid://shopify/Cart/1', 'shopify');
      expect(session.id).toBe('gid://shopify/Cart/1');
      expect(session.provider_id).toBe('shopify');
      expect(session.status).toBe('pending');
      expect(session.data.checkoutUrl).toBe('https://my-store.myshopify.com/cart/c/abc123');
    });
  });

  describe('completeCart', () => {
    it('throws with redirect URL (Shopify handles completion)', async () => {
      globalThis.fetch = mockGraphQL({ cart: makeShopifyCart() });
      const provider = new ShopifyProvider(makeConfig());

      try {
        await provider.completeCart('gid://shopify/Cart/1');
        expect.fail('should have thrown');
      } catch (err) {
        const e = err as ShopifyApiError;
        expect(e.status).toBe(400);
        expect(e.body).toContain('Redirect to:');
        expect(e.body).toContain('https://my-store.myshopify.com/cart/c/abc123');
      }
    });
  });
});
