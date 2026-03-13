/**
 * createMcpServer — factory function
 *
 * Creates an McpServer instance with all tools and resources registered.
 * This is the main entry point for consumers who want a fully-configured
 * MCP server without wiring each register* call manually.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpServerOptions } from './types.js';
import { registerProductTools } from './tools/product.tools.js';
import { registerOrderTools } from './tools/order.tools.js';
import { registerCartTools } from './tools/cart.tools.js';
import { registerCheckoutTools } from './tools/checkout.tools.js';
import { registerStoreResources } from './resources/store.resources.js';

export function createMcpServer(options: McpServerOptions): McpServer {
  const {
    store,
    provider,
    scopeChecker,
    webhookEmitter,
    logger,
    serverName,
    serverVersion,
  } = options;

  const server = new McpServer({
    name: serverName ?? store.name,
    version: serverVersion ?? '1.0.0',
  });

  registerProductTools(server, provider, scopeChecker, logger);
  registerOrderTools(server, provider, scopeChecker, logger);
  registerCartTools(server, provider, scopeChecker, logger);
  registerCheckoutTools(
    server,
    provider,
    store,
    webhookEmitter,
    scopeChecker,
    logger,
  );
  registerStoreResources(server, store, logger);

  return server;
}
