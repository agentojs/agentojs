# Getting Started

AgentOJS is agentic middleware for AI commerce. It provides a unified `CommerceBackend` interface that works with any e-commerce platform -- Medusa.js, WooCommerce, or any REST API.

## How It Works

1. Install `@agentojs/core` (types) and an adapter package (Medusa, WooCommerce, or Generic REST)
2. Create a backend instance with your store credentials
3. Call methods like `searchProducts()`, `createCart()`, `completeCart()`

All adapters implement the same 19-method `CommerceBackend` interface, so your code works the same regardless of the underlying platform.

## Install

Pick the adapter that matches your e-commerce backend:

::: code-group

```bash [Medusa.js v2]
npm install @agentojs/core @agentojs/medusa
```

```bash [WooCommerce]
npm install @agentojs/core @agentojs/woocommerce
```

```bash [Generic REST API]
npm install @agentojs/core @agentojs/generic
```

:::

## Minimal Example

```typescript
import { MedusaBackend } from '@agentojs/medusa';

const backend = new MedusaBackend({
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

That's it. Three lines to connect, one line to search.

## Backend-Agnostic Code

The `CommerceBackend` type lets you write code that works with any adapter:

```typescript
import type { CommerceBackend, Product } from '@agentojs/core';

async function findCheapestProduct(
  backend: CommerceBackend,
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

Pass any adapter -- `MedusaBackend`, `WooCommerceBackend`, or `GenericRESTBackend` -- and the function works unchanged.

## Full Checkout Flow

Every adapter supports the same checkout workflow:

```typescript
import type { CommerceBackend } from '@agentojs/core';

async function checkout(backend: CommerceBackend) {
  // 1. Search and pick a product
  const { data } = await backend.searchProducts({ q: 'hoodie' });
  const variant = data[0].variants[0];

  // 2. Create a cart
  const cart = await backend.createCart('reg_01ABC', [
    { variant_id: variant.id, quantity: 1 },
  ]);

  // 3. Set shipping address
  await backend.updateCart(cart.id, {
    email: 'customer@example.com',
    shipping_address: {
      first_name: 'Jane',
      last_name: 'Doe',
      address_1: '123 Main St',
      city: 'New York',
      province: 'NY',
      postal_code: '10001',
      country_code: 'US',
    },
  });

  // 4. Select shipping
  const options = await backend.getShippingOptions(cart.id);
  await backend.addShippingMethod(cart.id, options[0].id);

  // 5. Complete checkout
  const order = await backend.completeCart(cart.id);
  console.log(`Order #${order.display_id} placed`);
}
```

## CommerceBackend Methods

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

See the [API Reference](/api/commerce-backend) for full method signatures.

## Error Handling

Each adapter throws its own typed error class:

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

See [Errors](/api/errors) for all error types.

## Next Steps

- [Medusa Guide](/guide/medusa) -- Connect to a Medusa.js v2 store
- [WooCommerce Guide](/guide/woocommerce) -- Connect to a WooCommerce site
- [Generic REST Guide](/guide/generic) -- Connect to any REST API
- [Custom Backend](/guide/custom-backend) -- Implement your own adapter
- [API Reference](/api/commerce-backend) -- Full method signatures and types
