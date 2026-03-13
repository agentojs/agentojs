# Shopify

Connect your Shopify store to AI agents using `@agentojs/shopify`.

## Prerequisites

- A Shopify store with the **Storefront API** enabled
- A **Storefront Access Token** (created in Shopify Admin)

## Shopify Setup

To create a Storefront Access Token:

1. Go to your **Shopify Admin** → **Settings** → **Apps and sales channels**
2. Click **Develop apps** → **Create an app** (give it a name like "AI Agent")
3. Under **Configuration**, select **Storefront API access scopes**:
   - `unauthenticated_read_product_listings` — browse products
   - `unauthenticated_read_product_inventory` — check stock levels
   - `unauthenticated_write_checkouts` — create carts and checkouts
   - `unauthenticated_read_checkouts` — read cart state
   - `unauthenticated_read_content` — read store info
4. Click **Install app**
5. Copy the **Storefront access token** — you'll need this for the provider config

::: tip
The Storefront Access Token is safe to use in client-side code — it only grants access to public storefront data. It's different from the Admin API key which should never be exposed.
:::

## Install

```bash
npm install @agentojs/core @agentojs/shopify
```

## Configure

```typescript
import { ShopifyProvider } from '@agentojs/shopify';

const provider = new ShopifyProvider({
  storeDomain: 'my-store.myshopify.com',
  storefrontAccessToken: 'your_storefront_access_token',
  apiVersion: '2025-01', // optional, defaults to '2025-01'
});
```

### Configuration Options

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

## Quick Example

```typescript
import { ShopifyProvider } from '@agentojs/shopify';

const provider = new ShopifyProvider({
  storeDomain: 'my-store.myshopify.com',
  storefrontAccessToken: 'your_token',
});

const { data: products } = await provider.searchProducts({ q: 'shirt', limit: 10 });
console.log(`Found ${products.length} products`);
console.log(products[0].title);
```

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

// Get a single product by Shopify GID
const product = await provider.getProduct('gid://shopify/Product/123');

// Browse collections
const collections = await provider.getCollections();
const collection = await provider.getCollection(collections[0].id);

// Create a cart
const cart = await provider.createCart('default', [
  { variant_id: 'gid://shopify/ProductVariant/456', quantity: 1 },
]);

// Add more items
await provider.addLineItem(cart.id, 'gid://shopify/ProductVariant/789', 2);

// Set buyer info and shipping address
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

// Get shipping options and select one
const shippingOptions = await provider.getShippingOptions(cart.id);
if (shippingOptions.length > 0) {
  await provider.addShippingMethod(cart.id, shippingOptions[0].id);
}

// Checkout -- Shopify handles payment natively
const payment = await provider.initializePayment(cart.id, 'shopify');
console.log(`Redirect customer to: ${payment.data.checkoutUrl}`);
```

## Using with createAgent()

The fastest way to serve your Shopify store to AI agents is `createAgent()`:

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
    storefrontAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN!,
  }),
});

await agent.start(3100);
// MCP → http://localhost:3100/mcp
// UCP → http://localhost:3100/ucp/*
// ACP → http://localhost:3100/acp/*
```

This creates an Express server with all three protocol endpoints (MCP, UCP, ACP). See [Protocol Integration](/guide/protocols) for details on each protocol.

## Shopify-Specific Notes

### Product IDs

Shopify uses Global IDs (GIDs) for all resources:

```
gid://shopify/Product/123456789
gid://shopify/ProductVariant/987654321
gid://shopify/Collection/111222333
gid://shopify/Cart/abc123def456
```

These IDs are used as-is in the provider — no conversion needed.

### Checkout Flow

Shopify handles checkout natively via `checkoutUrl`. Unlike Medusa or WooCommerce, you cannot complete a cart server-side:

1. Create a cart with `createCart()`
2. Add items, update buyer info, select shipping
3. Call `initializePayment()` to get the `checkoutUrl`
4. **Redirect the customer** to the checkout URL
5. Shopify handles payment and order creation

```typescript
const payment = await provider.initializePayment(cart.id, 'shopify');
// payment.data.checkoutUrl → "https://my-store.myshopify.com/cart/c/abc123"
```

::: warning
Calling `completeCart()` will throw an error — Shopify does not support server-side cart completion via the Storefront API. Always redirect to `checkoutUrl`.
:::

### Prices

Shopify returns prices as strings (e.g., `"29.99"`). The provider automatically converts these to integer cents (`2999`) to match the `@agentojs/core` types.

### Order Lookup

The Storefront API does not support order queries. `getOrder()` and `listOrders()` throw a 501 error. To access order data, use:

- **Shopify Admin API** — for server-side order management
- **Shopify Webhooks** — for real-time order notifications

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

### Shipping & Checkout

| Method | Description |
|--------|-------------|
| `getShippingOptions(cartId)` | Get available delivery options |
| `addShippingMethod(cartId, optionId)` | Select a delivery option |
| `initializePayment(cartId, providerId)` | Returns PaymentSession with `checkoutUrl` |
| `healthCheck()` | Check if the Shopify store is reachable |

## Error Handling

All API errors throw `ShopifyApiError`:

```typescript
import { ShopifyApiError } from '@agentojs/shopify';

try {
  await provider.getProduct('gid://shopify/Product/nonexistent');
} catch (err) {
  if (err instanceof ShopifyApiError) {
    console.error(`HTTP ${err.status}: ${err.body}`);
  }
}
```

| Status | Cause |
|--------|-------|
| 200 (GraphQL) | Invalid query or access denied |
| 401 | Invalid Storefront Access Token |
| 404 | Product/cart/collection not found |
| 501 | Operation requires Admin API (orders) |

## Exports

```typescript
import { ShopifyProvider, ShopifyApiError } from '@agentojs/shopify';
import type { ShopifyProviderConfig } from '@agentojs/shopify';
```
