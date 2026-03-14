# Medusa Basic Example

Connects to a Medusa.js v2 store and serves all three AI protocols (MCP, UCP, ACP) using `createAgent()`.

## Prerequisites

- Node.js 20+
- A running Medusa.js v2 instance (see [medusa.com](https://medusajs.com))
- A publishable API key from your Medusa admin

## Setup

```bash
cd examples/medusa-basic
cp .env.example .env
# Edit .env with your Medusa URL and API key
npm install
npm run dev
```

## Endpoints

Once running, the following endpoints are available:

| Protocol | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| MCP | POST | `/mcp` | Claude / Model Context Protocol |
| UCP | GET | `/ucp/products` | Google / Universal Checkout Protocol |
| ACP | GET | `/acp/feeds` | ChatGPT / Agent Commerce Protocol |
| Health | GET | `/health` | Server health check |

## Testing

### MCP — Initialize session

```bash
curl -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": { "name": "test", "version": "1.0" }
    }
  }'
```

### UCP — List products

```bash
curl http://localhost:3100/ucp/products
```

### ACP — Get product feed

```bash
curl http://localhost:3100/acp/feeds
```

## What it does

1. Creates a `MedusaProvider` connected to your Medusa.js v2 backend
2. Spins up an Express server via `createAgent()`
3. Mounts MCP, UCP, and ACP protocol handlers automatically
4. AI agents (Claude, Gemini, ChatGPT) can now browse and purchase from your store
