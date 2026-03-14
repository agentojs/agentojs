# Production Deployment

A guide to deploying AgentOJS in production with Docker, environment variables, and best practices.

## Docker Setup

Use a multi-stage Dockerfile for minimal image size:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3100
CMD ["node", "dist/main.js"]
```

## Environment Variables

All environment variables used by `createAgent()` and provider constructors:

### Core

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Server listen port |
| `NODE_ENV` | No | — | Set to `production` in production |
| `STORE_NAME` | Yes | — | Store display name |
| `STORE_SLUG` | Yes | — | Unique store identifier (`/^[a-z0-9-]{3,50}$/`) |
| `STORE_CURRENCY` | Yes | — | Currency code (e.g. `usd`, `eur`, `nok`) |
| `STORE_COUNTRY` | Yes | — | Country code (e.g. `us`, `no`) |
| `STORE_BACKEND_URL` | Yes | — | Commerce backend URL |

### Medusa Provider

| Variable | Required | Description |
|----------|----------|-------------|
| `MEDUSA_URL` | Yes | Medusa backend URL (e.g. `http://localhost:9000`) |
| `MEDUSA_PUBLISHABLE_API_KEY` | Yes | Medusa publishable API key |

### WooCommerce Provider

| Variable | Required | Description |
|----------|----------|-------------|
| `WOOCOMMERCE_URL` | Yes | WooCommerce store URL |
| `WOOCOMMERCE_CONSUMER_KEY` | Yes | WooCommerce REST API consumer key |
| `WOOCOMMERCE_CONSUMER_SECRET` | Yes | WooCommerce REST API consumer secret |

### Shopify Provider

| Variable | Required | Description |
|----------|----------|-------------|
| `SHOPIFY_DOMAIN` | Yes | Shopify store domain (e.g. `my-store.myshopify.com`) |
| `SHOPIFY_STOREFRONT_TOKEN` | Yes | Shopify Storefront Access Token |

### Generic REST Provider

| Variable | Required | Description |
|----------|----------|-------------|
| `GENERIC_API_URL` | Yes | Base URL of the REST API |
| `GENERIC_API_KEY` | Yes | API key for authentication |

### Stripe (ACP Protocol)

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | For ACP | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | For ACP | Stripe publishable key (returned to ChatGPT) |
| `STRIPE_WEBHOOK_SECRET` | For ACP | Stripe webhook signing secret |

## Express Production Config

For production Express apps, add security and compression middleware:

```ts
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { agentMiddleware } from '@agentojs/express';

const app = express();

// Trust proxy (required behind load balancer / reverse proxy)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// Response compression
app.use(compression());

// Mount AI protocols
app.use('/ai', agentMiddleware({
  store: { /* ... */ },
  provider: myProvider,
}));

app.listen(process.env.PORT || 3100);
```

::: tip
If using `createAgent()`, the Express app is available as `agent.app` for adding middleware before starting.
:::

## Health Checks

`createAgent()` includes a built-in health endpoint at `GET /health` (enabled by default):

```json
{ "status": "ok", "timestamp": "2025-01-15T10:30:00.000Z" }
```

For custom health checks with provider connectivity verification:

```ts
import express from 'express';
import { agentMiddleware } from '@agentojs/express';

const app = express();

app.get('/health', async (req, res) => {
  try {
    const healthy = await provider.healthCheck();
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      provider: healthy ? 'connected' : 'unreachable',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({ status: 'error', timestamp: new Date().toISOString() });
  }
});

app.use('/ai', agentMiddleware({ store, provider }));
app.listen(3100);
```

For NestJS, use [`AgentOJSHealthIndicator`](/api/nestjs#agentojshealthindicator) with `@nestjs/terminus`.

## Logging

Implement the `Logger` interface to integrate with your logging system:

```ts
import type { Logger } from '@agentojs/core';

const logger: Logger = {
  log(message, ...args) { /* your logger */ },
  warn(message, ...args) { /* your logger */ },
  error(message, ...args) { /* your logger */ },
  debug(message, ...args) { /* your logger */ },
};

const agent = await createAgent({
  store, provider, logger,
});
```

A built-in `ConsoleLogger` is available for development:

```ts
import { ConsoleLogger } from '@agentojs/core';

const agent = await createAgent({
  store, provider,
  logger: new ConsoleLogger(),
});
```

## Scaling Considerations

### MCP Sessions Are In-Memory

MCP uses `StreamableHTTPServerTransport` which stores session state in an in-memory `Map`. This means:

- **Sticky sessions are required** when running multiple instances behind a load balancer
- Configure your load balancer to route requests with the same `mcp-session-id` header to the same instance
- Session state is lost on restart — clients will need to reconnect

Example NGINX sticky session config:

```nginx
upstream agentojs {
  ip_hash;  # Or use cookie-based stickiness
  server app1:3100;
  server app2:3100;
}
```

### UCP and ACP Are Stateless

UCP and ACP endpoints are stateless REST APIs — they can be horizontally scaled without sticky sessions. All state lives in the commerce backend (carts, orders, etc.).

## Monitoring

Use the `WebhookEmitter` to receive events for monitoring and analytics:

```ts
import type { WebhookEmitter } from '@agentojs/core';

const webhookEmitter: WebhookEmitter = {
  async emit(event) {
    // Send to your monitoring system
    console.log('Event:', event.type, event.data);
  },
};

const agent = await createAgent({
  store, provider, webhookEmitter,
});
```

## Docker Compose Example

A complete `docker-compose.yml` for running an AgentOJS server:

```yaml
services:
  agent:
    build: .
    ports:
      - "3100:3100"
    environment:
      NODE_ENV: production
      PORT: 3100
      STORE_NAME: "My Store"
      STORE_SLUG: "my-store"
      STORE_CURRENCY: "usd"
      STORE_COUNTRY: "us"
      STORE_BACKEND_URL: "http://medusa:9000"
      MEDUSA_URL: "http://medusa:9000"
      MEDUSA_PUBLISHABLE_API_KEY: "${MEDUSA_PUBLISHABLE_API_KEY}"
      STRIPE_SECRET_KEY: "${STRIPE_SECRET_KEY}"
      STRIPE_PUBLISHABLE_KEY: "${STRIPE_PUBLISHABLE_KEY}"
      STRIPE_WEBHOOK_SECRET: "${STRIPE_WEBHOOK_SECRET}"
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3100/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
```

## Protocol Selection

Disable protocols you don't need to reduce attack surface:

```ts
const agent = await createAgent({
  store, provider,
  enableMcp: true,   // Claude
  enableUcp: true,   // Gemini
  enableAcp: false,  // Disable ChatGPT (no Stripe setup needed)
});
```

## CORS Configuration

`createAgent()` accepts a `cors` array for allowed origins:

```ts
const agent = await createAgent({
  store, provider,
  cors: ['https://my-store.com', 'https://admin.my-store.com'],
});
```

The following headers are automatically allowed:
- `Content-Type`, `Authorization`, `mcp-session-id`
- `idempotency-key`, `request-id`, `api-version`
- `openai-ephemeral-user-id`
