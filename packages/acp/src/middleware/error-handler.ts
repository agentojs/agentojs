import type { Request, Response, NextFunction } from 'express';
import type { Logger } from '@agentojs/core';

/**
 * ACP error response format per OpenAI ACP spec.
 */
interface AcpErrorResponse {
  type: string;
  code: string;
  message: string;
  param?: string;
}

/**
 * Maps HTTP status codes to ACP error types.
 */
function httpStatusToAcpType(status: number): string {
  switch (status) {
    case 400:
      return 'invalid_request';
    case 401:
      return 'authentication_error';
    case 403:
      return 'permission_error';
    case 404:
      return 'invalid_request';
    case 405:
      return 'invalid_request';
    case 409:
      return 'request_not_idempotent';
    case 429:
      return 'rate_limit_error';
    default:
      return status >= 500 ? 'api_error' : 'invalid_request';
  }
}

/**
 * Maps HTTP status codes to ACP error codes.
 */
function httpStatusToAcpCode(status: number): string {
  switch (status) {
    case 400:
      return 'invalid';
    case 401:
      return 'authentication_required';
    case 403:
      return 'forbidden';
    case 404:
      return 'not_found';
    case 405:
      return 'method_not_allowed';
    case 409:
      return 'request_not_idempotent';
    case 429:
      return 'rate_limit_exceeded';
    default:
      return status >= 500 ? 'internal_error' : 'invalid';
  }
}

/**
 * Express error-handling middleware that formats all errors per OpenAI ACP spec.
 *
 * Response format: { type, code, message, param? }
 *
 * If the error object has a `statusCode` or `status` property, it is used.
 * Errors that are already ACP checkout session responses (have `id`, `status`, `line_items`)
 * are passed through unmodified.
 */
export function acpErrorHandler(logger?: Logger) {
  return (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    // If response already sent, skip
    if (res.headersSent) return;

    let status = 500;
    let message = 'An unexpected error occurred';
    let param: string | undefined;

    if (err && typeof err === 'object') {
      const e = err as Record<string, unknown>;

      // Extract status from error object
      if (typeof e.statusCode === 'number') {
        status = e.statusCode;
      } else if (typeof e.status === 'number') {
        status = e.status;
      }

      // If the error body is already an ACP checkout session response, pass through
      if (e.body && typeof e.body === 'object') {
        const body = e.body as Record<string, unknown>;
        if (body.id && body.status && body.line_items) {
          res.status(status).json(body);
          return;
        }
      }

      if (typeof e.message === 'string') {
        message = e.message;
      }
      if (typeof e.param === 'string') {
        param = e.param;
      }
    } else if (err instanceof Error) {
      message = err.message;
    }

    if (status >= 500) {
      logger?.error(`ACP error: ${message}`);
    }

    const errorResponse: AcpErrorResponse = {
      type: httpStatusToAcpType(status),
      code: httpStatusToAcpCode(status),
      message,
    };

    if (param) {
      errorResponse.param = param;
    }

    res.status(status).json(errorResponse);
  };
}
