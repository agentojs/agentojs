/**
 * MCP Package Types
 *
 * Shared interfaces for MCP server configuration and session management.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type {
  CommerceProvider,
  StoreInfo,
  ScopeChecker,
  WebhookEmitter,
  Logger,
} from '@agentojs/core';

/** Options for creating an MCP server with all tools and resources registered. */
export interface McpServerOptions {
  store: StoreInfo;
  provider: CommerceProvider;
  scopeChecker?: ScopeChecker;
  webhookEmitter?: WebhookEmitter;
  logger?: Logger;
  serverName?: string;
  serverVersion?: string;
}

/** An active MCP session — transport + server pair. */
export interface McpSession {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
}
