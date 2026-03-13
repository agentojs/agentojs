// @agentojs/mcp — MCP (Model Context Protocol) adapter

export type { McpToolResult } from './scope-check.js';
export { checkMcpScope } from './scope-check.js';
export { registerProductTools } from './tools/product.tools.js';
export { registerOrderTools } from './tools/order.tools.js';
export { registerCartTools } from './tools/cart.tools.js';
export { registerCheckoutTools } from './tools/checkout.tools.js';
export { registerStoreResources } from './resources/store.resources.js';

// v0.3.0 — createMcpServer, McpSessionManager, types
export type { McpServerOptions, McpSession } from './types.js';
export { createMcpServer } from './create-mcp-server.js';
export { McpSessionManager } from './session-manager.js';
