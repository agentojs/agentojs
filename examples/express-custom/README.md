# Express Custom Example

Advanced example showing manual Express app setup with `agentMiddleware` — no `createAgent()` needed.

## What This Demonstrates

- **Manual Express setup** — full control over your Express app
- **Custom middleware** — request logging applied globally
- **GenericRESTProvider** — connects to any REST API (uses [fakestoreapi.com](https://fakestoreapi.com), a public API with no credentials)
- **Selective protocol enablement** — MCP + UCP only, ACP disabled (no Stripe keys needed)
- **Custom routes** — health endpoint and HTML landing page alongside AI endpoints

## Prerequisites

- Node.js 20+
- No external services needed — fakestoreapi.com is a free public API

## Setup

```bash
cp .env.example .env    # defaults work out of the box
npm install
npm run dev
```

## Available Endpoints

| Protocol | Endpoint           | Method       | Description                        |
|----------|--------------------|--------------|------------------------------------|
| Root     | `GET /`            | GET          | HTML page listing all endpoints    |
| Health   | `GET /health`      | GET          | JSON health check                  |
| MCP      | `POST /ai/mcp`     | POST         | Model Context Protocol (Claude)    |
| UCP      | `GET /ai/ucp/*`    | GET / POST   | Universal Commerce Protocol        |

> ACP is intentionally disabled in this example to show selective protocol enablement.

## Testing

### Health check

```bash
curl http://localhost:3100/health
```

### UCP — List products

```bash
curl http://localhost:3100/ai/ucp/products
```

### UCP — Get single product

```bash
curl http://localhost:3100/ai/ucp/products/1
```

### MCP — Initialize session

```bash
curl -X POST http://localhost:3100/ai/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": { "name": "test", "version": "1.0.0" }
    }
  }'
```

## Key Differences from `medusa-basic`

| Feature               | medusa-basic            | express-custom               |
|-----------------------|-------------------------|------------------------------|
| Setup                 | `createAgent()`         | Manual Express + middleware  |
| Provider              | MedusaProvider          | GenericRESTProvider          |
| Protocols             | MCP + UCP + ACP         | MCP + UCP only               |
| Credentials           | Medusa API key required | None (public API)            |
| Custom routes         | No                      | Yes (/, /health)             |
| Custom middleware      | No                      | Yes (request logger)         |
| Mount path            | `/` (root)              | `/ai` (nested)               |
