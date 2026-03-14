import { describe, it, expect, vi } from 'vitest';
import { createAuthMiddleware } from '../middleware.js';

function createMockReq(headers: Record<string, string> = {}) {
  return { headers } as Record<string, unknown>;
}

function createMockRes() {
  const jsonFn = vi.fn();
  const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
  return { status: statusFn, json: jsonFn, _status: statusFn, _json: jsonFn };
}

describe('createAuthMiddleware', () => {
  it('extracts key from Authorization: Bearer header', async () => {
    const validateKey = vi.fn().mockResolvedValue({ valid: true, scopes: ['*'] });
    const middleware = createAuthMiddleware({ validateKey });

    const req = createMockReq({ authorization: 'Bearer test-key-12345678901234567890' });
    const res = createMockRes();
    const next = vi.fn();

    await middleware(req as any, res as any, next);

    expect(validateKey).toHaveBeenCalledWith('test-key-12345678901234567890');
    expect(next).toHaveBeenCalled();
    expect(req.apiKey).toBe('test-key-12345678901234567890');
    expect(req.scopes).toEqual(['*']);
  });

  it('extracts key from X-API-Key header', async () => {
    const validateKey = vi.fn().mockResolvedValue({ valid: true, scopes: ['products:read'] });
    const middleware = createAuthMiddleware({ validateKey });

    const req = createMockReq({ 'x-api-key': 'my-api-key-1234567890' });
    const res = createMockRes();
    const next = vi.fn();

    await middleware(req as any, res as any, next);

    expect(validateKey).toHaveBeenCalledWith('my-api-key-1234567890');
    expect(next).toHaveBeenCalled();
    expect(req.apiKey).toBe('my-api-key-1234567890');
    expect(req.scopes).toEqual(['products:read']);
  });

  it('prefers Authorization header over X-API-Key', async () => {
    const validateKey = vi.fn().mockResolvedValue({ valid: true });
    const middleware = createAuthMiddleware({ validateKey });

    const req = createMockReq({
      authorization: 'Bearer bearer-key-1234567890',
      'x-api-key': 'header-key-1234567890',
    });
    const res = createMockRes();
    const next = vi.fn();

    await middleware(req as any, res as any, next);

    expect(validateKey).toHaveBeenCalledWith('bearer-key-1234567890');
  });

  it('returns 401 when no key is provided', async () => {
    const validateKey = vi.fn();
    const middleware = createAuthMiddleware({ validateKey });

    const req = createMockReq({});
    const res = createMockRes();
    const next = vi.fn();

    await middleware(req as any, res as any, next);

    expect(res._status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    expect(validateKey).not.toHaveBeenCalled();
  });

  it('returns 401 when key is invalid', async () => {
    const validateKey = vi.fn().mockResolvedValue({ valid: false });
    const middleware = createAuthMiddleware({ validateKey });

    const req = createMockReq({ authorization: 'Bearer invalid-key-1234567890' });
    const res = createMockRes();
    const next = vi.fn();

    await middleware(req as any, res as any, next);

    expect(res._status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when validateKey throws', async () => {
    const validateKey = vi.fn().mockRejectedValue(new Error('db error'));
    const middleware = createAuthMiddleware({ validateKey });

    const req = createMockReq({ authorization: 'Bearer some-key-12345678901234567890' });
    const res = createMockRes();
    const next = vi.fn();

    await middleware(req as any, res as any, next);

    expect(res._status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('does not call next when Authorization header has no Bearer prefix', async () => {
    const validateKey = vi.fn();
    const middleware = createAuthMiddleware({ validateKey });

    const req = createMockReq({ authorization: 'Basic dXNlcjpwYXNz' });
    const res = createMockRes();
    const next = vi.fn();

    await middleware(req as any, res as any, next);

    expect(res._status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
