import { describe, it, expect, vi } from 'vitest';
import type { CommerceProvider, StoreInfo, WebhookEmitter } from '@agentojs/core';
import { registerCheckoutTools } from '../tools/checkout.tools.js';

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

function createMockStore(): StoreInfo {
  return {
    slug: 'test-store',
    name: 'Test Store',
    currency: 'usd',
    country: 'us',
    backendUrl: 'https://api.example.com',
    stripeKey: 'pk_test_123',
    webhookUrl: 'https://example.com/webhook',
    webhookSecret: 'whsec_123',
  };
}

function createMockProvider(overrides: Partial<CommerceProvider> = {}): CommerceProvider {
  return {
    searchProducts: vi.fn(),
    getProduct: vi.fn(),
    getCollections: vi.fn(),
    getCollection: vi.fn(),
    createCart: vi.fn(),
    getCart: vi.fn().mockResolvedValue({
      id: 'cart_1',
      items: [
        { title: 'Shirt', quantity: 1, unit_price: 1999, thumbnail: null },
      ],
      currency_code: 'usd',
      total: 2499,
      subtotal: 1999,
      tax_total: 0,
      shipping_total: 500,
      discount_total: 0,
      email: 'test@example.com',
      shipping_address: {},
      shipping_methods: [],
    }),
    updateCart: vi.fn(),
    addLineItem: vi.fn(),
    removeLineItem: vi.fn(),
    getShippingOptions: vi.fn(),
    addShippingMethod: vi.fn(),
    createPaymentSessions: vi.fn(),
    selectPaymentSession: vi.fn(),
    initializePayment: vi.fn().mockResolvedValue({
      id: 'ps_1',
      data: { client_secret: 'pi_secret_123' },
      currency_code: 'usd',
      amount: 2499,
    }),
    completeCart: vi.fn().mockResolvedValue({
      id: 'order_1',
      display_id: 42,
      status: 'pending',
      email: 'test@example.com',
      total: 2499,
      currency_code: 'usd',
      items: [
        { title: 'Shirt', quantity: 1, total: 1999, unit_price: 1999 },
      ],
      shipping_address: { city: 'Oslo' },
      fulfillments: [],
    }),
    getOrder: vi.fn(),
    listOrders: vi.fn(),
    getRegions: vi.fn(),
    healthCheck: vi.fn(),
    ...overrides,
  };
}

describe('registerCheckoutTools', () => {
  it('registers create_payment_session and complete_checkout', () => {
    const server = createMockServer();
    const provider = createMockProvider();
    const store = createMockStore();
    registerCheckoutTools(server as any, provider, store);

    expect(server.tool).toHaveBeenCalledTimes(2);
    expect(server.getHandler('create_payment_session')).toBeDefined();
    expect(server.getHandler('complete_checkout')).toBeDefined();
  });

  it('create_payment_session returns payment URL', async () => {
    const server = createMockServer();
    const provider = createMockProvider();
    const store = createMockStore();
    registerCheckoutTools(server as any, provider, store);

    const handler = server.getHandler('create_payment_session')!;
    const result = await handler({ cart_id: 'cart_1' });

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.payment_url).toContain('pi_secret_123');
    expect(data.payment_url).toContain('pk_test_123');
    expect(data.total).toBe(2499);
    expect(data.currency).toBe('usd');
  });

  it('create_payment_session returns error if no client_secret', async () => {
    const server = createMockServer();
    const provider = createMockProvider({
      initializePayment: vi.fn().mockResolvedValue({
        id: 'ps_1',
        data: {},
        currency_code: 'usd',
        amount: 0,
      }),
    });
    const store = createMockStore();
    registerCheckoutTools(server as any, provider, store);

    const handler = server.getHandler('create_payment_session')!;
    const result = await handler({ cart_id: 'cart_1' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('No client_secret');
  });

  it('complete_checkout calls webhookEmitter', async () => {
    const server = createMockServer();
    const provider = createMockProvider();
    const store = createMockStore();
    const webhookEmitter: WebhookEmitter = vi.fn();
    registerCheckoutTools(server as any, provider, store, webhookEmitter);

    const handler = server.getHandler('complete_checkout')!;
    const result = await handler({ cart_id: 'cart_1' });

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.order_id).toBe('order_1');
    expect(data.display_id).toBe(42);
    expect(data.message).toContain('Order #42');

    expect(webhookEmitter).toHaveBeenCalledWith(
      'https://example.com/webhook',
      'whsec_123',
      'checkout.completed',
      expect.objectContaining({
        protocol: 'mcp',
        order_id: 'order_1',
        store_slug: 'test-store',
      }),
    );
  });

  it('complete_checkout handles already-completed cart', async () => {
    const server = createMockServer();
    const provider = createMockProvider({
      completeCart: vi.fn().mockRejectedValue(new Error('Cart already completed')),
    });
    const store = createMockStore();
    registerCheckoutTools(server as any, provider, store);

    const handler = server.getHandler('complete_checkout')!;
    const result = await handler({ cart_id: 'cart_1' });

    // Should not be an error — it's a graceful handling
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe('already_completed');
  });

  it('complete_checkout returns error on failure', async () => {
    const server = createMockServer();
    const provider = createMockProvider({
      completeCart: vi.fn().mockRejectedValue(new Error('Payment failed')),
    });
    const store = createMockStore();
    registerCheckoutTools(server as any, provider, store);

    const handler = server.getHandler('complete_checkout')!;
    const result = await handler({ cart_id: 'cart_1' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Payment failed');
  });
});
