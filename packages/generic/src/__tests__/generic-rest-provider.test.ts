import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GenericRESTProvider, GenericProviderNotImplementedError } from '../generic-rest-provider.js';

// ─── Fetch mock helpers ───────────────────────────────────────────

const originalFetch = globalThis.fetch;
let mockFetch: ReturnType<typeof vi.fn>;

function mockResponse(body: unknown, status = 200, statusText = 'OK') {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

beforeEach(() => {
  mockFetch = vi.fn();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function createBackend(overrides: Record<string, unknown> = {}) {
  return new GenericRESTProvider({
    baseUrl: 'https://api.example.com',
    apiKey: 'test-key',
    ...overrides,
  });
}

// ─── Constructor ──────────────────────────────────────────────────

describe('GenericRESTProvider — constructor', () => {
  it('creates an instance', () => {
    const backend = createBackend();
    expect(backend).toBeInstanceOf(GenericRESTProvider);
  });

  it('strips trailing slashes from baseUrl', async () => {
    const backend = createBackend({ baseUrl: 'https://api.example.com///' });
    mockFetch.mockResolvedValueOnce(mockResponse({ ok: true }));
    await backend.healthCheck();

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/health',
      expect.anything(),
    );
  });
});

// ─── Auth headers ─────────────────────────────────────────────────

describe('GenericRESTProvider — auth headers', () => {
  it('sends Bearer token in Authorization header by default', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(mockResponse({ ok: true }));
    await backend.healthCheck();

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers['Authorization']).toBe('Bearer test-key');
  });

  it('uses custom header name when configured', async () => {
    const backend = createBackend({ apiKeyHeader: 'X-API-Key' });
    mockFetch.mockResolvedValueOnce(mockResponse({ ok: true }));
    await backend.healthCheck();

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers['X-API-Key']).toBe('test-key');
    expect(init.headers['Authorization']).toBeUndefined();
  });

  it('does not add auth header when apiKey is empty', async () => {
    const backend = createBackend({ apiKey: '' });
    mockFetch.mockResolvedValueOnce(mockResponse({ ok: true }));
    await backend.healthCheck();

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers['Authorization']).toBeUndefined();
  });
});

// ─── Products ─────────────────────────────────────────────────────

describe('GenericRESTProvider — searchProducts', () => {
  it('handles { products: [...] } response shape', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        products: [
          { id: 'p1', title: 'Widget', price: 10 },
          { id: 'p2', title: 'Gadget', price: 20 },
        ],
        count: 2,
      }),
    );

    const result = await backend.searchProducts({});
    expect(result.data).toHaveLength(2);
    expect(result.data[0].title).toBe('Widget');
    expect(result.count).toBe(2);
  });

  it('handles { data: [...] } response shape', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        data: [{ id: 'p1', name: 'Item' }],
        total: 1,
      }),
    );

    const result = await backend.searchProducts({});
    expect(result.data).toHaveLength(1);
    expect(result.data[0].title).toBe('Item');
    expect(result.count).toBe(1);
  });

  it('handles raw array response', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(
      mockResponse([{ id: 'p1', title: 'Solo' }]),
    );

    const result = await backend.searchProducts({});
    expect(result.data).toHaveLength(1);
    expect(result.data[0].title).toBe('Solo');
  });

  it('sends query parameters', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(mockResponse({ products: [] }));

    await backend.searchProducts({
      q: 'widget',
      limit: 10,
      offset: 5,
      category_id: ['cat-1'],
    });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('q=widget');
    expect(url).toContain('limit=10');
    expect(url).toContain('offset=5');
    expect(url).toContain('category_id=cat-1');
  });

  it('handles empty response shape gracefully', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(mockResponse({}));

    const result = await backend.searchProducts({});
    expect(result.data).toEqual([]);
    expect(result.count).toBe(0);
  });
});

describe('GenericRESTProvider — getProduct', () => {
  it('fetches product by id', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(
      mockResponse({ id: 'p1', title: 'Widget', price: 29.99 }),
    );

    const product = await backend.getProduct('p1');
    expect(product.id).toBe('p1');
    expect(product.title).toBe('Widget');

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toBe('https://api.example.com/products/p1');
  });

  it('unwraps { product: {...} } envelope', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(
      mockResponse({ product: { id: 'p2', title: 'Nested' } }),
    );

    const product = await backend.getProduct('p2');
    expect(product.title).toBe('Nested');
  });
});

// ─── Collections ──────────────────────────────────────────────────

describe('GenericRESTProvider — collections', () => {
  it('getCollections handles { collections: [...] }', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        collections: [{ id: 'c1', title: 'Summer', slug: 'summer' }],
      }),
    );

    const collections = await backend.getCollections();
    expect(collections).toHaveLength(1);
    expect(collections[0].title).toBe('Summer');
    expect(collections[0].handle).toBe('summer');
  });

  it('getCollections handles raw array', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(
      mockResponse([{ id: 'c1', name: 'Winter', handle: 'winter' }]),
    );

    const collections = await backend.getCollections();
    expect(collections[0].title).toBe('Winter');
  });

  it('getCollection unwraps { collection: {...} }', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(
      mockResponse({ collection: { id: 'c1', title: 'Fall', slug: 'fall' } }),
    );

    const collection = await backend.getCollection('c1');
    expect(collection.title).toBe('Fall');
    expect(collection.handle).toBe('fall');
  });
});

// ─── Cart ─────────────────────────────────────────────────────────

describe('GenericRESTProvider — cart', () => {
  it('createCart sends POST with region and items', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        id: 'cart-1',
        items: [],
        total: 0,
      }),
    );

    const cart = await backend.createCart('reg-1', [
      { variant_id: 'v1', quantity: 2 },
    ]);

    expect(cart.id).toBe('cart-1');
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.example.com/carts');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      region_id: 'reg-1',
      items: [{ variant_id: 'v1', quantity: 2 }],
    });
  });

  it('getCart fetches cart by id and unwraps envelope', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(
      mockResponse({ cart: { id: 'cart-1', items: [], total: 50 } }),
    );

    const cart = await backend.getCart('cart-1');
    expect(cart.id).toBe('cart-1');
    expect(cart.total).toBe(50);
  });

  it('updateCart sends PATCH', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(
      mockResponse({ id: 'cart-1', email: 'test@example.com', total: 0 }),
    );

    const cart = await backend.updateCart('cart-1', {
      email: 'test@example.com',
    });

    expect(cart.email).toBe('test@example.com');
    const [, init] = mockFetch.mock.calls[0];
    expect(init.method).toBe('PATCH');
  });

  it('addLineItem sends POST to correct URL', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        id: 'cart-1',
        items: [{ id: 'li-1', variant_id: 'v1', quantity: 3, title: 'Widget' }],
        total: 30,
      }),
    );

    const cart = await backend.addLineItem('cart-1', 'v1', 3);
    expect(cart.items).toHaveLength(1);

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toBe('https://api.example.com/carts/cart-1/line-items');
  });

  it('removeLineItem sends DELETE', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(
      mockResponse({ id: 'cart-1', items: [], total: 0 }),
    );

    await backend.removeLineItem('cart-1', 'li-1');

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(
      'https://api.example.com/carts/cart-1/line-items/li-1',
    );
    expect(init.method).toBe('DELETE');
  });
});

// ─── Shipping ─────────────────────────────────────────────────────

describe('GenericRESTProvider — shipping', () => {
  it('getShippingOptions handles { shipping_options: [...] }', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        shipping_options: [
          { id: 'so-1', name: 'Standard', amount: 5 },
          { id: 'so-2', name: 'Express', amount: 15 },
        ],
      }),
    );

    const options = await backend.getShippingOptions('cart-1');
    expect(options).toHaveLength(2);
    expect(options[0].name).toBe('Standard');
    expect(options[1].amount).toBe(15);
  });

  it('addShippingMethod sends POST', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(
      mockResponse({ id: 'cart-1', items: [], total: 0 }),
    );

    await backend.addShippingMethod('cart-1', 'so-1');

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(
      'https://api.example.com/carts/cart-1/shipping-methods',
    );
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ option_id: 'so-1' });
  });
});

// ─── Checkout (not implemented methods) ───────────────────────────

describe('GenericRESTProvider — checkout', () => {
  it('createPaymentSessions throws NotImplementedError', async () => {
    const backend = createBackend();
    await expect(backend.createPaymentSessions('cart-1')).rejects.toThrow(
      GenericProviderNotImplementedError,
    );
  });

  it('selectPaymentSession throws NotImplementedError', async () => {
    const backend = createBackend();
    await expect(
      backend.selectPaymentSession('cart-1', 'stripe'),
    ).rejects.toThrow(GenericProviderNotImplementedError);
  });

  it('initializePayment throws NotImplementedError', async () => {
    const backend = createBackend();
    await expect(
      backend.initializePayment('cart-1', 'stripe'),
    ).rejects.toThrow(GenericProviderNotImplementedError);
  });

  it('completeCart sends POST and returns Order', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        id: 'ord-1',
        status: 'completed',
        items: [],
        total: 100,
      }),
    );

    const order = await backend.completeCart('cart-1');
    expect(order.id).toBe('ord-1');
    expect(order.status).toBe('completed');

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.example.com/carts/cart-1/complete');
    expect(init.method).toBe('POST');
  });
});

// ─── Orders ───────────────────────────────────────────────────────

describe('GenericRESTProvider — orders', () => {
  it('getOrder fetches and unwraps { order: {...} }', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(
      mockResponse({ order: { id: 'ord-1', status: 'pending', total: 50 } }),
    );

    const order = await backend.getOrder('ord-1');
    expect(order.id).toBe('ord-1');
    expect(order.status).toBe('pending');
  });

  it('listOrders handles { orders: [...] } response', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        orders: [
          { id: 'ord-1', status: 'completed', total: 100 },
          { id: 'ord-2', status: 'pending', total: 50 },
        ],
        count: 2,
      }),
    );

    const result = await backend.listOrders({ limit: 10, offset: 0 });
    expect(result.data).toHaveLength(2);
    expect(result.count).toBe(2);
  });

  it('listOrders handles raw array response', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(
      mockResponse([{ id: 'ord-1', total: 100 }]),
    );

    const result = await backend.listOrders({});
    expect(result.data).toHaveLength(1);
  });

  it('listOrders sends filter parameters', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(mockResponse({ orders: [], count: 0 }));

    await backend.listOrders({
      email: 'john@example.com',
      status: 'completed',
      limit: 5,
      offset: 10,
    });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('email=john%40example.com');
    expect(url).toContain('status=completed');
    expect(url).toContain('limit=5');
    expect(url).toContain('offset=10');
  });
});

// ─── Regions ──────────────────────────────────────────────────────

describe('GenericRESTProvider — regions', () => {
  it('returns regions from { regions: [...] } response', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        regions: [
          {
            id: 'r1',
            name: 'North America',
            currency_code: 'USD',
            countries: [{ iso_2: 'US', name: 'United States' }],
          },
        ],
      }),
    );

    const regions = await backend.getRegions();
    expect(regions).toHaveLength(1);
    expect(regions[0].name).toBe('North America');
    expect(regions[0].countries[0].iso_2).toBe('US');
  });

  it('returns default region on API failure', async () => {
    const backend = createBackend();
    mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

    const regions = await backend.getRegions();
    expect(regions).toHaveLength(1);
    expect(regions[0].id).toBe('default');
    expect(regions[0].currency_code).toBe('USD');
  });
});

// ─── Health ───────────────────────────────────────────────────────

describe('GenericRESTProvider — healthCheck', () => {
  it('returns true when API responds ok', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(mockResponse({ status: 'ok' }));

    expect(await backend.healthCheck()).toBe(true);
  });

  it('returns false when API fails', async () => {
    const backend = createBackend();
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    expect(await backend.healthCheck()).toBe(false);
  });

  it('returns false on non-ok status', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(mockResponse('Not Found', 404, 'Not Found'));

    expect(await backend.healthCheck()).toBe(false);
  });
});

// ─── Custom endpoints ─────────────────────────────────────────────

describe('GenericRESTProvider — custom endpoints', () => {
  it('uses custom endpoint paths', async () => {
    const backend = createBackend({
      endpointsMap: {
        products: '/api/v2/inventory',
        health: '/api/status',
      },
    });

    mockFetch.mockResolvedValueOnce(mockResponse({ status: 'ok' }));
    await backend.healthCheck();

    expect(mockFetch.mock.calls[0][0]).toBe(
      'https://api.example.com/api/status',
    );
  });
});

// ─── Custom field mapping ─────────────────────────────────────────

describe('GenericRESTProvider — custom field mapping', () => {
  it('uses field mapping for product transformation', async () => {
    const backend = createBackend({
      fieldMap: {
        product: {
          title: 'vehicle_name',
          price: 'msrp.amount',
        },
      },
    });

    mockFetch.mockResolvedValueOnce(
      mockResponse({
        id: 'car-1',
        vehicle_name: '2024 Tesla Model 3',
        msrp: { amount: 38990 },
      }),
    );

    const product = await backend.getProduct('car-1');
    expect(product.title).toBe('2024 Tesla Model 3');
    expect(product.variants[0].prices[0].amount).toBe(38990);
  });
});

// ─── Error handling ───────────────────────────────────────────────

describe('GenericRESTProvider — error handling', () => {
  it('throws on non-ok HTTP response', async () => {
    const backend = createBackend();
    mockFetch.mockResolvedValueOnce(
      mockResponse({ error: 'Not Found' }, 404, 'Not Found'),
    );

    await expect(backend.getProduct('missing')).rejects.toThrow(
      'Generic REST API error: 404 Not Found',
    );
  });

  it('GenericProviderNotImplementedError has correct name', () => {
    const error = new GenericProviderNotImplementedError('testMethod');
    expect(error.name).toBe('GenericProviderNotImplementedError');
    expect(error.message).toContain('testMethod');
    expect(error.message).toContain('does not support');
  });
});
