# @agentojs/acp

ACP (Agent Commerce Protocol) router for ChatGPT — exposes checkout sessions with Stripe payment integration and a product feed.

## Installation

```bash
npm install @agentojs/acp @agentojs/core
```

## `createAcpRouter(options)`

Creates an Express router with all ACP endpoints: checkout sessions, product feed, and Stripe webhook handler.

```ts
import { createAcpRouter } from '@agentojs/acp';

const router = createAcpRouter({
  provider: myProvider,
  store: { name: 'My Store', slug: 'my-store', currency: 'usd', country: 'us', backendUrl: 'https://api.example.com' },
  stripeSecretKey: 'sk_live_...',
  stripePublishableKey: 'pk_live_...',
  stripeWebhookSecret: 'whsec_...',
});
```

### `AcpRouterOptions`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `provider` | `CommerceProvider` | Yes | Commerce backend provider instance |
| `store` | `StoreInfo` | Yes | Store metadata |
| `scopeChecker` | `ScopeChecker` | No | Function to check API key scopes |
| `webhookEmitter` | `WebhookEmitter` | No | Emits events on checkout completion |
| `logger` | `Logger` | No | Custom logger instance |
| `stripeSecretKey` | `string` | No | Stripe secret key for payment intents |
| `stripePublishableKey` | `string` | No | Stripe publishable key (returned to client) |
| `stripeWebhookSecret` | `string` | No | Stripe webhook signing secret |

**Returns:** Express `Router`.

## Endpoints

### Checkout Sessions — Scope: `checkout:write`

All checkout endpoints require ACP-specific headers.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/checkout_sessions` | Create checkout session from cart |
| `GET` | `/checkout_sessions/:id` | Get checkout session status |
| `PATCH` | `/checkout_sessions/:id` | Update session (buyer, address, shipping, payment) |
| `POST` | `/checkout_sessions/:id/complete` | Complete checkout and place order |
| `DELETE` | `/checkout_sessions/:id` | Cancel checkout session |

### Product Feed — Scope: `products:read`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/feed` | Product catalog feed for OpenAI. Returns `AcpFeedItem[]` |

### Stripe Webhook

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/webhooks/stripe` | Handle Stripe payment events (no auth required) |

## `AcpSessionManager`

In-memory manager for ACP checkout sessions. Tracks status transitions, buyer info, fulfillment, and payment method.

```ts
import { AcpSessionManager } from '@agentojs/acp';

const sessions = new AcpSessionManager();

const session = sessions.createSession(checkoutId, cartId, storeSlug);
sessions.updateSession(checkoutId, { buyer: { email: 'user@example.com' } });
sessions.recalculateStatus(checkoutId); // not_ready → ready if all fields set
sessions.completeSession(checkoutId);
```

### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `createSession` | `checkoutId, cartId, storeSlug` | `AcpSession` | Create new checkout session |
| `getSession` | `checkoutId` | `AcpSession \| undefined` | Get session by ID |
| `updateSession` | `checkoutId, data` | `AcpSession \| undefined` | Merge update into session |
| `recalculateStatus` | `checkoutId` | `AcpSessionStatus \| undefined` | Auto-transition `not_ready_for_payment` → `ready_for_payment` when email + address + shipping are set |
| `completeSession` | `checkoutId` | `AcpSession \| undefined` | Transition to `completed` |
| `cancelSession` | `checkoutId` | `AcpSession \| undefined` | Transition to `canceled` |
| `findByPaymentIntentId` | `paymentIntentId` | `{ id, session } \| undefined` | Look up session by Stripe payment intent |
| `deleteSession` | `checkoutId` | `boolean` | Remove session |
| `getSessionCount` | — | `number` | Active session count |

### `AcpSession`

```ts
interface AcpSession {
  cartId: string;
  storeSlug: string;
  status: AcpSessionStatus;
  buyer?: AcpBuyerInfo;
  fulfillmentAddress?: AcpFulfillmentAddress;
  fulfillmentOptionId?: string;
  paymentProvider: {
    provider: 'stripe';
    supported_payment_methods: string[];
  };
  paymentMethod?: AcpPaymentMethod;
  createdAt: Date;
  updatedAt: Date;
}
```

### `AcpSessionStatus`

```ts
type AcpSessionStatus = 'not_ready_for_payment' | 'ready_for_payment' | 'completed' | 'canceled';
```

## `AcpResponseFormatter`

Formats commerce data into ACP-compliant checkout session responses.

```ts
import { AcpResponseFormatter } from '@agentojs/acp';

const formatter = new AcpResponseFormatter();

const response = formatter.buildCheckoutSession(sessionId, session, cart, shippingOptions, store);
```

### Methods

| Method | Description |
|--------|-------------|
| `buildCheckoutSession(sessionId, session, cart, shippingOptions?, store?)` | Full checkout session response |
| `buildTotals(cart)` | Totals array (items_base_amount, subtotal, fulfillment, tax, total) |
| `buildLineItems(cart)` | Line items with pricing breakdown |
| `buildFulfillmentOptions(shippingOptions)` | Fulfillment options array |
| `buildLinks(store?)` | Links array (terms_of_use, privacy_policy) |
| `buildMessages(errors?)` | Messages array from errors |

### `AcpCheckoutSessionResponse`

```ts
interface AcpCheckoutSessionResponse {
  id: string;
  status: AcpSessionStatus;
  currency: string;
  line_items: AcpLineItem[];
  totals: AcpTotal[];
  fulfillment_options: AcpFulfillmentOption[];
  payment_provider: {
    provider: 'stripe';
    supported_payment_methods: string[];
  };
  buyer?: AcpBuyerInfo;
  fulfillment_address?: AcpFulfillmentAddress;
  selected_fulfillment_option_id?: string;
  payment_method?: AcpPaymentMethod;
  messages: AcpMessage[];
  links: AcpLink[];
  order?: { id: string };
}
```

## `IdempotencyCache`

Prevents duplicate operations from retried requests.

```ts
import { IdempotencyCache } from '@agentojs/acp';

const cache = new IdempotencyCache();
// Used internally by the ACP router to handle idempotency keys
```

## Product Feed Types

### `AcpFeedItem`

The `/feed` endpoint returns product data formatted for OpenAI's catalog:

```ts
interface AcpFeedItem {
  item_id: string;
  title: string;
  description: string;
  url: string;
  brand: string;
  availability: 'in_stock' | 'out_of_stock' | 'preorder';
  price: { amount: number; currency: string };
  image_url: string;
  target_countries: string[];
  store_country: string;
  seller_name: string;
  seller_url: string;
  is_eligible_search: boolean;
  is_eligible_checkout: boolean;
  group_id?: string;
  variant_dict?: Record<string, string>;
  listing_has_variations?: boolean;
}
```

## Middleware

### `acpHeadersMiddleware`

Validates ACP-required headers on checkout session endpoints.

### `acpErrorHandler`

Express error handler that formats errors into ACP-compliant `messages[]` responses.

## Full Example

```ts
import express from 'express';
import { createAcpRouter } from '@agentojs/acp';
import { MedusaProvider } from '@agentojs/medusa';

const app = express();
app.use(express.json());

const provider = new MedusaProvider({
  backendUrl: 'http://localhost:9000',
  apiKey: 'sk-medusa-key',
});

const acpRouter = createAcpRouter({
  provider,
  store: {
    name: 'My Store',
    slug: 'my-store',
    currency: 'usd',
    country: 'us',
    backendUrl: 'http://localhost:9000',
  },
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
});

app.use('/acp', acpRouter);
app.listen(3100, () => console.log('ACP server on :3100'));
```

::: tip
For simpler setup, use [`@agentojs/express`](/api/express) which mounts ACP automatically at `/acp/*`, or [`createAgent()`](/guide/getting-started) for the highest-level API.
:::
