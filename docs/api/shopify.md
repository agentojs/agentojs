# @agentojs/shopify

Shopify Storefront API adapter for AgentOJS — expose Shopify stores to AI agents via MCP, UCP, and ACP protocols.

## Installation

```bash
npm install @agentojs/shopify @agentojs/core
```

Peer dependency: `@agentojs/core ^0.3.0`.

## `ShopifyProvider`

Implements the `CommerceProvider` interface using [Shopify's Storefront API](https://shopify.dev/docs/api/storefront) (GraphQL).

```ts
import { ShopifyProvider } from '@agentojs/shopify';

const provider = new ShopifyProvider({
  storeDomain: 'my-store.myshopify.com',
  storefrontAccessToken: 'your-storefront-access-token',
});
```

### `ShopifyProviderConfig`

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `storeDomain` | `string` | Yes | — | Shopify store domain (e.g. `my-store.myshopify.com`) |
| `storefrontAccessToken` | `string` | Yes | — | Shopify Storefront Access Token |
| `apiVersion` | `string` | No | `'2025-01'` | Storefront API version |

### API Endpoint

All requests go to:

```
https://{storeDomain}/api/{apiVersion}/graphql.json
```

With headers:
- `Content-Type: application/json`
- `X-Shopify-Storefront-Access-Token: {token}`

## Method Reference

### Products

#### `searchProducts(filters)`

Searches products using Shopify's product search query. Supports text search and tag filtering.

```ts
const results = await provider.searchProducts({
  q: 'shoes',
  limit: 10,
  offset: 0,
});
// results: PaginatedResponse<Product>
```

#### `getProduct(id)`

Retrieves a single product by Shopify global ID.

```ts
const product = await provider.getProduct('gid://shopify/Product/123');
```

Throws `ShopifyApiError` (404) if not found.

### Collections

#### `getCollections()`

Lists all collections (first 50).

```ts
const collections = await provider.getCollections();
```

#### `getCollection(id)`

Retrieves a single collection with its products (first 50).

```ts
const collection = await provider.getCollection('gid://shopify/Collection/123');
```

### Cart

#### `createCart(regionId, items)`

Creates a new Shopify cart with initial line items. The `regionId` parameter is accepted but ignored (Shopify has no regions concept in the Storefront API).

```ts
const cart = await provider.createCart('default', [
  { variant_id: 'gid://shopify/ProductVariant/456', quantity: 2 },
]);
// cart.id = Shopify cart GID
```

#### `getCart(cartId)`

Retrieves a cart by its Shopify cart GID.

#### `updateCart(cartId, updates)`

Updates buyer identity (email, shipping address) on a cart via the `cartBuyerIdentityUpdate` mutation.

```ts
await provider.updateCart(cartId, {
  email: 'customer@example.com',
  shipping_address: {
    address_1: '123 Main St',
    city: 'New York',
    province: 'NY',
    postal_code: '10001',
    country_code: 'US',
  },
});
```

#### `addLineItem(cartId, variantId, quantity)`

Adds a product variant to the cart via `cartLinesAdd` mutation.

#### `removeLineItem(cartId, lineItemId)`

Removes a line item from the cart via `cartLinesRemove` mutation.

### Shipping

#### `getShippingOptions(cartId)`

Extracts shipping options from the cart's delivery groups. Returns an empty array if no delivery groups are available.

```ts
const options = await provider.getShippingOptions(cartId);
// options: ShippingOption[]
```

#### `addShippingMethod(cartId, optionId)`

Selects a delivery option (by handle) for the cart via `cartSelectedDeliveryOptionsUpdate` mutation.

### Checkout & Payment

Shopify uses its own hosted checkout. The provider adapts this pattern to the `CommerceProvider` interface:

#### `createPaymentSessions(cartId)`

No-op — returns the cart as-is. Shopify handles payment natively.

#### `selectPaymentSession(cartId, providerId)`

No-op — returns the cart as-is.

#### `initializePayment(cartId, providerId)`

Returns a `PaymentSession` with the Shopify `checkoutUrl` in the `data` field:

```ts
const session = await provider.initializePayment(cartId, 'shopify');
// session.data.checkoutUrl = "https://my-store.myshopify.com/cart/c/..."
```

#### `completeCart(cartId)`

Throws `ShopifyApiError` (400) with a message containing the `checkoutUrl`. Shopify checkout must happen in the browser — server-side order completion is not supported via the Storefront API.

::: warning
To complete a purchase, redirect the customer to the `checkoutUrl` from `initializePayment()`. The Storefront API does not support server-side order completion.
:::

### Orders

#### `getOrder(orderId)` / `listOrders(filters)`

Both throw `ShopifyApiError` (501). The Storefront API does not support order queries — use the [Shopify Admin API](https://shopify.dev/docs/api/admin-rest) instead.

### Regions

#### `getRegions()`

Returns a single default region. Shopify does not have a regions concept in the Storefront API.

```ts
const regions = await provider.getRegions();
// [{ id: "default", name: "Default", currency_code: "usd", countries: [] }]
```

### Health

#### `healthCheck()`

Queries the shop name to verify connectivity. Returns `true` on success, `false` on failure.

## `ShopifyApiError`

Custom error class for Shopify API failures.

```ts
import { ShopifyApiError } from '@agentojs/shopify';

try {
  await provider.getProduct('invalid-id');
} catch (err) {
  if (err instanceof ShopifyApiError) {
    console.log(err.status);  // 404
    console.log(err.body);    // "Product not found"
    console.log(err.url);     // "https://my-store.myshopify.com/api/2025-01/graphql.json"
  }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `status` | `number` | HTTP status code (or custom: 404, 501) |
| `body` | `string` | Error message or response body |
| `url` | `string` | Shopify API endpoint URL |

## Price Handling

Shopify returns prices as decimal strings (e.g. `"29.99"`). The provider converts them to integer cents for consistency with the `CommerceProvider` interface:

```
"29.99" → 2999  (Math.round(parseFloat(amount) * 100))
```

## Limitations

- **No server-side checkout** — customers must be redirected to `checkoutUrl`
- **No order queries** — Storefront API limitation (requires Admin API)
- **Single default region** — Shopify has no regions in the Storefront API
- **50-item limits** — collection and product listings are capped at 50 items per query

## Full Example

```ts
import express from 'express';
import { agentMiddleware } from '@agentojs/express';
import { ShopifyProvider } from '@agentojs/shopify';

const app = express();

app.use('/ai', agentMiddleware({
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
}));

app.listen(3100);
```

::: tip
See the [`examples/shopify-basic`](https://github.com/agentojs/agentojs/tree/main/examples/shopify-basic) directory for a complete working example.
:::
