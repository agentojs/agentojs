# @agentojs/core

[![npm version](https://img.shields.io/npm/v/@agentojs/core.svg)](https://www.npmjs.com/package/@agentojs/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/agentojs/agentojs/blob/main/LICENSE)

Core types and `CommerceBackend` interface for building AI commerce agent adapters.

**Zero runtime dependencies** -- pure TypeScript types and one interface.

Part of the [AgentOJS](https://github.com/agentojs/agentojs) monorepo.

## Installation

```bash
npm install @agentojs/core
# or
pnpm add @agentojs/core
```

## What's Included

- `CommerceProvider` -- the unified interface that all adapters implement (19 methods)
- `Product`, `Cart`, `Order`, `Address`, `Region` and 15+ supporting types
- `PaginatedResponse<T>`, `ProductSearchFilters`, `OrderListFilters` -- query/response generics
- `StoreInfo` -- store metadata type (slug, name, currency, country, backendUrl)
- `ScopeChecker` / `checkScope` -- scope-based access control interface and helper
- `Logger` / `ConsoleLogger` -- pluggable logging interface with console default
- `getCurrencyDecimals`, `toMinorUnits`, `fromMinorUnits`, `formatPrice` -- currency utilities
- `createAgent` -- convenience factory that creates a fully configured Express server with MCP, UCP, and ACP endpoints

## Usage

### Implementing a custom adapter

```typescript
import type {
  CommerceBackend,
  Product,
  PaginatedResponse,
  ProductSearchFilters,
} from '@agentojs/core';

class MyCustomBackend implements CommerceBackend {
  async searchProducts(filters: ProductSearchFilters): Promise<PaginatedResponse<Product>> {
    const response = await fetch(`https://api.example.com/products?q=${filters.q}`);
    const data = await response.json();
    return { data: data.products, count: data.total, offset: filters.offset ?? 0, limit: filters.limit ?? 20 };
  }

  async getProduct(id: string): Promise<Product> {
    const response = await fetch(`https://api.example.com/products/${id}`);
    return response.json();
  }

  // ... implement remaining methods
}
```

### Using types standalone

```typescript
import type { Product, Cart, Order, Address } from '@agentojs/core';

function formatOrderSummary(order: Order): string {
  return `Order #${order.display_id}: ${order.items.length} items, total ${order.total} ${order.currency_code}`;
}
```

### Writing backend-agnostic code

```typescript
import type { CommerceBackend } from '@agentojs/core';

async function findCheapestProduct(backend: CommerceBackend, query: string) {
  const { data } = await backend.searchProducts({ q: query, limit: 50 });
  return data.sort((a, b) => {
    const priceA = a.variants[0]?.prices[0]?.amount ?? Infinity;
    const priceB = b.variants[0]?.prices[0]?.amount ?? Infinity;
    return priceA - priceB;
  })[0];
}
```

This function works with any adapter -- Medusa, WooCommerce, or a custom REST backend.

## CommerceBackend Interface

The `CommerceBackend` interface defines 19 methods across 7 categories:

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
| `initializePayment` | `(cartId: string, providerId: string) => Promise<PaymentSession>` | Initialize payment collection and session |
| `completeCart` | `(cartId: string) => Promise<Order>` | Complete checkout, returns the created Order |

### Orders

| Method | Signature | Description |
|--------|-----------|-------------|
| `getOrder` | `(orderId: string) => Promise<Order>` | Get order by ID |
| `listOrders` | `(filters: OrderListFilters) => Promise<PaginatedResponse<Order>>` | List orders with email/status filters |

### Regions

| Method | Signature | Description |
|--------|-----------|-------------|
| `getRegions` | `() => Promise<Region[]>` | List all store regions (currencies, countries) |

### Health

| Method | Signature | Description |
|--------|-----------|-------------|
| `healthCheck` | `() => Promise<boolean>` | Check if the e-commerce backend is reachable |

## Type Reference

### Core Entities

| Type | Key Fields |
|------|------------|
| `Product` | `id`, `title`, `description`, `handle`, `thumbnail`, `images`, `variants`, `options`, `categories`, `tags`, `status` |
| `ProductVariant` | `id`, `title`, `sku`, `barcode`, `prices`, `options`, `inventory_quantity`, `weight` |
| `Price` | `id`, `amount`, `currency_code`, `min_quantity`, `max_quantity` |
| `Collection` | `id`, `title`, `handle`, `products` |
| `Cart` | `id`, `items`, `region_id`, `currency_code`, `subtotal`, `tax_total`, `shipping_total`, `total`, `email`, `shipping_address` |
| `LineItem` | `id`, `variant_id`, `product_id`, `title`, `quantity`, `unit_price`, `total` |
| `Order` | `id`, `display_id`, `status`, `items`, `currency_code`, `total`, `email`, `shipping_address`, `fulfillments` |
| `Address` | `first_name`, `last_name`, `address_1`, `city`, `province`, `postal_code`, `country_code` |
| `Region` | `id`, `name`, `currency_code`, `countries` |
| `ShippingOption` | `id`, `name`, `amount`, `region_id` |
| `PaymentSession` | `id`, `provider_id`, `status`, `amount`, `currency_code` |

### Query/Response Types

| Type | Description |
|------|-------------|
| `PaginatedResponse<T>` | `{ data: T[], count, offset, limit }` |
| `ProductSearchFilters` | `{ q?, category_id[]?, collection_id[]?, tags[]?, price_min?, price_max?, limit?, offset? }` |
| `OrderListFilters` | `{ email?, status?, limit?, offset? }` |

## createAgent -- Quick Start Server

The fastest way to get a fully working AI commerce server:

```typescript
import { createAgent } from '@agentojs/core';
import { MedusaBackend } from '@agentojs/medusa';

const agent = await createAgent({
  store: {
    slug: 'my-store',
    name: 'My Store',
    currency: 'usd',
    country: 'us',
    backendUrl: 'https://your-medusa-store.com',
  },
  provider: new MedusaBackend({
    backendUrl: 'https://your-medusa-store.com',
    apiKey: 'pk_your_publishable_key',
  }),
  port: 3000,
});

await agent.start();
// MCP: POST http://localhost:3000/mcp
// UCP: http://localhost:3000/ucp/*
// ACP: http://localhost:3000/acp/*
```

Requires `@agentojs/express`, `@agentojs/mcp`, `@agentojs/ucp`, `@agentojs/acp`, and `express` as peer dependencies.

## Available Adapters

- [`@agentojs/medusa`](https://github.com/agentojs/agentojs/tree/main/packages/medusa) -- Medusa.js v2 adapter
- [`@agentojs/woocommerce`](https://github.com/agentojs/agentojs/tree/main/packages/woocommerce) -- WooCommerce adapter
- [`@agentojs/generic`](https://github.com/agentojs/agentojs/tree/main/packages/generic) -- Generic REST API adapter with configurable field mapping

## License

[MIT](https://github.com/agentojs/agentojs/blob/main/LICENSE)
