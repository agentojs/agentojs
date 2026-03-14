import { describe, it, expect } from 'vitest';
import { generateApiKey } from '../key-generator.js';

describe('generateApiKey', () => {
  it('generates a key with default prefix', () => {
    const { key, keyHash } = generateApiKey();
    expect(key).toMatch(/^agento_sk_/);
    expect(keyHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('generates a key with custom prefix', () => {
    const { key } = generateApiKey('myapp_live');
    expect(key).toMatch(/^myapp_live_/);
  });

  it('generates unique keys on each call', () => {
    const keys = new Set<string>();
    for (let i = 0; i < 50; i++) {
      keys.add(generateApiKey().key);
    }
    expect(keys.size).toBe(50);
  });

  it('generates keys with sufficient length', () => {
    const { key } = generateApiKey();
    // prefix (9) + underscore (1) + base64url of 32 bytes (43) = 53
    expect(key.length).toBeGreaterThanOrEqual(50);
  });

  it('key hash is a valid SHA-256 hex string', () => {
    const { keyHash } = generateApiKey();
    expect(keyHash).toHaveLength(64);
    expect(keyHash).toMatch(/^[a-f0-9]+$/);
  });

  it('different keys produce different hashes', () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.keyHash).not.toBe(b.keyHash);
  });
});
