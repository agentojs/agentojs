# AgentOJS

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Agentic middleware for AI commerce protocols. One interface, every e-commerce backend.

AgentOJS provides a unified `CommerceBackend` interface that abstracts away the differences between e-commerce platforms. Build AI agents that work with Medusa.js, WooCommerce, or any REST API — without rewriting integration code.

## Architecture

```
                    +-----------------------+
                    |   Your AI Agent       |
                    |  (MCP / UCP / ACP)    |
                    +-----------+-----------+
                                |
                    +-----------v-----------+
                    |   CommerceBackend     |
                    |   (@agentojs/core)    |
                    +-----------+-----------+
                                |
            +-------------------+-------------------+
            |                   |                   |
  +---------v-------+  +-------v---------+  +------v----------+
  | @agentojs/medusa|  |@agentojs/       |  |@agentojs/generic|
  | Medusa.js v2    |  |woocommerce      |  | Any REST API    |
  +-----------------+  +-----------------+  +-----------------+
```

## Packages

| Package | Description |
|---------|-------------|
| [`@agentojs/core`](packages/core) | TypeScript types and `CommerceBackend` interface |
| [`@agentojs/medusa`](packages/medusa) | Medusa.js v2 Store API adapter |
| [`@agentojs/woocommerce`](packages/woocommerce) | WooCommerce dual-API adapter (Store API + REST API) |
| [`@agentojs/generic`](packages/generic) | Generic REST API adapter with configurable field mapping |

## Quick Start

Connect a Medusa.js store in 5 lines:

```typescript
import { MedusaBackend } from '@agentojs/medusa';

const store = new MedusaBackend({
  backendUrl: 'https://your-medusa-store.com',
  apiKey: 'pk_your_publishable_key',
});

const products = await store.searchProducts({ q: 'shirt', limit: 10 });
console.log(products.data);
```

Or connect a WooCommerce store:

```typescript
import { WooCommerceBackend } from '@agentojs/woocommerce';

const store = new WooCommerceBackend({
  baseUrl: 'https://your-woocommerce-store.com',
  consumerKey: 'ck_your_key',
  consumerSecret: 'cs_your_secret',
});

const products = await store.searchProducts({ q: 'hoodie' });
```

Or connect any REST API with custom field mapping:

```typescript
import { GenericRESTBackend } from '@agentojs/generic';

const store = new GenericRESTBackend({
  baseUrl: 'https://api.cardealership.com',
  apiKey: 'dealer-key',
  fieldMap: {
    product: { title: 'vehicle_name', price: 'msrp.amount', id: 'vin' },
  },
});

const vehicles = await store.searchProducts({ q: 'sedan' });
```

All three return the same `Product[]` type. Write your agent logic once, swap backends freely.

## Installation

```bash
# Core types (required by all adapters)
npm install @agentojs/core

# Pick your adapter(s)
npm install @agentojs/medusa
npm install @agentojs/woocommerce
npm install @agentojs/generic
```

## CommerceBackend Interface

Every adapter implements these 19 methods:

| Category | Methods |
|----------|---------|
| Products | `searchProducts`, `getProduct`, `getCollections`, `getCollection` |
| Cart | `createCart`, `getCart`, `updateCart`, `addLineItem`, `removeLineItem` |
| Shipping | `getShippingOptions`, `addShippingMethod` |
| Checkout | `createPaymentSessions`, `selectPaymentSession`, `initializePayment`, `completeCart` |
| Orders | `getOrder`, `listOrders` |
| Regions | `getRegions` |
| Health | `healthCheck` |

## Examples

See the [`examples/`](examples/) directory for runnable demos:

- [`medusa-basic`](examples/medusa-basic/) — Connect to Medusa, search products
- [`woocommerce-basic`](examples/woocommerce-basic/) — Connect to WooCommerce, create a cart
- [`generic-car-dealer`](examples/generic-car-dealer/) — Custom field mapping for a car dealer API
- [`multi-store`](examples/multi-store/) — Query multiple backends with one interface

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm -r build

# Run all tests
pnpm test

# Type-check all packages
pnpm -r typecheck
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidelines.

## License

[MIT](LICENSE)
