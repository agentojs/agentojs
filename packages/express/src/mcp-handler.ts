/**
 * MCP StreamableHTTP Handler
 *
 * Express route handlers for the MCP protocol using StreamableHTTPServerTransport.
 * Manages session lifecycle: create (POST), stream (GET), close (DELETE).
 */

import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer, McpSessionManager } from '@agentojs/mcp';
import type { McpServerOptions } from '@agentojs/mcp';
import type { Logger } from '@agentojs/core';

/**
 * Creates an Express Router that handles MCP StreamableHTTP endpoints.
 *
 * POST /  — create new session or send message to existing session
 * GET  /  — SSE stream for an existing session
 * DELETE / — close an existing session
 */
export function createMcpHandler(
  serverOptions: McpServerOptions,
  logger?: Logger,
): Router {
  const router = Router();
  const sessionManager = new McpSessionManager();

  // POST — create session or send message
  router.post('/', async (req, res) => {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;

      // Resume existing session
      if (sessionId) {
        const session = sessionManager.getSession(sessionId);
        if (session) {
          await session.transport.handleRequest(req, res);
          return;
        }
        // Stale session — tell client to reconnect
        res.status(404).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Session not found. Please reconnect.',
          },
          id: null,
        });
        return;
      }

      // New session
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });

      const mcpServer = createMcpServer(serverOptions);

      // Auto-cleanup on close
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid) {
          sessionManager.deleteSession(sid);
          logger?.debug(`MCP session closed: ${sid}`);
        }
      };

      await mcpServer.connect(transport);
      await transport.handleRequest(req, res);

      // Store session after handleRequest — sessionId is set during request handling
      const newSessionId = transport.sessionId;
      if (newSessionId) {
        sessionManager.createSession(newSessionId, transport, mcpServer);
        logger?.log(`MCP session created: ${newSessionId}`);
      }
    } catch (error) {
      logger?.error('MCP POST error', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  });

  // GET — SSE stream for existing session
  router.get('/', async (req, res) => {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;

      if (!sessionId) {
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'No session. Send a POST first to establish a session.',
          },
          id: null,
        });
        return;
      }

      const session = sessionManager.getSession(sessionId);
      if (!session) {
        res.status(404).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Session not found. Please reconnect.',
          },
          id: null,
        });
        return;
      }

      await session.transport.handleRequest(req, res);
    } catch (error) {
      logger?.error('MCP GET error', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  });

  // DELETE — close session
  router.delete('/', async (req, res) => {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;

      if (!sessionId) {
        res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Missing mcp-session-id header.' },
          id: null,
        });
        return;
      }

      const session = sessionManager.getSession(sessionId);
      if (!session) {
        res.status(404).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Session not found.' },
          id: null,
        });
        return;
      }

      await session.transport.handleRequest(req, res);
      sessionManager.deleteSession(sessionId);
      logger?.debug(`MCP session deleted: ${sessionId}`);
    } catch (error) {
      logger?.error('MCP DELETE error', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  });

  return router;
}
