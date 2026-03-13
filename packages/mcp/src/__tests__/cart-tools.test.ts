import { describe, it, expect, vi } from 'vitest';
import type { CommerceProvider, ScopeChecker } from '@agentojs/core';
import { registerCartTools } from '../tools/cart.tools.js';

/** Captures tool handlers registered via server.tool() */
function createMockServer() {
  const tools = new Map<string, (...args: any[]) => any>();
  return {
    tool: vi.fn((...args: any[]) => {
      const name = args[0] as string;
      const handler = args[args.length - 1];
      tools.set(name, handler);
    }),
    getHandler(name: string) {
      return tools.get(name);
    },
  };
}

function mockCart(overrides: Record<string, any> = {}) {
  return {
    id: 'cart_1',
    items: [
      {
        id: 'item_1',
        title: 'Test Shirt',
        variant_id: 'var_1',
        quantity: 2,
        unit_price: 1999,
        total: 3998,
        thumbnail: null,
      },
    ],
    currency_code: 'usd',
    subtotal: 3998,
    tax_total: 400,
    shipping_total: 500,
    discount_total: 0,
    total: 4898,
    email: 'test@example.com',
    shipping_address: { first_name: 'John', last_name: 'Doe' },
    shipping_methods: [],
    ...overrides,
  };
}

function createMockProvider(overrides: Partial<CommerceProvider> = {}): CommerceProvider {
  return {
    searchProducts: vi.fn(),
    getProduct: vi.fn(),
    getCollections: vi.fn(),
    getCollection: vi.fn(),
    createCart: vi.fn().mockResolvedValue(mockCart()),
    getCart: vi.fn().mockResolvedValue(mockCart()),
    updateCart: vi.fn().mockResolvedValue(mockCart()),
    addLineItem: vi.fn().mockResolvedValue(mockCart()),
    removeLineItem: vi.fn().mockResolvedValue(mockCart()),
    getShippingOptions: vi.fn().mockResolvedValue([
      { id: 'so_1', name: 'Standard Shipping', amount: 500 },
      { id: 'so_2', name: 'Express Shipping', amount: 1500 },
    ]),
    addShippingMethod: vi.fn().mockResolvedValue(mockCart()),
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

describe('registerCartTools', () => {
  it('registers all 7 cart tools', () => {
    const server = createMockServer();
    const provider = createMockProvider();
    registerCartTools(server as any, provider);

    expect(server.tool).toHaveBeenCalledTimes(7);
    expect(server.getHandler('create_cart')).toBeDefined();
    expect(server.getHandler('get_cart')).toBeDefined();
    expect(server.getHandler('update_cart')).toBeDefined();
    expect(server.getHandler('add_to_cart')).toBeDefined();
    expect(server.getHandler('remove_from_cart')).toBeDefined();
    expect(server.getHandler('get_shipping_options')).toBeDefined();
    expect(server.getHandler('select_shipping')).toBeDefined();
  });

  it('create_cart returns formatted cart', async () => {
    const server = createMockServer();
    const provider = createMockProvider();
    registerCartTools(server as any, provider);

    const handler = server.getHandler('create_cart')!;
    const result = await handler({
      region_id: 'reg_1',
      items: [{ variant_id: 'var_1', quantity: 2 }],
    });

    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    const data = JSON.parse(result.content[0].text);
    expect(data.cart_id).toBe('cart_1');
    expect(data.total).toBe(4898);
    expect(data.items).toHaveLength(1);
    expect(data.items[0].quantity).toBe(2);
    expect(provider.createCart).toHaveBeenCalledWith('reg_1', [
      { variant_id: 'var_1', quantity: 2 },
    ]);
  });

  it('add_to_cart returns updated cart', async () => {
    const server = createMockServer();
    const provider = createMockProvider();
    registerCartTools(server as any, provider);

    const handler = server.getHandler('add_to_cart')!;
    const result = await handler({
      cart_id: 'cart_1',
      variant_id: 'var_2',
      quantity: 1,
    });

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.cart_id).toBe('cart_1');
    expect(provider.addLineItem).toHaveBeenCalledWith('cart_1', 'var_2', 1);
  });

  it('get_shipping_options returns formatted options', async () => {
    const server = createMockServer();
    const provider = createMockProvider();
    registerCartTools(server as any, provider);

    const handler = server.getHandler('get_shipping_options')!;
    const result = await handler({ cart_id: 'cart_1' });

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.shipping_options).toHaveLength(2);
    expect(data.shipping_options[0].name).toBe('Standard Shipping');
    expect(data.shipping_options[1].name).toBe('Express Shipping');
  });

  it('returns error when provider fails', async () => {
    const server = createMockServer();
    const provider = createMockProvider({
      createCart: vi.fn().mockRejectedValue(new Error('Region not found')),
    });
    registerCartTools(server as any, provider);

    const handler = server.getHandler('create_cart')!;
    const result = await handler({
      region_id: 'invalid',
      items: [{ variant_id: 'var_1', quantity: 1 }],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Region not found');
  });

  it('respects scope checker and denies access', async () => {
    const server = createMockServer();
    const provider = createMockProvider();
    const scopeChecker: ScopeChecker = {
      scopes: ['products:read'],
      hasScope(scope: string) {
        return this.scopes.includes('*') || this.scopes.includes(scope);
      },
    };
    registerCartTools(server as any, provider, scopeChecker);

    const handler = server.getHandler('create_cart')!;
    const result = await handler({
      region_id: 'reg_1',
      items: [{ variant_id: 'var_1', quantity: 1 }],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Access denied');
  });
});
