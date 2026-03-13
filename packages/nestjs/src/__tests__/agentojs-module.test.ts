import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import type { CommerceProvider, StoreInfo } from '@agentojs/core';
import { AgentOJSModule } from '../agentojs.module.js';
import { AgentOJSMiddleware } from '../agentojs.middleware.js';
import { AGENTOJS_OPTIONS } from '../constants.js';

// ── Mock agentMiddleware from @agentojs/express ─────────────────────
vi.mock('@agentojs/express', () => {
  const { Router } = require('express');
  return {
    agentMiddleware: vi.fn(() => {
      const router = Router();
      router.get('/health', (_req: unknown, res: { json: (data: unknown) => void }) => {
        res.json({ status: 'ok' });
      });
      return router;
    }),
  };
});

function createMockProvider(): CommerceProvider {
  return {
    searchProducts: vi.fn().mockResolvedValue({ data: [], count: 0, offset: 0, limit: 20 }),
    getProduct: vi.fn().mockResolvedValue({ id: 'prod_1' }),
    getCollections: vi.fn().mockResolvedValue([]),
    getCollection: vi.fn().mockResolvedValue(null),
    createCart: vi.fn().mockResolvedValue({ id: 'cart_1', items: [], total: 0 }),
    getCart: vi.fn().mockResolvedValue({ id: 'cart_1', items: [], total: 0 }),
    updateCart: vi.fn().mockResolvedValue({ id: 'cart_1', items: [], total: 0 }),
    addToCart: vi.fn().mockResolvedValue({ id: 'cart_1', items: [], total: 0 }),
    removeFromCart: vi.fn().mockResolvedValue({ id: 'cart_1', items: [], total: 0 }),
    getShippingOptions: vi.fn().mockResolvedValue([]),
    selectShippingOption: vi.fn().mockResolvedValue({ id: 'cart_1', items: [], total: 0 }),
    createPaymentSession: vi.fn().mockResolvedValue({ id: 'pay_1', status: 'pending' }),
    completeCheckout: vi.fn().mockResolvedValue({ id: 'order_1', status: 'pending' }),
    listOrders: vi.fn().mockResolvedValue({ data: [], count: 0, offset: 0, limit: 20 }),
    getOrder: vi.fn().mockResolvedValue({ id: 'order_1', status: 'pending' }),
    getRegions: vi.fn().mockResolvedValue([]),
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

describe('AgentOJSModule', () => {
  let provider: CommerceProvider;
  let store: StoreInfo;

  beforeEach(() => {
    provider = createMockProvider();
    store = createMockStore();
    vi.clearAllMocks();
  });

  describe('register()', () => {
    it('compiles the module successfully', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          AgentOJSModule.register({ store, provider }),
        ],
      }).compile();

      expect(moduleRef).toBeDefined();
      await moduleRef.close();
    });

    it('provides AGENTOJS_OPTIONS token', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          AgentOJSModule.register({ store, provider }),
        ],
      }).compile();

      const options = moduleRef.get(AGENTOJS_OPTIONS);
      expect(options).toBeDefined();
      expect(options.store.slug).toBe('test-store');
      expect(options.provider).toBe(provider);
      await moduleRef.close();
    });

    it('creates AgentOJSMiddleware instance', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          AgentOJSModule.register({ store, provider }),
        ],
      }).compile();

      const middleware = moduleRef.get(AgentOJSMiddleware);
      expect(middleware).toBeDefined();
      expect(middleware).toBeInstanceOf(AgentOJSMiddleware);
      await moduleRef.close();
    });

    it('middleware has use() method', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          AgentOJSModule.register({ store, provider }),
        ],
      }).compile();

      const middleware = moduleRef.get(AgentOJSMiddleware);
      expect(typeof middleware.use).toBe('function');
      await moduleRef.close();
    });

    it('passes options to agentMiddleware from @agentojs/express', async () => {
      const { agentMiddleware } = await import('@agentojs/express');

      const moduleRef = await Test.createTestingModule({
        imports: [
          AgentOJSModule.register({
            store,
            provider,
            enableMcp: true,
            enableUcp: false,
            enableAcp: false,
          }),
        ],
      }).compile();

      // agentMiddleware should have been called during middleware construction
      expect(agentMiddleware).toHaveBeenCalledWith(
        expect.objectContaining({
          store,
          provider,
          enableMcp: true,
          enableUcp: false,
          enableAcp: false,
        }),
      );

      await moduleRef.close();
    });

    it('uses default basePath /ai', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          AgentOJSModule.register({ store, provider }),
        ],
      }).compile();

      const options = moduleRef.get(AGENTOJS_OPTIONS);
      expect(options.basePath).toBeUndefined(); // defaults to /ai in configure()
      await moduleRef.close();
    });

    it('accepts custom basePath', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          AgentOJSModule.register({ store, provider, basePath: '/api/agent' }),
        ],
      }).compile();

      const options = moduleRef.get(AGENTOJS_OPTIONS);
      expect(options.basePath).toBe('/api/agent');
      await moduleRef.close();
    });

    it('creates NestJS application with middleware applied', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          AgentOJSModule.register({ store, provider }),
        ],
      }).compile();

      const app: INestApplication = moduleRef.createNestApplication();
      await app.init();

      // App initializes without error — middleware is configured
      expect(app).toBeDefined();

      await app.close();
    });
  });
});
