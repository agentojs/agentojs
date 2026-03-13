/**
 * MCP Session Manager
 *
 * In-memory session store for StreamableHTTP MCP sessions.
 * Plain class — no NestJS dependencies.
 */

import type { McpSession } from './types.js';

export class McpSessionManager {
  private sessions = new Map<string, McpSession>();

  /** Register a new session. */
  createSession(
    sessionId: string,
    transport: McpSession['transport'],
    server: McpSession['server'],
  ): void {
    this.sessions.set(sessionId, { transport, server });

    // Auto-cleanup when the transport closes
    transport.onclose = () => {
      this.sessions.delete(sessionId);
    };
  }

  /** Retrieve a session by ID. */
  getSession(sessionId: string): McpSession | undefined {
    return this.sessions.get(sessionId);
  }

  /** Remove a session by ID. */
  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /** Return the number of active sessions. */
  getSessionCount(): number {
    return this.sessions.size;
  }
}
