# @agentojs/ucp

[![npm version](https://img.shields.io/npm/v/@agentojs/ucp.svg)](https://www.npmjs.com/package/@agentojs/ucp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/agentojs/agentojs/blob/main/LICENSE)

UCP (Universal Checkout Protocol) adapter for AgentOJS -- exposes your commerce backend via Google's Universal Checkout Protocol for Gemini and other UCP-compatible AI agents.

Part of the [AgentOJS](https://github.com/agentojs/agentojs) monorepo.

## Installation

```bash
npm install @agentojs/ucp @agentojs/core
# or
pnpm add @agentojs/ucp @agentojs/core
```

## Quick Start

```typescript
import express from 'express';
import { createUcpRouter } from '@agentojs/ucp';
import { MedusaBackend } from '@agentojs/medusa';

const app = express();

const provider = new MedusaBackend({
  backendUrl: 'https://your-medusa-store.com',
  apiKey: 'pk_your_publishable_key',
});

const ucpRouter = createUcpRouter({
  store: { slug: 'my-store', name: 'My Store', currency: 'usd', country: 'us', backendUrl: 'https://your-medusa-store.com' },
  provider,
});

app.use('/ucp', ucpRouter);
app.listen(3000);
```

## createUcpRouter Options

```typescript
interface UcpRouterOptions {
  /** Store metadata (slug, name, currency, country, backendUrl). */
  store: StoreInfo;
  /** CommerceProvider implementation. */
  provider: CommerceProvider;
  /** Optional scope checker for endpoint access control. */
  scopeChecker?: ScopeChecker;
  /** Optional logger. */
  logger?: Logger;
}
```

## UCP Endpoints

The router exposes the following REST endpoints:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/checkout/sessions` | Create a new checkout session |
| GET | `/checkout/sessions/:id` | Get session status |
| PATCH | `/checkout/sessions/:id` | Update session (buyer info, fulfillment) |
| POST | `/checkout/sessions/:id/confirm` | Confirm and complete checkout |
| GET | `/products` | Browse product catalog |
| GET | `/products/:id` | Get product details |
| GET | `/fulfillment-options` | List available shipping options |

## Session Management

```typescript
import { UcpSessionManager } from '@agentojs/ucp';

const sessions = new UcpSessionManager();
// Manages checkout session lifecycle in-memory
```

## Response Formatting

```typescript
import { UcpResponseFormatter } from '@agentojs/ucp';

// Converts internal types to UCP-compliant response shapes
```

## Scope Middleware

```typescript
import { requireScope } from '@agentojs/ucp';

// Express middleware that checks scopes before handler execution
router.get('/products', requireScope('products:read', scopeChecker), handler);
```

## Using with createAgent

The simplest way to run a UCP server (plus MCP and ACP) is via `createAgent`:

```typescript
import { createAgent } from '@agentojs/core';
import { MedusaBackend } from '@agentojs/medusa';

const agent = await createAgent({
  store: { slug: 'my-store', name: 'My Store', currency: 'usd', country: 'us', backendUrl: 'https://your-medusa-store.com' },
  provider: new MedusaBackend({ backendUrl: 'https://your-medusa-store.com', apiKey: 'pk_key' }),
});
await agent.start(3000);
// UCP endpoint: http://localhost:3000/ucp/*
```

## API Reference

Full documentation at [agentojs.com](https://agentojs.com).

## License

[MIT](https://github.com/agentojs/agentojs/blob/main/LICENSE)
