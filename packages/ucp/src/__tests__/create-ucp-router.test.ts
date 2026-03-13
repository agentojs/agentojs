import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { CommerceProvider, StoreInfo, ScopeChecker } from '@agentojs/core';
import { createUcpRouter } from '../create-ucp-router.js';

// ── Mock CommerceProvider ───────────────────────────────────────────
function createMockProvider(): CommerceProvider {
  return {
    searchProducts: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'prod_1',
          title: 'Test Product',
          description: 'A test product',
          handle: 'test-product',
          thumbnail: null,
          images: [],
          options: [],
          variants: [
            {
              id: 'var_1',
              title: 'Default',
              sku: 'TEST-001',
              prices: [{ amount: 1999, currency_code: 'usd' }],
              inventory_quantity: 10,
              manage_inventory: true,
            },
          ],
          tags: [],
          categories: [],
          collection_id: null,
          status: 'published',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
        },
      ],
      count: 1,
      offset: 0,
      limit: 20,
    }),
    getProduct: vi.fn().mockResolvedValue({
      id: 'prod_1',
      title: 'Test Product',
      description: 'A test product',
      handle: 'test-product',
      thumbnail: null,
      images: [],
      options: [],
      variants: [],
      tags: [],
      categories: [],
      collection_id: null,
      status: 'published',
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    }),
    getCollections: vi.fn().mockResolvedValue([
      { id: 'col_1', title: 'Summer', handle: 'summer', products: [] },
    ]),
    getCollection: vi.fn().mockResolvedValue({ id: 'col_1', title: 'Summer', handle: 'summer', products: [] }),
    createCart: vi.fn().mockResolvedValue({
      id: 'cart_1',
      items: [],
      region_id: 'reg_1',
      currency_code: 'usd',
      subtotal: 0,
      tax_total: 0,
      shipping_total: 0,
      discount_total: 0,
      total: 0,
    }),
    getCart: vi.fn().mockResolvedValue({
      id: 'cart_1',
      items: [
        {
          id: 'item_1',
          variant_id: 'var_1',
          title: 'Test Product',
          quantity: 1,
          unit_price: 1999,
          subtotal: 1999,
          total: 1999,
          thumbnail: null,
        },
      ],
      region_id: 'reg_1',
      currency_code: 'usd',
      subtotal: 1999,
      tax_total: 0,
      shipping_total: 0,
      discount_total: 0,
      total: 1999,
    }),
    updateCart: vi.fn().mockResolvedValue({
      id: 'cart_1',
      items: [],
      region_id: 'reg_1',
      currency_code: 'usd',
      subtotal: 0,
      tax_total: 0,
      shipping_total: 0,
      discount_total: 0,
      total: 0,
    }),
    addLineItem: vi.fn().mockResolvedValue({
      id: 'cart_1',
      items: [{ id: 'item_1', variant_id: 'var_1', title: 'Test', quantity: 1, unit_price: 1999, subtotal: 1999, total: 1999, thumbnail: null }],
      region_id: 'reg_1',
      currency_code: 'usd',
      subtotal: 1999,
      tax_total: 0,
      shipping_total: 0,
      discount_total: 0,
      total: 1999,
    }),
    removeLineItem: vi.fn().mockResolvedValue({
      id: 'cart_1',
      items: [],
      region_id: 'reg_1',
      currency_code: 'usd',
      subtotal: 0,
      tax_total: 0,
      shipping_total: 0,
      discount_total: 0,
      total: 0,
    }),
    getShippingOptions: vi.fn().mockResolvedValue([
      { id: 'ship_1', name: 'Standard', amount: 500, is_return: false },
    ]),
    addShippingMethod: vi.fn().mockResolvedValue({
      id: 'cart_1',
      items: [],
      region_id: 'reg_1',
      currency_code: 'usd',
      subtotal: 0,
      tax_total: 0,
      shipping_total: 500,
      discount_total: 0,
      total: 500,
    }),
    createPaymentSessions: vi.fn().mockResolvedValue({} as any),
    selectPaymentSession: vi.fn().mockResolvedValue({} as any),
    initializePayment: vi.fn().mockResolvedValue({ id: 'ps_1', provider_id: 'stripe', status: 'pending', amount: 1999, currency_code: 'usd', data: {} }),
    completeCart: vi.fn().mockResolvedValue({
      id: 'order_1',
      status: 'pending',
      items: [],
      shipping_address: null,
      billing_address: null,
      email: 'test@example.com',
      currency_code: 'usd',
      subtotal: 1999,
      tax_total: 0,
      shipping_total: 0,
      discount_total: 0,
      total: 1999,
      created_at: '2025-01-01',
      fulfillments: [],
      payments: [],
    }),
    getOrder: vi.fn().mockResolvedValue({
      id: 'order_1',
      status: 'pending',
      items: [],
      shipping_address: null,
      billing_address: null,
      email: 'test@example.com',
      currency_code: 'usd',
      subtotal: 1999,
      tax_total: 0,
      shipping_total: 0,
      discount_total: 0,
      total: 1999,
      created_at: '2025-01-01',
      fulfillments: [],
      payments: [],
    }),
    listOrders: vi.fn().mockResolvedValue({ data: [], count: 0, offset: 0, limit: 20 }),
    getRegions: vi.fn().mockResolvedValue([{ id: 'reg_1', name: 'US', currency_code: 'usd', countries: [] }]),
    healthCheck: vi.fn().mockResolvedValue(true),
  };
}

const mockStore: StoreInfo = {
  slug: 'test-store',
  name: 'Test Store',
  currency: 'usd',
  country: 'us',
  backendUrl: 'https://api.test-store.com',
};

describe('createUcpRouter', () => {
  let provider: CommerceProvider;
  let app: ReturnType<typeof express>;

  beforeEach(() => {
    provider = createMockProvider();
    app = express();
    app.use(express.json());
    app.use('/', createUcpRouter({ provider, store: mockStore }));
  });

  // ── Products ────────────────────────────────────────────────────

  it('GET /products returns product list', async () => {
    const res = await request(app).get('/products');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('products');
    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0].id).toBe('prod_1');
    expect(res.body).toHaveProperty('total', 1);
    expect(res.body).toHaveProperty('offset', 0);
    expect(res.body).toHaveProperty('limit', 20);
  });

  it('GET /products?q=test passes search query to provider', async () => {
    await request(app).get('/products?q=test&limit=5');
    expect(provider.searchProducts).toHaveBeenCalledWith({
      q: 'test',
      category_id: undefined,
      limit: 5,
      offset: 0,
    });
  });

  it('GET /products/:id returns product detail', async () => {
    const res = await request(app).get('/products/prod_1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('product');
    expect(res.body.product.id).toBe('prod_1');
  });

  it('GET /products/:id returns 404 for not found', async () => {
    (provider.getProduct as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Product not found'),
    );
    const res = await request(app).get('/products/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  // ── Collections ─────────────────────────────────────────────────

  it('GET /collections returns collections', async () => {
    const res = await request(app).get('/collections');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('collections');
    expect(res.body.collections).toHaveLength(1);
    expect(res.body.collections[0].id).toBe('col_1');
  });

  // ── Carts ───────────────────────────────────────────────────────

  it('POST /carts creates a new cart', async () => {
    const res = await request(app)
      .post('/carts')
      .send({ items: [{ variant_id: 'var_1', quantity: 1 }] });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('cart');
    expect(res.body.cart.id).toBe('cart_1');
  });

  it('POST /carts returns 400 if no items', async () => {
    const res = await request(app).post('/carts').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('GET /carts/:id returns cart', async () => {
    const res = await request(app).get('/carts/cart_1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('cart');
    expect(res.body.cart.id).toBe('cart_1');
  });

  it('POST /carts/:id/items adds item to cart', async () => {
    const res = await request(app)
      .post('/carts/cart_1/items')
      .send({ variant_id: 'var_1', quantity: 2 });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('cart');
  });

  // ── Checkout Sessions ───────────────────────────────────────────

  it('POST /checkout-sessions creates a checkout session', async () => {
    const res = await request(app)
      .post('/checkout-sessions')
      .send({
        items: [{ id: 'var_1', quantity: 1 }],
        buyer: { email: 'buyer@example.com' },
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('status', 'incomplete');
    expect(res.body).toHaveProperty('currency');
    expect(res.body).toHaveProperty('line_items');
    expect(res.body).toHaveProperty('totals');
    expect(res.body).toHaveProperty('fulfillment');
    expect(res.body).toHaveProperty('payment');
  });

  it('GET /checkout-sessions/:id returns 404 for unknown session', async () => {
    const res = await request(app).get('/checkout-sessions/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  // ── Orders ──────────────────────────────────────────────────────

  it('GET /orders/:id returns order', async () => {
    const res = await request(app).get('/orders/order_1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('order');
    expect(res.body.order.id).toBe('order_1');
  });

  // ── Discovery ───────────────────────────────────────────────────

  it('GET /.well-known/ucp returns discovery document', async () => {
    const res = await request(app).get('/.well-known/ucp');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ucp_version', '1.0');
    expect(res.body).toHaveProperty('merchant');
    expect(res.body.merchant).toHaveProperty('name', 'Test Store');
    expect(res.body).toHaveProperty('capabilities');
    expect(res.body.capabilities).toContain('checkout');
    expect(res.body).toHaveProperty('endpoints');
    expect(res.body.endpoints).toHaveProperty('products');
    expect(res.body.endpoints).toHaveProperty('carts');
    expect(res.body.endpoints).toHaveProperty('checkout_sessions');
    expect(res.body.endpoints).toHaveProperty('orders');
  });

  // ── Scope Checking ──────────────────────────────────────────────

  it('returns 403 when scope is denied', async () => {
    const restrictedChecker: ScopeChecker = {
      scopes: ['orders:read'],
      hasScope: (scope: string) => scope === 'orders:read',
    };

    const scopedApp = express();
    scopedApp.use(express.json());
    scopedApp.use('/', createUcpRouter({ provider, store: mockStore, scopeChecker: restrictedChecker }));

    // products:read not in scopes — should be denied
    const res = await request(scopedApp).get('/products');
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');

    // orders:read is allowed
    const orderRes = await request(scopedApp).get('/orders/order_1');
    expect(orderRes.status).toBe(200);
  });

  it('allows all when scopeChecker has wildcard', async () => {
    const wildcardChecker: ScopeChecker = {
      scopes: ['*'],
      hasScope: () => true,
    };

    const scopedApp = express();
    scopedApp.use(express.json());
    scopedApp.use('/', createUcpRouter({ provider, store: mockStore, scopeChecker: wildcardChecker }));

    const res = await request(scopedApp).get('/products');
    expect(res.status).toBe(200);
  });
});
