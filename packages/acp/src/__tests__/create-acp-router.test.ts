import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { CommerceProvider, StoreInfo, ScopeChecker } from '@agentojs/core';
import { createAcpRouter } from '../create-acp-router.js';

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
          thumbnail: 'https://img.test.com/1.jpg',
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
      limit: 500,
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
    getCollections: vi.fn().mockResolvedValue([]),
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
    initializePayment: vi.fn().mockResolvedValue({
      id: 'ps_1',
      provider_id: 'stripe',
      status: 'pending',
      amount: 1999,
      currency_code: 'usd',
      data: {},
    }),
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
    getRegions: vi.fn().mockResolvedValue([
      { id: 'reg_1', name: 'US', currency_code: 'usd', countries: [] },
    ]),
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

// ACP headers required for checkout_sessions routes
const acpHeaders = {
  'idempotency-key': 'idem-123',
  'request-id': 'req-123',
  'api-version': '2025-09-12',
};

describe('createAcpRouter', () => {
  let provider: CommerceProvider;
  let app: ReturnType<typeof express>;

  beforeEach(() => {
    provider = createMockProvider();
    app = express();
    app.use(express.json());
    app.use('/', createAcpRouter({ provider, store: mockStore }));
  });

  // ── Feed ─────────────────────────────────────────────────────────

  it('GET /feed returns product feed items', async () => {
    const res = await request(app).get('/feed');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toHaveProperty('item_id', 'var_1');
    expect(res.body[0]).toHaveProperty('title', 'Test Product');
    expect(res.body[0]).toHaveProperty('availability', 'in_stock');
    expect(res.body[0]).toHaveProperty('price');
    expect(res.body[0].price).toEqual({ amount: 1999, currency: 'USD' });
    expect(res.body[0]).toHaveProperty('seller_name', 'Test Store');
    expect(res.body[0]).toHaveProperty('is_eligible_checkout', true);
  });

  it('GET /feed returns cached results on second call', async () => {
    await request(app).get('/feed');
    await request(app).get('/feed');
    // searchProducts should only be called once (second call hits cache)
    expect(provider.searchProducts).toHaveBeenCalledTimes(1);
  });

  // ── Checkout Sessions ─────────────────────────────────────────────

  it('POST /checkout_sessions creates a session', async () => {
    const res = await request(app)
      .post('/checkout_sessions')
      .set(acpHeaders)
      .send({
        items: [{ id: 'var_1', quantity: 1 }],
        buyer: { email: 'buyer@example.com' },
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('status', 'not_ready_for_payment');
    expect(res.body).toHaveProperty('currency', 'usd');
    expect(res.body).toHaveProperty('line_items');
    expect(res.body).toHaveProperty('totals');
    expect(res.body).toHaveProperty('payment_provider');
    expect(res.body).toHaveProperty('links');

    // Echoed headers
    expect(res.headers['idempotency-key']).toBe('idem-123');
    expect(res.headers['request-id']).toBe('req-123');
  });

  it('POST /checkout_sessions returns 400 without items', async () => {
    const res = await request(app)
      .post('/checkout_sessions')
      .set(acpHeaders)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('type', 'invalid_request');
    expect(res.body).toHaveProperty('message');
  });

  it('POST /checkout_sessions returns 400 without ACP headers', async () => {
    const res = await request(app)
      .post('/checkout_sessions')
      .send({
        items: [{ id: 'var_1', quantity: 1 }],
      });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('code', 'missing_headers');
  });

  it('GET /checkout_sessions/:id returns 404 for unknown session', async () => {
    const res = await request(app)
      .get('/checkout_sessions/nonexistent')
      .set(acpHeaders);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('code', 'not_found');
  });

  it('DELETE /checkout_sessions/:id cancels a session', async () => {
    // First create a session
    const createRes = await request(app)
      .post('/checkout_sessions')
      .set(acpHeaders)
      .send({
        items: [{ id: 'var_1', quantity: 1 }],
      });
    const sessionId = createRes.body.id;

    // Then cancel it
    const cancelRes = await request(app)
      .delete(`/checkout_sessions/${sessionId}`)
      .set(acpHeaders);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body).toHaveProperty('status', 'canceled');
  });

  // ── Stripe Webhook ────────────────────────────────────────────────

  it('POST /webhooks/stripe returns 400 when Stripe not configured', async () => {
    const res = await request(app)
      .post('/webhooks/stripe')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Stripe is not configured');
  });

  // ── Scope Checking ────────────────────────────────────────────────

  it('returns 403 when scope is denied', async () => {
    const restrictedChecker: ScopeChecker = {
      scopes: ['orders:read'],
      hasScope: (scope: string) => scope === 'orders:read',
    };

    const scopedApp = express();
    scopedApp.use(express.json());
    scopedApp.use('/', createAcpRouter({
      provider,
      store: mockStore,
      scopeChecker: restrictedChecker,
    }));

    // checkout:write not in scopes — should be denied
    const res = await request(scopedApp)
      .post('/checkout_sessions')
      .set(acpHeaders)
      .send({ items: [{ id: 'var_1', quantity: 1 }] });
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('type', 'permission_error');

    // products:read not in scopes — feed should be denied
    const feedRes = await request(scopedApp).get('/feed');
    expect(feedRes.status).toBe(403);
  });

  it('allows all when scopeChecker has wildcard', async () => {
    const wildcardChecker: ScopeChecker = {
      scopes: ['*'],
      hasScope: () => true,
    };

    const scopedApp = express();
    scopedApp.use(express.json());
    scopedApp.use('/', createAcpRouter({
      provider,
      store: mockStore,
      scopeChecker: wildcardChecker,
    }));

    const res = await request(scopedApp).get('/feed');
    expect(res.status).toBe(200);
  });

  // ── Full Checkout Flow ────────────────────────────────────────────

  it('full checkout flow: create -> update -> complete', async () => {
    // Create session
    const createRes = await request(app)
      .post('/checkout_sessions')
      .set(acpHeaders)
      .send({
        items: [{ id: 'var_1', quantity: 1 }],
        buyer: { email: 'buyer@example.com' },
      });
    expect(createRes.status).toBe(201);
    const sessionId = createRes.body.id;
    expect(createRes.body.status).toBe('not_ready_for_payment');

    // Update with address + fulfillment option
    const updateRes = await request(app)
      .patch(`/checkout_sessions/${sessionId}`)
      .set(acpHeaders)
      .send({
        fulfillment_address: {
          name: 'John Doe',
          line_one: '123 Main St',
          city: 'New York',
          state: 'NY',
          country: 'us',
          postal_code: '10001',
        },
        fulfillment_option_id: 'ship_1',
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body).toHaveProperty('status', 'ready_for_payment');
    expect(updateRes.body).toHaveProperty('fulfillment_address');
    expect(updateRes.body).toHaveProperty('selected_fulfillment_option_id', 'ship_1');

    // Complete
    const completeRes = await request(app)
      .post(`/checkout_sessions/${sessionId}/complete`)
      .set(acpHeaders)
      .send({});
    expect(completeRes.status).toBe(201);
    expect(completeRes.body).toHaveProperty('status', 'completed');
    expect(completeRes.body).toHaveProperty('order');
    expect(completeRes.body.order).toHaveProperty('id', 'order_1');
  });
});
