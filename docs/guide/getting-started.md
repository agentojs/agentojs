# Getting Started

AgentOJS is open-source agentic middleware for e-commerce. It connects any e-commerce backend to AI agents (Claude, ChatGPT, Gemini) via MCP, UCP, and ACP protocols — handling protocol translation, data normalization, and session management so you don't have to.

## Quick Start with createAgent()

The fastest way to get started is `createAgent()` — a one-call factory that creates an Express server with all three protocol endpoints.

### 1. Install

```bash
npm install @agentojs/core @agentojs/medusa @agentojs/express express
```

### 2. Create Your Agent

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
    apiKey: 'pk_your_publishable_key',
  }),
});

await agent.start(3100);
```

### 3. Test It

```bash
# MCP — Claude tools + resources (StreamableHTTP)
curl -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# UCP — Google/Gemini REST endpoints
curl http://localhost:3100/ucp/products?q=shirt

# ACP — ChatGPT checkout sessions
curl http://localhost:3100/acp/feed
```

That's it — three protocol endpoints from a single `createAgent()` call.

## How It Works

1. **Provider** connects to your e-commerce backend (Medusa, WooCommerce, Shopify, or any REST API)
2. **Core** normalizes all responses into consistent TypeScript types (Product, Cart, Order, etc.)
3. **Protocols** translate those types into AI-native formats:
   - **MCP** — Tools + Resources for Claude
   - **UCP** — REST endpoints for Gemini
   - **ACP** — Checkout sessions for ChatGPT
4. **Express** mounts all protocols on a single server

## Protocol Configuration

By default, all three protocols are enabled. Disable individual protocols with boolean flags:

```typescript
const agent = await createAgent({
  store: { /* ... */ },
  provider: myProvider,
  enableMcp: true,   // default: true
  enableUcp: true,   // default: true
  enableAcp: false,  // disable ACP
});
```

ACP requires Stripe keys for payment processing:

```typescript
const agent = await createAgent({
  store: { /* ... */ },
  provider: myProvider,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
});
```

See the [Protocol Integration](/guide/protocols) guide for details on each protocol.

## Standalone Provider Usage

You can also use providers directly without `createAgent()` — useful for scripts, custom servers, or testing:

```typescript
import { MedusaProvider } from '@agentojs/medusa';

const backend = new MedusaProvider({
  backendUrl: 'https://your-medusa-store.com',
  apiKey: 'pk_your_publishable_key',
});

// Search products
const { data: products } = await backend.searchProducts({ q: 'shirt', limit: 10 });
console.log(`Found ${products.length} products`);

// Get a single product
const product = await backend.getProduct(products[0].id);
console.log(product.title, product.variants[0].prices[0].amount);
```

## Backend-Agnostic Code

The `CommerceProvider` type lets you write code that works with any adapter:

```typescript
import type { CommerceProvider, Product } from '@agentojs/core';

async function findCheapestProduct(
  backend: CommerceProvider,
  query: string,
): Promise<Product | undefined> {
  const { data } = await backend.searchProducts({ q: query, limit: 50 });
  return data.sort((a, b) => {
    const priceA = a.variants[0]?.prices[0]?.amount ?? Infinity;
    const priceB = b.variants[0]?.prices[0]?.amount ?? Infinity;
    return priceA - priceB;
  })[0];
}
```

Pass any adapter — `MedusaProvider`, `WooCommerceProvider`, `GenericRESTProvider` — and the function works unchanged.

## CommerceProvider Methods

The interface defines 19 methods across 7 categories:

| Category | Methods |
|----------|---------|
| Products | `searchProducts`, `getProduct`, `getCollections`, `getCollection` |
| Cart | `createCart`, `getCart`, `updateCart`, `addLineItem`, `removeLineItem` |
| Shipping | `getShippingOptions`, `addShippingMethod` |
| Checkout | `createPaymentSessions`, `selectPaymentSession`, `initializePayment`, `completeCart` |
| Orders | `getOrder`, `listOrders` |
| Regions | `getRegions` |
| Health | `healthCheck` |

See the [API Reference](/api/commerce-provider) for full method signatures.

## Next Steps

- [Protocol Integration](/guide/protocols) — MCP, UCP, and ACP explained
- [Medusa Guide](/guide/medusa) — Connect to a Medusa.js v2 store
- [WooCommerce Guide](/guide/woocommerce) — Connect to a WooCommerce site
- [Generic REST Guide](/guide/generic) — Connect to any REST API
- [Custom Provider](/guide/custom-provider) — Implement your own adapter
- [API Reference](/api/commerce-provider) — Full method signatures and types
