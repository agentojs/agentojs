# @agentojs/mcp

MCP (Model Context Protocol) server for Claude AI — exposes commerce tools and resources via the StreamableHTTP transport.

## Installation

```bash
npm install @agentojs/mcp @agentojs/core
```

## `createMcpServer(options)`

Creates a configured MCP server with all commerce tools and resources registered.

```ts
import { createMcpServer } from '@agentojs/mcp';

const server = createMcpServer({
  store: { name: 'My Store', slug: 'my-store', currency: 'usd', country: 'us', backendUrl: 'https://api.example.com' },
  provider: myProvider,
  scopeChecker: (scope) => true,
  serverName: 'my-store-mcp',
  serverVersion: '1.0.0',
});
```

### `McpServerOptions`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `store` | `StoreInfo` | Yes | Store metadata (name, slug, currency, country, backendUrl) |
| `provider` | `CommerceProvider` | Yes | Commerce backend provider instance |
| `scopeChecker` | `ScopeChecker` | No | Function to check API key scopes |
| `webhookEmitter` | `WebhookEmitter` | No | Emits events on checkout completion |
| `logger` | `Logger` | No | Custom logger instance |
| `serverName` | `string` | No | MCP server name (default: store slug) |
| `serverVersion` | `string` | No | MCP server version (default: `'1.0.0'`) |

**Returns:** `McpServer` instance from `@modelcontextprotocol/sdk`.

## `McpSessionManager`

In-memory session manager for MCP StreamableHTTP connections. Each Claude conversation gets its own session with a unique transport and server instance.

```ts
import { McpSessionManager } from '@agentojs/mcp';

const sessions = new McpSessionManager();

sessions.createSession(sessionId, transport, server);
const session = sessions.getSession(sessionId);
sessions.deleteSession(sessionId);
const count = sessions.getSessionCount();
```

### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `createSession` | `sessionId: string, transport: StreamableHTTPServerTransport, server: McpServer` | `void` | Store a new MCP session |
| `getSession` | `sessionId: string` | `McpSession \| undefined` | Retrieve session by ID |
| `deleteSession` | `sessionId: string` | `void` | Remove session and free resources |
| `getSessionCount` | — | `number` | Number of active sessions |

### `McpSession`

```ts
interface McpSession {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
}
```

## Tools

The MCP server registers **15 tools** across 5 categories. Each tool checks the required scope before executing.

### Product Tools

Registered by `registerProductTools()`. Scope: `products:read`.

| Tool | Description | Parameters |
|------|-------------|-----------|
| `search_products` | Search product catalog | `query?: string, category_id?: string, min_price?: number, max_price?: number, limit?: number, offset?: number` |
| `get_product` | Get product details with variants, options, prices, images | `product_id: string` |
| `get_collections` | List all product collections | — |

### Cart Tools

Registered by `registerCartTools()`. Scope: `cart:read` / `cart:write`.

| Tool | Description | Parameters |
|------|-------------|-----------|
| `create_cart` | Create a new shopping cart | `region_id: string, items?: Array<{variant_id, quantity}>` |
| `get_cart` | Get current cart state | `cart_id: string` |
| `update_cart` | Set email, shipping/billing address | `cart_id: string, email?: string, shipping_address?: Address, billing_address?: Address` |
| `add_to_cart` | Add a product variant | `cart_id: string, variant_id: string, quantity: number` |
| `remove_from_cart` | Remove a line item | `cart_id: string, line_item_id: string` |
| `get_shipping_options` | List available shipping methods | `cart_id: string` |
| `select_shipping` | Select a shipping method | `cart_id: string, option_id: string` |

### Checkout Tools

Registered by `registerCheckoutTools()`. Scope: `checkout:write`.

| Tool | Description | Parameters |
|------|-------------|-----------|
| `create_payment_session` | Initialize payment (returns Stripe payment URL) | `cart_id: string` |
| `complete_checkout` | Complete order from paid cart, fires webhook | `cart_id: string` |

### Order Tools

Registered by `registerOrderTools()`. Scope: `orders:read`.

| Tool | Description | Parameters |
|------|-------------|-----------|
| `list_orders` | List orders with optional filters | `email?: string, status?: string, limit?: number, offset?: number` |
| `get_order` | Get order details with fulfillment and payment status | `order_id: string` |
| `get_regions` | List store regions with currencies and countries | — |

## Resources

Registered by `registerStoreResources()`. Scope: `store:read`.

| Resource URI | Description |
|-------------|-------------|
| `store://info` | Store metadata, enabled protocols, capabilities |
| `store://policies` | Shipping, returns, refunds, and privacy policies |
| `store://agent-guide` | Markdown instructions for AI agents interacting with the store |

## Scope Checking

```ts
import { checkMcpScope } from '@agentojs/mcp';

const denied = checkMcpScope(scopeChecker, 'products:read');
if (denied) {
  // denied is McpToolResult with isError: true
  return denied;
}
```

### `McpToolResult`

```ts
interface McpToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}
```

## Full Example

```ts
import express from 'express';
import { createMcpServer, McpSessionManager } from '@agentojs/mcp';
import { MedusaProvider } from '@agentojs/medusa';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

const app = express();
app.use(express.json());

const provider = new MedusaProvider({
  backendUrl: 'http://localhost:9000',
  apiKey: 'sk-medusa-key',
});

const sessions = new McpSessionManager();

app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string;

  if (!sessionId) {
    // New session
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID() });
    const server = createMcpServer({
      store: { name: 'My Store', slug: 'my-store', currency: 'usd', country: 'us', backendUrl: 'http://localhost:9000' },
      provider,
    });
    await server.connect(transport);
    sessions.createSession(transport.sessionId!, transport, server);
    await transport.handleRequest(req, res, req.body);
  } else {
    // Existing session
    const session = sessions.getSession(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    await session.transport.handleRequest(req, res, req.body);
  }
});

app.listen(3100);
```

::: tip
For simpler setup, use [`@agentojs/express`](/api/express) which handles session lifecycle automatically, or [`createAgent()`](/guide/getting-started) for the highest-level API.
:::
