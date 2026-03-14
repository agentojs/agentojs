# Testing

A guide to testing AgentOJS integrations — mock providers, protocol endpoints, and MCP tools.

## Unit Testing Providers

Create a mock `CommerceProvider` to test your application logic without hitting a real commerce backend:

```ts
import { describe, it, expect, vi } from 'vitest';
import type { CommerceProvider } from '@agentojs/core';

function createMockProvider(): CommerceProvider {
  return {
    searchProducts: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'prod_1',
          title: 'Test Shirt',
          description: 'A test shirt',
          handle: 'test-shirt',
          thumbnail: 'https://example.com/shirt.jpg',
          variants: [{
            id: 'var_1',
            title: 'Small',
            sku: 'TSH-S',
            prices: [{ id: 'p1', amount: 1999, currency_code: 'usd' }],
            options: { size: 'S' },
            inventory_quantity: 10,
          }],
          options: [],
          categories: [],
          tags: [],
          images: [],
          collection_id: null,
          status: 'published' as const,
          metadata: {},
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
        },
      ],
      count: 1,
      offset: 0,
      limit: 20,
    }),
    getProduct: vi.fn(),
    getCollections: vi.fn().mockResolvedValue([]),
    getCollection: vi.fn(),
    createCart: vi.fn(),
    getCart: vi.fn(),
    updateCart: vi.fn(),
    addLineItem: vi.fn(),
    removeLineItem: vi.fn(),
    getShippingOptions: vi.fn().mockResolvedValue([]),
    addShippingMethod: vi.fn(),
    createPaymentSessions: vi.fn(),
    selectPaymentSession: vi.fn(),
    initializePayment: vi.fn(),
    completeCart: vi.fn(),
    getOrder: vi.fn(),
    listOrders: vi.fn().mockResolvedValue({ data: [], count: 0, offset: 0, limit: 20 }),
    getRegions: vi.fn().mockResolvedValue([]),
    healthCheck: vi.fn().mockResolvedValue(true),
  };
}
```

Use this mock in your tests:

```ts
describe('my product service', () => {
  it('returns products from the provider', async () => {
    const provider = createMockProvider();
    const result = await provider.searchProducts({ q: 'shirt' });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].title).toBe('Test Shirt');
    expect(provider.searchProducts).toHaveBeenCalledWith({ q: 'shirt' });
  });
});
```

## Testing with GenericRESTProvider

Use [fakestoreapi.com](https://fakestoreapi.com/) for integration tests against a real REST API:

```ts
import { describe, it, expect } from 'vitest';
import { GenericRESTProvider } from '@agentojs/generic';

describe('GenericRESTProvider integration', () => {
  const provider = new GenericRESTProvider({
    baseUrl: 'https://fakestoreapi.com',
    apiKey: '',
    fieldMap: {
      product: {
        title: 'title',
        description: 'description',
      },
    },
  });

  it('fetches real products', async () => {
    const result = await provider.searchProducts({ limit: 5 });
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0].title).toBeDefined();
  });
});
```

## Testing MCP Tools

Create a mock MCP server to capture tool registrations and call handlers programmatically:

```ts
import { describe, it, expect, vi } from 'vitest';
import { createMcpServer } from '@agentojs/mcp';
import type { CommerceProvider, StoreInfo } from '@agentojs/core';

const testStore: StoreInfo = {
  slug: 'test-store',
  name: 'Test Store',
  currency: 'usd',
  country: 'us',
  backendUrl: 'https://api.example.com',
};

describe('MCP Server', () => {
  it('creates a server with tools', () => {
    const provider = createMockProvider();
    const server = createMcpServer({
      store: testStore,
      provider,
    });

    expect(server).toBeDefined();
    expect(typeof server.connect).toBe('function');
  });
});
```

To test individual tool handlers, capture registrations with a mock server:

```ts
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

it('search_products tool returns formatted products', async () => {
  const server = createMockServer();
  const provider = createMockProvider();

  // Register tools on the mock server
  registerProductTools(server as any, provider);

  // Call the handler directly
  const handler = server.getHandler('search_products')!;
  const result = await handler({ query: 'shirt', limit: 20, offset: 0 });

  expect(result.isError).toBeUndefined();
  expect(result.content).toHaveLength(1);
  const data = JSON.parse(result.content[0].text);
  expect(data.products).toHaveLength(1);
});
```

## Testing UCP Endpoints

Use [supertest](https://www.npmjs.com/package/supertest) to test UCP REST endpoints:

```ts
import express from 'express';
import request from 'supertest';
import { createUcpRouter } from '@agentojs/ucp';

describe('UCP endpoints', () => {
  let app: ReturnType<typeof express>;

  beforeEach(() => {
    const provider = createMockProvider();
    app = express();
    app.use(express.json());
    app.use('/', createUcpRouter({
      provider,
      store: testStore,
    }));
  });

  it('GET /products returns product list', async () => {
    const res = await request(app).get('/products');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('products');
    expect(res.body.products).toHaveLength(1);
  });

  it('GET /products?q=test passes search query', async () => {
    const res = await request(app).get('/products?q=test&limit=5');
    expect(res.status).toBe(200);
  });

  it('POST /carts creates a new cart', async () => {
    const res = await request(app)
      .post('/carts')
      .send({ items: [{ variant_id: 'var_1', quantity: 1 }] });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('cart');
  });

  it('GET /.well-known/ucp returns discovery document', async () => {
    const res = await request(app).get('/.well-known/ucp');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ucp_version', '1.0');
    expect(res.body).toHaveProperty('merchant');
  });
});
```

## Testing ACP Endpoints

ACP requires specific headers on all requests:

```ts
import express from 'express';
import request from 'supertest';
import { createAcpRouter } from '@agentojs/acp';

const acpHeaders = {
  'idempotency-key': 'idem-123',
  'request-id': 'req-123',
  'api-version': '2025-09-12',
};

describe('ACP endpoints', () => {
  let app: ReturnType<typeof express>;

  beforeEach(() => {
    const provider = createMockProvider();
    app = express();
    app.use(express.json());
    app.use('/', createAcpRouter({
      provider,
      store: testStore,
    }));
  });

  it('GET /feed returns product feed', async () => {
    const res = await request(app).get('/feed');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('item_id');
    expect(res.body[0]).toHaveProperty('price');
  });

  it('POST /checkout_sessions creates a session', async () => {
    const res = await request(app)
      .post('/checkout_sessions')
      .set(acpHeaders)
      .send({
        items: [{ id: 'var_1', quantity: 1 }],
        buyer: { email: 'buyer@example.com' },
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('status');
  });

  it('returns 400 without required ACP headers', async () => {
    const res = await request(app)
      .post('/checkout_sessions')
      .send({ items: [{ id: 'var_1', quantity: 1 }] });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('code', 'missing_headers');
  });
});
```

## Mocking Strategies

### Mocking `fetch` for Provider Tests

All AgentOJS providers use `globalThis.fetch`. Mock it in tests:

```ts
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockFetch(data: unknown, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  });
}

it('fetches products from Medusa', async () => {
  mockFetch({
    products: [{ id: 'prod_1', title: 'Shirt' }],
    count: 1,
    offset: 0,
    limit: 20,
  });

  const provider = new MedusaProvider({
    backendUrl: 'https://medusa.example.com',
    apiKey: 'pk_test_123',
    regionId: 'reg_1',
  });
  const result = await provider.searchProducts({});
  expect(result.data[0].title).toBe('Shirt');
});
```

### Mocking with `vitest.mock`

For module-level mocking:

```ts
vi.mock('@agentojs/core', async () => {
  const actual = await vi.importActual('@agentojs/core');
  return {
    ...actual,
    ConsoleLogger: vi.fn().mockImplementation(() => ({
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  };
});
```

### Scope Checker Testing

Test authorization by providing a restricted `ScopeChecker`:

```ts
import type { ScopeChecker } from '@agentojs/core';

const restrictedChecker: ScopeChecker = {
  scopes: ['orders:read'],
  hasScope(scope: string) {
    return this.scopes.includes('*') || this.scopes.includes(scope);
  },
};

it('returns 403 when scope is denied', async () => {
  const app = express();
  app.use('/', createUcpRouter({
    provider: createMockProvider(),
    store: testStore,
    scopeChecker: restrictedChecker,
  }));

  const res = await request(app).get('/products');
  expect(res.status).toBe(403);
});
```

## Running Tests

AgentOJS uses [Vitest](https://vitest.dev/) for testing:

```bash
# Run all tests
npx vitest run

# Run tests in watch mode
npx vitest

# Run tests for a specific package
npx vitest run packages/medusa

# Run with coverage
npx vitest run --coverage
```

::: tip
Test files are excluded from the build by default — `tsconfig.json` in each package has `"exclude": ["src/**/*.test.ts", "src/__tests__"]`.
:::
