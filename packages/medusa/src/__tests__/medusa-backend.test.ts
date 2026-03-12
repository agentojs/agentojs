import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MedusaBackend, MedusaApiError } from '../medusa-backend.js';
import type { MedusaBackendConfig } from '../medusa-backend.js';

const BASE_URL = 'https://medusa.example.com';
const API_KEY = 'pk_test_123';

function makeConfig(overrides?: Partial<MedusaBackendConfig>): MedusaBackendConfig {
  return { backendUrl: BASE_URL, apiKey: API_KEY, ...overrides };
}

function mockFetch(data: unknown, options?: { status?: number; ok?: boolean }) {
  const status = options?.status ?? 200;
  const ok = options?.ok ?? true;
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

describe('MedusaBackend', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('constructor creates instance', () => {
    const backend = new MedusaBackend(makeConfig());
    expect(backend).toBeInstanceOf(MedusaBackend);
  });

  // ─── Products ───────────────────────────────────────────────────

  describe('searchProducts', () => {
    it('calls /store/products with search query and region', async () => {
      const fetchMock = mockFetch({
        products: [{ id: 'prod_1', title: 'T-Shirt' }],
        count: 1,
        offset: 0,
        limit: 20,
      });
      globalThis.fetch = fetchMock;

      const backend = new MedusaBackend(makeConfig({ regionId: 'reg_eu' }));
      const result = await backend.searchProducts({ q: 'shirt', limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('prod_1');
      expect(result.count).toBe(1);

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/store/products');
      expect(calledUrl).toContain('q=shirt');
      expect(calledUrl).toContain('region_id=reg_eu');
    });

    it('auto-resolves region when not provided', async () => {
      const fetchMock = vi.fn()
        // First call: getRegions
        .mockResolvedValueOnce({
          ok: true, status: 200,
          json: () => Promise.resolve({ regions: [{ id: 'reg_auto' }] }),
          text: () => Promise.resolve(''),
        })
        // Second call: searchProducts
        .mockResolvedValueOnce({
          ok: true, status: 200,
          json: () => Promise.resolve({ products: [], count: 0, offset: 0, limit: 20 }),
          text: () => Promise.resolve(''),
        });
      globalThis.fetch = fetchMock;

      const backend = new MedusaBackend(makeConfig({ regionId: undefined }));
      await backend.searchProducts({ q: 'test' });

      // Second call should include the auto-detected region
      const productUrl = fetchMock.mock.calls[1][0] as string;
      expect(productUrl).toContain('region_id=reg_auto');
    });

    it('passes category_id[] and collection_id[] params', async () => {
      const fetchMock = mockFetch({ products: [], count: 0, offset: 0, limit: 20 });
      globalThis.fetch = fetchMock;

      const backend = new MedusaBackend(makeConfig({ regionId: 'reg_1' }));
      await backend.searchProducts({
        category_id: ['cat_1', 'cat_2'],
        collection_id: ['col_1'],
      });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain('category_id%5B%5D=cat_1');
      expect(calledUrl).toContain('category_id%5B%5D=cat_2');
      expect(calledUrl).toContain('collection_id%5B%5D=col_1');
    });
  });

  describe('getProduct', () => {
    it('calls /store/products/:id with region params', async () => {
      const fetchMock = mockFetch({ product: { id: 'prod_1', title: 'Hoodie' } });
      globalThis.fetch = fetchMock;

      const backend = new MedusaBackend(makeConfig({ regionId: 'reg_1' }));
      const product = await backend.getProduct('prod_1');

      expect(product.id).toBe('prod_1');
      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/store/products/prod_1');
      expect(calledUrl).toContain('region_id=reg_1');
    });
  });

  // ─── Collections ────────────────────────────────────────────────

  describe('getCollections', () => {
    it('returns array of collections', async () => {
      globalThis.fetch = mockFetch({ collections: [{ id: 'col_1', title: 'Summer' }] });
      const backend = new MedusaBackend(makeConfig());
      const cols = await backend.getCollections();
      expect(cols).toHaveLength(1);
      expect(cols[0].id).toBe('col_1');
    });
  });

  describe('getCollection', () => {
    it('returns single collection', async () => {
      globalThis.fetch = mockFetch({ collection: { id: 'col_1', title: 'Summer' } });
      const backend = new MedusaBackend(makeConfig());
      const col = await backend.getCollection('col_1');
      expect(col.id).toBe('col_1');
    });
  });

  // ─── Cart ───────────────────────────────────────────────────────

  describe('createCart', () => {
    it('sends POST /store/carts with region_id and items', async () => {
      const fetchMock = mockFetch({ cart: { id: 'cart_1', items: [] } });
      globalThis.fetch = fetchMock;

      const backend = new MedusaBackend(makeConfig());
      const cart = await backend.createCart('reg_1', [
        { variant_id: 'var_1', quantity: 2 },
      ]);

      expect(cart.id).toBe('cart_1');
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain('/store/carts');
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toEqual({
        region_id: 'reg_1',
        items: [{ variant_id: 'var_1', quantity: 2 }],
      });
    });
  });

  describe('getCart', () => {
    it('calls GET /store/carts/:id', async () => {
      const fetchMock = mockFetch({ cart: { id: 'cart_1' } });
      globalThis.fetch = fetchMock;

      const backend = new MedusaBackend(makeConfig());
      const cart = await backend.getCart('cart_1');

      expect(cart.id).toBe('cart_1');
      expect((fetchMock.mock.calls[0][0] as string)).toContain('/store/carts/cart_1');
    });
  });

  describe('addLineItem', () => {
    it('sends POST /store/carts/:id/line-items', async () => {
      const fetchMock = mockFetch({ cart: { id: 'cart_1', items: [{ id: 'li_1' }] } });
      globalThis.fetch = fetchMock;

      const backend = new MedusaBackend(makeConfig());
      const cart = await backend.addLineItem('cart_1', 'var_1', 3);

      expect(cart.id).toBe('cart_1');
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain('/store/carts/cart_1/line-items');
      expect(JSON.parse(opts.body)).toEqual({ variant_id: 'var_1', quantity: 3 });
    });
  });

  describe('removeLineItem', () => {
    it('sends DELETE /store/carts/:id/line-items/:itemId', async () => {
      const fetchMock = mockFetch({ cart: { id: 'cart_1', items: [] } });
      globalThis.fetch = fetchMock;

      const backend = new MedusaBackend(makeConfig());
      await backend.removeLineItem('cart_1', 'li_1');

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain('/store/carts/cart_1/line-items/li_1');
      expect(opts.method).toBe('DELETE');
    });
  });

  describe('updateCart', () => {
    it('sends POST /store/carts/:id with updates', async () => {
      const fetchMock = mockFetch({ cart: { id: 'cart_1', email: 'a@b.com' } });
      globalThis.fetch = fetchMock;

      const backend = new MedusaBackend(makeConfig());
      await backend.updateCart('cart_1', { email: 'a@b.com' });

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain('/store/carts/cart_1');
      expect(JSON.parse(opts.body)).toEqual({ email: 'a@b.com' });
    });
  });

  // ─── Shipping ───────────────────────────────────────────────────

  describe('getShippingOptions', () => {
    it('calls /store/shipping-options?cart_id=...', async () => {
      const fetchMock = mockFetch({
        shipping_options: [{ id: 'so_1', name: 'Standard' }],
      });
      globalThis.fetch = fetchMock;

      const backend = new MedusaBackend(makeConfig());
      const options = await backend.getShippingOptions('cart_1');

      expect(options).toHaveLength(1);
      expect((fetchMock.mock.calls[0][0] as string)).toContain('cart_id=cart_1');
    });
  });

  describe('addShippingMethod', () => {
    it('sends POST with option_id', async () => {
      const fetchMock = mockFetch({ cart: { id: 'cart_1' } });
      globalThis.fetch = fetchMock;

      const backend = new MedusaBackend(makeConfig());
      await backend.addShippingMethod('cart_1', 'so_1');

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain('/store/carts/cart_1/shipping-methods');
      expect(JSON.parse(opts.body)).toEqual({ option_id: 'so_1' });
    });
  });

  // ─── Checkout ───────────────────────────────────────────────────

  describe('initializePayment', () => {
    it('creates payment collection and session (full flow)', async () => {
      const fetchMock = vi.fn()
        // 1. GET cart — no payment collection
        .mockResolvedValueOnce({
          ok: true, status: 200,
          json: () => Promise.resolve({ cart: { payment_collection: undefined } }),
          text: () => Promise.resolve(''),
        })
        // 2. POST /payment-collections — create payment collection
        .mockResolvedValueOnce({
          ok: true, status: 200,
          json: () => Promise.resolve({ payment_collection: { id: 'pc_1' } }),
          text: () => Promise.resolve(''),
        })
        // 3. POST /payment-collections/:id/payment-sessions
        .mockResolvedValueOnce({
          ok: true, status: 200,
          json: () => Promise.resolve({
            payment_collection: {
              payment_sessions: [{
                id: 'ps_1',
                provider_id: 'stripe',
                status: 'pending',
                amount: 5000,
                currency_code: 'usd',
                data: { client_secret: 'cs_123' },
              }],
            },
          }),
          text: () => Promise.resolve(''),
        });
      globalThis.fetch = fetchMock;

      const backend = new MedusaBackend(makeConfig());
      const ps = await backend.initializePayment('cart_1', 'stripe');

      expect(ps.id).toBe('ps_1');
      expect(ps.provider_id).toBe('stripe');
      expect(ps.status).toBe('pending');
      expect(ps.data).toMatchObject({ amount: 5000, currency_code: 'usd', client_secret: 'cs_123' });
    });

    it('reuses existing payment collection', async () => {
      const fetchMock = vi.fn()
        // 1. GET cart — has payment collection
        .mockResolvedValueOnce({
          ok: true, status: 200,
          json: () => Promise.resolve({ cart: { payment_collection: { id: 'pc_existing' } } }),
          text: () => Promise.resolve(''),
        })
        // 2. POST /payment-collections/:id/payment-sessions (skips creation)
        .mockResolvedValueOnce({
          ok: true, status: 200,
          json: () => Promise.resolve({
            payment_collection: {
              payment_sessions: [{
                id: 'ps_2', provider_id: 'stripe', status: 'authorized',
                amount: 3000, currency_code: 'eur', data: {},
              }],
            },
          }),
          text: () => Promise.resolve(''),
        });
      globalThis.fetch = fetchMock;

      const backend = new MedusaBackend(makeConfig());
      const ps = await backend.initializePayment('cart_1', 'stripe');

      expect(ps.status).toBe('authorized');
      // Should only have 2 calls (no create-pc call)
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('completeCart', () => {
    it('sends POST to /store/carts/:id/complete', async () => {
      const fetchMock = mockFetch({
        type: 'order',
        order: { id: 'order_1', status: 'completed' },
      });
      globalThis.fetch = fetchMock;

      const backend = new MedusaBackend(makeConfig());
      const order = await backend.completeCart('cart_1');

      expect(order.id).toBe('order_1');
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain('/store/carts/cart_1/complete');
      expect(opts.method).toBe('POST');
    });
  });

  // ─── Orders ─────────────────────────────────────────────────────

  describe('getOrder', () => {
    it('calls GET /store/orders/:id', async () => {
      globalThis.fetch = mockFetch({ order: { id: 'order_1' } });
      const backend = new MedusaBackend(makeConfig());
      const order = await backend.getOrder('order_1');
      expect(order.id).toBe('order_1');
    });
  });

  describe('listOrders', () => {
    it('passes filters as query params', async () => {
      const fetchMock = mockFetch({
        orders: [{ id: 'order_1' }],
        count: 1, offset: 0, limit: 10,
      });
      globalThis.fetch = fetchMock;

      const backend = new MedusaBackend(makeConfig());
      const result = await backend.listOrders({ email: 'a@b.com', limit: 5 });

      expect(result.data).toHaveLength(1);
      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain('email=a%40b.com');
      expect(calledUrl).toContain('limit=5');
    });
  });

  // ─── Regions ────────────────────────────────────────────────────

  describe('getRegions', () => {
    it('returns regions array', async () => {
      globalThis.fetch = mockFetch({ regions: [{ id: 'reg_1', name: 'EU' }] });
      const backend = new MedusaBackend(makeConfig());
      const regions = await backend.getRegions();
      expect(regions).toHaveLength(1);
      expect(regions[0].id).toBe('reg_1');
    });
  });

  // ─── Health ─────────────────────────────────────────────────────

  describe('healthCheck', () => {
    it('returns true when server responds', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
      const backend = new MedusaBackend(makeConfig());
      expect(await backend.healthCheck()).toBe(true);
    });

    it('returns false when server is unreachable', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
      const backend = new MedusaBackend(makeConfig());
      expect(await backend.healthCheck()).toBe(false);
    });

    it('calls /health (not /store/health)', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      globalThis.fetch = fetchMock;

      const backend = new MedusaBackend(makeConfig());
      await backend.healthCheck();

      expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/health`);
    });
  });

  // ─── Error Handling ─────────────────────────────────────────────

  describe('error handling', () => {
    it('throws MedusaApiError on non-ok response', async () => {
      globalThis.fetch = mockFetch({ message: 'Not Found' }, { status: 404, ok: false });
      const backend = new MedusaBackend(makeConfig({ regionId: 'reg_1' }));

      await expect(backend.getProduct('missing')).rejects.toThrow(MedusaApiError);
    });

    it('includes status, body, and url in error', async () => {
      globalThis.fetch = mockFetch({ message: 'Gone' }, { status: 410, ok: false });
      const backend = new MedusaBackend(makeConfig({ regionId: 'reg_1' }));

      try {
        await backend.getProduct('gone');
        expect.fail('should have thrown');
      } catch (err) {
        const e = err as MedusaApiError;
        expect(e.status).toBe(410);
        expect(e.url).toContain('/store/products/gone');
      }
    });
  });

  // ─── Headers ────────────────────────────────────────────────────

  describe('headers', () => {
    it('sends x-publishable-api-key header', async () => {
      const fetchMock = mockFetch({ collections: [] });
      globalThis.fetch = fetchMock;

      const backend = new MedusaBackend(makeConfig());
      await backend.getCollections();

      const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
      expect(headers['x-publishable-api-key']).toBe(API_KEY);
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('omits api key header when empty', async () => {
      const fetchMock = mockFetch({ collections: [] });
      globalThis.fetch = fetchMock;

      const backend = new MedusaBackend(makeConfig({ apiKey: '' }));
      await backend.getCollections();

      const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
      expect(headers['x-publishable-api-key']).toBeUndefined();
    });
  });
});
