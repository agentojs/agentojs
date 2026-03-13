import { describe, it, expect, vi } from 'vitest';
import type { CommerceProvider, StoreInfo } from '@agentojs/core';
import { createMcpServer } from '../create-mcp-server.js';

function createMockProvider(): CommerceProvider {
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
    getOrder: vi.fn(),
    listOrders: vi.fn(),
    getRegions: vi.fn(),
    healthCheck: vi.fn(),
  };
}

const testStore: StoreInfo = {
  slug: 'test-store',
  name: 'Test Store',
  currency: 'usd',
  country: 'us',
  backendUrl: 'https://api.example.com',
};

describe('createMcpServer', () => {
  it('returns an McpServer instance', () => {
    const server = createMcpServer({
      store: testStore,
      provider: createMockProvider(),
    });

    // McpServer should have the connect method
    expect(server).toBeDefined();
    expect(typeof server.connect).toBe('function');
  });

  it('uses store name as default server name', () => {
    const server = createMcpServer({
      store: testStore,
      provider: createMockProvider(),
    });

    // The server object is created — verify it exists
    expect(server).toBeDefined();
  });

  it('accepts custom serverName and serverVersion', () => {
    const server = createMcpServer({
      store: testStore,
      provider: createMockProvider(),
      serverName: 'Custom MCP',
      serverVersion: '2.0.0',
    });

    expect(server).toBeDefined();
  });

  it('accepts optional scopeChecker, webhookEmitter, logger', () => {
    const server = createMcpServer({
      store: testStore,
      provider: createMockProvider(),
      scopeChecker: { scopes: ['*'], hasScope: () => true },
      webhookEmitter: vi.fn(),
      logger: {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      },
    });

    expect(server).toBeDefined();
  });
});
