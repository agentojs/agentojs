# @agentojs/acp

[![npm version](https://img.shields.io/npm/v/@agentojs/acp.svg)](https://www.npmjs.com/package/@agentojs/acp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/agentojs/agentojs/blob/main/LICENSE)

ACP (Agent Commerce Protocol) adapter for AgentOJS -- exposes your commerce backend via OpenAI's Agent Commerce Protocol for ChatGPT and other ACP-compatible AI agents, with optional Stripe payment integration.

Part of the [AgentOJS](https://github.com/agentojs/agentojs) monorepo.

## Installation

```bash
npm install @agentojs/acp @agentojs/core
# or
pnpm add @agentojs/acp @agentojs/core
```

For Stripe payment support:

```bash
npm install stripe
```

## Quick Start

```typescript
import express from 'express';
import { createAcpRouter } from '@agentojs/acp';
import { MedusaBackend } from '@agentojs/medusa';

const app = express();

const provider = new MedusaBackend({
  backendUrl: 'https://your-medusa-store.com',
  apiKey: 'pk_your_publishable_key',
});

const acpRouter = createAcpRouter({
  store: { slug: 'my-store', name: 'My Store', currency: 'usd', country: 'us', backendUrl: 'https://your-medusa-store.com' },
  provider,
  stripeSecretKey: 'sk_test_...',          // optional
  stripePublishableKey: 'pk_test_...',     // optional
  stripeWebhookSecret: 'whsec_...',        // optional
});

app.use('/acp', acpRouter);
app.listen(3000);
```

## createAcpRouter Options

```typescript
interface AcpRouterOptions {
  /** Store metadata (slug, name, currency, country, backendUrl). */
  store: StoreInfo;
  /** CommerceProvider implementation. */
  provider: CommerceProvider;
  /** Optional scope checker for endpoint access control. */
  scopeChecker?: ScopeChecker;
  /** Optional webhook emitter. */
  webhookEmitter?: WebhookEmitter;
  /** Optional logger. */
  logger?: Logger;
  /** Stripe secret key for payment processing. */
  stripeSecretKey?: string;
  /** Stripe publishable key. */
  stripePublishableKey?: string;
  /** Stripe webhook secret for signature verification. */
  stripeWebhookSecret?: string;
}
```

## ACP Endpoints

The router exposes the following REST endpoints:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/checkout/sessions` | Create a new checkout session |
| GET | `/checkout/sessions/:id` | Get session status |
| PATCH | `/checkout/sessions/:id` | Update session (buyer info, payment) |
| POST | `/checkout/sessions/:id/confirm` | Confirm and complete checkout |
| GET | `/feed` | Product feed for AI agent discovery |
| GET | `/products` | Browse product catalog |
| GET | `/products/:id` | Get product details |
| POST | `/webhooks/stripe` | Stripe webhook receiver |

## Key Components

### Session Manager
```typescript
import { AcpSessionManager } from '@agentojs/acp';
const sessions = new AcpSessionManager();
```

### Feed Builder
```typescript
import { AcpFeedBuilder, buildFeedItems } from '@agentojs/acp';
// Generate ACP-compliant product feed items from your catalog
```

### Webhook Emitter
```typescript
import { AcpWebhookEmitter } from '@agentojs/acp';
// Emit order status events to registered webhook endpoints
```

### Idempotency Cache
```typescript
import { IdempotencyCache } from '@agentojs/acp';
// Prevent duplicate order creation with idempotency keys
```

### Middleware
```typescript
import { acpHeadersMiddleware, acpErrorHandler } from '@agentojs/acp';
// ACP-required headers (api-version, request-id) and error formatting
```

## Using with createAgent

The simplest way to run an ACP server (plus MCP and UCP) is via `createAgent`:

```typescript
import { createAgent } from '@agentojs/core';
import { MedusaBackend } from '@agentojs/medusa';

const agent = await createAgent({
  store: { slug: 'my-store', name: 'My Store', currency: 'usd', country: 'us', backendUrl: 'https://your-medusa-store.com' },
  provider: new MedusaBackend({ backendUrl: 'https://your-medusa-store.com', apiKey: 'pk_key' }),
  stripeSecretKey: 'sk_test_...',
});
await agent.start(3000);
// ACP endpoint: http://localhost:3000/acp/*
```

## API Reference

Full documentation at [agentojs.com](https://agentojs.com).

## License

[MIT](https://github.com/agentojs/agentojs/blob/main/LICENSE)
