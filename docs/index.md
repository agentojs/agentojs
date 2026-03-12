---
layout: home

hero:
  name: AgentOJS
  text: Open-source agentic middleware for e-commerce
  tagline: Connect any e-commerce backend to Claude, ChatGPT, and Gemini — pre-verified for MCP, UCP, and ACP protocols
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/agentojs/agentojs

features:
  - title: Agentic Middleware
    details: Full protocol translation, data normalization, rate limiting, and analytics — not just an SDK, a production-ready middleware layer.
  - title: Pre-verified for AI Platforms
    details: Built to pass Claude Directory, Google UCP, and OpenAI ACP verification requirements. Ship faster, skip the $50K+ DIY cost.
  - title: Protocol-agnostic
    details: MCP + UCP + ACP through one interface. Write your adapter once, connect to every AI agent platform.
  - title: Self-hosted & Open Source
    details: MIT licensed. Run on your own infrastructure with zero lock-in, zero commission, full data control.
---

## Why AgentOJS?

AI agents are becoming the new storefront. **57% of e-commerce runs outside Shopify** — and those merchants need a way to connect to Claude, ChatGPT, and Gemini. AgentOJS is the middleware that bridges that gap.

| | Shopify | Firmly.ai | DIY | **AgentOJS** |
|---|---|---|---|---|
| Platforms | Shopify only | Closed SaaS | Manual | **Any** |
| Open source | No | No | N/A | **MIT** |
| Self-hosted | No | No | Yes | **Yes** |
| Commission | Shopify fees | Unknown | None | **None** |

## Quick Start

Connect a Medusa.js store in 5 lines:

```typescript
import { MedusaBackend } from '@agentojs/medusa';

const store = new MedusaBackend({
  backendUrl: 'https://your-medusa-store.com',
  apiKey: 'pk_your_publishable_key',
});

const products = await store.searchProducts({ q: 'shirt', limit: 10 });
console.log(products.data); // Product[]
```

All adapters return the same `Product[]` type. Write your agent logic once, swap backends freely.

## Supported Backends

### Medusa.js v2

```bash
npm install @agentojs/core @agentojs/medusa
```

```typescript
import { MedusaBackend } from '@agentojs/medusa';

const store = new MedusaBackend({
  backendUrl: 'https://your-medusa-store.com',
  apiKey: 'pk_your_publishable_key',
});
```

Full Medusa.js v2 Store API support: products, carts, checkout, orders, regions, shipping.

### WooCommerce

```bash
npm install @agentojs/core @agentojs/woocommerce
```

```typescript
import { WooCommerceBackend } from '@agentojs/woocommerce';

const store = new WooCommerceBackend({
  baseUrl: 'https://your-woocommerce-store.com',
  consumerKey: 'ck_your_key',
  consumerSecret: 'cs_your_secret',
});
```

Dual-API adapter: WooCommerce Store API v1 for carts and checkout, REST API v3 for products and orders.

### Generic REST API

```bash
npm install @agentojs/core @agentojs/generic
```

```typescript
import { GenericRESTBackend } from '@agentojs/generic';

const store = new GenericRESTBackend({
  baseUrl: 'https://api.cardealership.com',
  apiKey: 'dealer-key',
  fieldMap: {
    product: { title: 'vehicle_name', price: 'msrp.amount', id: 'vin' },
  },
});
```

Connect any REST API with configurable endpoint and field mapping. Supports dot-notation for nested fields.

## CommerceBackend Interface

Every adapter implements 19 methods across 7 categories:

| Category | Methods |
|----------|---------|
| Products | `searchProducts`, `getProduct`, `getCollections`, `getCollection` |
| Cart | `createCart`, `getCart`, `updateCart`, `addLineItem`, `removeLineItem` |
| Shipping | `getShippingOptions`, `addShippingMethod` |
| Checkout | `createPaymentSessions`, `selectPaymentSession`, `initializePayment`, `completeCart` |
| Orders | `getOrder`, `listOrders` |
| Regions | `getRegions` |
| Health | `healthCheck` |

## Coming Soon

- **Shopify** adapter
- **@agentojs/mcp-server** — MCP protocol handler (extractable from AgentOMCP)
- **@agentojs/ucp-server** — UCP protocol endpoints
- **@agentojs/acp-server** — ACP protocol endpoints
- **@agentojs/dashboard** — Embeddable analytics and store config UI
- **NestJS** module for rapid API scaffolding
- **Express** middleware for REST endpoints

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
