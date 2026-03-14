# @agentojs/woocommerce

[![npm version](https://img.shields.io/npm/v/@agentojs/woocommerce.svg)](https://www.npmjs.com/package/@agentojs/woocommerce)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/agentojs/agentojs/blob/main/LICENSE)

WooCommerce adapter for AI commerce agents. Implements the `CommerceBackend` interface from `@agentojs/core` using WooCommerce's dual API surface.

Part of the [AgentOJS](https://github.com/agentojs/agentojs) monorepo.

## Features

- Dual API architecture (Store API + REST API) -- handled transparently
- Cart-Token JWT management with in-memory state
- Automatic price conversion from minor units to decimals
- Variable product support (fetches variations)
- Native `fetch()` -- zero runtime dependencies

## Installation

```bash
npm install @agentojs/woocommerce @agentojs/core
```

## Quick Start

```typescript
import { WooCommerceBackend } from '@agentojs/woocommerce';

const backend = new WooCommerceBackend({
  baseUrl: 'https://your-store.com',
  consumerKey: 'ck_your_consumer_key',
  consumerSecret: 'cs_your_consumer_secret',
});

const { data: products } = await backend.searchProducts({ q: 'hoodie' });
console.log(products[0].title);
```

Generate API keys in WooCommerce: **Settings > Advanced > REST API > Add Key** (Read/Write permissions).

## Configuration

```typescript
interface WooCommerceBackendConfig {
  /** WooCommerce site URL (e.g., "https://store.example.com") */
  baseUrl: string;
  /** WooCommerce REST API consumer key (starts with ck_) */
  consumerKey: string;
  /** WooCommerce REST API consumer secret (starts with cs_) */
  consumerSecret: string;
}
```

## Dual API Architecture

WooCommerce exposes two APIs with different capabilities. This adapter transparently routes calls to the correct one:

| Feature | Store API (`wc/store/v1`) | REST API (`wc/v3`) |
|---------|--------------------------|---------------------|
| Auth | None / Cart-Token JWT | Basic Auth (key + secret) |
| Products | Read (public) | Read + Write |
| Cart | Full CRUD | Not available |
| Checkout | Full flow | Not available |
| Orders | Not available | Full CRUD |
| Categories | Not available | Full CRUD |
| Shipping Zones | Not available | Read |

## Cart-Token Flow

WooCommerce carts are identified by a JWT token returned in the `Cart-Token` response header. This adapter:

1. Creates a UUID as the public `cartId`
2. Maps it internally to the real Cart-Token JWT
3. Stores cart state (email, addresses, payment method) in memory

> Cart state is in-memory and lost on process restart. This is acceptable for stateless AI agent interactions.

## Full Example

```typescript
import { WooCommerceBackend } from '@agentojs/woocommerce';

const backend = new WooCommerceBackend({
  baseUrl: 'https://your-store.com',
  consumerKey: 'ck_key',
  consumerSecret: 'cs_secret',
});

// Browse products
const { data: products } = await backend.searchProducts({ q: 'hoodie' });
console.log(`Found ${products.length} products`);

// Create a cart
const cart = await backend.createCart('default', [
  { variant_id: '42', quantity: 2 },
]);
console.log(`Cart total: ${cart.total} ${cart.currency_code}`);

// Update shipping address
await backend.updateCart(cart.id, {
  email: 'customer@example.com',
  shipping_address: {
    first_name: 'John',
    last_name: 'Doe',
    address_1: '123 Main St',
    city: 'New York',
    province: 'NY',
    postal_code: '10001',
    country_code: 'US',
  },
});

// Shipping and checkout
const shippingOptions = await backend.getShippingOptions(cart.id);
await backend.addShippingMethod(cart.id, shippingOptions[0].id);
const order = await backend.completeCart(cart.id);
console.log(`Order #${order.display_id} placed!`);
```

## Using with createAgent

The fastest way to expose your WooCommerce store to AI agents via all three protocols (MCP, UCP, ACP):

```typescript
import { createAgent } from '@agentojs/core';
import { WooCommerceBackend } from '@agentojs/woocommerce';

const agent = await createAgent({
  store: {
    slug: 'my-woo-store',
    name: 'My WooCommerce Store',
    currency: 'usd',
    country: 'us',
    backendUrl: 'https://your-store.com',
  },
  provider: new WooCommerceBackend({
    baseUrl: 'https://your-store.com',
    consumerKey: 'ck_your_consumer_key',
    consumerSecret: 'cs_your_consumer_secret',
  }),
});

await agent.start(3000);
// MCP: POST http://localhost:3000/mcp
// UCP: http://localhost:3000/ucp/*
// ACP: http://localhost:3000/acp/*
```

## API Reference

### Products

| Method | Description |
|--------|-------------|
| `searchProducts(filters)` | Search products via Store API with pagination |
| `getProduct(id)` | Get single product with variations (if variable) |
| `getCollections()` | List product categories with products |
| `getCollection(id)` | Get single category with its products |

### Cart

| Method | Description |
|--------|-------------|
| `createCart(regionId, items)` | Create cart and add initial items |
| `getCart(cartId)` | Retrieve cart by ID |
| `updateCart(cartId, updates)` | Update email, shipping/billing address |
| `addLineItem(cartId, variantId, quantity)` | Add item to cart |
| `removeLineItem(cartId, lineItemId)` | Remove item by key |

### Shipping

| Method | Description |
|--------|-------------|
| `getShippingOptions(cartId)` | Get available shipping rates |
| `addShippingMethod(cartId, optionId)` | Select a shipping rate |

### Checkout

| Method | Description |
|--------|-------------|
| `createPaymentSessions(cartId)` | Get available payment methods |
| `selectPaymentSession(cartId, providerId)` | Select payment method |
| `completeCart(cartId)` | Complete checkout, returns Order |

> `initializePayment()` is not supported for WooCommerce and throws an error.

### Orders

| Method | Description |
|--------|-------------|
| `getOrder(orderId)` | Fetch order by ID (REST API) |
| `listOrders(filters)` | List orders with filters (email, status) |

### Regions & Health

| Method | Description |
|--------|-------------|
| `getRegions()` | Get shipping zones as regions |
| `healthCheck()` | Check if WP REST API is accessible |

## Price Handling

WooCommerce Store API returns prices in **minor units** (e.g., `"2999"` for $29.99). This adapter automatically converts them to decimal format using the `currency_minor_unit` field from the API response.

## Error Handling

```typescript
import { WooCommerceApiError } from '@agentojs/woocommerce';

try {
  await backend.getProduct('999');
} catch (err) {
  if (err instanceof WooCommerceApiError) {
    console.error(`HTTP ${err.status}: ${err.body}`);
    console.error(`URL: ${err.url}`);
  }
}
```

## Exported Types

The package exports all internal WooCommerce API types for advanced use:

```typescript
import type {
  WcStoreProduct,
  WcVariation,
  WcCart,
  WcCartItem,
  WcOrder,
  WcAddress,
  WcShippingRate,
  WcPaymentMethod,
  WcCategory,
  WcShippingZone,
} from '@agentojs/woocommerce';
```

## License

[MIT](https://github.com/agentojs/agentojs/blob/main/LICENSE)
