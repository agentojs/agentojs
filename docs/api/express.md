# @agentojs/express

Unified Express middleware that mounts all three AI commerce protocols (MCP, UCP, ACP) on a single router.

## Installation

```bash
npm install @agentojs/express @agentojs/core @agentojs/mcp @agentojs/ucp @agentojs/acp
```

## `agentMiddleware(options)`

Creates a single Express router that mounts all enabled protocol handlers:

- **`/mcp`** — MCP StreamableHTTP server (POST/GET/DELETE) for Claude
- **`/ucp/*`** — UCP REST endpoints for Gemini
- **`/acp/*`** — ACP REST endpoints + Stripe webhooks for ChatGPT

```ts
import express from 'express';
import { agentMiddleware } from '@agentojs/express';
import { MedusaProvider } from '@agentojs/medusa';

const app = express();

app.use('/ai', agentMiddleware({
  store: {
    name: 'My Store',
    slug: 'my-store',
    currency: 'usd',
    country: 'us',
    backendUrl: 'http://localhost:9000',
  },
  provider: new MedusaProvider({
    backendUrl: 'http://localhost:9000',
    apiKey: 'sk-medusa-key',
  }),
}));

app.listen(3100);
// MCP:  POST http://localhost:3100/ai/mcp
// UCP:  GET  http://localhost:3100/ai/ucp/products
// ACP:  POST http://localhost:3100/ai/acp/checkout_sessions
```

### `AgentMiddlewareOptions`

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `store` | `StoreInfo` | Yes | — | Store metadata (name, slug, currency, country, backendUrl) |
| `provider` | `CommerceProvider` | Yes | — | Commerce backend provider instance |
| `scopeChecker` | `ScopeChecker` | No | — | Function to check API key scopes |
| `webhookEmitter` | `WebhookEmitter` | No | — | Emits events on checkout/order completion |
| `logger` | `Logger` | No | — | Custom logger instance |
| `stripeSecretKey` | `string` | No | — | Stripe secret key (required for ACP payments) |
| `stripePublishableKey` | `string` | No | — | Stripe publishable key (returned to ChatGPT) |
| `stripeWebhookSecret` | `string` | No | — | Stripe webhook signing secret |
| `enableMcp` | `boolean` | No | `true` | Enable MCP protocol (Claude) |
| `enableUcp` | `boolean` | No | `true` | Enable UCP protocol (Gemini) |
| `enableAcp` | `boolean` | No | `true` | Enable ACP protocol (ChatGPT) |

**Returns:** Express `Router`.

## Protocol Enable/Disable

Selectively enable protocols based on your needs:

```ts
// Only MCP (Claude)
app.use('/ai', agentMiddleware({
  store, provider,
  enableMcp: true,
  enableUcp: false,
  enableAcp: false,
}));

// UCP + ACP (Gemini + ChatGPT), no MCP
app.use('/ai', agentMiddleware({
  store, provider,
  enableMcp: false,
}));
```

## `createMcpHandler(serverOptions, logger?)`

Lower-level factory that creates just the MCP StreamableHTTP handler. Used internally by `agentMiddleware` but available for custom setups.

```ts
import { createMcpHandler } from '@agentojs/express';

const mcpRouter = createMcpHandler({
  store: { name: 'My Store', slug: 'my-store', currency: 'usd', country: 'us', backendUrl: 'http://localhost:9000' },
  provider: myProvider,
});

app.use('/mcp', mcpRouter);
```

### MCP Session Lifecycle

The MCP handler manages the full StreamableHTTP session lifecycle:

1. **`POST /` (no `mcp-session-id` header)** — Creates a new session: instantiates `StreamableHTTPServerTransport`, creates and connects `McpServer`, stores in `McpSessionManager`
2. **`POST /` (with `mcp-session-id` header)** — Resumes existing session, forwards request to transport
3. **`GET /` (with `mcp-session-id` header)** — Opens SSE stream for server-initiated messages
4. **`DELETE /` (with `mcp-session-id` header)** — Closes and cleans up the session
5. **Transport `onclose`** — Automatically removes session from manager

**Returns:** Express `Router`.

## Mounted Routes Summary

When mounted at `/ai`, the full route tree is:

| Protocol | Method | Path | AI Agent |
|----------|--------|------|----------|
| MCP | `POST` | `/ai/mcp` | Claude |
| MCP | `GET` | `/ai/mcp` | Claude (SSE) |
| MCP | `DELETE` | `/ai/mcp` | Claude |
| UCP | `GET` | `/ai/ucp/products` | Gemini |
| UCP | `GET` | `/ai/ucp/products/:id` | Gemini |
| UCP | `GET` | `/ai/ucp/collections` | Gemini |
| UCP | `POST` | `/ai/ucp/carts` | Gemini |
| UCP | `GET/PATCH` | `/ai/ucp/carts/:id` | Gemini |
| UCP | `POST` | `/ai/ucp/carts/:id/items` | Gemini |
| UCP | `DELETE` | `/ai/ucp/carts/:id/items/:itemId` | Gemini |
| UCP | `GET/POST` | `/ai/ucp/carts/:id/shipping` | Gemini |
| UCP | `POST/GET/PATCH` | `/ai/ucp/checkout-sessions/*` | Gemini |
| UCP | `GET` | `/ai/ucp/orders/:id` | Gemini |
| UCP | `GET` | `/ai/ucp/.well-known/ucp` | Gemini |
| ACP | `POST/GET/PATCH/DELETE` | `/ai/acp/checkout_sessions/*` | ChatGPT |
| ACP | `GET` | `/ai/acp/feed` | ChatGPT |
| ACP | `POST` | `/ai/acp/webhooks/stripe` | Stripe |

## Full Express App Example

```ts
import express from 'express';
import { agentMiddleware } from '@agentojs/express';
import { MedusaProvider } from '@agentojs/medusa';

const app = express();

const provider = new MedusaProvider({
  backendUrl: process.env.MEDUSA_URL || 'http://localhost:9000',
  apiKey: process.env.MEDUSA_API_KEY || '',
});

const store = {
  name: 'Gytis Autek AS',
  slug: 'gytis-autek',
  currency: 'nok',
  country: 'no',
  backendUrl: process.env.MEDUSA_URL || 'http://localhost:9000',
};

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Mount all AI protocols at /ai
app.use('/ai', agentMiddleware({
  store,
  provider,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
}));

app.listen(3100, () => {
  console.log('AgentOJS server running on http://localhost:3100');
  console.log('  MCP (Claude):  POST http://localhost:3100/ai/mcp');
  console.log('  UCP (Gemini):  GET  http://localhost:3100/ai/ucp/products');
  console.log('  ACP (ChatGPT): POST http://localhost:3100/ai/acp/checkout_sessions');
});
```

::: tip
For the simplest setup, use [`createAgent()`](/guide/getting-started) from `@agentojs/core` which wraps `agentMiddleware` and handles Express app creation automatically.
:::
