/**
 * MCP Tool Scope Check — verifies scopes within MCP tool handlers.
 *
 * Since MCP tools are plain functions (not controllers), they cannot
 * use decorator-based scope checks. This helper performs the same check.
 *
 * If no ScopeChecker is present (unauthenticated session), access is allowed.
 * Wildcard scope '*' bypasses all checks.
 */

import type { ScopeChecker } from '@agentojs/core';
import { checkScope } from '@agentojs/core';

export interface McpToolResult {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/**
 * Check if the scope checker (if any) has the required scope.
 * Returns an error McpToolResult if the scope is missing, or null if access is allowed.
 */
export function checkMcpScope(
  scopeChecker: ScopeChecker | undefined,
  requiredScope: string,
): McpToolResult | null {
  const result = checkScope(scopeChecker, requiredScope);
  if (result.allowed) return null;

  return {
    content: [
      {
        type: 'text' as const,
        text: `Access denied: ${result.error}. Current scopes: [${scopeChecker?.scopes.join(', ') ?? ''}]`,
      },
    ],
    isError: true,
  };
}
