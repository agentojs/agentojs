# @agentojs/express

[![npm version](https://img.shields.io/npm/v/@agentojs/express.svg)](https://www.npmjs.com/package/@agentojs/express)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/agentojs/agentojs/blob/main/LICENSE)

Express middleware that mounts all three AI commerce protocols (MCP, UCP, ACP) on a single Express app. One middleware call gives your store MCP, UCP, and ACP endpoints.

Part of the [AgentOJS](https://github.com/agentojs/agentojs) monorepo.

## Installation

```bash
npm install @agentojs/express @agentojs/core @agentojs/mcp @agentojs/ucp @agentojs/acp express
# or
pnpm add @agentojs/express @agentojs/core @agentojs/mcp @agentojs/ucp @agentojs/acp express
```

## Quick Start

```typescript
import express from 'express';
import { agentMiddleware } from '@agentojs/express';
import { MedusaBackend } from '@agentojs/medusa';

const app = express();

const provider = new MedusaBackend({
  backendUrl: 'https://your-medusa-store.com',
  apiKey: 'pk_your_publishable_key',
});

app.use(agentMiddleware({
  store: { slug: 'my-store', name: 'My Store', currency: 'usd', country: 'us', backendUrl: 'https://your-medusa-store.com' },
  provider,
}));

app.listen(3000, () => {
  console.log('Agent server running on http://localhost:3000');
  console.log('  MCP: POST /mcp');
  console.log('  UCP: /ucp/*');
  console.log('  ACP: /acp/*');
});
```

## agentMiddleware Options

```typescript
interface AgentMiddlewareOptions {
  /** Store metadata (slug, name, currency, country, backendUrl). */
  store: StoreInfo;
  /** CommerceProvider implementation. */
  provider: CommerceProvider;
  /** Optional scope checker. */
  scopeChecker?: ScopeChecker;
  /** Optional webhook emitter. */
  webhookEmitter?: WebhookEmitter;
  /** Optional logger. */
  logger?: Logger;
  /** Stripe secret key for ACP payments. */
  stripeSecretKey?: string;
  /** Stripe publishable key for ACP. */
  stripePublishableKey?: string;
  /** Stripe webhook secret for ACP. */
  stripeWebhookSecret?: string;
  /** Enable MCP protocol (default: true). */
  enableMcp?: boolean;
  /** Enable UCP protocol (default: true). */
  enableUcp?: boolean;
  /** Enable ACP protocol (default: true). */
  enableAcp?: boolean;
}
```

## Mounted Endpoints

| Protocol | Endpoint | Description |
|----------|----------|-------------|
| MCP | `POST /mcp` | Model Context Protocol (Claude, MCP clients) |
| UCP | `/ucp/*` | Universal Checkout Protocol (Google/Gemini) |
| ACP | `/acp/*` | Agent Commerce Protocol (ChatGPT/OpenAI) |

## MCP Handler

For standalone MCP handling without the full middleware stack:

```typescript
import { createMcpHandler } from '@agentojs/express';

// Lower-level MCP request handler for custom setups
const handler = createMcpHandler(mcpServerOptions);
app.post('/mcp', handler);
```

## Using with createAgent

For the simplest setup, use `createAgent` from `@agentojs/core` which wraps `agentMiddleware` with an Express app and health check:

```typescript
import { createAgent } from '@agentojs/core';
import { MedusaBackend } from '@agentojs/medusa';

const agent = await createAgent({
  store: { slug: 'my-store', name: 'My Store', currency: 'usd', country: 'us', backendUrl: 'https://your-medusa-store.com' },
  provider: new MedusaBackend({ backendUrl: 'https://your-medusa-store.com', apiKey: 'pk_key' }),
});
await agent.start(3000);
```

## API Reference

Full documentation at [agentojs.com](https://agentojs.com).

## License

[MIT](https://github.com/agentojs/agentojs/blob/main/LICENSE)
