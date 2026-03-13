/**
 * Framework-free scope checking utilities.
 * Replaces NestJS ApiKey-based scope checks.
 */

export interface ScopeChecker {
  hasScope(scope: string): boolean;
  scopes: string[];
}

export function checkScope(
  checker: ScopeChecker | undefined,
  requiredScope: string,
): { allowed: true } | { allowed: false; error: string } {
  if (!checker) return { allowed: true };
  if (checker.scopes.includes('*')) return { allowed: true };
  if (checker.hasScope(requiredScope)) return { allowed: true };
  return { allowed: false, error: `Missing required scope: ${requiredScope}` };
}
