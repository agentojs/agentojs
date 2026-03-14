# AgentOJS

[![CI](https://github.com/KulinichOlexii/agentomcp/actions/workflows/ci.yml/badge.svg)](https://github.com/KulinichOlexii/agentomcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm @agentojs/core](https://img.shields.io/npm/v/@agentojs/core?label=@agentojs/core)](https://www.npmjs.com/package/@agentojs/core)
[![npm @agentojs/medusa](https://img.shields.io/npm/v/@agentojs/medusa?label=@agentojs/medusa)](https://www.npmjs.com/package/@agentojs/medusa)
[![npm @agentojs/woocommerce](https://img.shields.io/npm/v/@agentojs/woocommerce?label=@agentojs/woocommerce)](https://www.npmjs.com/package/@agentojs/woocommerce)
[![npm @agentojs/generic](https://img.shields.io/npm/v/@agentojs/generic?label=@agentojs/generic)](https://www.npmjs.com/package/@agentojs/generic)
[![npm @agentojs/shopify](https://img.shields.io/npm/v/@agentojs/shopify?label=@agentojs/shopify)](https://www.npmjs.com/package/@agentojs/shopify)
[![npm @agentojs/mcp](https://img.shields.io/npm/v/@agentojs/mcp?label=@agentojs/mcp)](https://www.npmjs.com/package/@agentojs/mcp)
[![npm @agentojs/ucp](https://img.shields.io/npm/v/@agentojs/ucp?label=@agentojs/ucp)](https://www.npmjs.com/package/@agentojs/ucp)
[![npm @agentojs/acp](https://img.shields.io/npm/v/@agentojs/acp?label=@agentojs/acp)](https://www.npmjs.com/package/@agentojs/acp)
[![npm @agentojs/express](https://img.shields.io/npm/v/@agentojs/express?label=@agentojs/express)](https://www.npmjs.com/package/@agentojs/express)
[![npm @agentojs/nestjs](https://img.shields.io/npm/v/@agentojs/nestjs?label=@agentojs/nestjs)](https://www.npmjs.com/package/@agentojs/nestjs)
[![npm create-agentojs-app](https://img.shields.io/npm/v/create-agentojs-app?label=create-agentojs-app)](https://www.npmjs.com/package/create-agentojs-app)

**Open-source agentic middleware for any commerce backend. One SDK. Three AI protocols. Zero commission.**

AgentOJS connects any e-commerce platform to Claude, ChatGPT, and Gemini through a single `CommerceProvider` interface. It handles MCP, UCP, and ACP protocol translation, data normalization, and rate limiting — so you write your integration once and every AI agent can shop your store.

## Quick Start

```typescript
import { createAgent } from '@agentojs/core';
import { MedusaProvider } from '@agentojs/medusa';

const agent = await createAgent({
  store: {
    name: 'My Store',
    slug: 'my-store',
    currency: 'usd',
    country: 'us',
    backendUrl: 'https://my-medusa.example.com',
  },
  provider: new MedusaProvider({
    backendUrl: 'https://my-medusa.example.com',
    apiKey: 'pk_your_publishable_key',
  }),
});

await agent.start(3100);
// MCP  → POST http://localhost:3100/mcp       (Claude)
// UCP  → GET  http://localhost:3100/ucp/*      (Gemini)
// ACP  → POST http://localhost:3100/acp/*      (ChatGPT)
```

All three protocols are enabled by default. Disable any with `enableMcp: false`, `enableUcp: false`, or `enableAcp: false`.

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| [`@agentojs/core`](packages/core) | TypeScript types, `CommerceProvider` interface, `createAgent()` factory | [![npm](https://img.shields.io/npm/v/@agentojs/core)](https://www.npmjs.com/package/@agentojs/core) |
| [`@agentojs/medusa`](packages/medusa) | Medusa.js v2 Store API adapter | [![npm](https://img.shields.io/npm/v/@agentojs/medusa)](https://www.npmjs.com/package/@agentojs/medusa) |
| [`@agentojs/woocommerce`](packages/woocommerce) | WooCommerce dual-API adapter (Store API + REST API) | [![npm](https://img.shields.io/npm/v/@agentojs/woocommerce)](https://www.npmjs.com/package/@agentojs/woocommerce) |
| [`@agentojs/generic`](packages/generic) | Generic REST API adapter with configurable field mapping | [![npm](https://img.shields.io/npm/v/@agentojs/generic)](https://www.npmjs.com/package/@agentojs/generic) |
| [`@agentojs/shopify`](packages/shopify) | Shopify Storefront API adapter | [![npm](https://img.shields.io/npm/v/@agentojs/shopify)](https://www.npmjs.com/package/@agentojs/shopify) |
| [`@agentojs/mcp`](packages/mcp) | MCP server — tools & resources for Claude | [![npm](https://img.shields.io/npm/v/@agentojs/mcp)](https://www.npmjs.com/package/@agentojs/mcp) |
| [`@agentojs/ucp`](packages/ucp) | UCP router — REST endpoints for Google/Gemini | [![npm](https://img.shields.io/npm/v/@agentojs/ucp)](https://www.npmjs.com/package/@agentojs/ucp) |
| [`@agentojs/acp`](packages/acp) | ACP router — checkout sessions for ChatGPT + Stripe | [![npm](https://img.shields.io/npm/v/@agentojs/acp)](https://www.npmjs.com/package/@agentojs/acp) |
| [`@agentojs/express`](packages/express) | Express middleware mounting all three protocols | [![npm](https://img.shields.io/npm/v/@agentojs/express)](https://www.npmjs.com/package/@agentojs/express) |
| [`@agentojs/nestjs`](packages/nestjs) | NestJS module for AgentOJS integration | [![npm](https://img.shields.io/npm/v/@agentojs/nestjs)](https://www.npmjs.com/package/@agentojs/nestjs) |
| [`create-agentojs-app`](packages/create-agentojs-app) | CLI scaffolding tool — `npm create agentojs-app` | [![npm](https://img.shields.io/npm/v/create-agentojs-app)](https://www.npmjs.com/package/create-agentojs-app) |

## Architecture

```
    AI Agents (Claude, ChatGPT, Gemini)
                    │
         MCP  /  UCP  /  ACP  protocols
                    │
    ┌───────────────────────────────┐
    │     @agentojs/express         │  ← one-line middleware
    │  ┌─────┐  ┌─────┐  ┌─────┐  │
    │  │ mcp │  │ ucp │  │ acp │  │  ← protocol adapters
    │  └──┬──┘  └──┬──┘  └──┬──┘  │
    │     └────────┼────────┘      │
    │              │               │
    │      @agentojs/core          │  ← CommerceProvider interface
    └──────────────┼───────────────┘
                   │
     ┌─────────┬───┴───┬───────────┐
     │         │       │           │
  medusa   woocommerce generic  shopify
   v2       REST API  REST API  (soon)
```

**Provider** → implements `CommerceProvider` (19 methods: products, cart, checkout, orders)
**Core** → normalizes all responses into shared TypeScript types (`Product`, `Cart`, `Order`, …)
**Protocols** → expose those operations through MCP tools, UCP REST endpoints, or ACP checkout sessions
**Express** → mounts everything on a single Express router

## Why AgentOJS?

AI agents are the new storefront. Shopify ships MCP endpoints on every store. Google UCP and OpenAI ACP are rolling out. But if you're **not** on Shopify, you're locked out.

AgentOJS solves this:

| Capability | What it does |
|-----------|--------------|
| **Three protocols, one codebase** | MCP (Claude), UCP (Gemini), ACP (ChatGPT) — no separate integrations |
| **Data normalization** | Every provider returns the same `Product[]`, `Cart`, `Order` types |
| **Pre-verified** | Built to pass Claude Directory, Google UCP, and OpenAI ACP verification requirements |
| **Rate limiting & analytics** | Built-in request tracking, plan enforcement, per-store metrics |
| **Self-hosted** | Run on your own infrastructure — zero lock-in, full data control |
| **Zero commission** | No per-transaction fees, ever |

### How does AgentOJS compare?

| | Shopify MCP | Firmly.ai | DIY Integration | **AgentOJS** |
|---|---|---|---|---|
| Platforms | Shopify only | Closed SaaS | Any (manual) | **Any** |
| Protocols | MCP only | Unknown | One at a time | **MCP + UCP + ACP** |
| Open source | No | No | N/A | **Yes (MIT)** |
| Self-hosted | No | No | Yes | **Yes** |
| Pre-verified | Auto (Shopify) | Managed | You do it | **Built-in** |
| Commission | Shopify fees | Unknown | None | **None** |
| Setup effort | Toggle in admin | Onboarding | 3-6 months | **`npm install`** |

## Installation

```bash
# Core + your provider + express middleware
npm install @agentojs/core @agentojs/medusa @agentojs/express express

# Or with WooCommerce
npm install @agentojs/core @agentojs/woocommerce @agentojs/express express

# Or with any REST API
npm install @agentojs/core @agentojs/generic @agentojs/express express
```

Protocol packages are installed automatically as peer dependencies of `@agentojs/express`.

## CommerceProvider Interface

Every adapter implements these 19 methods:

| Category | Methods |
|----------|---------|
| Products | `searchProducts`, `getProduct`, `getCollections`, `getCollection` |
| Cart | `createCart`, `getCart`, `updateCart`, `addLineItem`, `removeLineItem` |
| Shipping | `getShippingOptions`, `addShippingMethod` |
| Checkout | `createPaymentSessions`, `selectPaymentSession`, `initializePayment`, `completeCart` |
| Orders | `getOrder`, `listOrders` |
| Regions | `getRegions` |
| Health | `healthCheck` |

## Examples

See the [`examples/`](examples/) directory for runnable demos:

- [`medusa-basic`](examples/medusa-basic/) — Medusa v2 + createAgent() serving MCP, UCP, and ACP
- [`shopify-basic`](examples/shopify-basic/) — Shopify Storefront API + createAgent()
- [`express-custom`](examples/express-custom/) — Manual Express setup with agentMiddleware and GenericRESTProvider
- [`woocommerce-basic`](examples/woocommerce-basic/) — Connect to WooCommerce, create a cart
- [`generic-car-dealer`](examples/generic-car-dealer/) — Custom field mapping for a car dealer API
- [`multi-store`](examples/multi-store/) — Query multiple providers with one interface

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm -r build

# Run all tests
npx vitest run

# Build docs (VitePress)
pnpm docs:build
```

## Links

- **Docs:** [agentojs.com](https://agentojs.com)
- **npm:** [@agentojs](https://www.npmjs.com/org/agentojs)
- **GitHub:** [github.com/KulinichOlexii/agentomcp](https://github.com/KulinichOlexii/agentomcp)
- **Discord:** Coming soon
- **Contributing:** [CONTRIBUTING.md](CONTRIBUTING.md)

## License

[MIT](LICENSE)
