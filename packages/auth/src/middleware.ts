/**
 * Express middleware for API key authentication.
 */

import type { AuthMiddlewareOptions, AuthenticatedRequest } from './types.js';

/**
 * Creates an Express middleware that authenticates requests via API key.
 *
 * Extracts the key from:
 * 1. `Authorization: Bearer <key>` header
 * 2. `X-API-Key: <key>` header
 *
 * On success, sets `req.apiKey` and `req.scopes` on the request.
 * On failure, responds with 401.
 *
 * @param options - Middleware options with async `validateKey` callback
 * @returns Express middleware function
 *
 * @example
 * ```ts
 * app.use(createAuthMiddleware({
 *   validateKey: async (key) => {
 *     const record = await db.findApiKey(hashApiKey(key));
 *     if (!record) return { valid: false };
 *     return { valid: true, scopes: record.scopes };
 *   },
 * }));
 * ```
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions) {
  return async (
    req: AuthenticatedRequest & Record<string, unknown>,
    res: { status(code: number): { json(body: unknown): void } },
    next: () => void,
  ) => {
    const key = extractApiKey(req as Record<string, unknown>);

    if (!key) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'API key is required. Provide via Authorization: Bearer <key> or X-API-Key header.',
      });
      return;
    }

    try {
      const result = await options.validateKey(key);

      if (!result.valid) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid API key.',
        });
        return;
      }

      req.apiKey = key;
      req.scopes = result.scopes;
      next();
    } catch {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'API key validation failed.',
      });
    }
  };
}

/** Extracts API key from Authorization header or X-API-Key header. */
function extractApiKey(req: Record<string, unknown>): string | null {
  const headers = req.headers as Record<string, string | undefined> | undefined;
  if (!headers) return null;

  // Check Authorization: Bearer <key>
  const auth = headers.authorization || headers.Authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }

  // Check X-API-Key header
  const apiKey = headers['x-api-key'] || headers['X-API-Key'];
  if (apiKey) {
    return apiKey.trim();
  }

  return null;
}
