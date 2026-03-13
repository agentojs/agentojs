import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { Injectable, Module } from '@nestjs/common';
import type { CommerceProvider, StoreInfo } from '@agentojs/core';
import { AgentOJSModule } from '../agentojs.module.js';
import { AgentOJSHealthIndicator } from '../agentojs-health.indicator.js';
import { AGENTOJS_OPTIONS } from '../constants.js';
import type { AgentOJSModuleOptions } from '../types.js';

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

function createMockProvider(healthy = true): CommerceProvider {
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
    healthCheck: vi.fn().mockResolvedValue(healthy),
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

// ── Fake ConfigService for useFactory tests ─────────────────────────
@Injectable()
class FakeConfigService {
  private data: Record<string, string>;

  constructor() {
    this.data = {
      STORE_SLUG: 'async-store',
      STORE_NAME: 'Async Store',
      BACKEND_URL: 'https://async.example.com',
    };
  }

  get(key: string): string {
    return this.data[key] ?? '';
  }
}

@Module({
  providers: [FakeConfigService],
  exports: [FakeConfigService],
})
class FakeConfigModule {}

// ── Tests ───────────────────────────────────────────────────────────

describe('AgentOJSModule.registerAsync()', () => {
  let provider: CommerceProvider;

  beforeEach(() => {
    provider = createMockProvider();
    vi.clearAllMocks();
  });

  it('compiles with useFactory', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AgentOJSModule.registerAsync({
          useFactory: () => ({
            store: createMockStore(),
            provider,
          }),
        }),
      ],
    }).compile();

    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  });

  it('provides AGENTOJS_OPTIONS via useFactory', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AgentOJSModule.registerAsync({
          useFactory: () => ({
            store: createMockStore(),
            provider,
          }),
        }),
      ],
    }).compile();

    const options = moduleRef.get<AgentOJSModuleOptions>(AGENTOJS_OPTIONS);
    expect(options.store.slug).toBe('test-store');
    expect(options.provider).toBe(provider);
    await moduleRef.close();
  });

  it('injects dependencies into useFactory', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AgentOJSModule.registerAsync({
          imports: [FakeConfigModule],
          useFactory: (config: FakeConfigService) => ({
            store: {
              slug: config.get('STORE_SLUG'),
              name: config.get('STORE_NAME'),
              currency: 'usd',
              country: 'us',
              backendUrl: config.get('BACKEND_URL'),
            },
            provider,
          }),
          inject: [FakeConfigService],
        }),
      ],
    }).compile();

    const options = moduleRef.get<AgentOJSModuleOptions>(AGENTOJS_OPTIONS);
    expect(options.store.slug).toBe('async-store');
    expect(options.store.name).toBe('Async Store');
    expect(options.store.backendUrl).toBe('https://async.example.com');
    await moduleRef.close();
  });

  it('supports async useFactory', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AgentOJSModule.registerAsync({
          useFactory: async () => {
            // Simulate async config loading
            await new Promise((r) => setTimeout(r, 10));
            return {
              store: createMockStore(),
              provider,
              enableMcp: true,
              enableUcp: false,
            };
          },
        }),
      ],
    }).compile();

    const options = moduleRef.get<AgentOJSModuleOptions>(AGENTOJS_OPTIONS);
    expect(options.enableMcp).toBe(true);
    expect(options.enableUcp).toBe(false);
    await moduleRef.close();
  });

  it('creates NestJS app with registerAsync', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AgentOJSModule.registerAsync({
          useFactory: () => ({
            store: createMockStore(),
            provider,
          }),
        }),
      ],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();
    expect(app).toBeDefined();
    await app.close();
  });
});

describe('AgentOJSHealthIndicator', () => {
  it('returns healthy result when provider is healthy', async () => {
    const provider = createMockProvider(true);

    const moduleRef = await Test.createTestingModule({
      imports: [
        AgentOJSModule.register({
          store: createMockStore(),
          provider,
        }),
      ],
      providers: [AgentOJSHealthIndicator],
    }).compile();

    const indicator = moduleRef.get(AgentOJSHealthIndicator);
    const result = await indicator.check('commerce');

    expect(result).toEqual({
      commerce: { status: 'up' },
    });
    expect(provider.healthCheck).toHaveBeenCalled();

    await moduleRef.close();
  });

  it('throws HealthCheckError when provider is unhealthy', async () => {
    const provider = createMockProvider(false);

    const moduleRef = await Test.createTestingModule({
      imports: [
        AgentOJSModule.register({
          store: createMockStore(),
          provider,
        }),
      ],
      providers: [AgentOJSHealthIndicator],
    }).compile();

    const indicator = moduleRef.get(AgentOJSHealthIndicator);

    await expect(indicator.check('commerce')).rejects.toThrow('AgentOJS health check failed');
    expect(provider.healthCheck).toHaveBeenCalled();

    await moduleRef.close();
  });

  it('throws HealthCheckError when provider throws', async () => {
    const provider = createMockProvider(true);
    (provider.healthCheck as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Connection refused'));

    const moduleRef = await Test.createTestingModule({
      imports: [
        AgentOJSModule.register({
          store: createMockStore(),
          provider,
        }),
      ],
      providers: [AgentOJSHealthIndicator],
    }).compile();

    const indicator = moduleRef.get(AgentOJSHealthIndicator);

    await expect(indicator.check()).rejects.toThrow('AgentOJS health check failed');

    await moduleRef.close();
  });

  it('uses default key "agentojs" when none provided', async () => {
    const provider = createMockProvider(true);

    const moduleRef = await Test.createTestingModule({
      imports: [
        AgentOJSModule.register({
          store: createMockStore(),
          provider,
        }),
      ],
      providers: [AgentOJSHealthIndicator],
    }).compile();

    const indicator = moduleRef.get(AgentOJSHealthIndicator);
    const result = await indicator.check();

    expect(result).toEqual({
      agentojs: { status: 'up' },
    });

    await moduleRef.close();
  });
});
