# AgentOJS

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Open-source agentic middleware for e-commerce.** Connect any e-commerce backend to Claude, ChatGPT, and Gemini — pre-verified for MCP, UCP, and ACP protocols.

AgentOJS sits between AI agents and your e-commerce platform, handling protocol translation, data normalization, and a unified `CommerceBackend` interface. Build AI-powered commerce experiences on Medusa.js, WooCommerce, or any REST API — without rewriting integration code for each AI platform.

## Why Agentic Middleware?

AI agents are becoming the new storefront. Shopify has MCP endpoints on every store. Google UCP and OpenAI ACP are rolling out. But if you're **not** on Shopify (57% of e-commerce), you're locked out.

AgentOJS solves this:

| Capability | What it does |
|-----------|--------------|
| **Protocol translation** | MCP, UCP, and ACP through one codebase — no separate integrations |
| **Data normalization** | Every backend returns the same `Product[]`, `Cart`, `Order` types |
| **Pre-verification** | Built to pass Claude Directory, Google UCP, and OpenAI ACP verification requirements |
| **Rate limiting & analytics** | Built-in request tracking, plan enforcement, per-store metrics |
| **Self-hosted** | Run on your own infrastructure — zero lock-in, full data control |
| **Zero commission** | No per-transaction fees, ever |

### How does AgentOJS compare?

| | Shopify Agentic Storefronts | Firmly.ai | DIY Integration | **AgentOJS** |
|---|---|---|---|---|
| Platforms | Shopify only | Closed SaaS | Any (manual) | **Any** |
| Open source | No | No | N/A | **Yes (MIT)** |
| Self-hosted | No | No | Yes | **Yes** |
| Pre-verified | Auto (Shopify) | Managed | You do it ($50K+) | **Built-in** |
| Commission | Shopify fees | Unknown | None | **None** |
| Setup effort | Toggle in admin | Onboarding | 3-6 months | **`npm install`** |

## Architecture

```
    Customer's AI Agent (Claude, ChatGPT, Gemini)
                    |
            MCP / UCP / ACP protocols
                    |
    +-------------------------------+
    |       AgentOJS Middleware      |
    |   Protocol   |   Analytics    |
    |  Translation  | & Rate Limits |
    +-------+-------+-------+------+
            |               |
    +-------v-------+ +----v--------+
    | CommerceBackend| | Verification|
    | (@agentojs/core)| | & Security |
    +-------+-------+ +-------------+
            |
  +---------+---------+---------+
  |         |         |         |
  v         v         v         v
Medusa  WooCommerce  Generic  Shopify
  v2      REST API   REST API  (soon)
```

## Packages

| Package | Description |
|---------|-------------|
| [`@agentojs/core`](packages/core) | TypeScript types and `CommerceBackend` interface |
| [`@agentojs/medusa`](packages/medusa) | Medusa.js v2 Store API adapter |
| [`@agentojs/woocommerce`](packages/woocommerce) | WooCommerce dual-API adapter (Store API + REST API) |
| [`@agentojs/generic`](packages/generic) | Generic REST API adapter with configurable field mapping |

**Coming soon:** `@agentojs/shopify`, `@agentojs/mcp-server`, `@agentojs/ucp-server`, `@agentojs/acp-server`, `@agentojs/dashboard`

## Quick Start

Connect a Medusa.js store in 5 lines:

```typescript
import { MedusaBackend } from '@agentojs/medusa';

const store = new MedusaBackend({
  backendUrl: 'https://your-medusa-store.com',
  apiKey: 'pk_your_publishable_key',
});

const products = await store.searchProducts({ q: 'shirt', limit: 10 });
console.log(products.data);
```

Or connect a WooCommerce store:

```typescript
import { WooCommerceBackend } from '@agentojs/woocommerce';

const store = new WooCommerceBackend({
  baseUrl: 'https://your-woocommerce-store.com',
  consumerKey: 'ck_your_key',
  consumerSecret: 'cs_your_secret',
});

const products = await store.searchProducts({ q: 'hoodie' });
```

Or connect any REST API with custom field mapping:

```typescript
import { GenericRESTBackend } from '@agentojs/generic';

const store = new GenericRESTBackend({
  baseUrl: 'https://api.cardealership.com',
  apiKey: 'dealer-key',
  fieldMap: {
    product: { title: 'vehicle_name', price: 'msrp.amount', id: 'vin' },
  },
});

const vehicles = await store.searchProducts({ q: 'sedan' });
```

All three return the same `Product[]` type. Write your agent logic once, swap backends freely.

## Installation

```bash
# Core types (required by all adapters)
npm install @agentojs/core

# Pick your adapter(s)
npm install @agentojs/medusa
npm install @agentojs/woocommerce
npm install @agentojs/generic
```

## CommerceBackend Interface

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

- [`medusa-basic`](examples/medusa-basic/) — Connect to Medusa, search products
- [`woocommerce-basic`](examples/woocommerce-basic/) — Connect to WooCommerce, create a cart
- [`generic-car-dealer`](examples/generic-car-dealer/) — Custom field mapping for a car dealer API
- [`multi-store`](examples/multi-store/) — Query multiple backends with one interface

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm -r build

# Run all tests
pnpm test

# Type-check all packages
pnpm -r typecheck
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidelines.

## License

[MIT](LICENSE)
