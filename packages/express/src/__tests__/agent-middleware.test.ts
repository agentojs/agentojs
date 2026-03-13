import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { CommerceProvider, StoreInfo } from '@agentojs/core';
import { agentMiddleware } from '../agent-middleware.js';

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
    getCollections: vi.fn().mockResolvedValue([]),
    getCollection: vi.fn().mockResolvedValue(null),
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
    getCart: vi.fn().mockResolvedValue({ id: 'cart_1', items: [], total: 0, currency_code: 'usd' }),
    updateCart: vi.fn().mockResolvedValue({ id: 'cart_1', items: [], total: 0 }),
    addToCart: vi.fn().mockResolvedValue({ id: 'cart_1', items: [], total: 0 }),
    removeFromCart: vi.fn().mockResolvedValue({ id: 'cart_1', items: [], total: 0 }),
    getShippingOptions: vi.fn().mockResolvedValue([]),
    selectShippingOption: vi.fn().mockResolvedValue({ id: 'cart_1', items: [], total: 0 }),
    createPaymentSession: vi.fn().mockResolvedValue({ id: 'pay_1', status: 'pending' }),
    completeCheckout: vi.fn().mockResolvedValue({ id: 'order_1', status: 'pending' }),
    listOrders: vi.fn().mockResolvedValue({ data: [], count: 0, offset: 0, limit: 20 }),
    getOrder: vi.fn().mockResolvedValue({ id: 'order_1', status: 'pending' }),
    getRegions: vi.fn().mockResolvedValue([{ id: 'reg_1', name: 'US', currency_code: 'usd', countries: [] }]),
    initializePayment: vi.fn().mockResolvedValue({ client_secret: 'cs_test' }),
  } as unknown as CommerceProvider;
}

function createMockStore(): StoreInfo {
  return {
    slug: 'test-store',
    name: 'Test Store',
    currency: 'usd',
    country: 'us',
    backendUrl: 'https://store.example.com',
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('agentMiddleware', () => {
  let provider: CommerceProvider;
  let store: StoreInfo;

  beforeEach(() => {
    provider = createMockProvider();
    store = createMockStore();
  });

  it('mounts UCP products endpoint at /ucp/products', async () => {
    const app = express();
    app.use(agentMiddleware({ store, provider }));

    const res = await request(app).get('/ucp/products');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('products');
  });

  it('mounts ACP feed endpoint at /acp/feed', async () => {
    const app = express();
    app.use(agentMiddleware({ store, provider }));

    const res = await request(app).get('/acp/feed');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('mounts MCP endpoint at /mcp (returns error without proper JSON-RPC)', async () => {
    const app = express();
    app.use(agentMiddleware({ store, provider }));

    // POST without valid JSON-RPC should get handled (may error but endpoint exists)
    const res = await request(app)
      .post('/mcp')
      .send({});

    // The MCP SDK will respond — either a valid response or an error
    // The important thing is the endpoint is mounted and responds
    expect([200, 400, 406, 500]).toContain(res.status);
  });

  it('disables MCP when enableMcp=false', async () => {
    const app = express();
    app.use(agentMiddleware({ store, provider, enableMcp: false }));

    const res = await request(app).post('/mcp').send({});
    expect(res.status).toBe(404);
  });

  it('disables UCP when enableUcp=false', async () => {
    const app = express();
    app.use(agentMiddleware({ store, provider, enableUcp: false }));

    const res = await request(app).get('/ucp/products');
    expect(res.status).toBe(404);
  });

  it('disables ACP when enableAcp=false', async () => {
    const app = express();
    app.use(agentMiddleware({ store, provider, enableAcp: false }));

    const res = await request(app).get('/acp/feed');
    expect(res.status).toBe(404);
  });

  it('mounts UCP discovery at /ucp/.well-known/ucp', async () => {
    const app = express();
    app.use(agentMiddleware({ store, provider }));

    const res = await request(app).get('/ucp/.well-known/ucp');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('merchant');
    expect(res.body.merchant).toHaveProperty('name', 'Test Store');
  });

  it('returns products from mock provider via UCP', async () => {
    const app = express();
    app.use(agentMiddleware({ store, provider }));

    const res = await request(app).get('/ucp/products');
    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0].id).toBe('prod_1');
    expect(provider.searchProducts).toHaveBeenCalled();
  });

  it('creates ACP checkout session at /acp/checkout_sessions', async () => {
    const app = express();
    app.use(agentMiddleware({ store, provider }));

    const res = await request(app)
      .post('/acp/checkout_sessions')
      .set('idempotency-key', 'test-key-1')
      .set('request-id', 'req-1')
      .set('api-version', '2025-09-12')
      .send({
        items: [{ id: 'var_1', quantity: 1 }],
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('status');
  });

  it('can selectively enable only one protocol', async () => {
    const app = express();
    app.use(agentMiddleware({
      store,
      provider,
      enableMcp: false,
      enableUcp: true,
      enableAcp: false,
    }));

    // UCP should work
    const ucpRes = await request(app).get('/ucp/products');
    expect(ucpRes.status).toBe(200);

    // MCP and ACP should 404
    const mcpRes = await request(app).post('/mcp').send({});
    expect(mcpRes.status).toBe(404);
    const acpRes = await request(app).get('/acp/feed');
    expect(acpRes.status).toBe(404);
  });
});
