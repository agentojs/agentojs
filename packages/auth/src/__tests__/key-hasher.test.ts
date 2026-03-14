import { describe, it, expect } from 'vitest';
import { hashApiKey, compareApiKey } from '../key-hasher.js';
import { generateApiKey } from '../key-generator.js';

describe('hashApiKey', () => {
  it('returns a 64-character hex string', () => {
    const hash = hashApiKey('test-key');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  it('is deterministic', () => {
    const hash1 = hashApiKey('same-key');
    const hash2 = hashApiKey('same-key');
    expect(hash1).toBe(hash2);
  });

  it('different inputs produce different hashes', () => {
    const hash1 = hashApiKey('key-a');
    const hash2 = hashApiKey('key-b');
    expect(hash1).not.toBe(hash2);
  });
});

describe('compareApiKey', () => {
  it('returns true for matching key and hash', () => {
    const { key, keyHash } = generateApiKey();
    expect(compareApiKey(key, keyHash)).toBe(true);
  });

  it('returns false for wrong key', () => {
    const { keyHash } = generateApiKey();
    expect(compareApiKey('wrong-key', keyHash)).toBe(false);
  });

  it('returns false for wrong hash', () => {
    const { key } = generateApiKey();
    const wrongHash = 'a'.repeat(64);
    expect(compareApiKey(key, wrongHash)).toBe(false);
  });

  it('returns false for malformed hash', () => {
    const { key } = generateApiKey();
    expect(compareApiKey(key, 'not-a-valid-hash')).toBe(false);
  });

  it('returns false for empty inputs', () => {
    expect(compareApiKey('', '')).toBe(false);
  });

  it('uses constant-time comparison (does not throw on length mismatch)', () => {
    expect(compareApiKey('short', 'a'.repeat(64))).toBe(false);
  });
});
