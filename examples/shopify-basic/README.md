# Shopify Basic Example

Connects to a Shopify store via the Storefront API and serves all three AI protocols (MCP, UCP, ACP) using `createAgent()`.

## Prerequisites

- Node.js 20+
- A Shopify store with a [Storefront Access Token](https://shopify.dev/docs/api/storefront#authentication)

### Getting a Storefront Access Token

1. Go to your Shopify admin → **Settings** → **Apps and sales channels** → **Develop apps**
2. Create a new app (or use an existing one)
3. Under **API credentials**, configure **Storefront API scopes**: `unauthenticated_read_product_listings`, `unauthenticated_read_checkouts`, `unauthenticated_write_checkouts`
4. Install the app and copy the **Storefront access token**

## Setup

```bash
cd examples/shopify-basic
cp .env.example .env
# Edit .env with your Shopify domain and Storefront access token
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

## Shopify-specific notes

- **Checkout**: Shopify uses a hosted checkout page. When a cart is completed, the response includes a `checkoutUrl` — redirect the buyer there to finish payment. There is no server-side payment completion.
- **Orders**: Listing orders requires the Admin API, which is not available via Storefront tokens. The `listOrders` and `getOrder` methods will return a 501 error.
- **GraphQL**: All Shopify API calls use the Storefront GraphQL API (not REST).

## What it does

1. Creates a `ShopifyProvider` connected to your Shopify Storefront API
2. Spins up an Express server via `createAgent()`
3. Mounts MCP, UCP, and ACP protocol handlers automatically
4. AI agents (Claude, Gemini, ChatGPT) can now browse and purchase from your store
