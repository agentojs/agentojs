---
layout: home

hero:
  name: AgentOJS
  text: Agentic middleware for AI commerce
  tagline: Connect any e-commerce backend to Claude, ChatGPT, and Gemini — via MCP, UCP, and ACP protocols
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/agentojs/agentojs

features:
  - title: Protocol-agnostic
    details: MCP + UCP + ACP through one interface. Write your adapter once, connect to every AI agent.
  - title: Zero runtime dependencies
    details: Native fetch(), no bloat. Each adapter is under 50KB with zero transitive dependencies.
  - title: Type-safe
    details: Full TypeScript. CommerceBackend interface with 19 methods, strict types for products, carts, orders.
---

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
- **NestJS** module for rapid API scaffolding
- **Express** middleware for REST endpoints
- **Next.js** server actions integration

## Architecture

```
                    +-----------------------+
                    |   Your AI Agent       |
                    |  (MCP / UCP / ACP)    |
                    +-----------+-----------+
                                |
                    +-----------v-----------+
                    |   CommerceBackend     |
                    |   (@agentojs/core)    |
                    +-----------+-----------+
                                |
            +-------------------+-------------------+
            |                   |                   |
  +---------v-------+  +-------v---------+  +------v----------+
  | @agentojs/medusa|  |@agentojs/       |  |@agentojs/generic|
  | Medusa.js v2    |  |woocommerce      |  | Any REST API    |
  +-----------------+  +-----------------+  +-----------------+
```
