import { describe, it, expect, vi } from 'vitest';
import type { CommerceProvider } from '@agentojs/core';
import { registerOrderTools } from '../tools/order.tools.js';

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

function createMockProvider(overrides: Partial<CommerceProvider> = {}): CommerceProvider {
  return {
    searchProducts: vi.fn(),
    getProduct: vi.fn(),
    getCollections: vi.fn(),
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
    getOrder: vi.fn().mockResolvedValue({
      id: 'order_1',
      display_id: 42,
      status: 'completed',
      fulfillment_status: 'shipped',
      payment_status: 'captured',
      email: 'alice@example.com',
      currency_code: 'usd',
      subtotal: 3998,
      tax_total: 400,
      shipping_total: 500,
      total: 4898,
      items: [
        {
          id: 'item_1',
          cart_id: 'cart_1',
          variant_id: 'var_1',
          product_id: 'prod_1',
          title: 'Test Shirt',
          description: 'A test shirt',
          thumbnail: null,
          quantity: 2,
          unit_price: 1999,
          subtotal: 3998,
          total: 3998,
          metadata: {},
        },
      ],
      shipping_address: {
        first_name: 'Alice',
        last_name: 'Smith',
        address_1: '123 Main St',
        address_2: null,
        city: 'Springfield',
        province: 'IL',
        postal_code: '62701',
        country_code: 'us',
        phone: null,
      },
      fulfillments: [
        {
          id: 'ful_1',
          order_id: 'order_1',
          tracking_numbers: ['1Z999AA1'],
          tracking_links: [{ tracking_number: '1Z999AA1', url: 'https://track.example.com/1Z999AA1' }],
          items: [{ item_id: 'item_1', quantity: 2 }],
          shipped_at: '2026-01-05',
          created_at: '2026-01-04',
        },
      ],
      created_at: '2026-01-01',
      updated_at: '2026-01-05',
    }),
    listOrders: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'order_1',
          display_id: 42,
          status: 'completed',
          fulfillment_status: 'shipped',
          payment_status: 'captured',
          email: 'alice@example.com',
          currency_code: 'usd',
          subtotal: 3998,
          tax_total: 400,
          shipping_total: 500,
          total: 4898,
          items: [
            {
              id: 'item_1',
              cart_id: 'cart_1',
              variant_id: 'var_1',
              product_id: 'prod_1',
              title: 'Test Shirt',
              description: '',
              thumbnail: null,
              quantity: 2,
              unit_price: 1999,
              subtotal: 3998,
              total: 3998,
              metadata: {},
            },
          ],
          shipping_address: {
            first_name: 'Alice',
            last_name: 'Smith',
            address_1: '123 Main St',
            address_2: null,
            city: 'Springfield',
            province: 'IL',
            postal_code: '62701',
            country_code: 'us',
            phone: null,
          },
          fulfillments: [],
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
      ],
      count: 1,
      offset: 0,
      limit: 10,
    }),
    getRegions: vi.fn().mockResolvedValue([
      {
        id: 'reg_eu',
        name: 'Europe',
        currency_code: 'eur',
        countries: [
          { iso_2: 'de', name: 'Germany' },
          { iso_2: 'fr', name: 'France' },
        ],
      },
    ]),
    healthCheck: vi.fn(),
    ...overrides,
  };
}

describe('registerOrderTools', () => {
  it('registers list_orders, get_order, get_regions tools', () => {
    const server = createMockServer();
    const provider = createMockProvider();
    registerOrderTools(server as any, provider);

    expect(server.tool).toHaveBeenCalledTimes(3);
    expect(server.getHandler('list_orders')).toBeDefined();
    expect(server.getHandler('get_order')).toBeDefined();
    expect(server.getHandler('get_regions')).toBeDefined();
  });

  it('list_orders returns paginated order summaries', async () => {
    const server = createMockServer();
    const provider = createMockProvider();
    registerOrderTools(server as any, provider);

    const handler = server.getHandler('list_orders')!;
    const result = await handler({ limit: 10, offset: 0 });

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.orders).toHaveLength(1);
    expect(data.orders[0].order_id).toBe('order_1');
    expect(data.orders[0].formatted_total).toContain('4,898');
    expect(data.orders[0].item_count).toBe(1);
    expect(data.pagination.total).toBe(1);
    expect(data.pagination.has_more).toBe(false);
  });

  it('get_order returns detailed order with fulfillments', async () => {
    const server = createMockServer();
    const provider = createMockProvider();
    registerOrderTools(server as any, provider);

    const handler = server.getHandler('get_order')!;
    const result = await handler({ order_id: 'order_1' });

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.order_id).toBe('order_1');
    expect(data.status).toBe('completed');
    expect(data.formatted_total).toContain('4,898');
    expect(data.items).toHaveLength(1);
    expect(data.items[0].title).toBe('Test Shirt');
    expect(data.fulfillments).toHaveLength(1);
    expect(data.fulfillments[0].tracking_numbers).toEqual(['1Z999AA1']);
  });

  it('get_order returns error for provider failure', async () => {
    const server = createMockServer();
    const provider = createMockProvider({
      getOrder: vi.fn().mockRejectedValue(new Error('Order not found')),
    });
    registerOrderTools(server as any, provider);

    const handler = server.getHandler('get_order')!;
    const result = await handler({ order_id: 'invalid' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Order not found');
  });

  it('get_regions returns simplified regions', async () => {
    const server = createMockServer();
    const provider = createMockProvider();
    registerOrderTools(server as any, provider);

    const handler = server.getHandler('get_regions')!;
    const result = await handler({});

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.regions).toHaveLength(1);
    expect(data.regions[0].name).toBe('Europe');
    expect(data.regions[0].currency).toBe('eur');
    expect(data.regions[0].countries).toHaveLength(2);
    expect(data.regions[0].countries[0].code).toBe('de');
  });
});
