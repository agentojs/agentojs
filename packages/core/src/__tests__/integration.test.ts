/**
 * Integration tests — verify all 4 @agentojs packages work together.
 * Imports from core, medusa, woocommerce, and generic packages,
 * verifying types, instantiation, and CommerceBackend conformance.
 */
import { describe, it, expect, expectTypeOf, vi, afterEach } from 'vitest';

// ─── Core types ─────────────────────────────────────────────────────
import type {
  Product,
  Cart,
  Order,
  Collection,
  Region,
  CommerceBackend,
  PaginatedResponse,
  ProductSearchFilters,
  OrderListFilters,
  Address,
  ShippingOption,
  PaymentSession,
} from '@agentojs/core';

// ─── Adapter classes ────────────────────────────────────────────────
import { MedusaBackend, MedusaApiError } from '@agentojs/medusa';
import type { MedusaBackendConfig } from '@agentojs/medusa';

import { WooCommerceBackend, WooCommerceApiError } from '@agentojs/woocommerce';
import type { WooCommerceBackendConfig } from '@agentojs/woocommerce';

import {
  GenericRESTBackend,
  GenericFieldMapper,
  GenericBackendNotImplementedError,
  getField,
} from '@agentojs/generic';
import type { GenericRESTBackendConfig, GenericFieldMap } from '@agentojs/generic';

// ─── Helpers ────────────────────────────────────────────────────────
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockFetch(response: unknown, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => response,
    text: async () => JSON.stringify(response),
  });
}

// ─── Integration Tests ─────────────────────────────────────────────

describe('Cross-package integration', () => {
  // ── MedusaBackend ───────────────────────────────────────────────
  describe('MedusaBackend implements CommerceBackend', () => {
    const config: MedusaBackendConfig = {
      baseUrl: 'https://medusa.example.com',
      publishableApiKey: 'pk_test_123',
    };

    it('instantiates and satisfies CommerceBackend type', () => {
      const backend = new MedusaBackend(config);
      expectTypeOf(backend).toMatchTypeOf<CommerceBackend>();
      expect(backend).toBeDefined();
    });

    it('searchProducts returns PaginatedResponse<Product>', async () => {
      mockFetch({ regions: [{ id: 'reg_1', name: 'US', currency_code: 'usd', countries: [] }] });
      const backend = new MedusaBackend(config);

      // First call = getRegions (auto-detect), second = actual search
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true, status: 200,
          json: async () => ({ regions: [{ id: 'reg_1', name: 'US', currency_code: 'usd', countries: [] }] }),
        })
        .mockResolvedValueOnce({
          ok: true, status: 200,
          json: async () => ({
            products: [{ id: 'prod_1', title: 'Shirt', description: '', handle: 'shirt', thumbnail: null, images: [], variants: [], options: [], collection_id: null, categories: [], tags: [], status: 'published', metadata: {}, created_at: '', updated_at: '' }],
            count: 1,
            offset: 0,
            limit: 20,
          }),
        });

      const result = await backend.searchProducts({});
      expectTypeOf(result).toMatchTypeOf<PaginatedResponse<Product>>();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('prod_1');
    });

    it('exports MedusaApiError', () => {
      const error = new MedusaApiError('test', 404, 'not found');
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('test');
    });
  });

  // ── WooCommerceBackend ──────────────────────────────────────────
  describe('WooCommerceBackend implements CommerceBackend', () => {
    const config: WooCommerceBackendConfig = {
      baseUrl: 'https://shop.example.com',
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
    };

    it('instantiates and satisfies CommerceBackend type', () => {
      const backend = new WooCommerceBackend(config);
      expectTypeOf(backend).toMatchTypeOf<CommerceBackend>();
      expect(backend).toBeDefined();
    });

    it('searchProducts returns PaginatedResponse<Product>', async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true, status: 200,
        headers: new Map(),
        json: async () => ([{
          id: 42, name: 'WC Product', slug: 'wc-product', short_description: 'desc',
          permalink: '', images: [], prices: { price: '1999', currency_code: 'USD', currency_minor_unit: 2 },
          attributes: [], categories: [], tags: [],
          type: 'simple', variations: [],
        }]),
      });

      const backend = new WooCommerceBackend(config);
      const result = await backend.searchProducts({ q: 'product' });
      expectTypeOf(result).toMatchTypeOf<PaginatedResponse<Product>>();
      expect(result.data.length).toBeGreaterThanOrEqual(1);
    });

    it('exports WooCommerceApiError', () => {
      const error = new WooCommerceApiError('wc error', 500, 'internal');
      expect(error).toBeInstanceOf(Error);
    });
  });

  // ── GenericRESTBackend ──────────────────────────────────────────
  describe('GenericRESTBackend implements CommerceBackend', () => {
    const config: GenericRESTBackendConfig = {
      baseUrl: 'https://api.example.com',
      apiKey: 'key_123',
    };

    it('instantiates and satisfies CommerceBackend type', () => {
      const backend = new GenericRESTBackend(config);
      expectTypeOf(backend).toMatchTypeOf<CommerceBackend>();
      expect(backend).toBeDefined();
    });

    it('searchProducts returns PaginatedResponse<Product>', async () => {
      mockFetch({
        products: [{
          id: 'gen_1', title: 'Generic Item', description: 'A generic product',
          handle: 'generic-item', price: 29.99, currency: 'USD',
        }],
        total: 1,
      });

      const backend = new GenericRESTBackend(config);
      const result = await backend.searchProducts({});
      expectTypeOf(result).toMatchTypeOf<PaginatedResponse<Product>>();
      expect(result.data).toHaveLength(1);
    });

    it('exports GenericBackendNotImplementedError', () => {
      const error = new GenericBackendNotImplementedError('createPaymentSessions');
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('createPaymentSessions');
    });
  });

  // ── GenericFieldMapper ──────────────────────────────────────────
  describe('GenericFieldMapper works with core types', () => {
    it('maps raw API response to Product type', () => {
      const fieldMap: GenericFieldMap = {
        product: {
          title: 'vehicle_name',
          description: 'vehicle_description',
          handle: 'vin',
        },
      };
      const mapper = new GenericFieldMapper(fieldMap);
      const raw = {
        id: 'car_1',
        vehicle_name: '2024 Tesla Model 3',
        vehicle_description: 'Electric sedan',
        vin: '5YJ3E1EA1PF000001',
        price: 42990,
        currency: 'USD',
      };
      const product: Product = mapper.mapProduct(raw);
      expect(product.title).toBe('2024 Tesla Model 3');
      expect(product.description).toBe('Electric sedan');
      expect(product.handle).toBe('5YJ3E1EA1PF000001');
    });

    it('getField resolves dot-notation paths', () => {
      const data = { pricing: { retail: { amount: 42990 } } };
      expect(getField(data, 'pricing.retail.amount')).toBe(42990);
    });
  });

  // ── Cross-package type compatibility ────────────────────────────
  describe('Type compatibility across packages', () => {
    it('all adapters produce compatible Product types', async () => {
      // Verify at the type level that searchProducts returns the same Product type
      type MedusaProduct = Awaited<ReturnType<MedusaBackend['searchProducts']>>['data'][number];
      type WCProduct = Awaited<ReturnType<WooCommerceBackend['searchProducts']>>['data'][number];
      type GenericProduct = Awaited<ReturnType<GenericRESTBackend['searchProducts']>>['data'][number];

      expectTypeOf<MedusaProduct>().toMatchTypeOf<Product>();
      expectTypeOf<WCProduct>().toMatchTypeOf<Product>();
      expectTypeOf<GenericProduct>().toMatchTypeOf<Product>();
    });

    it('all adapters produce compatible Cart types', async () => {
      type MedusaCart = Awaited<ReturnType<MedusaBackend['createCart']>>;
      type WCCart = Awaited<ReturnType<WooCommerceBackend['createCart']>>;
      type GenericCart = Awaited<ReturnType<GenericRESTBackend['createCart']>>;

      expectTypeOf<MedusaCart>().toMatchTypeOf<Cart>();
      expectTypeOf<WCCart>().toMatchTypeOf<Cart>();
      expectTypeOf<GenericCart>().toMatchTypeOf<Cart>();
    });

    it('all adapters produce compatible Order types', async () => {
      type MedusaOrder = Awaited<ReturnType<MedusaBackend['completeCart']>>;
      type WCOrder = Awaited<ReturnType<WooCommerceBackend['completeCart']>>;
      type GenericOrder = Awaited<ReturnType<GenericRESTBackend['completeCart']>>;

      expectTypeOf<MedusaOrder>().toMatchTypeOf<Order>();
      expectTypeOf<WCOrder>().toMatchTypeOf<Order>();
      expectTypeOf<GenericOrder>().toMatchTypeOf<Order>();
    });

    it('a function accepting CommerceBackend works with any adapter', () => {
      // Simulate a consumer function that depends only on the interface
      async function getProductCount(backend: CommerceBackend): Promise<number> {
        const result = await backend.searchProducts({ limit: 1 });
        return result.count;
      }

      // Type-level: all adapters are assignable to CommerceBackend parameter
      expectTypeOf(getProductCount).parameter(0).toMatchTypeOf<CommerceBackend>();

      const medusa = new MedusaBackend({ baseUrl: 'http://x', publishableApiKey: 'k' });
      const woo = new WooCommerceBackend({ baseUrl: 'http://x', consumerKey: 'k', consumerSecret: 's' });
      const generic = new GenericRESTBackend({ baseUrl: 'http://x' });

      // Runtime: all instances are valid arguments (just checking they don't throw on type)
      expectTypeOf(medusa).toMatchTypeOf<Parameters<typeof getProductCount>[0]>();
      expectTypeOf(woo).toMatchTypeOf<Parameters<typeof getProductCount>[0]>();
      expectTypeOf(generic).toMatchTypeOf<Parameters<typeof getProductCount>[0]>();
    });
  });

  // ── All 19 CommerceBackend methods exist on every adapter ───────
  describe('All CommerceBackend methods exist on every adapter', () => {
    const methods: (keyof CommerceBackend)[] = [
      'searchProducts', 'getProduct', 'getCollections', 'getCollection',
      'createCart', 'getCart', 'updateCart', 'addLineItem', 'removeLineItem',
      'getShippingOptions', 'addShippingMethod',
      'createPaymentSessions', 'selectPaymentSession', 'initializePayment', 'completeCart',
      'getOrder', 'listOrders',
      'getRegions',
      'healthCheck',
    ];

    it('MedusaBackend has all 19 methods', () => {
      const backend = new MedusaBackend({ baseUrl: 'http://x', publishableApiKey: 'k' });
      for (const method of methods) {
        expect(typeof (backend as any)[method]).toBe('function');
      }
    });

    it('WooCommerceBackend has all 19 methods', () => {
      const backend = new WooCommerceBackend({ baseUrl: 'http://x', consumerKey: 'k', consumerSecret: 's' });
      for (const method of methods) {
        expect(typeof (backend as any)[method]).toBe('function');
      }
    });

    it('GenericRESTBackend has all 19 methods', () => {
      const backend = new GenericRESTBackend({ baseUrl: 'http://x' });
      for (const method of methods) {
        expect(typeof (backend as any)[method]).toBe('function');
      }
    });
  });
});
