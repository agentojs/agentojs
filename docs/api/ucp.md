# @agentojs/ucp

UCP (Universal Commerce Protocol) REST router for Google Gemini — exposes commerce operations as standard REST endpoints.

## Installation

```bash
npm install @agentojs/ucp @agentojs/core
```

## `createUcpRouter(options)`

Creates an Express router with all UCP REST endpoints mounted.

```ts
import { createUcpRouter } from '@agentojs/ucp';

const router = createUcpRouter({
  provider: myProvider,
  store: { name: 'My Store', slug: 'my-store', currency: 'usd', country: 'us', backendUrl: 'https://api.example.com' },
  basePath: '',
});
```

### `UcpRouterOptions`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `provider` | `CommerceProvider` | Yes | Commerce backend provider instance |
| `store` | `StoreInfo` | Yes | Store metadata |
| `scopeChecker` | `ScopeChecker` | No | Function to check API key scopes |
| `webhookEmitter` | `WebhookEmitter` | No | Emits events on checkout completion |
| `logger` | `Logger` | No | Custom logger instance |
| `basePath` | `string` | No | Route prefix (default: `''`) |

**Returns:** Express `Router`.

## Endpoints

### Products — Scope: `products:read`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/products` | Search products. Query: `q`, `category_id`, `limit`, `offset` |
| `POST` | `/products` | Search products (body: same params) |
| `GET` | `/products/:id` | Get product by ID |
| `GET` | `/collections` | List all collections |

### Carts — Scope: `cart:write`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/carts` | Create a new cart |
| `GET` | `/carts/:id` | Get cart by ID |
| `PATCH` | `/carts/:id` | Update cart (email, addresses) |
| `POST` | `/carts/:id/items` | Add line item to cart |
| `DELETE` | `/carts/:id/items/:itemId` | Remove line item |
| `GET` | `/carts/:id/shipping` | List shipping options |
| `POST` | `/carts/:id/shipping` | Select shipping method |

### Checkout Sessions — Scope: `checkout:write`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/checkout-sessions` | Create checkout session from cart |
| `GET` | `/checkout-sessions/:id` | Get checkout session status |
| `PATCH` | `/checkout-sessions/:id` | Update session (buyer info, address, shipping) |
| `POST` | `/checkout-sessions/:id/complete` | Complete checkout |
| `POST` | `/checkout-sessions/:id/cancel` | Cancel checkout session |

### Orders — Scope: `orders:read`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/orders/:id` | Get order by ID |

### Discovery

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/.well-known/ucp` | UCP discovery document (no auth required) |

## `UcpSessionManager`

In-memory manager for UCP checkout sessions. Tracks cart association, buyer info, fulfillment address, and session status.

```ts
import { UcpSessionManager } from '@agentojs/ucp';

const sessions = new UcpSessionManager();

const session = sessions.createSession(sessionId, cartId, storeSlug);
sessions.updateSession(sessionId, { buyer: { email: 'user@example.com' } });
sessions.completeSession(sessionId);
```

### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `createSession` | `sessionId, cartId, storeSlug` | `UcpSession` | Create new checkout session |
| `getSession` | `sessionId` | `UcpSession \| undefined` | Get session by ID |
| `updateSession` | `sessionId, data` | `UcpSession \| undefined` | Merge update data into session |
| `completeSession` | `sessionId` | `UcpSession \| undefined` | Transition status to `completed` |
| `cancelSession` | `sessionId` | `UcpSession \| undefined` | Transition status to `canceled` |
| `isReadyForComplete` | `sessionId` | `boolean` | Check if buyer email + address + shipping set |
| `deleteSession` | `sessionId` | `boolean` | Remove session |
| `getSessionCount` | — | `number` | Active session count |

### `UcpSession`

```ts
interface UcpSession {
  cartId: string;
  storeSlug: string;
  status: UcpSessionStatus;
  buyer?: UcpBuyerInfo;
  fulfillmentAddress?: UcpFulfillmentAddress;
  fulfillmentMethodId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### `UcpSessionStatus`

```ts
type UcpSessionStatus = 'incomplete' | 'completed' | 'requires_escalation' | 'canceled';
```

## `UcpResponseFormatter`

Formats commerce data into UCP-compliant checkout session responses.

```ts
import { UcpResponseFormatter } from '@agentojs/ucp';

const formatter = new UcpResponseFormatter();

const response = formatter.formatCheckoutSession(sessionId, session, cart, store, orderId, shippingOptions);
```

### Methods

| Method | Description |
|--------|-------------|
| `formatCart(sessionId, session, cart, store, shippingOptions?)` | Format cart as checkout session response |
| `formatShippingOptions(options, store)` | Format shipping options as fulfillment methods |
| `formatCheckoutSession(sessionId, session, cart, store, orderId?, shippingOptions?)` | Full checkout session response |
| `buildTotals(cart)` | Build totals array (items_base_amount, subtotal, fulfillment, tax, total) |
| `buildLineItems(cart)` | Build line items array |
| `buildFulfillmentMethods(shippingOptions)` | Build fulfillment methods array |
| `buildMessages(errors?)` | Build messages array from errors |

### `UcpCheckoutSessionResponse`

```ts
interface UcpCheckoutSessionResponse {
  id: string;
  status: UcpSessionStatus;
  currency: string;
  line_items: UcpLineItem[];
  totals: UcpTotal[];
  fulfillment: {
    methods: UcpFulfillmentMethod[];
    selected_method_id?: string;
    address?: UcpFulfillmentAddress;
  };
  payment: {
    provider: string;
    supported_methods: string[];
  };
  buyer?: UcpBuyerInfo;
  messages: UcpMessage[];
  order?: { id: string };
}
```

## Scope Middleware

```ts
import { requireScope } from '@agentojs/ucp';

// Applies scope check middleware to a route
router.get('/products', requireScope('products:read', scopeChecker), handler);
```

Returns `403 { error: 'Forbidden: missing scope products:read' }` if the scope check fails.

## Full Example

```ts
import express from 'express';
import { createUcpRouter } from '@agentojs/ucp';
import { MedusaProvider } from '@agentojs/medusa';

const app = express();
app.use(express.json());

const provider = new MedusaProvider({
  backendUrl: 'http://localhost:9000',
  apiKey: 'sk-medusa-key',
});

const ucpRouter = createUcpRouter({
  provider,
  store: {
    name: 'My Store',
    slug: 'my-store',
    currency: 'usd',
    country: 'us',
    backendUrl: 'http://localhost:9000',
  },
});

app.use('/ucp', ucpRouter);
app.listen(3100, () => console.log('UCP server on :3100'));
```

::: tip
For simpler setup, use [`@agentojs/express`](/api/express) which mounts UCP automatically at `/ucp/*`, or [`createAgent()`](/guide/getting-started) for the highest-level API.
:::
