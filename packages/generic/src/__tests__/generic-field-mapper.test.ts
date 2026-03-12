import { describe, it, expect } from 'vitest';
import { GenericFieldMapper, getField } from '../generic-field-mapper.js';

// ─── getField helper ──────────────────────────────────────────────

describe('getField', () => {
  it('resolves top-level fields', () => {
    expect(getField({ name: 'Widget' }, 'name')).toBe('Widget');
  });

  it('resolves dot-notation paths', () => {
    expect(getField({ pricing: { amount: 9.99 } }, 'pricing.amount')).toBe(9.99);
  });

  it('resolves deeply nested paths', () => {
    expect(getField({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
  });

  it('returns undefined for missing paths', () => {
    expect(getField({ a: 1 }, 'b')).toBeUndefined();
    expect(getField({ a: 1 }, 'a.b.c')).toBeUndefined();
  });

  it('returns undefined for null/undefined input', () => {
    expect(getField(null, 'a')).toBeUndefined();
    expect(getField(undefined, 'a')).toBeUndefined();
  });

  it('returns undefined for non-object input', () => {
    expect(getField('string', 'length')).toBeUndefined();
  });
});

// ─── GenericFieldMapper — Product ─────────────────────────────────

describe('GenericFieldMapper — mapProduct', () => {
  it('maps standard product fields', () => {
    const mapper = new GenericFieldMapper();
    const product = mapper.mapProduct({
      id: 'p1',
      title: 'Widget',
      description: 'A great widget',
      handle: 'widget',
      thumbnail: 'https://img.example.com/widget.jpg',
      price: 29.99,
      currency_code: 'USD',
    });

    expect(product.id).toBe('p1');
    expect(product.title).toBe('Widget');
    expect(product.description).toBe('A great widget');
    expect(product.handle).toBe('widget');
    expect(product.thumbnail).toBe('https://img.example.com/widget.jpg');
    expect(product.variants).toHaveLength(1);
    expect(product.variants[0].prices[0].amount).toBe(29.99);
    expect(product.variants[0].prices[0].currency_code).toBe('usd');
  });

  it('uses custom field mapping', () => {
    const mapper = new GenericFieldMapper({
      product: {
        title: 'vehicle_name',
        price: 'msrp.amount',
      },
    });

    const product = mapper.mapProduct({
      id: 'car-1',
      vehicle_name: '2024 Tesla Model 3',
      msrp: { amount: 38990, currency: 'USD' },
    });

    expect(product.title).toBe('2024 Tesla Model 3');
    expect(product.variants[0].prices[0].amount).toBe(38990);
  });

  it('falls back through field name chain', () => {
    const mapper = new GenericFieldMapper();

    // 'name' is in the fallback chain for 'title'
    const product = mapper.mapProduct({
      id: 'p2',
      name: 'Gadget',
      body_html: 'An awesome gadget',
      slug: 'gadget',
    });

    expect(product.title).toBe('Gadget');
    expect(product.description).toBe('An awesome gadget');
    expect(product.handle).toBe('gadget');
  });

  it('creates default variant when no variants array', () => {
    const mapper = new GenericFieldMapper();
    const product = mapper.mapProduct({
      id: 'p3',
      title: 'Simple',
      price: 10,
      currency: 'EUR',
      stock: 5,
    });

    expect(product.variants).toHaveLength(1);
    expect(product.variants[0].title).toBe('Default');
    expect(product.variants[0].prices[0].amount).toBe(10);
    expect(product.variants[0].prices[0].currency_code).toBe('eur');
    expect(product.variants[0].inventory_quantity).toBe(5);
  });

  it('maps explicit variants array', () => {
    const mapper = new GenericFieldMapper();
    const product = mapper.mapProduct({
      id: 'p4',
      title: 'T-Shirt',
      variants: [
        { id: 'v1', title: 'Small', price: 20, currency_code: 'USD' },
        { id: 'v2', title: 'Large', price: 22, currency_code: 'USD' },
      ],
    });

    expect(product.variants).toHaveLength(2);
    expect(product.variants[0].id).toBe('v1');
    expect(product.variants[0].title).toBe('Small');
    expect(product.variants[1].title).toBe('Large');
  });

  it('maps images from string URLs', () => {
    const mapper = new GenericFieldMapper();
    const product = mapper.mapProduct({
      id: 'p5',
      title: 'Img Test',
      images: ['https://img.example.com/1.jpg', 'https://img.example.com/2.jpg'],
    });

    expect(product.images).toHaveLength(2);
    expect(product.images[0].url).toBe('https://img.example.com/1.jpg');
    expect(product.images[1].url).toBe('https://img.example.com/2.jpg');
  });

  it('maps images from object URLs', () => {
    const mapper = new GenericFieldMapper();
    const product = mapper.mapProduct({
      id: 'p6',
      title: 'Img Test 2',
      images: [
        { id: 'img-1', url: 'https://img.example.com/a.jpg' },
        { id: 'img-2', src: 'https://img.example.com/b.jpg' },
      ],
    });

    expect(product.images).toHaveLength(2);
    expect(product.images[0].id).toBe('img-1');
    expect(product.images[0].url).toBe('https://img.example.com/a.jpg');
    expect(product.images[1].url).toBe('https://img.example.com/b.jpg');
  });

  it('maps categories and tags', () => {
    const mapper = new GenericFieldMapper();
    const product = mapper.mapProduct({
      id: 'p7',
      title: 'Tagged',
      categories: [{ id: 'c1', name: 'Electronics', slug: 'electronics' }],
      tags: ['sale', 'new'],
    });

    expect(product.categories).toHaveLength(1);
    expect(product.categories[0].name).toBe('Electronics');
    expect(product.categories[0].handle).toBe('electronics');
    expect(product.tags).toHaveLength(2);
    expect(product.tags[0]).toEqual({ id: 'sale', value: 'sale' });
  });

  it('handles null/undefined input gracefully', () => {
    const mapper = new GenericFieldMapper();
    const product = mapper.mapProduct(null);

    expect(product.id).toBe('');
    expect(product.title).toBe('');
    expect(product.variants).toHaveLength(1);
    expect(product.status).toBe('published');
  });

  it('maps variant with explicit prices array', () => {
    const mapper = new GenericFieldMapper();
    const product = mapper.mapProduct({
      id: 'p8',
      title: 'Multi-price',
      variants: [
        {
          id: 'v1',
          title: 'Default',
          prices: [
            { id: 'pr1', amount: 100, currency_code: 'usd' },
            { id: 'pr2', amount: 90, currency_code: 'eur' },
          ],
        },
      ],
    });

    expect(product.variants[0].prices).toHaveLength(2);
    expect(product.variants[0].prices[0].amount).toBe(100);
    expect(product.variants[0].prices[1].currency_code).toBe('eur');
  });

  it('maps variant physical dimensions', () => {
    const mapper = new GenericFieldMapper();
    const product = mapper.mapProduct({
      id: 'p9',
      title: 'Heavy',
      variants: [
        { id: 'v1', weight: 2.5, length: 10, height: 5, width: 8 },
      ],
    });

    expect(product.variants[0].weight).toBe(2.5);
    expect(product.variants[0].length).toBe(10);
    expect(product.variants[0].height).toBe(5);
    expect(product.variants[0].width).toBe(8);
  });
});

// ─── GenericFieldMapper — Cart ────────────────────────────────────

describe('GenericFieldMapper — mapCart', () => {
  it('maps cart with items', () => {
    const mapper = new GenericFieldMapper();
    const cart = mapper.mapCart({
      id: 'cart-1',
      items: [
        {
          id: 'li-1',
          variant_id: 'v1',
          product_id: 'p1',
          title: 'Widget',
          quantity: 2,
          unit_price: 10,
          subtotal: 20,
          total: 20,
        },
      ],
      currency_code: 'usd',
      subtotal: 20,
      tax_total: 2,
      shipping_total: 5,
      total: 27,
    });

    expect(cart.id).toBe('cart-1');
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].title).toBe('Widget');
    expect(cart.items[0].quantity).toBe(2);
    expect(cart.total).toBe(27);
    expect(cart.currency_code).toBe('usd');
  });

  it('uses custom cart field mapping', () => {
    const mapper = new GenericFieldMapper({
      cart: {
        items: 'line_items',
        total: 'grand_total',
      },
    });

    const cart = mapper.mapCart({
      id: 'cart-2',
      line_items: [{ id: 'li-2', title: 'Item', quantity: 1 }],
      grand_total: 50,
    });

    expect(cart.items).toHaveLength(1);
    expect(cart.total).toBe(50);
  });

  it('maps shipping and billing addresses', () => {
    const mapper = new GenericFieldMapper();
    const cart = mapper.mapCart({
      id: 'cart-3',
      shipping_address: {
        first_name: 'John',
        last_name: 'Doe',
        address_1: '123 Main St',
        city: 'Springfield',
        postal_code: '62701',
        country_code: 'US',
      },
    });

    expect(cart.shipping_address).not.toBeNull();
    expect(cart.shipping_address?.first_name).toBe('John');
    expect(cart.shipping_address?.city).toBe('Springfield');
  });

  it('handles empty cart', () => {
    const mapper = new GenericFieldMapper();
    const cart = mapper.mapCart({});

    expect(cart.id).toBe('');
    expect(cart.items).toEqual([]);
    expect(cart.total).toBe(0);
    expect(cart.region_id).toBe('default');
    expect(cart.currency_code).toBe('usd');
  });
});

// ─── GenericFieldMapper — Order ───────────────────────────────────

describe('GenericFieldMapper — mapOrder', () => {
  it('maps order with items', () => {
    const mapper = new GenericFieldMapper();
    const order = mapper.mapOrder({
      id: 'ord-1',
      display_id: 1001,
      status: 'completed',
      fulfillment_status: 'fulfilled',
      payment_status: 'captured',
      items: [
        { id: 'li-1', title: 'Widget', quantity: 1, unit_price: 10, total: 10 },
      ],
      currency_code: 'usd',
      subtotal: 10,
      tax_total: 1,
      shipping_total: 5,
      total: 16,
      email: 'john@example.com',
    });

    expect(order.id).toBe('ord-1');
    expect(order.display_id).toBe(1001);
    expect(order.status).toBe('completed');
    expect(order.items).toHaveLength(1);
    expect(order.total).toBe(16);
    expect(order.email).toBe('john@example.com');
  });

  it('uses custom order field mapping', () => {
    const mapper = new GenericFieldMapper({
      order: {
        id: 'order_id',
        display_id: 'order_number',
      },
    });

    const order = mapper.mapOrder({
      order_id: 'custom-1',
      order_number: 5001,
      status: 'pending',
    });

    expect(order.id).toBe('custom-1');
    expect(order.display_id).toBe(5001);
  });

  it('defaults status fields when missing', () => {
    const mapper = new GenericFieldMapper();
    const order = mapper.mapOrder({ id: 'ord-2' });

    expect(order.status).toBe('pending');
    expect(order.fulfillment_status).toBe('not_fulfilled');
    expect(order.payment_status).toBe('not_paid');
  });

  it('provides default shipping address when missing', () => {
    const mapper = new GenericFieldMapper();
    const order = mapper.mapOrder({ id: 'ord-3' });

    expect(order.shipping_address).toBeDefined();
    expect(order.shipping_address.first_name).toBe('');
    expect(order.shipping_address.country_code).toBe('');
  });
});

// ─── GenericFieldMapper — Address ─────────────────────────────────

describe('GenericFieldMapper — mapAddress', () => {
  it('maps address with standard field names', () => {
    const mapper = new GenericFieldMapper();
    const address = mapper.mapAddress({
      first_name: 'Jane',
      last_name: 'Smith',
      address_1: '456 Oak Ave',
      city: 'Portland',
      province: 'OR',
      postal_code: '97201',
      country_code: 'US',
      phone: '+1234567890',
    });

    expect(address).not.toBeNull();
    expect(address!.first_name).toBe('Jane');
    expect(address!.province).toBe('OR');
    expect(address!.phone).toBe('+1234567890');
  });

  it('maps address with alternative field names', () => {
    const mapper = new GenericFieldMapper();
    const address = mapper.mapAddress({
      firstName: 'Bob',
      lastName: 'Jones',
      address: '789 Pine St',
      city: 'Denver',
      state: 'CO',
      zip: '80201',
      country: 'US',
    });

    expect(address).not.toBeNull();
    expect(address!.first_name).toBe('Bob');
    expect(address!.address_1).toBe('789 Pine St');
    expect(address!.province).toBe('CO');
    expect(address!.postal_code).toBe('80201');
  });

  it('returns null for non-object input', () => {
    const mapper = new GenericFieldMapper();
    expect(mapper.mapAddress(null)).toBeNull();
    expect(mapper.mapAddress(undefined)).toBeNull();
    expect(mapper.mapAddress('string')).toBeNull();
  });
});
