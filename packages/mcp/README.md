# @agentojs/mcp

[![npm version](https://img.shields.io/npm/v/@agentojs/mcp.svg)](https://www.npmjs.com/package/@agentojs/mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/agentojs/agentojs/blob/main/LICENSE)

MCP (Model Context Protocol) adapter for AgentOJS -- exposes your commerce backend as an MCP server for Claude and other MCP-compatible AI agents.

Part of the [AgentOJS](https://github.com/agentojs/agentojs) monorepo.

## Installation

```bash
npm install @agentojs/mcp @agentojs/core
# or
pnpm add @agentojs/mcp @agentojs/core
```

## Quick Start

```typescript
import { createMcpServer } from '@agentojs/mcp';
import { MedusaBackend } from '@agentojs/medusa';

const provider = new MedusaBackend({
  backendUrl: 'https://your-medusa-store.com',
  apiKey: 'pk_your_publishable_key',
});

const server = createMcpServer({
  store: { slug: 'my-store', name: 'My Store', currency: 'usd', country: 'us', backendUrl: 'https://your-medusa-store.com' },
  provider,
});
```

The MCP server registers tools for product search, cart management, checkout, and order retrieval -- ready for Claude or any MCP client.

## createMcpServer Options

```typescript
interface McpServerOptions {
  /** Store metadata (slug, name, currency, country, backendUrl). */
  store: StoreInfo;
  /** CommerceProvider implementation (Medusa, WooCommerce, Generic, etc.). */
  provider: CommerceProvider;
  /** Optional scope checker for tool-level access control. */
  scopeChecker?: ScopeChecker;
  /** Optional logger. */
  logger?: Logger;
}
```

## Registered Tools

The MCP server registers tools across four categories:

### Product Tools
- `search_products` -- Search products with text query, filters, pagination
- `get_product` -- Get a single product by ID
- `get_collections` -- List all product collections
- `get_collection` -- Get a single collection by ID

### Cart Tools
- `create_cart` -- Create a new cart with initial items
- `get_cart` -- Retrieve cart by ID
- `update_cart` -- Update cart email, addresses, metadata
- `add_line_item` -- Add item to cart
- `remove_line_item` -- Remove item from cart

### Checkout Tools
- `get_shipping_options` -- List shipping options for a cart
- `add_shipping_method` -- Select a shipping method
- `initialize_payment` -- Initialize payment for checkout
- `complete_cart` -- Complete the checkout

### Order Tools
- `get_order` -- Get order by ID
- `list_orders` -- List orders with filters

## Store Resources

- `store://info` -- Store metadata (slug, name, currency, country)
- `store://regions` -- Available regions and currencies
- `store://health` -- Backend health status

## Session Management

Use `McpSessionManager` to manage multiple concurrent MCP sessions:

```typescript
import { McpSessionManager } from '@agentojs/mcp';

const sessions = new McpSessionManager();
// Sessions are tracked in-memory by session ID
```

## Scope-Based Access Control

Restrict which tools are available per API key:

```typescript
import { checkMcpScope } from '@agentojs/mcp';

// Returns { allowed: true } or { allowed: false, error: '...' }
const result = checkMcpScope('products:read', scopeChecker);
```

## Using with createAgent

The simplest way to run an MCP server (plus UCP and ACP) is via `createAgent` from `@agentojs/core`:

```typescript
import { createAgent } from '@agentojs/core';
import { MedusaBackend } from '@agentojs/medusa';

const agent = await createAgent({
  store: { slug: 'my-store', name: 'My Store', currency: 'usd', country: 'us', backendUrl: 'https://your-medusa-store.com' },
  provider: new MedusaBackend({ backendUrl: 'https://your-medusa-store.com', apiKey: 'pk_key' }),
});
await agent.start(3000);
// MCP endpoint: POST http://localhost:3000/mcp
```

## API Reference

Full documentation at [agentojs.com](https://agentojs.com).

## License

[MIT](https://github.com/agentojs/agentojs/blob/main/LICENSE)
