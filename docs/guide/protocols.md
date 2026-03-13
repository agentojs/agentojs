# Protocol Integration

AgentOJS supports three AI commerce protocols, each targeting a different AI agent ecosystem:

| Protocol | AI Agent | Transport | Package |
|----------|----------|-----------|---------|
| **MCP** | Claude (Anthropic) | StreamableHTTP (JSON-RPC) | `@agentojs/mcp` |
| **UCP** | Gemini (Google) | REST endpoints | `@agentojs/ucp` |
| **ACP** | ChatGPT (OpenAI) | REST + Stripe checkout | `@agentojs/acp` |

## Using createAgent() (Recommended)

The simplest way to enable all protocols is via `createAgent()`:

```typescript
import { createAgent } from '@agentojs/core';
import { MedusaProvider } from '@agentojs/medusa';

const agent = await createAgent({
  store: {
    name: 'My Store',
    slug: 'my-store',
    currency: 'usd',
    country: 'us',
    backendUrl: 'https://your-medusa-store.com',
  },
  provider: new MedusaProvider({
    backendUrl: 'https://your-medusa-store.com',
    apiKey: 'pk_key',
  }),
  // All three protocols enabled by default
  enableMcp: true,
  enableUcp: true,
  enableAcp: true,
});

await agent.start(3100);
// MCP → http://localhost:3100/mcp
// UCP → http://localhost:3100/ucp/*
// ACP → http://localhost:3100/acp/*
```

### Disabling Protocols

Disable protocols you don't need:

```typescript
const agent = await createAgent({
  store: { /* ... */ },
  provider: myProvider,
  enableMcp: true,
  enableUcp: false,  // disable UCP
  enableAcp: false,  // disable ACP
});
```

## MCP — Model Context Protocol

MCP is Claude's native protocol. It exposes your store as **tools** (actions the AI can take) and **resources** (data the AI can read).

### What Gets Exposed

**15 Tools:**

| Category | Tools |
|----------|-------|
| Products | `search_products`, `get_product`, `get_collections` |
| Cart | `create_cart`, `get_cart`, `update_cart`, `add_to_cart`, `remove_from_cart`, `get_shipping_options`, `set_shipping_method` |
| Checkout | `create_payment`, `complete_checkout` |
| Orders | `get_order`, `list_orders`, `get_order_details` |

**3 Resources:**

| URI | Description |
|-----|-------------|
| `store://info` | Store name, slug, currency, country |
| `store://policies` | Shipping, return, privacy policies |
| `store://agent-guide` | Instructions for AI agents |

### Standalone Usage

Use `@agentojs/mcp` directly without `createAgent()` or Express:

```typescript
import { createMcpServer, McpSessionManager } from '@agentojs/mcp';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

const server = createMcpServer({
  store: { slug: 'my-store', name: 'My Store', currency: 'usd', country: 'us', backendUrl: '...' },
  provider: myProvider,
});

// Create a transport for each session
const sessionManager = new McpSessionManager();

// In your HTTP handler:
const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID() });
await server.connect(transport);
```

See the [MCP API Reference](/api/mcp) for the full `McpServerOptions` interface.

## UCP — Universal Checkout Protocol

UCP is Google's REST-based protocol for Gemini agents. It provides standard REST endpoints for product discovery, cart management, and checkout.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/ucp/products` | Search products |
| GET | `/ucp/products/:id` | Get product by ID |
| GET | `/ucp/collections` | List collections |
| POST | `/ucp/carts` | Create cart |
| GET | `/ucp/carts/:id` | Get cart |
| PATCH | `/ucp/carts/:id` | Update cart |
| POST | `/ucp/carts/:id/items` | Add line item |
| DELETE | `/ucp/carts/:id/items/:itemId` | Remove line item |
| GET | `/ucp/carts/:id/shipping` | Get shipping options |
| POST | `/ucp/carts/:id/shipping` | Set shipping method |
| POST | `/ucp/checkout-sessions` | Create checkout session |
| GET | `/ucp/checkout-sessions/:id` | Get checkout session |
| PATCH | `/ucp/checkout-sessions/:id` | Update checkout session |
| POST | `/ucp/checkout-sessions/:id/complete` | Complete checkout |
| GET | `/ucp/orders/:id` | Get order |
| GET | `/ucp/.well-known/ucp` | Discovery document |

### Standalone Usage

Use `@agentojs/ucp` directly as an Express router:

```typescript
import express from 'express';
import { createUcpRouter } from '@agentojs/ucp';

const app = express();
app.use(express.json());

app.use('/ucp', createUcpRouter({
  provider: myProvider,
  store: { slug: 'my-store', name: 'My Store', currency: 'usd', country: 'us', backendUrl: '...' },
}));

app.listen(3100);
```

See the [UCP API Reference](/api/ucp) for the full `UcpRouterOptions` interface.

## ACP — Agent Commerce Protocol

ACP is OpenAI's protocol for ChatGPT shopping. It provides checkout sessions, a product feed for indexing, and optional Stripe payment integration.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/acp/checkout_sessions` | Create checkout session |
| GET | `/acp/checkout_sessions/:id` | Get session |
| PATCH | `/acp/checkout_sessions/:id` | Update session |
| POST | `/acp/checkout_sessions/:id/complete` | Complete checkout |
| DELETE | `/acp/checkout_sessions/:id` | Cancel session |
| GET | `/acp/feed` | Product feed (for OpenAI crawling) |
| POST | `/acp/webhooks/stripe` | Stripe webhook |

### Stripe Integration

ACP optionally integrates with Stripe for payment processing:

```typescript
const agent = await createAgent({
  store: { /* ... */ },
  provider: myProvider,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
});
```

Without Stripe keys, checkout sessions still work but without payment verification.

### Standalone Usage

Use `@agentojs/acp` directly as an Express router:

```typescript
import express from 'express';
import { createAcpRouter } from '@agentojs/acp';

const app = express();
app.use(express.json());

app.use('/acp', createAcpRouter({
  provider: myProvider,
  store: { slug: 'my-store', name: 'My Store', currency: 'usd', country: 'us', backendUrl: '...' },
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
}));

app.listen(3100);
```

See the [ACP API Reference](/api/acp) for the full `AcpRouterOptions` interface.

## Express Middleware

The `@agentojs/express` package provides `agentMiddleware()` — a single Express router that mounts all three protocols:

```typescript
import express from 'express';
import { agentMiddleware } from '@agentojs/express';

const app = express();

app.use(agentMiddleware({
  store: { slug: 'my-store', name: 'My Store', currency: 'usd', country: 'us', backendUrl: '...' },
  provider: myProvider,
  enableMcp: true,
  enableUcp: true,
  enableAcp: true,
}));

app.listen(3100);
// /mcp, /ucp/*, /acp/* all mounted
```

This is what `createAgent()` uses internally. Use `agentMiddleware()` directly when you need to add protocols to an existing Express app.

See the [Express API Reference](/api/express) for the full `AgentMiddlewareOptions` interface.

## Protocol Comparison

| Feature | MCP | UCP | ACP |
|---------|-----|-----|-----|
| AI Agent | Claude | Gemini | ChatGPT |
| Transport | JSON-RPC over HTTP | REST | REST |
| Product Discovery | Tools (search, browse) | GET endpoints | Product feed |
| Cart | Tools (create, add, remove) | CRUD endpoints | Checkout sessions |
| Checkout | Tools (pay, complete) | Session-based | Session + Stripe |
| Discovery | Resource URIs | `/.well-known/ucp` | Product feed URL |
| Stateless | Per-session | Per-session | Session + idempotency |
