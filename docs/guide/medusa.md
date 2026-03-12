# Medusa.js v2

Connect your Medusa.js v2 store to AI agents using `@agentojs/medusa`.

## Prerequisites

- A running Medusa.js v2 instance (v2.0+)
- A publishable API key (created in Medusa Admin under Settings > API Keys)

## Install

```bash
npm install @agentojs/core @agentojs/medusa
```

## Configure

```typescript
import { MedusaBackend } from '@agentojs/medusa';

const backend = new MedusaBackend({
  backendUrl: 'https://your-medusa-store.com',
  apiKey: 'pk_your_publishable_key',
  regionId: 'reg_01ABC', // optional -- auto-detected if omitted
});
```

### Configuration Options

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

The `regionId` controls currency and country settings for product pricing. If omitted, the adapter calls `getRegions()` once and caches the first region's ID.

## Quick Example

```typescript
import { MedusaBackend } from '@agentojs/medusa';

const backend = new MedusaBackend({
  backendUrl: 'https://your-medusa-store.com',
  apiKey: 'pk_your_publishable_key',
});

const { data: products } = await backend.searchProducts({ q: 'shirt', limit: 10 });
console.log(`Found ${products.length} products`);
console.log(products[0].title);
```

## Full Example

```typescript
import { MedusaBackend } from '@agentojs/medusa';

const backend = new MedusaBackend({
  backendUrl: 'https://your-medusa-store.com',
  apiKey: 'pk_your_publishable_key',
  regionId: 'reg_01ABC',
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

// Set shipping address
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

// Select shipping
const shippingOptions = await backend.getShippingOptions(cart.id);
await backend.addShippingMethod(cart.id, shippingOptions[0].id);

// Checkout
const payment = await backend.initializePayment(cart.id, 'stripe');
const order = await backend.completeCart(cart.id);
console.log(`Order ${order.display_id} created!`);
```

## API Reference

### Products

| Method | Signature | Description |
|--------|-----------|-------------|
| `searchProducts` | `(filters: ProductSearchFilters) => Promise<PaginatedResponse<Product>>` | Search with text query, category/collection filters, price range, pagination |
| `getProduct` | `(id: string) => Promise<Product>` | Get a single product by ID with variants and pricing |
| `getCollections` | `() => Promise<Collection[]>` | List all product collections |
| `getCollection` | `(id: string) => Promise<Collection>` | Get a single collection with its products |

### Cart

| Method | Signature | Description |
|--------|-----------|-------------|
| `createCart` | `(regionId: string, items: Array<{variant_id: string; quantity: number}>) => Promise<Cart>` | Create a new cart with initial items |
| `getCart` | `(cartId: string) => Promise<Cart>` | Retrieve cart by ID |
| `updateCart` | `(cartId: string, updates: {...}) => Promise<Cart>` | Update email, shipping/billing address, metadata |
| `addLineItem` | `(cartId: string, variantId: string, quantity: number) => Promise<Cart>` | Add a line item to cart |
| `removeLineItem` | `(cartId: string, lineItemId: string) => Promise<Cart>` | Remove a line item from cart |

### Shipping

| Method | Signature | Description |
|--------|-----------|-------------|
| `getShippingOptions` | `(cartId: string) => Promise<ShippingOption[]>` | Get available shipping options for a cart |
| `addShippingMethod` | `(cartId: string, optionId: string) => Promise<Cart>` | Select a shipping method |

### Checkout

| Method | Signature | Description |
|--------|-----------|-------------|
| `createPaymentSessions` | `(cartId: string) => Promise<Cart>` | Create payment sessions for cart |
| `selectPaymentSession` | `(cartId: string, providerId: string) => Promise<Cart>` | Select a payment provider |
| `initializePayment` | `(cartId: string, providerId: string) => Promise<PaymentSession>` | Initialize payment (creates payment collection + session) |
| `completeCart` | `(cartId: string) => Promise<Order>` | Complete checkout, returns the created Order |

### Orders

| Method | Signature | Description |
|--------|-----------|-------------|
| `getOrder` | `(orderId: string) => Promise<Order>` | Get order by ID |
| `listOrders` | `(filters: OrderListFilters) => Promise<PaginatedResponse<Order>>` | List orders with email/status filters |

### Regions & Health

| Method | Signature | Description |
|--------|-----------|-------------|
| `getRegions` | `() => Promise<Region[]>` | List all store regions (currencies, countries) |
| `healthCheck` | `() => Promise<boolean>` | Check if the Medusa server is reachable |

## Medusa v2 Checkout Flow

Medusa v2 uses a payment-collections flow that differs from v1. The adapter handles this transparently:

1. `createCart()` -- creates the cart
2. `updateCart()` -- sets email and shipping address
3. `getShippingOptions()` + `addShippingMethod()` -- configures shipping
4. `initializePayment()` -- creates a payment collection and initializes a session (Medusa v2 specific)
5. `completeCart()` -- finalizes the order

The `initializePayment()` method wraps Medusa v2's two-step process (create payment collection, then initialize session) into a single call.

## Error Handling

All API errors throw `MedusaApiError`:

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

Common error scenarios:

| Status | Cause |
|--------|-------|
| 401 | Invalid or missing publishable API key |
| 404 | Product/cart/order not found |
| 422 | Validation error (e.g., invalid region ID) |
| ECONNREFUSED | Medusa server not running |

`healthCheck()` returns `false` (not throws) when the server is unreachable. Other methods throw on connection failure.

## Exports

```typescript
import { MedusaBackend, MedusaApiError } from '@agentojs/medusa';
import type { MedusaBackendConfig } from '@agentojs/medusa';
```
