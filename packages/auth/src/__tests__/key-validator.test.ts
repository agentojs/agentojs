import { describe, it, expect } from 'vitest';
import { validateApiKey } from '../key-validator.js';
import { generateApiKey } from '../key-generator.js';

describe('validateApiKey', () => {
  it('accepts a valid generated key', () => {
    const { key } = generateApiKey();
    const result = validateApiKey(key);
    expect(result.valid).toBe(true);
    expect(result.prefix).toBe('agento_sk');
    expect(result.error).toBeUndefined();
  });

  it('accepts a key with custom prefix', () => {
    const { key } = generateApiKey('myapp_live');
    const result = validateApiKey(key);
    expect(result.valid).toBe(true);
    expect(result.prefix).toBe('myapp_live');
  });

  it('rejects empty string', () => {
    const result = validateApiKey('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('API key is required');
  });

  it('rejects whitespace-only string', () => {
    const result = validateApiKey('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('API key is empty');
  });

  it('rejects key without underscore', () => {
    const result = validateApiKey('nounderscore');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('underscore');
  });

  it('rejects key with empty prefix', () => {
    const result = validateApiKey('_somethinglong1234567890');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('prefix');
  });

  it('rejects key with short token', () => {
    const result = validateApiKey('prefix_short');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least');
  });

  it('handles null-like inputs', () => {
    expect(validateApiKey(null as any).valid).toBe(false);
    expect(validateApiKey(undefined as any).valid).toBe(false);
  });
});
