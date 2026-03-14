# @agentojs/medusa

[![npm version](https://img.shields.io/npm/v/@agentojs/medusa.svg)](https://www.npmjs.com/package/@agentojs/medusa)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/agentojs/agentojs/blob/main/LICENSE)

Medusa.js v2 adapter for AI commerce agents. Implements the `CommerceBackend` interface from `@agentojs/core` using Medusa's Store API.

Part of the [AgentOJS](https://github.com/agentojs/agentojs) monorepo.

## Features

- Full Medusa.js v2 Store API support (products, carts, checkout, orders)
- Auto-region detection -- resolves the first available region when none provided
- Native `fetch()` -- zero runtime dependencies
- x-publishable-api-key authentication
- Medusa v2 payment-collections flow for checkout

## Installation

```bash
npm install @agentojs/medusa @agentojs/core
```

## Quick Start

```typescript
import { MedusaBackend } from '@agentojs/medusa';

const backend = new MedusaBackend({
  backendUrl: 'https://your-medusa-store.com',
  apiKey: 'pk_your_publishable_key',
});

const results = await backend.searchProducts({ q: 'shirt', limit: 10 });
console.log(results.data); // Product[]
```

That's it. Three lines to connect, one line to search.

## Configuration

```typescript
interface MedusaBackendConfig {
  /** Medusa server URL (e.g., "https://medusa.example.com") */
  backendUrl: string;
  /** Publishable API key (sent as x-publishable-api-key header) */
  apiKey: string;
  /** Region ID -- auto-detected from first available region if omitted */
  regionId?: string;
}
```

The `regionId` controls which currency and country settings are used for product pricing. If omitted, the adapter calls `getRegions()` once and caches the first region's ID.

## Full Example

```typescript
import { MedusaBackend } from '@agentojs/medusa';

const backend = new MedusaBackend({
  backendUrl: 'https://your-medusa-store.com',
  apiKey: 'pk_your_publishable_key',
  regionId: 'reg_01ABC', // optional
});

// Search products
const results = await backend.searchProducts({ q: 'shirt', limit: 10 });
console.log(results.data);

// Get a single product
const product = await backend.getProduct('prod_01ABC');

// Create a cart and add items
const cart = await backend.createCart('reg_01ABC', [
  { variant_id: 'variant_01ABC', quantity: 1 },
]);

// Add more items
const updated = await backend.addLineItem(cart.id, 'variant_02DEF', 2);

// Checkout flow
const withShipping = await backend.addShippingMethod(cart.id, 'so_01ABC');
const payment = await backend.initializePayment(cart.id, 'stripe');
const order = await backend.completeCart(cart.id);
console.log(`Order ${order.display_id} created!`);
```

## Using with createAgent

The fastest way to expose your Medusa store to AI agents via all three protocols (MCP, UCP, ACP):

```typescript
import { createAgent } from '@agentojs/core';
import { MedusaBackend } from '@agentojs/medusa';

const agent = await createAgent({
  store: {
    slug: 'my-medusa-store',
    name: 'My Medusa Store',
    currency: 'usd',
    country: 'us',
    backendUrl: 'https://your-medusa-store.com',
  },
  provider: new MedusaBackend({
    backendUrl: 'https://your-medusa-store.com',
    apiKey: 'pk_your_publishable_key',
  }),
});

await agent.start(3000);
// MCP: POST http://localhost:3000/mcp
// UCP: http://localhost:3000/ucp/*
// ACP: http://localhost:3000/acp/*
```

## API Reference

| Method | Description |
|--------|-------------|
| `searchProducts(filters)` | Search products with text query, category/collection filters, pagination |
| `getProduct(id)` | Get a single product by ID with pricing |
| `getCollections()` | List all product collections |
| `getCollection(id)` | Get a single collection by ID |
| `createCart(regionId, items)` | Create a new cart with initial items |
| `getCart(cartId)` | Retrieve cart by ID |
| `updateCart(cartId, updates)` | Update cart (email, addresses, metadata) |
| `addLineItem(cartId, variantId, qty)` | Add a line item to cart |
| `removeLineItem(cartId, lineItemId)` | Remove a line item from cart |
| `getShippingOptions(cartId)` | Get available shipping options for cart |
| `addShippingMethod(cartId, optionId)` | Select a shipping method |
| `createPaymentSessions(cartId)` | Create payment sessions for cart |
| `selectPaymentSession(cartId, providerId)` | Select a payment provider |
| `initializePayment(cartId, providerId)` | Initialize payment (creates payment collection + session) |
| `completeCart(cartId)` | Complete checkout -- returns Order |
| `getOrder(orderId)` | Get order by ID |
| `listOrders(filters)` | List orders with email/status filters |
| `getRegions()` | List all store regions |
| `healthCheck()` | Check if the Medusa server is reachable |

## Error Handling

All API errors throw `MedusaApiError` with `status`, `body`, and `url` properties:

```typescript
import { MedusaApiError } from '@agentojs/medusa';

try {
  await backend.getProduct('nonexistent');
} catch (err) {
  if (err instanceof MedusaApiError) {
    console.error(`HTTP ${err.status}: ${err.body}`);
    console.error(`URL: ${err.url}`);
  }
}
```

## Exports

```typescript
import { MedusaBackend, MedusaApiError } from '@agentojs/medusa';
import type { MedusaBackendConfig } from '@agentojs/medusa';
```

## License

[MIT](https://github.com/agentojs/agentojs/blob/main/LICENSE)
