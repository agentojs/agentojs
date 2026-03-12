import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
  Product,
  ProductVariant,
  Price,
  ProductImage,
  ProductOption,
  ProductCategory,
  ProductTag,
  Collection,
  Cart,
  LineItem,
  Address,
  ShippingMethod,
  ShippingOption,
  PaymentSession,
  Order,
  Fulfillment,
  TrackingLink,
  FulfillmentItem,
  Region,
  Country,
  PaginatedResponse,
  ProductSearchFilters,
  OrderListFilters,
  CommerceBackend,
} from '../index.js';

describe('@agentojs/core types', () => {
  it('Product has required fields', () => {
    const product: Product = {
      id: 'prod_1',
      title: 'Test Product',
      description: 'A test product',
      handle: 'test-product',
      thumbnail: null,
      images: [],
      variants: [],
      options: [],
      collection_id: null,
      categories: [],
      tags: [],
      status: 'published',
      metadata: {},
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };
    expect(product.id).toBe('prod_1');
    expect(product.status).toBe('published');
  });

  it('ProductVariant has price and inventory fields', () => {
    const variant: ProductVariant = {
      id: 'var_1',
      title: 'Default',
      sku: 'SKU-001',
      barcode: null,
      prices: [{ id: 'p1', amount: 1999, currency_code: 'usd', min_quantity: null, max_quantity: null }],
      options: { size: 'M' },
      inventory_quantity: 10,
      allow_backorder: false,
      manage_inventory: true,
      weight: null,
      length: null,
      height: null,
      width: null,
      metadata: {},
    };
    expect(variant.prices).toHaveLength(1);
    expect(variant.inventory_quantity).toBe(10);
  });

  it('Cart has items and totals', () => {
    const cart: Cart = {
      id: 'cart_1',
      items: [],
      region_id: 'reg_1',
      currency_code: 'usd',
      subtotal: 0,
      tax_total: 0,
      shipping_total: 0,
      discount_total: 0,
      total: 0,
      shipping_address: null,
      billing_address: null,
      email: null,
      shipping_methods: [],
      payment_sessions: [],
      metadata: {},
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };
    expect(cart.id).toBe('cart_1');
    expect(cart.total).toBe(0);
  });

  it('Order has status fields', () => {
    const order: Order = {
      id: 'order_1',
      display_id: 1,
      status: 'pending',
      fulfillment_status: 'not_fulfilled',
      payment_status: 'not_paid',
      items: [],
      currency_code: 'usd',
      subtotal: 1999,
      tax_total: 200,
      shipping_total: 500,
      total: 2699,
      email: 'test@example.com',
      shipping_address: {
        first_name: 'John',
        last_name: 'Doe',
        address_1: '123 Main St',
        address_2: null,
        city: 'New York',
        province: 'NY',
        postal_code: '10001',
        country_code: 'US',
        phone: null,
      },
      fulfillments: [],
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };
    expect(order.status).toBe('pending');
    expect(order.total).toBe(2699);
  });

  it('PaginatedResponse wraps typed data', () => {
    const response: PaginatedResponse<Product> = {
      data: [],
      count: 0,
      offset: 0,
      limit: 20,
    };
    expect(response.data).toHaveLength(0);
    expect(response.limit).toBe(20);
  });

  it('ProductSearchFilters are all optional', () => {
    const empty: ProductSearchFilters = {};
    const full: ProductSearchFilters = {
      q: 'shoes',
      category_id: ['cat_1'],
      collection_id: ['col_1'],
      tags: ['sale'],
      price_min: 10,
      price_max: 100,
      currency_code: 'usd',
      limit: 20,
      offset: 0,
    };
    expect(empty).toEqual({});
    expect(full.q).toBe('shoes');
  });

  it('OrderListFilters are all optional', () => {
    const filters: OrderListFilters = { email: 'test@example.com', limit: 10 };
    expect(filters.email).toBe('test@example.com');
  });

  it('CommerceBackend interface has all 22 methods', () => {
    // Type-level assertion: a class implementing CommerceBackend must have these methods
    type MethodKeys = keyof CommerceBackend;
    const expectedMethods: MethodKeys[] = [
      'searchProducts',
      'getProduct',
      'getCollections',
      'getCollection',
      'createCart',
      'getCart',
      'updateCart',
      'addLineItem',
      'removeLineItem',
      'getShippingOptions',
      'addShippingMethod',
      'createPaymentSessions',
      'selectPaymentSession',
      'initializePayment',
      'completeCart',
      'getOrder',
      'listOrders',
      'getRegions',
      'healthCheck',
    ];
    // Verify each method name is a valid key of CommerceBackend
    for (const method of expectedMethods) {
      expectTypeOf<CommerceBackend>().toHaveProperty(method);
    }
  });

  it('Address has required fields', () => {
    const address: Address = {
      first_name: 'Jane',
      last_name: 'Smith',
      address_1: '456 Oak Ave',
      address_2: 'Apt 2B',
      city: 'Chicago',
      province: 'IL',
      postal_code: '60601',
      country_code: 'US',
      phone: '+1234567890',
    };
    expect(address.country_code).toBe('US');
  });

  it('Region contains countries', () => {
    const region: Region = {
      id: 'reg_us',
      name: 'United States',
      currency_code: 'usd',
      countries: [{ iso_2: 'US', name: 'United States' }],
    };
    expect(region.countries).toHaveLength(1);
    expect(region.countries[0].iso_2).toBe('US');
  });

  it('Collection contains products', () => {
    const collection: Collection = {
      id: 'col_1',
      title: 'Summer Sale',
      handle: 'summer-sale',
      products: [],
    };
    expect(collection.handle).toBe('summer-sale');
  });

  it('PaymentSession has status variants', () => {
    const sessions: PaymentSession[] = [
      { id: 'ps_1', provider_id: 'stripe', status: 'pending', data: {} },
      { id: 'ps_2', provider_id: 'paypal', status: 'authorized', amount: 2699, currency_code: 'usd', data: {} },
      { id: 'ps_3', provider_id: 'manual', status: 'requires_more', data: {} },
    ];
    expect(sessions).toHaveLength(3);
  });

  it('Fulfillment tracks shipping', () => {
    const fulfillment: Fulfillment = {
      id: 'ful_1',
      order_id: 'order_1',
      tracking_numbers: ['1Z999AA10123456784'],
      tracking_links: [{ tracking_number: '1Z999AA10123456784', url: 'https://track.example.com/1Z999AA10123456784' }],
      items: [{ item_id: 'item_1', quantity: 2 }],
      shipped_at: '2024-01-02',
      created_at: '2024-01-01',
    };
    expect(fulfillment.tracking_numbers).toHaveLength(1);
  });
});
