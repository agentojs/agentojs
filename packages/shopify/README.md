# @agentojs/shopify

[![npm version](https://img.shields.io/npm/v/@agentojs/shopify.svg)](https://www.npmjs.com/package/@agentojs/shopify)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/agentojs/agentojs/blob/main/LICENSE)

Shopify Storefront API adapter for AI commerce agents. Implements the `CommerceProvider` interface from `@agentojs/core` using Shopify's Storefront GraphQL API.

Part of the [AgentOJS](https://github.com/agentojs/agentojs) monorepo.

## Features

- Full Shopify Storefront API support (products, collections, carts, checkout)
- GraphQL client with typed queries and mutations
- Shopify Cart API integration (cartCreate, cartLinesAdd, cartLinesRemove, etc.)
- Native `fetch()` -- zero runtime dependencies
- Automatic price conversion (Shopify strings to integer cents)
- Checkout via Shopify's native `checkoutUrl`

## Installation

```bash
npm install @agentojs/shopify @agentojs/core
```

## Quick Start

```typescript
import { ShopifyProvider } from '@agentojs/shopify';

const provider = new ShopifyProvider({
  storeDomain: 'my-store.myshopify.com',
  storefrontAccessToken: 'your_storefront_access_token',
});

const results = await provider.searchProducts({ q: 'shirt', limit: 10 });
console.log(results.data); // Product[]
```

## Using with createAgent()

The fastest way to serve your Shopify store to AI agents:

```typescript
import { createAgent } from '@agentojs/core';
import { ShopifyProvider } from '@agentojs/shopify';

const agent = await createAgent({
  store: {
    name: 'My Shopify Store',
    slug: 'my-shopify-store',
    currency: 'usd',
    country: 'us',
    backendUrl: 'https://my-store.myshopify.com',
  },
  provider: new ShopifyProvider({
    storeDomain: 'my-store.myshopify.com',
    storefrontAccessToken: 'your_storefront_access_token',
  }),
});

await agent.start(3100);
// MCP → http://localhost:3100/mcp
// UCP → http://localhost:3100/ucp/*
// ACP → http://localhost:3100/acp/*
```

## Configuration

```typescript
interface ShopifyProviderConfig {
  /** Shopify store domain (e.g., "my-store.myshopify.com") */
  storeDomain: string;
  /** Storefront Access Token (created in Shopify Admin) */
  storefrontAccessToken: string;
  /** Storefront API version (default: "2025-01") */
  apiVersion?: string;
}
```

## Shopify Setup

To get a Storefront Access Token:

1. Go to your **Shopify Admin** → **Settings** → **Apps and sales channels**
2. Click **Develop apps** → **Create an app**
3. Under **Configuration**, select **Storefront API access scopes**:
   - `unauthenticated_read_product_listings`
   - `unauthenticated_read_product_inventory`
   - `unauthenticated_write_checkouts`
   - `unauthenticated_read_checkouts`
   - `unauthenticated_read_content`
4. Click **Install app** → copy the **Storefront access token**

## Full Example

```typescript
import { ShopifyProvider } from '@agentojs/shopify';

const provider = new ShopifyProvider({
  storeDomain: 'my-store.myshopify.com',
  storefrontAccessToken: 'your_token',
});

// Search products
const results = await provider.searchProducts({ q: 'shirt', limit: 10 });
console.log(results.data);

// Get a single product
const product = await provider.getProduct('gid://shopify/Product/123');

// Browse collections
const collections = await provider.getCollections();
const collection = await provider.getCollection(collections[0].id);

// Create a cart and add items
const cart = await provider.createCart('default', [
  { variant_id: 'gid://shopify/ProductVariant/456', quantity: 1 },
]);

// Add more items
const updated = await provider.addLineItem(
  cart.id,
  'gid://shopify/ProductVariant/789',
  2,
);

// Update buyer info
await provider.updateCart(cart.id, {
  email: 'customer@example.com',
  shipping_address: {
    first_name: 'John',
    last_name: 'Doe',
    address_1: '123 Main St',
    city: 'New York',
    province: 'NY',
    postal_code: '10001',
    country_code: 'us',
  },
});

// Get shipping options
const shippingOptions = await provider.getShippingOptions(cart.id);
await provider.addShippingMethod(cart.id, shippingOptions[0].id);

// Checkout -- Shopify handles payment via checkoutUrl
const payment = await provider.initializePayment(cart.id, 'shopify');
console.log(`Redirect customer to: ${payment.data.checkoutUrl}`);
```

## API Reference

### Products

| Method | Description |
|--------|-------------|
| `searchProducts(filters)` | Search products with text query, tag filters, pagination |
| `getProduct(id)` | Get a single product by Shopify GID |
| `getCollections()` | List all product collections |
| `getCollection(id)` | Get a single collection with its products |

### Cart

| Method | Description |
|--------|-------------|
| `createCart(regionId, items)` | Create a new cart with initial line items |
| `getCart(cartId)` | Retrieve cart by ID |
| `updateCart(cartId, updates)` | Update buyer identity (email, shipping address) |
| `addLineItem(cartId, variantId, qty)` | Add a line item to cart |
| `removeLineItem(cartId, lineItemId)` | Remove a line item from cart |

### Shipping

| Method | Description |
|--------|-------------|
| `getShippingOptions(cartId)` | Get available delivery options from cart delivery groups |
| `addShippingMethod(cartId, optionId)` | Select a delivery option |

### Checkout

| Method | Description |
|--------|-------------|
| `createPaymentSessions(cartId)` | Returns cart as-is (Shopify handles payment natively) |
| `selectPaymentSession(cartId, providerId)` | No-op for Shopify |
| `initializePayment(cartId, providerId)` | Returns PaymentSession with `checkoutUrl` |
| `completeCart(cartId)` | Throws -- redirect to `checkoutUrl` instead |

### Orders & Health

| Method | Description |
|--------|-------------|
| `getOrder(orderId)` | Throws 501 -- requires Admin API |
| `listOrders(filters)` | Throws 501 -- requires Admin API |
| `getRegions()` | Returns single default region |
| `healthCheck()` | Check if the Shopify store is reachable |

## API Limitations

The Shopify **Storefront API** has specific limitations compared to the Admin API:

- **Order lookup**: Not available. Use the Shopify Admin API or webhooks for order data.
- **Cart completion**: Shopify handles checkout natively via `checkoutUrl`. Server-side cart completion is not supported.
- **Inventory management**: Read-only. Use the Admin API for inventory updates.
- **Price modification**: Prices come from Shopify product configuration and cannot be overridden.

## Error Handling

All API errors throw `ShopifyApiError` with `status`, `body`, and `url` properties:

```typescript
import { ShopifyApiError } from '@agentojs/shopify';

try {
  await provider.getProduct('gid://shopify/Product/nonexistent');
} catch (err) {
  if (err instanceof ShopifyApiError) {
    console.error(`HTTP ${err.status}: ${err.body}`);
    console.error(`URL: ${err.url}`);
  }
}
```

Common error scenarios:

| Status | Cause |
|--------|-------|
| 200 (GraphQL error) | Invalid query or access denied |
| 401 | Invalid Storefront Access Token |
| 404 | Product/cart/collection not found |
| 501 | Operation requires Admin API (orders) |

## Exports

```typescript
import { ShopifyProvider, ShopifyApiError } from '@agentojs/shopify';
import type { ShopifyProviderConfig } from '@agentojs/shopify';
```

## License

[MIT](https://github.com/agentojs/agentojs/blob/main/LICENSE)
