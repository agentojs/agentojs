import { describe, it, expect, vi, afterEach } from 'vitest';
import { WooCommerceBackend, WooCommerceApiError } from '../woocommerce-backend.js';
import type { WooCommerceBackendConfig, WcStoreProduct, WcCart, WcOrder } from '../woocommerce-backend.js';

const BASE_URL = 'https://shop.example.com';
const CONSUMER_KEY = 'ck_test_123';
const CONSUMER_SECRET = 'cs_test_456';

function makeConfig(overrides?: Partial<WooCommerceBackendConfig>): WooCommerceBackendConfig {
  return { baseUrl: BASE_URL, consumerKey: CONSUMER_KEY, consumerSecret: CONSUMER_SECRET, ...overrides };
}

/** Create a mock fetch response */
function mockResponse(data: unknown, opts?: { status?: number; ok?: boolean; headers?: Record<string, string> }) {
  const status = opts?.status ?? 200;
  const ok = opts?.ok ?? true;
  const headers = new Map(Object.entries(opts?.headers ?? {}));
  return {
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: { get: (key: string) => headers.get(key) ?? null },
  };
}

/** A typical WC Store API product */
function makeWcProduct(overrides?: Partial<WcStoreProduct>): WcStoreProduct {
  return {
    id: 42,
    name: 'Test Hoodie',
    slug: 'test-hoodie',
    description: 'A warm hoodie',
    short_description: 'Warm hoodie',
    sku: 'HOODIE-001',
    prices: {
      price: '2999',
      regular_price: '3999',
      sale_price: '2999',
      currency_code: 'USD',
      currency_minor_unit: 2,
    },
    images: [{ id: 1, src: 'https://img.example.com/hoodie.jpg', alt: 'Hoodie' }],
    categories: [{ id: 5, name: 'Clothing', slug: 'clothing' }],
    attributes: [{ id: 1, name: 'Size', terms: [{ name: 'S' }, { name: 'M' }, { name: 'L' }] }],
    has_options: false,
    is_in_stock: true,
    is_purchasable: true,
    low_stock_remaining: null,
    ...overrides,
  };
}

/** A typical WC Store API cart */
function makeWcCart(overrides?: Partial<WcCart>): WcCart {
  return {
    items: [
      {
        key: 'item-key-1',
        id: 42,
        name: 'Test Hoodie',
        short_description: 'Warm hoodie',
        quantity: 2,
        images: [{ thumbnail: 'https://img.example.com/hoodie-thumb.jpg' }],
        prices: { price: '2999', currency_code: 'USD', currency_minor_unit: 2 },
        totals: { line_subtotal: '5998', line_total: '5998' },
      },
    ],
    totals: {
      total_items: '5998',
      total_shipping: '500',
      total_tax: '600',
      total_discount: '0',
      total_price: '7098',
      currency_code: 'USD',
      currency_minor_unit: 2,
    },
    shipping_rates: [
      {
        package_id: 0,
        shipping_rates: [
          { rate_id: 'flat_rate:1', name: 'Flat Rate', price: '500', selected: true },
          { rate_id: 'free_shipping:2', name: 'Free Shipping', price: '0', selected: false },
        ],
      },
    ],
    payment_methods: [
      { name: 'cod', label: 'Cash on Delivery' },
      { name: 'stripe', label: 'Credit Card' },
    ],
    ...overrides,
  };
}

describe('WooCommerceBackend', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ─── Constructor ────────────────────────────────────────────────

  it('constructor creates instance', () => {
    const backend = new WooCommerceBackend(makeConfig());
    expect(backend).toBeInstanceOf(WooCommerceBackend);
  });

  it('strips trailing slash from baseUrl', () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse([]));
    globalThis.fetch = fetchMock;

    const backend = new WooCommerceBackend(makeConfig({ baseUrl: 'https://shop.example.com/' }));
    // healthCheck will call baseUrl/wp-json/
    backend.healthCheck();

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toBe('https://shop.example.com/wp-json/');
    expect(calledUrl).not.toContain('//wp-json');
  });

  // ─── Products ───────────────────────────────────────────────────

  describe('searchProducts', () => {
    it('calls Store API /products with search params', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        mockResponse([makeWcProduct()]),
      );
      globalThis.fetch = fetchMock;

      const backend = new WooCommerceBackend(makeConfig());
      const result = await backend.searchProducts({ q: 'hoodie', limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('42');
      expect(result.data[0].title).toBe('Test Hoodie');
      expect(result.count).toBe(1);
      expect(result.limit).toBe(10);

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/wp-json/wc/store/v1/products');
      expect(calledUrl).toContain('search=hoodie');
      expect(calledUrl).toContain('per_page=10');
    });

    it('maps product fields correctly (prices, images, categories, options)', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockResponse([makeWcProduct()]),
      );

      const backend = new WooCommerceBackend(makeConfig());
      const result = await backend.searchProducts({});
      const product = result.data[0];

      // Price: 2999 minor units / 10^2 = 29.99
      expect(product.variants[0].prices[0].amount).toBe(29.99);
      expect(product.variants[0].prices[0].currency_code).toBe('USD');
      expect(product.variants[0].sku).toBe('HOODIE-001');
      expect(product.images).toHaveLength(1);
      expect(product.images[0].url).toBe('https://img.example.com/hoodie.jpg');
      expect(product.categories).toHaveLength(1);
      expect(product.categories[0].name).toBe('Clothing');
      expect(product.options).toHaveLength(1);
      expect(product.options[0].title).toBe('Size');
      expect(product.options[0].values).toEqual(['S', 'M', 'L']);
      expect(product.handle).toBe('test-hoodie');
      expect(product.thumbnail).toBe('https://img.example.com/hoodie.jpg');
      expect(product.status).toBe('published');
    });

    it('handles category_id filter', async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockResponse([]));
      globalThis.fetch = fetchMock;

      const backend = new WooCommerceBackend(makeConfig());
      await backend.searchProducts({ category_id: ['5'] });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain('category=5');
    });

    it('calculates pagination correctly', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(mockResponse([]));

      const backend = new WooCommerceBackend(makeConfig());
      await backend.searchProducts({ offset: 40, limit: 20 });

      const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain('page=3'); // offset 40 / limit 20 + 1 = page 3
    });
  });

  describe('getProduct', () => {
    it('fetches product from Store API', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        mockResponse(makeWcProduct({ has_options: false })),
      );
      globalThis.fetch = fetchMock;

      const backend = new WooCommerceBackend(makeConfig());
      const product = await backend.getProduct('42');

      expect(product.id).toBe('42');
      expect(product.title).toBe('Test Hoodie');

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/wp-json/wc/store/v1/products/42');
    });

    it('fetches variations via REST API for variable products', async () => {
      const variations = [
        { id: 100, sku: 'H-S', price: '29.99', weight: '0.5', stock_status: 'instock' as const, stock_quantity: 10, manage_stock: true, attributes: [{ name: 'Size', option: 'S' }] },
        { id: 101, sku: 'H-M', price: '29.99', weight: '0.5', stock_status: 'instock' as const, stock_quantity: 5, manage_stock: true, attributes: [{ name: 'Size', option: 'M' }] },
      ];

      const fetchMock = vi.fn()
        .mockResolvedValueOnce(mockResponse(makeWcProduct({ has_options: true })))
        .mockResolvedValueOnce(mockResponse(variations));
      globalThis.fetch = fetchMock;

      const backend = new WooCommerceBackend(makeConfig());
      const product = await backend.getProduct('42');

      expect(product.variants).toHaveLength(2);
      expect(product.variants[0].sku).toBe('H-S');
      expect(product.variants[0].options).toEqual({ Size: 'S' });
      expect(product.variants[0].title).toBe('S');
      expect(product.variants[0].weight).toBe(0.5);
      expect(product.variants[0].inventory_quantity).toBe(10);
      expect(product.variants[1].allow_backorder).toBe(false);

      // Second call should be to REST API /variations
      const secondUrl = fetchMock.mock.calls[1][0] as string;
      expect(secondUrl).toContain('/wp-json/wc/v3/products/42/variations');
    });

    it('falls back to simple product when variations fetch fails', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(mockResponse(makeWcProduct({ has_options: true })))
        .mockRejectedValueOnce(new Error('Network error'));
      globalThis.fetch = fetchMock;

      const backend = new WooCommerceBackend(makeConfig());
      const product = await backend.getProduct('42');

      // Should have a single default variant
      expect(product.variants).toHaveLength(1);
      expect(product.variants[0].title).toBe('Default');
    });
  });

  describe('getCollections', () => {
    it('fetches categories from REST API and filters by count', async () => {
      const categories = [
        { id: 1, name: 'Uncategorized', slug: 'uncategorized', count: 0 },
        { id: 5, name: 'Clothing', slug: 'clothing', count: 12 },
        { id: 8, name: 'Accessories', slug: 'accessories', count: 3 },
      ];
      globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(categories));

      const backend = new WooCommerceBackend(makeConfig());
      const collections = await backend.getCollections();

      expect(collections).toHaveLength(2); // Uncategorized (count=0) excluded
      expect(collections[0].title).toBe('Clothing');
      expect(collections[0].handle).toBe('clothing');
      expect(collections[1].title).toBe('Accessories');
    });
  });

  describe('getCollection', () => {
    it('fetches single category and its products', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(mockResponse({ id: 5, name: 'Clothing', slug: 'clothing', count: 3 }))
        .mockResolvedValueOnce(mockResponse([makeWcProduct()]));
      globalThis.fetch = fetchMock;

      const backend = new WooCommerceBackend(makeConfig());
      const collection = await backend.getCollection('5');

      expect(collection.id).toBe('5');
      expect(collection.title).toBe('Clothing');
      expect(collection.products).toHaveLength(1);

      // Second call to Store API for products in category
      const secondUrl = fetchMock.mock.calls[1][0] as string;
      expect(secondUrl).toContain('category=5');
    });
  });

  // ─── Cart ───────────────────────────────────────────────────────

  describe('createCart', () => {
    it('creates cart, stores Cart-Token, adds items', async () => {
      const cartToken = 'jwt-cart-token-abc123';
      const fetchMock = vi.fn()
        // GET /cart → returns empty cart + Cart-Token header
        .mockResolvedValueOnce(mockResponse(makeWcCart({ items: [] }), { headers: { 'Cart-Token': cartToken } }))
        // POST /cart/add-item → item added
        .mockResolvedValueOnce(mockResponse(makeWcCart()))
        // GET /cart → final cart state
        .mockResolvedValueOnce(mockResponse(makeWcCart()));
      globalThis.fetch = fetchMock;

      const backend = new WooCommerceBackend(makeConfig());
      const cart = await backend.createCart('default', [{ variant_id: '42', quantity: 2 }]);

      expect(cart.id).toBeTruthy(); // UUID
      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].title).toBe('Test Hoodie');
      expect(cart.items[0].quantity).toBe(2);
      expect(cart.currency_code).toBe('USD');

      // Verify add-item was called with Cart-Token
      const addItemCall = fetchMock.mock.calls[1];
      expect(addItemCall[0]).toContain('/cart/add-item');
      expect(addItemCall[1].headers['Cart-Token']).toBe(cartToken);
      expect(JSON.parse(addItemCall[1].body)).toEqual({ id: 42, quantity: 2 });
    });
  });

  describe('getCart', () => {
    it('retrieves cart using stored Cart-Token', async () => {
      const cartToken = 'jwt-cart-token-abc123';
      const fetchMock = vi.fn()
        // createCart: GET /cart (initial) + GET /cart (final)
        .mockResolvedValueOnce(mockResponse(makeWcCart({ items: [] }), { headers: { 'Cart-Token': cartToken } }))
        .mockResolvedValueOnce(mockResponse(makeWcCart({ items: [] })))
        // getCart: GET /cart
        .mockResolvedValueOnce(mockResponse(makeWcCart()));
      globalThis.fetch = fetchMock;

      const backend = new WooCommerceBackend(makeConfig());
      const created = await backend.createCart('default', []);
      const cart = await backend.getCart(created.id);

      expect(cart.id).toBe(created.id);
      expect(cart.items).toHaveLength(1);
    });

    it('throws 404 for unknown cartId', async () => {
      const backend = new WooCommerceBackend(makeConfig());
      await expect(backend.getCart('nonexistent')).rejects.toThrow(WooCommerceApiError);
      await expect(backend.getCart('nonexistent')).rejects.toThrow('Cart not found');
    });
  });

  describe('addLineItem', () => {
    it('adds item to existing cart', async () => {
      const cartToken = 'jwt-token';
      const fetchMock = vi.fn()
        // createCart: GET /cart (initial) + GET /cart (final)
        .mockResolvedValueOnce(mockResponse(makeWcCart({ items: [] }), { headers: { 'Cart-Token': cartToken } }))
        .mockResolvedValueOnce(mockResponse(makeWcCart({ items: [] })))
        // addLineItem: POST /cart/add-item
        .mockResolvedValueOnce(mockResponse(makeWcCart()))
        // addLineItem: GET /cart
        .mockResolvedValueOnce(mockResponse(makeWcCart()));
      globalThis.fetch = fetchMock;

      const backend = new WooCommerceBackend(makeConfig());
      const created = await backend.createCart('default', []);
      const cart = await backend.addLineItem(created.id, '42', 1);

      expect(cart.items).toHaveLength(1);

      // Verify the POST body (call index 2: after 2 createCart calls)
      const addCall = fetchMock.mock.calls[2];
      expect(addCall[0]).toContain('/cart/add-item');
      expect(JSON.parse(addCall[1].body)).toEqual({ id: 42, quantity: 1 });
    });

    it('throws for unknown cart', async () => {
      const backend = new WooCommerceBackend(makeConfig());
      await expect(backend.addLineItem('bad-id', '42', 1)).rejects.toThrow('Cart not found');
    });
  });

  describe('removeLineItem', () => {
    it('removes item by key', async () => {
      const cartToken = 'jwt-token';
      const fetchMock = vi.fn()
        // createCart: GET /cart (initial) + GET /cart (final)
        .mockResolvedValueOnce(mockResponse(makeWcCart(), { headers: { 'Cart-Token': cartToken } }))
        .mockResolvedValueOnce(mockResponse(makeWcCart()))
        // removeLineItem: POST /cart/remove-item
        .mockResolvedValueOnce(mockResponse(makeWcCart({ items: [] })))
        // removeLineItem: GET /cart
        .mockResolvedValueOnce(mockResponse(makeWcCart({ items: [] })));
      globalThis.fetch = fetchMock;

      const backend = new WooCommerceBackend(makeConfig());
      const created = await backend.createCart('default', []);
      const cart = await backend.removeLineItem(created.id, 'item-key-1');

      expect(cart.items).toHaveLength(0);

      const removeCall = fetchMock.mock.calls[2];
      expect(removeCall[0]).toContain('/cart/remove-item');
      expect(JSON.parse(removeCall[1].body)).toEqual({ key: 'item-key-1' });
    });
  });

  describe('updateCart', () => {
    it('updates shipping address via /cart/update-customer', async () => {
      const cartToken = 'jwt-token';
      const fetchMock = vi.fn()
        // createCart: GET /cart (initial) + GET /cart (final)
        .mockResolvedValueOnce(mockResponse(makeWcCart({ items: [] }), { headers: { 'Cart-Token': cartToken } }))
        .mockResolvedValueOnce(mockResponse(makeWcCart({ items: [] })))
        // updateCart: POST /cart/update-customer
        .mockResolvedValueOnce(mockResponse(makeWcCart()))
        // updateCart: GET /cart
        .mockResolvedValueOnce(mockResponse(makeWcCart()));
      globalThis.fetch = fetchMock;

      const backend = new WooCommerceBackend(makeConfig());
      const created = await backend.createCart('default', []);

      const address = {
        first_name: 'John',
        last_name: 'Doe',
        address_1: '123 Main St',
        address_2: null,
        city: 'New York',
        province: 'NY',
        postal_code: '10001',
        country_code: 'US',
        phone: '+1234567890',
      };

      const cart = await backend.updateCart(created.id, {
        email: 'john@example.com',
        shipping_address: address,
      });

      expect(cart).toBeDefined();

      const updateCall = fetchMock.mock.calls[2];
      expect(updateCall[0]).toContain('/cart/update-customer');
      const body = JSON.parse(updateCall[1].body);
      expect(body.shipping_address.first_name).toBe('John');
      expect(body.shipping_address.postcode).toBe('10001');
      expect(body.shipping_address.country).toBe('US');
    });

    it('throws for unknown cart', async () => {
      const backend = new WooCommerceBackend(makeConfig());
      await expect(backend.updateCart('bad-id', { email: 'test@test.com' })).rejects.toThrow('Cart not found');
    });
  });

  // ─── Cart price mapping ──────────────────────────────────────────

  describe('price mapping', () => {
    it('converts minor units to decimal correctly', async () => {
      const cartWithPrices = makeWcCart({
        totals: {
          total_items: '5998',
          total_shipping: '500',
          total_tax: '600',
          total_discount: '100',
          total_price: '6998',
          currency_code: 'EUR',
          currency_minor_unit: 2,
        },
      });

      const cartToken = 'jwt-token';
      const fetchMock = vi.fn()
        // createCart: GET /cart (initial) + GET /cart (final)
        .mockResolvedValueOnce(mockResponse(cartWithPrices, { headers: { 'Cart-Token': cartToken } }))
        .mockResolvedValueOnce(mockResponse(cartWithPrices));
      globalThis.fetch = fetchMock;

      const backend = new WooCommerceBackend(makeConfig());
      const created = await backend.createCart('default', []);

      expect(created.subtotal).toBe(59.98);
      expect(created.shipping_total).toBe(5);
      expect(created.tax_total).toBe(6);
      expect(created.discount_total).toBe(1);
      expect(created.total).toBe(69.98);
      expect(created.currency_code).toBe('EUR');
    });
  });

  // ─── Shipping ───────────────────────────────────────────────────

  describe('getShippingOptions', () => {
    it('extracts shipping rates from cart', async () => {
      const cartToken = 'jwt-token';
      const fetchMock = vi.fn()
        // createCart: GET /cart (initial) + GET /cart (final)
        .mockResolvedValueOnce(mockResponse(makeWcCart({ items: [] }), { headers: { 'Cart-Token': cartToken } }))
        .mockResolvedValueOnce(mockResponse(makeWcCart({ items: [] })))
        // getShippingOptions: GET /cart
        .mockResolvedValueOnce(mockResponse(makeWcCart()));
      globalThis.fetch = fetchMock;

      const backend = new WooCommerceBackend(makeConfig());
      const created = await backend.createCart('default', []);
      const options = await backend.getShippingOptions(created.id);

      expect(options).toHaveLength(2);
      expect(options[0].id).toBe('flat_rate:1');
      expect(options[0].name).toBe('Flat Rate');
      expect(options[0].amount).toBe(5); // 500 / 100
      expect(options[1].id).toBe('free_shipping:2');
      expect(options[1].amount).toBe(0);
    });
  });

  describe('addShippingMethod', () => {
    it('selects shipping rate', async () => {
      const cartToken = 'jwt-token';
      const fetchMock = vi.fn()
        // createCart: GET /cart (initial) + GET /cart (final)
        .mockResolvedValueOnce(mockResponse(makeWcCart({ items: [] }), { headers: { 'Cart-Token': cartToken } }))
        .mockResolvedValueOnce(mockResponse(makeWcCart({ items: [] })))
        // addShippingMethod: POST /cart/select-shipping-rate
        .mockResolvedValueOnce(mockResponse(makeWcCart()))
        // addShippingMethod: GET /cart
        .mockResolvedValueOnce(mockResponse(makeWcCart()));
      globalThis.fetch = fetchMock;

      const backend = new WooCommerceBackend(makeConfig());
      const created = await backend.createCart('default', []);
      const cart = await backend.addShippingMethod(created.id, 'flat_rate:1');

      expect(cart.shipping_methods).toHaveLength(1);
      expect(cart.shipping_methods[0].id).toBe('flat_rate:1');

      const selectCall = fetchMock.mock.calls[2];
      expect(selectCall[0]).toContain('/cart/select-shipping-rate');
      expect(JSON.parse(selectCall[1].body)).toEqual({ package_id: 0, rate_id: 'flat_rate:1' });
    });
  });

  // ─── Checkout ───────────────────────────────────────────────────

  describe('createPaymentSessions', () => {
    it('returns cart with payment methods', async () => {
      const cartToken = 'jwt-token';
      const fetchMock = vi.fn()
        // createCart: GET /cart (initial) + GET /cart (final)
        .mockResolvedValueOnce(mockResponse(makeWcCart({ items: [] }), { headers: { 'Cart-Token': cartToken } }))
        .mockResolvedValueOnce(mockResponse(makeWcCart({ items: [] })))
        // createPaymentSessions → getCart: GET /cart
        .mockResolvedValueOnce(mockResponse(makeWcCart()));
      globalThis.fetch = fetchMock;

      const backend = new WooCommerceBackend(makeConfig());
      const created = await backend.createCart('default', []);
      const cart = await backend.createPaymentSessions(created.id);

      expect(cart.payment_sessions).toHaveLength(2);
      expect(cart.payment_sessions[0].provider_id).toBe('cod');
      expect(cart.payment_sessions[1].provider_id).toBe('stripe');
    });
  });

  describe('selectPaymentSession', () => {
    it('stores selected payment method', async () => {
      const cartToken = 'jwt-token';
      const fetchMock = vi.fn()
        // createCart: GET /cart (initial) + GET /cart (final)
        .mockResolvedValueOnce(mockResponse(makeWcCart({ items: [] }), { headers: { 'Cart-Token': cartToken } }))
        .mockResolvedValueOnce(mockResponse(makeWcCart({ items: [] })))
        // selectPaymentSession → getCart: GET /cart
        .mockResolvedValueOnce(mockResponse(makeWcCart()));
      globalThis.fetch = fetchMock;

      const backend = new WooCommerceBackend(makeConfig());
      const created = await backend.createCart('default', []);
      const cart = await backend.selectPaymentSession(created.id, 'stripe');

      expect(cart).toBeDefined();
    });
  });

  describe('initializePayment', () => {
    it('throws not supported error', async () => {
      const backend = new WooCommerceBackend(makeConfig());
      await expect(backend.initializePayment('cart1', 'stripe')).rejects.toThrow(
        'initializePayment not supported for WooCommerce yet',
      );
    });
  });

  describe('completeCart', () => {
    it('completes checkout and returns order', async () => {
      const cartToken = 'jwt-token';
      const checkoutResult = {
        order_id: 99,
        status: 'processing',
        currency: 'USD',
        total: '69.98',
        total_tax: '6.00',
        shipping_total: '5.00',
        billing_address: { first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
        shipping_address: { first_name: 'John', last_name: 'Doe' },
        line_items: [{ id: 1, product_id: 42, name: 'Test Hoodie', quantity: 2, price: '29.99', subtotal: '59.98', total: '59.98' }],
        payment_result: { payment_status: 'success' },
      };

      const fetchMock = vi.fn()
        // createCart: GET /cart
        .mockResolvedValueOnce(mockResponse(makeWcCart({ items: [] }), { headers: { 'Cart-Token': cartToken } }))
        // completeCart: POST /checkout
        .mockResolvedValueOnce(mockResponse(checkoutResult));
      globalThis.fetch = fetchMock;

      const backend = new WooCommerceBackend(makeConfig());
      const created = await backend.createCart('default', []);

      // Set addresses on cart state
      const address = {
        first_name: 'John', last_name: 'Doe', address_1: '123 Main St',
        address_2: null, city: 'NY', province: 'NY', postal_code: '10001',
        country_code: 'US', phone: null,
      };
      // Need to use updateCart to set addresses — mock the required calls
      fetchMock
        .mockResolvedValueOnce(mockResponse(makeWcCart()))  // POST /cart/update-customer
        .mockResolvedValueOnce(mockResponse(makeWcCart())); // GET /cart
      await backend.updateCart(created.id, {
        email: 'john@example.com',
        shipping_address: address,
        billing_address: address,
      });

      // Now complete — mock the checkout POST
      fetchMock.mockResolvedValueOnce(mockResponse(checkoutResult));
      const order = await backend.completeCart(created.id);

      expect(order.id).toBe('99');
      expect(order.status).toBe('pending'); // 'processing' → 'pending'
      expect(order.payment_status).toBe('captured'); // payment_status: 'success'
      expect(order.total).toBe(69.98);
      expect(order.items).toHaveLength(1);
      expect(order.items[0].title).toBe('Test Hoodie');
    });

    it('throws 400 when no address set', async () => {
      const cartToken = 'jwt-token';
      const fetchMock = vi.fn()
        // createCart: GET /cart (initial) + GET /cart (final)
        .mockResolvedValueOnce(mockResponse(makeWcCart({ items: [] }), { headers: { 'Cart-Token': cartToken } }))
        .mockResolvedValueOnce(mockResponse(makeWcCart({ items: [] })));
      globalThis.fetch = fetchMock;

      const backend = new WooCommerceBackend(makeConfig());
      const created = await backend.createCart('default', []);

      await expect(backend.completeCart(created.id)).rejects.toThrow(
        'Shipping and billing address required for checkout',
      );
    });

    it('throws for unknown cart', async () => {
      const backend = new WooCommerceBackend(makeConfig());
      await expect(backend.completeCart('bad-id')).rejects.toThrow('Cart not found');
    });
  });

  // ─── Orders ─────────────────────────────────────────────────────

  describe('getOrder', () => {
    it('fetches order from REST API', async () => {
      const wcOrder: WcOrder = {
        id: 99,
        number: '1099',
        status: 'completed',
        currency: 'USD',
        total: '69.98',
        total_tax: '6.00',
        shipping_total: '5.00',
        billing: { first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
        shipping: { first_name: 'John', last_name: 'Doe', address_1: '123 Main St', city: 'NY', postcode: '10001', country: 'US' },
        line_items: [{ id: 1, product_id: 42, name: 'Test Hoodie', quantity: 2, price: 29.99, subtotal: 59.98, total: 59.98 }],
      };
      globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(wcOrder));

      const backend = new WooCommerceBackend(makeConfig());
      const order = await backend.getOrder('99');

      expect(order.id).toBe('99');
      expect(order.display_id).toBe(1099);
      expect(order.status).toBe('completed');
      expect(order.total).toBe(69.98);
      expect(order.shipping_address.address_1).toBe('123 Main St');
      expect(order.email).toBe('john@example.com');

      const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain('/wp-json/wc/v3/orders/99');
    });

    it('maps order statuses correctly', async () => {
      const makeOrder = (status: string) => ({
        id: 1, status, currency: 'USD', total: '10', total_tax: '0', shipping_total: '0',
      });

      const backend = new WooCommerceBackend(makeConfig());

      // Test pending statuses
      for (const wcStatus of ['pending', 'processing', 'on-hold']) {
        globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(makeOrder(wcStatus)));
        const order = await backend.getOrder('1');
        expect(order.status).toBe('pending');
      }

      // Test completed
      globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(makeOrder('completed')));
      expect((await backend.getOrder('1')).status).toBe('completed');

      // Test canceled statuses
      for (const wcStatus of ['cancelled', 'refunded', 'failed']) {
        globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(makeOrder(wcStatus)));
        const order = await backend.getOrder('1');
        expect(order.status).toBe('canceled');
      }
    });
  });

  describe('listOrders', () => {
    it('fetches orders with filters', async () => {
      const orders: WcOrder[] = [
        { id: 99, status: 'completed', currency: 'USD', total: '69.98', total_tax: '6', shipping_total: '5', line_items: [] },
        { id: 100, status: 'pending', currency: 'USD', total: '30.00', total_tax: '0', shipping_total: '0', line_items: [] },
      ];
      const fetchMock = vi.fn().mockResolvedValue(mockResponse(orders));
      globalThis.fetch = fetchMock;

      const backend = new WooCommerceBackend(makeConfig());
      const result = await backend.listOrders({ email: 'john@example.com', limit: 10, offset: 0 });

      expect(result.data).toHaveLength(2);
      expect(result.count).toBe(2);

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/wp-json/wc/v3/orders');
      expect(calledUrl).toContain('search=john%40example.com');
      expect(calledUrl).toContain('per_page=10');
    });
  });

  // ─── Regions ────────────────────────────────────────────────────

  describe('getRegions', () => {
    it('fetches shipping zones from REST API', async () => {
      const zones = [
        { id: 0, name: 'Locations not covered by your other zones', order: 0 },
        { id: 1, name: 'US', order: 1 },
        { id: 2, name: 'Europe', order: 2 },
      ];
      globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(zones));

      const backend = new WooCommerceBackend(makeConfig());
      const regions = await backend.getRegions();

      expect(regions).toHaveLength(2); // Zone 0 excluded
      expect(regions[0].name).toBe('US');
      expect(regions[1].name).toBe('Europe');
    });

    it('returns default region on error', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const backend = new WooCommerceBackend(makeConfig());
      const regions = await backend.getRegions();

      expect(regions).toHaveLength(1);
      expect(regions[0].id).toBe('default');
      expect(regions[0].name).toBe('Default');
    });
  });

  // ─── Health ─────────────────────────────────────────────────────

  describe('healthCheck', () => {
    it('returns true when WP REST API is accessible', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

      const backend = new WooCommerceBackend(makeConfig());
      const healthy = await backend.healthCheck();

      expect(healthy).toBe(true);

      const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toBe('https://shop.example.com/wp-json/');
    });

    it('returns false when request fails', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const backend = new WooCommerceBackend(makeConfig());
      const healthy = await backend.healthCheck();

      expect(healthy).toBe(false);
    });

    it('returns false on non-ok response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });

      const backend = new WooCommerceBackend(makeConfig());
      const healthy = await backend.healthCheck();

      expect(healthy).toBe(false);
    });
  });

  // ─── Error handling ─────────────────────────────────────────────

  describe('error handling', () => {
    it('throws WooCommerceApiError on Store API failure', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Product not found'),
        headers: { get: () => null },
      });

      const backend = new WooCommerceBackend(makeConfig());
      try {
        await backend.searchProducts({});
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(WooCommerceApiError);
        const apiErr = err as WooCommerceApiError;
        expect(apiErr.status).toBe(404);
        expect(apiErr.body).toBe('Product not found');
        expect(apiErr.url).toContain('/wp-json/wc/store/v1/products');
      }
    });

    it('throws WooCommerceApiError on REST API failure', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      const backend = new WooCommerceBackend(makeConfig());
      try {
        await backend.getCollections();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(WooCommerceApiError);
        const apiErr = err as WooCommerceApiError;
        expect(apiErr.status).toBe(401);
      }
    });

    it('sends Basic Auth header on REST API calls', async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockResponse([]));
      globalThis.fetch = fetchMock;

      const backend = new WooCommerceBackend(makeConfig());
      await backend.getCollections();

      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers.Authorization).toMatch(/^Basic /);
      // Decode and verify credentials
      const decoded = Buffer.from(headers.Authorization.replace('Basic ', ''), 'base64').toString();
      expect(decoded).toBe('ck_test_123:cs_test_456');
    });
  });
});
