import { describe, it, expect, vi } from 'vitest';
import type { CommerceProvider, ScopeChecker } from '@agentojs/core';
import { registerProductTools } from '../tools/product.tools.js';

/** Captures tool handlers registered via server.tool() */
function createMockServer() {
  const tools = new Map<string, (...args: any[]) => any>();
  return {
    tool: vi.fn((...args: any[]) => {
      // server.tool(name, description, schema, hints, handler) — 5 args
      // server.tool(name, description, schema, handler) — 4 args
      const name = args[0] as string;
      const handler = args[args.length - 1];
      tools.set(name, handler);
    }),
    getHandler(name: string) {
      return tools.get(name);
    },
  };
}

function createMockProvider(overrides: Partial<CommerceProvider> = {}): CommerceProvider {
  return {
    searchProducts: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'prod_1',
          title: 'Test Shirt',
          description: 'A test shirt',
          handle: 'test-shirt',
          thumbnail: 'https://example.com/shirt.jpg',
          variants: [
            {
              id: 'var_1',
              title: 'Small',
              sku: 'TSH-S',
              prices: [{ id: 'p1', amount: 1999, currency_code: 'usd', min_quantity: null, max_quantity: null }],
              options: { size: 'S' },
              inventory_quantity: 10,
              allow_backorder: false,
              manage_inventory: true,
              weight: null,
              length: null,
              height: null,
              width: null,
              metadata: {},
            },
          ],
          options: [],
          categories: [{ id: 'cat_1', name: 'Shirts', handle: 'shirts' }],
          tags: [{ id: 'tag_1', value: 'new' }],
          images: [],
          collection_id: null,
          status: 'published' as const,
          metadata: {},
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
      ],
      count: 1,
      offset: 0,
      limit: 20,
    }),
    getProduct: vi.fn().mockResolvedValue({
      id: 'prod_1',
      title: 'Test Shirt',
      description: 'A test shirt',
      handle: 'test-shirt',
      thumbnail: null,
      images: [{ id: 'img_1', url: 'https://example.com/shirt.jpg', metadata: {} }],
      variants: [
        {
          id: 'var_1',
          title: 'Small',
          sku: 'TSH-S',
          prices: [{ id: 'p1', amount: 1999, currency_code: 'usd', min_quantity: null, max_quantity: null }],
          options: { size: 'S' },
          inventory_quantity: 10,
          allow_backorder: false,
          manage_inventory: true,
          weight: 200,
          length: null,
          height: null,
          width: null,
          metadata: {},
        },
      ],
      options: [{ id: 'opt_1', title: 'Size', values: ['S', 'M', 'L'] }],
      categories: [{ id: 'cat_1', name: 'Shirts', handle: 'shirts' }],
      tags: [{ id: 'tag_1', value: 'new' }],
      collection_id: null,
      status: 'published' as const,
      metadata: {},
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    }),
    getCollections: vi.fn().mockResolvedValue([
      { id: 'col_1', title: 'Summer 2026', handle: 'summer-2026', products: [] },
    ]),
    getCollection: vi.fn(),
    createCart: vi.fn(),
    getCart: vi.fn(),
    updateCart: vi.fn(),
    addLineItem: vi.fn(),
    removeLineItem: vi.fn(),
    getShippingOptions: vi.fn(),
    addShippingMethod: vi.fn(),
    createPaymentSessions: vi.fn(),
    selectPaymentSession: vi.fn(),
    initializePayment: vi.fn(),
    completeCart: vi.fn(),
    getOrder: vi.fn(),
    listOrders: vi.fn(),
    getRegions: vi.fn(),
    healthCheck: vi.fn(),
    ...overrides,
  };
}

describe('registerProductTools', () => {
  it('registers search_products, get_product, get_collections tools', () => {
    const server = createMockServer();
    const provider = createMockProvider();
    registerProductTools(server as any, provider);

    expect(server.tool).toHaveBeenCalledTimes(3);
    expect(server.getHandler('search_products')).toBeDefined();
    expect(server.getHandler('get_product')).toBeDefined();
    expect(server.getHandler('get_collections')).toBeDefined();
  });

  it('search_products returns formatted products', async () => {
    const server = createMockServer();
    const provider = createMockProvider();
    registerProductTools(server as any, provider);

    const handler = server.getHandler('search_products')!;
    const result = await handler({ query: 'shirt', limit: 20, offset: 0 });

    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    const data = JSON.parse(result.content[0].text);
    expect(data.products).toHaveLength(1);
    expect(data.products[0].id).toBe('prod_1');
    expect(data.products[0].title).toBe('Test Shirt');
    expect(data.products[0].variants[0].prices[0].formatted).toContain('1,999');
    expect(data.total).toBe(1);
  });

  it('get_product returns detailed product', async () => {
    const server = createMockServer();
    const provider = createMockProvider();
    registerProductTools(server as any, provider);

    const handler = server.getHandler('get_product')!;
    const result = await handler({ product_id: 'prod_1' });

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.id).toBe('prod_1');
    expect(data.images).toEqual(['https://example.com/shirt.jpg']);
    expect(data.options[0].name).toBe('Size');
    expect(data.variants[0].prices).toHaveLength(1);
  });

  it('get_product returns error for provider failure', async () => {
    const server = createMockServer();
    const provider = createMockProvider({
      getProduct: vi.fn().mockRejectedValue(new Error('Product not found')),
    });
    registerProductTools(server as any, provider);

    const handler = server.getHandler('get_product')!;
    const result = await handler({ product_id: 'invalid_id' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Product not found');
  });

  it('get_collections returns simplified collections', async () => {
    const server = createMockServer();
    const provider = createMockProvider();
    registerProductTools(server as any, provider);

    const handler = server.getHandler('get_collections')!;
    const result = await handler({});

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.collections).toHaveLength(1);
    expect(data.collections[0].title).toBe('Summer 2026');
  });

  it('respects scope checker and denies access', async () => {
    const server = createMockServer();
    const provider = createMockProvider();
    const scopeChecker: ScopeChecker = {
      scopes: ['cart:read'],
      hasScope(scope: string) {
        return this.scopes.includes('*') || this.scopes.includes(scope);
      },
    };
    registerProductTools(server as any, provider, scopeChecker);

    const handler = server.getHandler('search_products')!;
    const result = await handler({ limit: 20, offset: 0 });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Access denied');
  });
});
