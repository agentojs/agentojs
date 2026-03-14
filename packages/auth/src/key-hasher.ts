/**
 * API key hashing — SHA-256 for storage, constant-time comparison.
 */

import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Hashes an API key using SHA-256 for secure storage.
 *
 * @param key - The plaintext API key
 * @returns Hex-encoded SHA-256 hash
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Compares an API key against a stored hash using constant-time comparison.
 *
 * @param key - The plaintext API key to check
 * @param hash - The stored SHA-256 hash
 * @returns `true` if the key matches the hash
 */
export function compareApiKey(key: string, hash: string): boolean {
  const keyHash = hashApiKey(key);
  try {
    return timingSafeEqual(
      Buffer.from(keyHash, 'hex'),
      Buffer.from(hash, 'hex'),
    );
  } catch {
    return false;
  }
}
