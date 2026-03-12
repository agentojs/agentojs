# WooCommerce

Connect your WooCommerce store to AI agents using `@agentojs/woocommerce`.

## Prerequisites

- A WordPress site with WooCommerce installed
- REST API keys: **WooCommerce > Settings > Advanced > REST API > Add Key** (Read/Write permissions)

## Install

```bash
npm install @agentojs/core @agentojs/woocommerce
```

## Configure

```typescript
import { WooCommerceBackend } from '@agentojs/woocommerce';

const backend = new WooCommerceBackend({
  baseUrl: 'https://your-store.com',
  consumerKey: 'ck_your_consumer_key',
  consumerSecret: 'cs_your_consumer_secret',
});
```

### Configuration Options

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

## Quick Example

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

## Dual API Architecture

WooCommerce exposes two APIs with different capabilities. The adapter transparently routes calls to the correct one:

| Feature | Store API (`wc/store/v1`) | REST API (`wc/v3`) |
|---------|--------------------------|---------------------|
| Auth | None / Cart-Token JWT | Basic Auth (key + secret) |
| Products | Read (public) | Read + Write |
| Cart | Full CRUD | Not available |
| Checkout | Full flow | Not available |
| Orders | Not available | Full CRUD |
| Categories | Not available | Full CRUD |
| Shipping Zones | Not available | Read |

You don't need to know which API is used -- the adapter handles routing automatically.

## Cart-Token Management

WooCommerce carts are identified by a JWT token returned in the `Cart-Token` response header. The adapter manages this transparently:

1. Creates a UUID as the public `cartId`
2. Maps it internally to the real Cart-Token JWT
3. Stores cart state (email, addresses, payment method) in memory

::: warning
Cart state is in-memory and lost on process restart. This is acceptable for stateless AI agent interactions.
:::

## Price Handling

WooCommerce Store API returns prices in **minor units** (e.g., `"2999"` for $29.99). The adapter automatically converts them to decimal format using the `currency_minor_unit` field from the API response.

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

## API Reference

### Products

| Method | Signature | Description |
|--------|-----------|-------------|
| `searchProducts` | `(filters: ProductSearchFilters) => Promise<PaginatedResponse<Product>>` | Search products via Store API with pagination |
| `getProduct` | `(id: string) => Promise<Product>` | Get single product with variations (if variable) |
| `getCollections` | `() => Promise<Collection[]>` | List product categories with products |
| `getCollection` | `(id: string) => Promise<Collection>` | Get single category with its products |

### Cart

| Method | Signature | Description |
|--------|-----------|-------------|
| `createCart` | `(regionId: string, items: Array<{variant_id: string; quantity: number}>) => Promise<Cart>` | Create cart and add initial items |
| `getCart` | `(cartId: string) => Promise<Cart>` | Retrieve cart by ID |
| `updateCart` | `(cartId: string, updates: {...}) => Promise<Cart>` | Update email, shipping/billing address |
| `addLineItem` | `(cartId: string, variantId: string, quantity: number) => Promise<Cart>` | Add item to cart |
| `removeLineItem` | `(cartId: string, lineItemId: string) => Promise<Cart>` | Remove item by key |

### Shipping

| Method | Signature | Description |
|--------|-----------|-------------|
| `getShippingOptions` | `(cartId: string) => Promise<ShippingOption[]>` | Get available shipping rates |
| `addShippingMethod` | `(cartId: string, optionId: string) => Promise<Cart>` | Select a shipping rate |

### Checkout

| Method | Signature | Description |
|--------|-----------|-------------|
| `createPaymentSessions` | `(cartId: string) => Promise<Cart>` | Get available payment methods |
| `selectPaymentSession` | `(cartId: string, providerId: string) => Promise<Cart>` | Select payment method |
| `completeCart` | `(cartId: string) => Promise<Order>` | Complete checkout, returns Order |

::: info
`initializePayment()` is not supported for WooCommerce and throws an error. WooCommerce handles payment initialization as part of `completeCart()`.
:::

### Orders

| Method | Signature | Description |
|--------|-----------|-------------|
| `getOrder` | `(orderId: string) => Promise<Order>` | Fetch order by ID (REST API) |
| `listOrders` | `(filters: OrderListFilters) => Promise<PaginatedResponse<Order>>` | List orders with filters (email, status) |

### Regions & Health

| Method | Signature | Description |
|--------|-----------|-------------|
| `getRegions` | `() => Promise<Region[]>` | Get shipping zones as regions |
| `healthCheck` | `() => Promise<boolean>` | Check if WP REST API is accessible |

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

Common error scenarios:

| Status | Cause |
|--------|-------|
| 401 | Invalid consumer key/secret |
| 404 | Product/order not found |
| 403 | Insufficient API key permissions (need Read/Write) |
| ECONNREFUSED | WooCommerce site not reachable |

## WooCommerce-Specific Types

The package exports WooCommerce-specific types for advanced use:

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

## Exports

```typescript
import { WooCommerceBackend, WooCommerceApiError } from '@agentojs/woocommerce';
import type { WooCommerceBackendConfig } from '@agentojs/woocommerce';
```
