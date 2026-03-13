import { describe, it, expect, beforeEach } from 'vitest';
import { UcpResponseFormatter } from '../response-formatter.js';
import type { Cart, ShippingOption, StoreInfo } from '@agentojs/core';
import type { UcpSession } from '../types.js';

function createMockCart(overrides?: Partial<Cart>): Cart {
  return {
    id: 'cart-1',
    items: [
      {
        id: 'item-1',
        cart_id: 'cart-1',
        variant_id: 'var-1',
        product_id: 'prod-1',
        title: 'T-Shirt',
        description: 'A nice t-shirt',
        thumbnail: null,
        quantity: 2,
        unit_price: 1500,
        subtotal: 3000,
        total: 3300,
        metadata: {},
      },
    ],
    region_id: 'reg-1',
    currency_code: 'usd',
    subtotal: 3000,
    tax_total: 300,
    shipping_total: 500,
    discount_total: 0,
    total: 3800,
    shipping_address: null,
    billing_address: null,
    email: null,
    shipping_methods: [],
    payment_sessions: [],
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function createMockStore(overrides?: Partial<StoreInfo>): StoreInfo {
  return {
    slug: 'test-store',
    name: 'Test Store',
    currency: 'usd',
    country: 'us',
    backendUrl: 'https://api.test-store.com',
    ...overrides,
  };
}

function createMockSession(overrides?: Partial<UcpSession>): UcpSession {
  return {
    cartId: 'cart-1',
    storeSlug: 'test-store',
    status: 'incomplete',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('UcpResponseFormatter', () => {
  let formatter: UcpResponseFormatter;

  beforeEach(() => {
    formatter = new UcpResponseFormatter();
  });

  describe('formatCart', () => {
    it('returns correct UCP checkout session shape', () => {
      const cart = createMockCart();
      const store = createMockStore();
      const session = createMockSession();

      const result = formatter.formatCart('session-1', session, cart, store);

      expect(result.id).toBe('gid://api.test-store.com/Checkout/session-1');
      expect(result.status).toBe('incomplete');
      expect(result.currency).toBe('usd');
      expect(result.line_items).toHaveLength(1);
      expect(result.totals).toHaveLength(5);
      expect(result.fulfillment.methods).toEqual([]);
      expect(result.payment.provider).toBe('stripe');
      expect(result.payment.supported_methods).toEqual(['card']);
      expect(result.messages).toEqual([]);
    });

    it('includes buyer info when present', () => {
      const cart = createMockCart();
      const store = createMockStore();
      const session = createMockSession({
        buyer: { email: 'john@example.com', name: 'John' },
      });

      const result = formatter.formatCart('session-1', session, cart, store);
      expect(result.buyer).toEqual({ email: 'john@example.com', name: 'John' });
    });

    it('includes fulfillment address and selected method', () => {
      const cart = createMockCart();
      const store = createMockStore();
      const session = createMockSession({
        fulfillmentAddress: {
          line_one: '123 Main St',
          city: 'Oslo',
          country: 'NO',
          postal_code: '0150',
        },
        fulfillmentMethodId: 'ship-1',
      });

      const result = formatter.formatCart('session-1', session, cart, store);
      expect(result.fulfillment.address).toBeDefined();
      expect(result.fulfillment.address!.city).toBe('Oslo');
      expect(result.fulfillment.selected_method_id).toBe('ship-1');
    });

    it('includes shipping options when provided', () => {
      const cart = createMockCart();
      const store = createMockStore();
      const session = createMockSession();
      const options: ShippingOption[] = [
        { id: 'ship-1', name: 'Standard', amount: 500, region_id: 'reg-1' },
        { id: 'ship-2', name: 'Express', amount: 1500, region_id: 'reg-1' },
      ];

      const result = formatter.formatCart('session-1', session, cart, store, options);
      expect(result.fulfillment.methods).toHaveLength(2);
      expect(result.fulfillment.methods[0].title).toBe('Standard');
      expect(result.fulfillment.methods[1].total).toBe(1500);
    });
  });

  describe('buildLineItems', () => {
    it('computes base_amount, discount, subtotal, tax, total correctly', () => {
      const cart = createMockCart();
      const items = formatter.buildLineItems(cart);

      expect(items).toHaveLength(1);
      const item = items[0];
      expect(item.id).toBe('item-1');
      expect(item.item.id).toBe('var-1');
      expect(item.item.quantity).toBe(2);
      expect(item.base_amount).toBe(3000); // 1500 * 2
      expect(item.discount).toBe(0); // 3000 - 3000
      expect(item.subtotal).toBe(3000);
      expect(item.tax).toBe(300); // 3300 - 3000
      expect(item.total).toBe(3300);
    });

    it('computes discount when subtotal is less than base amount', () => {
      const cart = createMockCart({
        items: [
          {
            id: 'item-1',
            cart_id: 'cart-1',
            variant_id: 'var-1',
            product_id: 'prod-1',
            title: 'Discounted Item',
            description: '',
            thumbnail: null,
            quantity: 1,
            unit_price: 2000,
            subtotal: 1500, // discounted
            total: 1650,
            metadata: {},
          },
        ],
      });
      const items = formatter.buildLineItems(cart);
      expect(items[0].base_amount).toBe(2000);
      expect(items[0].discount).toBe(500); // 2000 - 1500
      expect(items[0].subtotal).toBe(1500);
    });
  });

  describe('buildTotals', () => {
    it('returns five total entries', () => {
      const cart = createMockCart();
      const totals = formatter.buildTotals(cart);

      expect(totals).toHaveLength(5);
      expect(totals[0].type).toBe('items_base_amount');
      expect(totals[0].amount).toBe(3000);
      expect(totals[1].type).toBe('subtotal');
      expect(totals[1].amount).toBe(3000);
      expect(totals[2].type).toBe('fulfillment');
      expect(totals[2].amount).toBe(500);
      expect(totals[3].type).toBe('tax');
      expect(totals[3].amount).toBe(300);
      expect(totals[4].type).toBe('total');
      expect(totals[4].amount).toBe(3800);
    });
  });

  describe('buildFulfillmentMethods', () => {
    it('formats shipping options as UCP fulfillment methods', () => {
      const options: ShippingOption[] = [
        { id: 'ship-1', name: 'Standard Shipping', amount: 500, region_id: 'reg-1' },
      ];
      const methods = formatter.buildFulfillmentMethods(options);

      expect(methods).toHaveLength(1);
      expect(methods[0].type).toBe('shipping');
      expect(methods[0].id).toBe('ship-1');
      expect(methods[0].title).toBe('Standard Shipping');
      expect(methods[0].subtitle).toBe('');
      expect(methods[0].subtotal).toBe(500);
      expect(methods[0].tax).toBe(0);
      expect(methods[0].total).toBe(500);
    });
  });

  describe('formatShippingOptions', () => {
    it('delegates to buildFulfillmentMethods', () => {
      const store = createMockStore();
      const options: ShippingOption[] = [
        { id: 's1', name: 'Fast', amount: 1000, region_id: 'reg-1' },
      ];
      const methods = formatter.formatShippingOptions(options, store);
      expect(methods).toHaveLength(1);
      expect(methods[0].title).toBe('Fast');
    });
  });

  describe('formatCheckoutSession', () => {
    it('includes order info when orderId is provided', () => {
      const cart = createMockCart();
      const store = createMockStore();
      const session = createMockSession({ status: 'completed' });

      const result = formatter.formatCheckoutSession(
        'session-1',
        session,
        cart,
        store,
        'order-123',
      );

      expect(result.order).toBeDefined();
      expect(result.order!.id).toBe('order-123');
      expect(result.order!.checkout_session_id).toBe(
        'gid://api.test-store.com/Checkout/session-1',
      );
      expect(result.order!.permalink_url).toBe(
        'https://api.test-store.com/orders/order-123',
      );
    });

    it('omits order when orderId is not provided', () => {
      const cart = createMockCart();
      const store = createMockStore();
      const session = createMockSession();

      const result = formatter.formatCheckoutSession(
        'session-1',
        session,
        cart,
        store,
      );
      expect(result.order).toBeUndefined();
    });
  });

  describe('buildMessages', () => {
    it('returns empty array when no errors', () => {
      expect(formatter.buildMessages()).toEqual([]);
      expect(formatter.buildMessages([])).toEqual([]);
    });

    it('formats errors as UCP messages', () => {
      const messages = formatter.buildMessages([
        { code: 'out_of_stock', content: 'Item is out of stock' },
        { code: 'invalid_address', content: 'Address not valid' },
      ]);

      expect(messages).toHaveLength(2);
      expect(messages[0].type).toBe('error');
      expect(messages[0].code).toBe('out_of_stock');
      expect(messages[0].content).toBe('Item is out of stock');
    });
  });
});
