import { describe, it, expect } from 'vitest';
import { checkScope, type ScopeChecker } from '../scope-checker.js';

function createChecker(scopes: string[]): ScopeChecker {
  return {
    scopes,
    hasScope(scope: string) {
      return scopes.includes(scope);
    },
  };
}

describe('checkScope', () => {
  it('allows all when checker is undefined', () => {
    const result = checkScope(undefined, 'products:read');
    expect(result).toEqual({ allowed: true });
  });

  it('allows when checker has wildcard scope', () => {
    const checker = createChecker(['*']);
    const result = checkScope(checker, 'products:read');
    expect(result).toEqual({ allowed: true });
  });

  it('allows when checker has exact scope', () => {
    const checker = createChecker(['products:read', 'cart:write']);
    const result = checkScope(checker, 'products:read');
    expect(result).toEqual({ allowed: true });
  });

  it('denies when checker lacks the required scope', () => {
    const checker = createChecker(['products:read']);
    const result = checkScope(checker, 'cart:write');
    expect(result).toEqual({
      allowed: false,
      error: 'Missing required scope: cart:write',
    });
  });

  it('denies when checker has empty scopes', () => {
    const checker = createChecker([]);
    const result = checkScope(checker, 'products:read');
    expect(result).toEqual({
      allowed: false,
      error: 'Missing required scope: products:read',
    });
  });
});
