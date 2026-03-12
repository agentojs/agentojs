# Core Types

All types are exported from `@agentojs/core`. They are used as return types across all adapter packages.

```ts
import type {
  Product,
  Cart,
  Order,
  Region,
  PaginatedResponse,
  // ... all types below
} from '@agentojs/core'
```

## Product Types

### Product

```ts
interface Product {
  id: string
  title: string
  description: string
  handle: string
  thumbnail: string | null
  images: ProductImage[]
  variants: ProductVariant[]
  options: ProductOption[]
  collection_id: string | null
  categories: ProductCategory[]
  tags: ProductTag[]
  status: 'draft' | 'published' | 'proposed' | 'rejected'
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}
```

### ProductVariant

```ts
interface ProductVariant {
  id: string
  title: string
  sku: string | null
  barcode: string | null
  prices: Price[]
  options: Record<string, string>
  inventory_quantity: number
  allow_backorder: boolean
  manage_inventory: boolean
  weight: number | null
  length: number | null
  height: number | null
  width: number | null
  metadata: Record<string, unknown>
}
```

### Price

```ts
interface Price {
  id: string
  amount: number
  currency_code: string
  min_quantity: number | null
  max_quantity: number | null
}
```

### ProductImage

```ts
interface ProductImage {
  id: string
  url: string
  metadata: Record<string, unknown>
}
```

### ProductOption

```ts
interface ProductOption {
  id: string
  title: string
  values: string[]
}
```

### ProductCategory

```ts
interface ProductCategory {
  id: string
  name: string
  handle: string
}
```

### ProductTag

```ts
interface ProductTag {
  id: string
  value: string
}
```

### Collection

```ts
interface Collection {
  id: string
  title: string
  handle: string
  products: Product[]
}
```

## Cart Types

### Cart

```ts
interface Cart {
  id: string
  items: LineItem[]
  region_id: string
  currency_code: string
  subtotal: number
  tax_total: number
  shipping_total: number
  discount_total: number
  total: number
  shipping_address: Address | null
  billing_address: Address | null
  email: string | null
  shipping_methods: ShippingMethod[]
  payment_sessions: PaymentSession[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}
```

### LineItem

```ts
interface LineItem {
  id: string
  cart_id: string
  variant_id: string
  product_id: string
  title: string
  description: string
  thumbnail: string | null
  quantity: number
  unit_price: number
  subtotal: number
  total: number
  metadata: Record<string, unknown>
}
```

### Address

```ts
interface Address {
  first_name: string
  last_name: string
  address_1: string
  address_2: string | null
  city: string
  province: string | null
  postal_code: string
  country_code: string
  phone: string | null
}
```

## Shipping Types

### ShippingMethod

```ts
interface ShippingMethod {
  id: string
  shipping_option_id: string
  name: string
  price: number
}
```

### ShippingOption

```ts
interface ShippingOption {
  id: string
  name: string
  amount: number
  region_id: string
}
```

## Payment Types

### PaymentSession

```ts
interface PaymentSession {
  id: string
  provider_id: string
  status: 'pending' | 'authorized' | 'requires_more'
  amount?: number
  currency_code?: string
  data: Record<string, unknown>
}
```

## Order Types

### Order

```ts
interface Order {
  id: string
  display_id: number
  status: 'pending' | 'completed' | 'archived' | 'canceled' | 'requires_action'
  fulfillment_status:
    | 'not_fulfilled'
    | 'partially_fulfilled'
    | 'fulfilled'
    | 'partially_shipped'
    | 'shipped'
    | 'partially_returned'
    | 'returned'
    | 'canceled'
    | 'requires_action'
  payment_status:
    | 'not_paid'
    | 'awaiting'
    | 'captured'
    | 'partially_refunded'
    | 'refunded'
    | 'canceled'
    | 'requires_action'
  items: LineItem[]
  currency_code: string
  subtotal: number
  tax_total: number
  shipping_total: number
  total: number
  email: string
  shipping_address: Address
  fulfillments: Fulfillment[]
  created_at: string
  updated_at: string
}
```

### Fulfillment

```ts
interface Fulfillment {
  id: string
  order_id: string
  tracking_numbers: string[]
  tracking_links: TrackingLink[]
  items: FulfillmentItem[]
  shipped_at: string | null
  created_at: string
}
```

### TrackingLink

```ts
interface TrackingLink {
  tracking_number: string
  url: string
}
```

### FulfillmentItem

```ts
interface FulfillmentItem {
  item_id: string
  quantity: number
}
```

## Region Types

### Region

```ts
interface Region {
  id: string
  name: string
  currency_code: string
  countries: Country[]
}
```

### Country

```ts
interface Country {
  iso_2: string
  name: string
}
```

## Utility Types

### PaginatedResponse

Generic wrapper for paginated results. Used by `searchProducts` and `listOrders`.

```ts
interface PaginatedResponse<T> {
  data: T[]
  count: number
  offset: number
  limit: number
}
```

### ProductSearchFilters

```ts
interface ProductSearchFilters {
  q?: string
  category_id?: string[]
  collection_id?: string[]
  tags?: string[]
  price_min?: number
  price_max?: number
  currency_code?: string
  limit?: number
  offset?: number
}
```

### OrderListFilters

```ts
interface OrderListFilters {
  email?: string
  status?: string
  limit?: number
  offset?: number
}
```

## Generic Adapter Types

These types are exported from `@agentojs/generic` for configuring the Generic REST adapter.

### GenericRESTBackendConfig

```ts
import type { GenericRESTBackendConfig } from '@agentojs/generic'
```

```ts
interface GenericRESTBackendConfig {
  baseUrl: string
  apiKey: string
  /** Header name for the API key (default: Authorization with Bearer prefix) */
  apiKeyHeader?: string
  /** Custom endpoint paths (merged with defaults) */
  endpointsMap?: GenericEndpointsMap
  /** Custom field mappings for response transformation */
  fieldMap?: GenericFieldMap
}
```

### GenericEndpointsMap

Override default endpoint paths to match your API.

```ts
interface GenericEndpointsMap {
  products?: string       // default: /products
  product?: string        // default: /products/:id
  collections?: string    // default: /collections
  collection?: string     // default: /collections/:id
  createCart?: string      // default: /carts
  getCart?: string         // default: /carts/:id
  updateCart?: string      // default: /carts/:id
  addLineItem?: string     // default: /carts/:id/line-items
  removeLineItem?: string  // default: /carts/:id/line-items/:lineItemId
  shippingOptions?: string // default: /shipping-options
  addShippingMethod?: string // default: /carts/:id/shipping-methods
  completeCart?: string    // default: /carts/:id/complete
  getOrder?: string        // default: /orders/:id
  orders?: string          // default: /orders
  regions?: string         // default: /regions
  health?: string          // default: /health
}
```

### GenericFieldMap

Map non-standard field names in API responses to the expected AgentOJS field names.

```ts
interface GenericFieldMap {
  product?: Record<string, string>
  cart?: Record<string, string>
  order?: Record<string, string>
}
```

Supports dot-notation for nested fields. Example:

```ts
const fieldMap: GenericFieldMap = {
  product: {
    title: 'name',              // maps response.name → Product.title
    handle: 'slug',             // maps response.slug → Product.handle
    thumbnail: 'images.0.src',  // maps response.images[0].src → Product.thumbnail
  },
}
```
