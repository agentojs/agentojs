import { describe, it, expect, vi } from 'vitest';
import { McpSessionManager } from '../session-manager.js';

function createMockTransport() {
  return {
    onclose: undefined as (() => void) | undefined,
  };
}

function createMockServer() {
  return { tool: vi.fn(), resource: vi.fn() };
}

describe('McpSessionManager', () => {
  it('creates and retrieves a session', () => {
    const manager = new McpSessionManager();
    const transport = createMockTransport();
    const server = createMockServer();

    manager.createSession('sess-1', transport as any, server as any);

    const session = manager.getSession('sess-1');
    expect(session).toBeDefined();
    expect(session!.transport).toBe(transport);
    expect(session!.server).toBe(server);
  });

  it('returns undefined for unknown session', () => {
    const manager = new McpSessionManager();
    expect(manager.getSession('nonexistent')).toBeUndefined();
  });

  it('deletes a session', () => {
    const manager = new McpSessionManager();
    const transport = createMockTransport();
    const server = createMockServer();

    manager.createSession('sess-1', transport as any, server as any);
    expect(manager.getSessionCount()).toBe(1);

    manager.deleteSession('sess-1');
    expect(manager.getSession('sess-1')).toBeUndefined();
    expect(manager.getSessionCount()).toBe(0);
  });

  it('tracks session count', () => {
    const manager = new McpSessionManager();

    manager.createSession('a', createMockTransport() as any, createMockServer() as any);
    manager.createSession('b', createMockTransport() as any, createMockServer() as any);
    expect(manager.getSessionCount()).toBe(2);

    manager.deleteSession('a');
    expect(manager.getSessionCount()).toBe(1);
  });

  it('auto-cleans up session when transport closes', () => {
    const manager = new McpSessionManager();
    const transport = createMockTransport();
    const server = createMockServer();

    manager.createSession('sess-auto', transport as any, server as any);
    expect(manager.getSessionCount()).toBe(1);

    // Simulate transport close
    transport.onclose!();

    expect(manager.getSession('sess-auto')).toBeUndefined();
    expect(manager.getSessionCount()).toBe(0);
  });
});
