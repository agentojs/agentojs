import { describe, it, expect, beforeEach } from 'vitest';
import { buildFeedItems, AcpFeedBuilder } from '../feed-builder.js';
import type { Product, StoreInfo } from '@agentojs/core';

const mockStore: StoreInfo = {
  slug: 'test-store',
  name: 'Test Store',
  currency: 'usd',
  country: 'us',
  backendUrl: 'https://store.example.com',
};

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod_1',
    title: 'Test Product',
    description: 'A test product',
    handle: 'test-product',
    status: 'published',
    thumbnail: 'https://img.example.com/thumb.jpg',
    images: [],
    variants: [
      {
        id: 'var_1',
        title: 'Default',
        sku: 'TP-001',
        prices: [{ amount: 1999, currency_code: 'usd' }],
        manage_inventory: false,
        inventory_quantity: 10,
        allow_backorder: false,
        options: {},
      },
    ],
    options: [],
    categories: [],
    tags: [],
    ...overrides,
  };
}

describe('buildFeedItems', () => {
  it('transforms a single-variant product to a feed item', () => {
    const products = [makeProduct()];
    const items = buildFeedItems(products, mockStore);

    expect(items).toHaveLength(1);
    expect(items[0].item_id).toBe('var_1');
    expect(items[0].title).toBe('Test Product');
    expect(items[0].price).toEqual({ amount: 1999, currency: 'USD' });
    expect(items[0].availability).toBe('in_stock');
    expect(items[0].seller_name).toBe('Test Store');
    expect(items[0].store_country).toBe('US');
    expect(items[0].is_eligible_search).toBe(true);
    expect(items[0].is_eligible_checkout).toBe(true);
  });

  it('skips non-published products', () => {
    const products = [makeProduct({ status: 'draft' })];
    const items = buildFeedItems(products, mockStore);
    expect(items).toHaveLength(0);
  });

  it('creates separate items for multi-variant products', () => {
    const products = [
      makeProduct({
        variants: [
          {
            id: 'var_a',
            title: 'Small',
            sku: 'TP-S',
            prices: [{ amount: 1999, currency_code: 'usd' }],
            manage_inventory: false,
            inventory_quantity: 5,
            allow_backorder: false,
            options: { size: 'S' },
          },
          {
            id: 'var_b',
            title: 'Large',
            sku: 'TP-L',
            prices: [{ amount: 2499, currency_code: 'usd' }],
            manage_inventory: false,
            inventory_quantity: 3,
            allow_backorder: false,
            options: { size: 'L' },
          },
        ],
      }),
    ];

    const items = buildFeedItems(products, mockStore);

    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Test Product - Small');
    expect(items[0].group_id).toBe('prod_1');
    expect(items[0].listing_has_variations).toBe(true);
    expect(items[0].variant_dict).toEqual({ size: 'S' });
    expect(items[1].title).toBe('Test Product - Large');
    expect(items[1].price.amount).toBe(2499);
  });

  it('marks out-of-stock when managed and zero inventory', () => {
    const products = [
      makeProduct({
        variants: [
          {
            id: 'var_oos',
            title: 'Default',
            sku: 'OOS-1',
            prices: [{ amount: 999, currency_code: 'usd' }],
            manage_inventory: true,
            inventory_quantity: 0,
            allow_backorder: false,
            options: {},
          },
        ],
      }),
    ];

    const items = buildFeedItems(products, mockStore);
    expect(items[0].availability).toBe('out_of_stock');
    expect(items[0].is_eligible_search).toBe(false);
    expect(items[0].is_eligible_checkout).toBe(false);
  });

  it('handles product with no variants', () => {
    const products = [makeProduct({ variants: [] })];
    const items = buildFeedItems(products, mockStore);
    expect(items).toHaveLength(1);
    expect(items[0].item_id).toBe('prod_1');
    expect(items[0].availability).toBe('in_stock');
  });

  it('builds correct URL from store backend URL and product handle', () => {
    const products = [makeProduct()];
    const items = buildFeedItems(products, mockStore);
    expect(items[0].url).toBe('https://store.example.com/products/test-product');
  });
});

describe('AcpFeedBuilder cache', () => {
  let builder: AcpFeedBuilder;

  beforeEach(() => {
    builder = new AcpFeedBuilder();
  });

  it('returns null when no cache exists', () => {
    expect(builder.getCached('test-store')).toBeNull();
  });

  it('caches and retrieves feed items', () => {
    const items = [{ item_id: 'test' } as any];
    builder.cache('test-store', items);
    const cached = builder.getCached('test-store');
    expect(cached).toEqual(items);
  });

  it('clears cache for specific store', () => {
    builder.cache('store-a', []);
    builder.cache('store-b', []);
    builder.clearCache('store-a');
    expect(builder.getCached('store-a')).toBeNull();
    expect(builder.getCached('store-b')).not.toBeNull();
  });
});
