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
});
