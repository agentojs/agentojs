# Generic REST

Connect **any** REST API to AI agents using `@agentojs/generic`. Ideal for custom e-commerce APIs, car dealerships, wholesale platforms, real estate listings, or any product catalog served over HTTP.

## When to Use

Use `@agentojs/generic` when your API is not Medusa or WooCommerce. Common scenarios:

- Custom-built e-commerce backends
- Car dealer inventory APIs
- Wholesale product catalogs
- Real estate listing services
- Any REST API that returns products in JSON

## Install

```bash
npm install @agentojs/core @agentojs/generic
```

## Configure

```typescript
import { GenericRESTBackend } from '@agentojs/generic';

const backend = new GenericRESTBackend({
  baseUrl: 'https://api.example.com',
  apiKey: 'your-api-key',
});
```

### Configuration Options

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

## Quick Example

```typescript
import { GenericRESTBackend } from '@agentojs/generic';

const backend = new GenericRESTBackend({
  baseUrl: 'https://api.mydealership.com',
  apiKey: 'my-secret-key',
});

const { data: products } = await backend.searchProducts({ q: 'sedan' });
console.log(products[0].title); // "2024 Tesla Model 3"
```

## Field Mapping

The main feature of `@agentojs/generic` is configurable field mapping. Map any API response shape to the standard `CommerceBackend` types.

### Basic Mapping

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
```

Your API returns:
```json
{ "vin": "1HGCG...", "vehicle_name": "2024 Accord", "msrp": { "amount": 32990 } }
```

The adapter maps it to:
```json
{ "id": "1HGCG...", "title": "2024 Accord", "variants": [{ "prices": [{ "amount": 32990 }] }] }
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

### Default Endpoints

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

Pass an empty string for `apiKey` when connecting to public APIs that require no authentication.

## Response Shape Detection

The adapter auto-detects common API response shapes:

```typescript
// All of these work automatically:
[{ id: '1', title: 'Product' }]                         // raw array
{ products: [{ id: '1', title: 'Product' }] }           // wrapped object
{ data: [{ id: '1', title: 'Product' }], total: 100 }   // paginated
```

## Full Example: Car Dealer API

```typescript
import { GenericRESTBackend } from '@agentojs/generic';

const backend = new GenericRESTBackend({
  baseUrl: 'https://api.cardealership.com',
  apiKey: 'dealer-key',
  apiKeyHeader: 'X-Dealer-Token',
  endpointsMap: {
    products: '/vehicles',
    product: '/vehicles/:id',
    collections: '/categories',
  },
  fieldMap: {
    product: {
      id: 'vin',
      title: 'vehicle_name',
      description: 'vehicle_desc',
      thumbnail: 'photo_url',
      price: 'msrp.amount',
    },
  },
});

// Search vehicles
const { data: vehicles } = await backend.searchProducts({ q: 'sedan' });
for (const vehicle of vehicles) {
  const price = vehicle.variants[0]?.prices[0]?.amount ?? 0;
  console.log(`${vehicle.title} - $${price}`);
}

// Get single vehicle by VIN
const vehicle = await backend.getProduct('1HGCG1655WA006789');
console.log(vehicle.title);
console.log(vehicle.description);
```

## Full Example: Public API (fakestoreapi.com)

No API key needed -- pass an empty string:

```typescript
import { GenericRESTBackend } from '@agentojs/generic';

const backend = new GenericRESTBackend({
  baseUrl: 'https://fakestoreapi.com',
  apiKey: '',
  endpointsMap: {
    products: '/products',
    product: '/products/:id',
    collections: '/products/categories',
  },
  fieldMap: {
    product: {
      handle: 'id',
    },
  },
});

const { data: products } = await backend.searchProducts({});
console.log(`${products.length} products found`);

const product = await backend.getProduct('1');
console.log(product.title);
```

## Unsupported Methods

Payment-related methods throw `GenericBackendNotImplementedError`:

- `createPaymentSessions()`
- `selectPaymentSession()`
- `initializePayment()`

Payment flows are API-specific and cannot be generalized. Use a specialized adapter (Medusa, WooCommerce) or implement a [Custom Backend](/guide/custom-backend) for full checkout.

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

## Error Handling

```typescript
import { GenericBackendNotImplementedError } from '@agentojs/generic';

try {
  await backend.createPaymentSessions('cart_123');
} catch (err) {
  if (err instanceof GenericBackendNotImplementedError) {
    console.error('Payment methods not supported for generic backends');
  }
}
```

Network errors (connection refused, timeout) throw standard `Error` objects.

## Exports

```typescript
import {
  GenericRESTBackend,
  GenericFieldMapper,
  getField,
  GenericBackendNotImplementedError,
} from '@agentojs/generic';

import type {
  GenericRESTBackendConfig,
  GenericEndpointsMap,
  GenericFieldMap,
} from '@agentojs/generic';
```
