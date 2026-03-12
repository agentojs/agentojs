# @agentojs/generic

[![npm version](https://img.shields.io/npm/v/@agentojs/generic.svg)](https://www.npmjs.com/package/@agentojs/generic)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/agentojs/agentojs/blob/main/LICENSE)

Generic REST API adapter for AI commerce agents. Connects to **any** REST API with configurable field mapping -- ideal for car dealers, wholesalers, real estate, or custom e-commerce APIs.

Part of the [AgentOJS](https://github.com/agentojs/agentojs) monorepo.

## Features

- Configurable field mapping with dot-notation for nested fields
- Automatic response shape detection (raw array, wrapped object, paginated)
- Custom endpoint paths to match any API structure
- Smart fallback chains for common field names
- Standalone `GenericFieldMapper` class for reuse
- Native `fetch()` -- zero runtime dependencies

## Installation

```bash
npm install @agentojs/generic @agentojs/core
```

## Quick Start

```typescript
import { GenericRESTBackend } from '@agentojs/generic';

const backend = new GenericRESTBackend({
  baseUrl: 'https://api.mydealership.com',
  apiKey: 'my-secret-key',
});

const { data: products } = await backend.searchProducts({ q: 'sedan' });
console.log(products[0].title); // "2024 Tesla Model 3"
```

## Custom Field Mapping

The main feature of `@agentojs/generic` is configurable field mapping. Map any API response shape to the standard `CommerceBackend` types:

```typescript
const backend = new GenericRESTBackend({
  baseUrl: 'https://api.cardealership.com',
  apiKey: 'dealer-key',
  fieldMap: {
    product: {
      title: 'vehicle_name',       // maps "vehicle_name" -> Product.title
      price: 'msrp.amount',        // dot-notation for nested fields
      description: 'vehicle_desc',
      thumbnail: 'photo_url',
      id: 'vin',                   // use VIN as product ID
    },
  },
});

// Your API returns:
// { vin: "1HGCG...", vehicle_name: "2024 Accord", msrp: { amount: 32990 } }
//
// GenericRESTBackend maps it to:
// { id: "1HGCG...", title: "2024 Accord", variants: [{ prices: [{ amount: 32990 }] }] }
```

### GenericFieldMap Structure

```typescript
interface GenericFieldMap {
  product?: Record<string, string>;  // Product field mappings
  cart?: Record<string, string>;     // Cart field mappings
  order?: Record<string, string>;    // Order field mappings
}
```

Each entry maps a standard field name to a path in your API's response. Use dot-notation for nested fields (e.g., `'pricing.retail_price'`).

### Fallback Chains

Even without custom mappings, the adapter tries common field names automatically:

| Standard Field | Fallback Chain |
|---|---|
| `title` | `title` -> `name` -> `product_name` -> `vehicle_name` |
| `description` | `description` -> `body_html` -> `short_description` |
| `handle` | `handle` -> `slug` -> `sku` |
| `thumbnail` | `thumbnail` -> `image` -> `image_url` -> `photo_url` -> `featured_image` |
| `price` | `price` -> `msrp` -> `retail_price` -> `pricing.amount` |
| `id` | `id` -> `product_id` -> `item_id` |

Custom field mappings take priority over fallback chains.

## Custom Endpoints

Override default endpoint paths to match your API:

```typescript
const backend = new GenericRESTBackend({
  baseUrl: 'https://api.example.com',
  apiKey: 'key',
  endpointsMap: {
    products: '/api/v2/inventory',
    product: '/api/v2/inventory/:id',
    health: '/api/status',
  },
});
```

### GenericEndpointsMap Reference

| Key | Default Path | HTTP Method |
|---|---|---|
| `products` | `/products` | GET |
| `product` | `/products/:id` | GET |
| `collections` | `/collections` | GET |
| `collection` | `/collections/:id` | GET |
| `createCart` | `/carts` | POST |
| `getCart` | `/carts/:id` | GET |
| `updateCart` | `/carts/:id` | PATCH |
| `addLineItem` | `/carts/:id/line-items` | POST |
| `removeLineItem` | `/carts/:id/line-items/:lineItemId` | DELETE |
| `shippingOptions` | `/shipping-options` | GET |
| `addShippingMethod` | `/carts/:id/shipping-methods` | POST |
| `completeCart` | `/carts/:id/complete` | POST |
| `getOrder` | `/orders/:id` | GET |
| `orders` | `/orders` | GET |
| `regions` | `/regions` | GET |
| `health` | `/health` | GET |

## Authentication

By default, the API key is sent as `Authorization: Bearer <key>`. Configure a custom header:

```typescript
const backend = new GenericRESTBackend({
  baseUrl: 'https://api.example.com',
  apiKey: 'my-key',
  apiKeyHeader: 'X-API-Key', // sends: X-API-Key: my-key (no Bearer prefix)
});
```

## Configuration Reference

```typescript
interface GenericRESTBackendConfig {
  /** Base URL of the REST API */
  baseUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Custom auth header name (default: "Authorization" with Bearer prefix) */
  apiKeyHeader?: string;
  /** Override default endpoint paths */
  endpointsMap?: GenericEndpointsMap;
  /** Custom field mappings for response transformation */
  fieldMap?: GenericFieldMap;
}
```

## Response Shape Detection

The adapter auto-detects common API response shapes:

```typescript
// All of these work:
[{ id: '1', title: 'Product' }]                         // raw array
{ products: [{ id: '1', title: 'Product' }] }           // wrapped
{ data: [{ id: '1', title: 'Product' }], total: 100 }   // paginated
```

## Unsupported Methods

Payment-related methods (`createPaymentSessions`, `selectPaymentSession`, `initializePayment`) throw `GenericBackendNotImplementedError`. Payment flows are API-specific and cannot be generalized. Use a specialized adapter (Medusa, WooCommerce) for full checkout.

## GenericFieldMapper (Standalone)

Use the field mapper independently of the REST backend:

```typescript
import { GenericFieldMapper, getField } from '@agentojs/generic';

const mapper = new GenericFieldMapper({
  product: { title: 'vehicle_name', price: 'msrp.amount' },
});

const product = mapper.mapProduct(rawApiResponse);
const cart = mapper.mapCart(rawCartResponse);
const order = mapper.mapOrder(rawOrderResponse);

// Low-level dot-notation resolver
const value = getField({ pricing: { amount: 99 } }, 'pricing.amount'); // 99
```

## API Reference

### GenericRESTBackend

Implements `CommerceBackend` from `@agentojs/core`.

| Method | Description |
|---|---|
| `searchProducts(filters)` | Search/list products with optional filters |
| `getProduct(id)` | Get a single product by ID |
| `getCollections()` | List all collections |
| `getCollection(id)` | Get a single collection by ID |
| `createCart(regionId, items)` | Create a new cart |
| `getCart(cartId)` | Get cart by ID |
| `updateCart(cartId, updates)` | Update cart (email, addresses) |
| `addLineItem(cartId, variantId, qty)` | Add item to cart |
| `removeLineItem(cartId, lineItemId)` | Remove item from cart |
| `getShippingOptions(cartId)` | List shipping options |
| `addShippingMethod(cartId, optionId)` | Add shipping to cart |
| `completeCart(cartId)` | Complete cart, create order |
| `getOrder(orderId)` | Get order by ID |
| `listOrders(filters)` | List orders with filters |
| `getRegions()` | List regions (fallback: default US region) |
| `healthCheck()` | Check API availability |

### Exports

- `GenericRESTBackend` -- Main adapter class
- `GenericFieldMapper` -- Standalone field mapper
- `getField(obj, path)` -- Dot-notation field resolver
- `GenericBackendNotImplementedError` -- Error for unsupported methods

Type exports:

- `GenericRESTBackendConfig` -- Constructor config
- `GenericEndpointsMap` -- Custom endpoint paths
- `GenericFieldMap` -- Custom field mappings

## License

[MIT](https://github.com/agentojs/agentojs/blob/main/LICENSE)
