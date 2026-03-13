import { describe, it, expect } from 'vitest';
import type { ScopeChecker } from '@agentojs/core';
import { checkMcpScope } from '../scope-check.js';

function makeScopeChecker(scopes: string[]): ScopeChecker {
  return {
    scopes,
    hasScope(scope: string) {
      return scopes.includes('*') || scopes.includes(scope);
    },
  };
}

describe('checkMcpScope', () => {
  it('returns null when scopeChecker is undefined (unauthenticated)', () => {
    expect(checkMcpScope(undefined, 'products:read')).toBeNull();
  });

  it('returns null when scopeChecker has the required scope', () => {
    const checker = makeScopeChecker(['products:read', 'cart:read']);
    expect(checkMcpScope(checker, 'products:read')).toBeNull();
  });

  it('returns error result when scopeChecker lacks the required scope', () => {
    const checker = makeScopeChecker(['products:read']);
    const result = checkMcpScope(checker, 'orders:read');

    expect(result).not.toBeNull();
    expect(result!.isError).toBe(true);
    expect(result!.content).toHaveLength(1);
    expect(result!.content[0].type).toBe('text');
    expect(result!.content[0].text).toContain('Access denied');
    expect(result!.content[0].text).toContain('orders:read');
  });

  it('returns null when scopeChecker has wildcard scope', () => {
    const checker = makeScopeChecker(['*']);
    expect(checkMcpScope(checker, 'anything:write')).toBeNull();
  });
});
