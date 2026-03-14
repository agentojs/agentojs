# CommerceProvider

The `CommerceProvider` interface defines the unified API that all adapter packages implement. It provides 21 methods across 7 categories.

```ts
import type { CommerceProvider } from '@agentojs/core'
```

## Products

### searchProducts

Search and filter products from the catalog.

```ts
searchProducts(filters: ProductSearchFilters): Promise<PaginatedResponse<Product>>
```

**Parameters:**

| Field | Type | Description |
|---|---|---|
| `q` | `string?` | Free-text search query |
| `category_id` | `string[]?` | Filter by category IDs |
| `collection_id` | `string[]?` | Filter by collection IDs |
| `tags` | `string[]?` | Filter by tags |
| `price_min` | `number?` | Minimum price |
| `price_max` | `number?` | Maximum price |
| `currency_code` | `string?` | Currency code (e.g. `usd`) |
| `limit` | `number?` | Max results to return |
| `offset` | `number?` | Offset for pagination |

**Returns:** [`PaginatedResponse<Product>`](/api/types#paginatedresponse)

### getProduct

Retrieve a single product by ID.

```ts
getProduct(id: string): Promise<Product>
```

**Returns:** [`Product`](/api/types#product)

### getCollections

List all product collections.

```ts
getCollections(): Promise<Collection[]>
```

**Returns:** [`Collection[]`](/api/types#collection)

### getCollection

Retrieve a single collection by ID.

```ts
getCollection(id: string): Promise<Collection>
```

**Returns:** [`Collection`](/api/types#collection)

## Cart

### createCart

Create a new shopping cart with initial items.

```ts
createCart(
  regionId: string,
  items: Array<{ variant_id: string; quantity: number }>
): Promise<Cart>
```

| Parameter | Type | Description |
|---|---|---|
| `regionId` | `string` | Region for pricing/currency |
| `items` | `Array<{ variant_id: string; quantity: number }>` | Initial line items |

**Returns:** [`Cart`](/api/types#cart)

### getCart

Retrieve an existing cart by ID.

```ts
getCart(cartId: string): Promise<Cart>
```

**Returns:** [`Cart`](/api/types#cart)

### updateCart

Update cart properties (email, addresses, metadata).

```ts
updateCart(
  cartId: string,
  updates: {
    email?: string
    shipping_address?: Address
    billing_address?: Address
    metadata?: Record<string, unknown>
  }
): Promise<Cart>
```

| Parameter | Type | Description |
|---|---|---|
| `cartId` | `string` | Cart ID |
| `updates.email` | `string?` | Customer email |
| `updates.shipping_address` | [`Address?`](/api/types#address) | Shipping address |
| `updates.billing_address` | [`Address?`](/api/types#address) | Billing address |
| `updates.metadata` | `Record<string, unknown>?` | Custom metadata |

**Returns:** [`Cart`](/api/types#cart)

### addLineItem

Add a product variant to the cart.

```ts
addLineItem(cartId: string, variantId: string, quantity: number): Promise<Cart>
```

**Returns:** [`Cart`](/api/types#cart)

### removeLineItem

Remove a line item from the cart.

```ts
removeLineItem(cartId: string, lineItemId: string): Promise<Cart>
```

**Returns:** [`Cart`](/api/types#cart)

## Shipping

### getShippingOptions

List available shipping options for a cart.

```ts
getShippingOptions(cartId: string): Promise<ShippingOption[]>
```

**Returns:** [`ShippingOption[]`](/api/types#shippingoption)

### addShippingMethod

Apply a shipping method to the cart.

```ts
addShippingMethod(cartId: string, optionId: string): Promise<Cart>
```

**Returns:** [`Cart`](/api/types#cart)

## Checkout

### createPaymentSessions

Initialize payment sessions for the cart.

```ts
createPaymentSessions(cartId: string): Promise<Cart>
```

**Returns:** [`Cart`](/api/types#cart) (with `payment_sessions` populated)

### selectPaymentSession

Select a payment provider for the cart.

```ts
selectPaymentSession(cartId: string, providerId: string): Promise<Cart>
```

**Returns:** [`Cart`](/api/types#cart)

### initializePayment

Initialize a payment with a specific provider. Returns provider-specific data (e.g. Stripe client secret).

```ts
initializePayment(cartId: string, providerId: string): Promise<PaymentSession>
```

**Returns:** [`PaymentSession`](/api/types#paymentsession)

### completeCart

Complete the cart and place the order.

```ts
completeCart(cartId: string): Promise<Order>
```

**Returns:** [`Order`](/api/types#order)

## Orders

### getOrder

Retrieve a single order by ID.

```ts
getOrder(orderId: string): Promise<Order>
```

**Returns:** [`Order`](/api/types#order)

### listOrders

List orders with optional filters.

```ts
listOrders(filters: OrderListFilters): Promise<PaginatedResponse<Order>>
```

**Parameters:**

| Field | Type | Description |
|---|---|---|
| `email` | `string?` | Filter by customer email |
| `status` | `string?` | Filter by order status |
| `limit` | `number?` | Max results to return |
| `offset` | `number?` | Offset for pagination |

**Returns:** [`PaginatedResponse<Order>`](/api/types#paginatedresponse)

## Regions

### getRegions

List all available regions with their currencies and countries.

```ts
getRegions(): Promise<Region[]>
```

**Returns:** [`Region[]`](/api/types#region)

## Health

### healthCheck

Check if the backend is reachable. Returns `true` if healthy, `false` otherwise. Does not throw.

```ts
healthCheck(): Promise<boolean>
```

**Returns:** `boolean`

## Method Summary

| Category | Method | Description |
|---|---|---|
| Products | `searchProducts` | Search catalog with filters |
| Products | `getProduct` | Get product by ID |
| Products | `getCollections` | List all collections |
| Products | `getCollection` | Get collection by ID |
| Cart | `createCart` | Create cart with items |
| Cart | `getCart` | Get cart by ID |
| Cart | `updateCart` | Update email/addresses |
| Cart | `addLineItem` | Add variant to cart |
| Cart | `removeLineItem` | Remove item from cart |
| Shipping | `getShippingOptions` | List shipping options |
| Shipping | `addShippingMethod` | Apply shipping to cart |
| Checkout | `createPaymentSessions` | Init payment sessions |
| Checkout | `selectPaymentSession` | Select payment provider |
| Checkout | `initializePayment` | Initialize payment |
| Checkout | `completeCart` | Place the order |
| Orders | `getOrder` | Get order by ID |
| Orders | `listOrders` | List orders with filters |
| Regions | `getRegions` | List regions |
| Health | `healthCheck` | Check backend status |
