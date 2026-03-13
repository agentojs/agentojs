import type { Request, Response, NextFunction } from 'express';

const ACP_API_VERSION = '2025-09-12';

const REQUIRED_HEADERS = [
  'idempotency-key',
  'request-id',
  'api-version',
] as const;

/**
 * Express middleware that validates required ACP headers on checkout_sessions routes.
 * Echoes Idempotency-Key and Request-Id back in response headers.
 *
 * @param requireHeaders - If false, skip header validation (default: true).
 */
export function acpHeadersMiddleware(
  requireHeaders = true,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!requireHeaders) {
      next();
      return;
    }

    const missing: string[] = [];

    for (const header of REQUIRED_HEADERS) {
      if (!req.headers[header]) {
        missing.push(header);
      }
    }

    if (missing.length > 0) {
      res.status(400).json({
        type: 'invalid_request',
        code: 'missing_headers',
        message: `Missing required ACP headers: ${missing.join(', ')}`,
      });
      return;
    }

    // Validate API-Version
    const apiVersion = req.headers['api-version'] as string;
    if (apiVersion !== ACP_API_VERSION) {
      res.status(400).json({
        type: 'invalid_request',
        code: 'unsupported_api_version',
        message: `Unsupported API-Version: ${apiVersion}. Current version: ${ACP_API_VERSION}`,
      });
      return;
    }

    // Echo back Idempotency-Key and Request-Id in response
    const idempotencyKey = req.headers['idempotency-key'] as string;
    const requestId = req.headers['request-id'] as string;

    res.setHeader('Idempotency-Key', idempotencyKey);
    res.setHeader('Request-Id', requestId);

    next();
  };
}
