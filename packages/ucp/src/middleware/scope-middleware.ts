import type { Request, Response, NextFunction } from 'express';
import type { ScopeChecker } from '@agentojs/core';
import { checkScope } from '@agentojs/core';

/**
 * Express middleware factory that enforces scope requirements.
 * Returns 403 if the scope check fails.
 */
export function requireScope(
  scope: string,
  scopeChecker?: ScopeChecker,
): (req: Request, res: Response, next: NextFunction) => void {
  return (_req: Request, res: Response, next: NextFunction) => {
    const result = checkScope(scopeChecker, scope);
    if (!result.allowed) {
      res.status(403).json({ error: result.error });
      return;
    }
    next();
  };
}
