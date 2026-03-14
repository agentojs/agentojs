/**
 * API key generation — cryptographically secure random keys.
 */

import { randomBytes, createHash } from 'node:crypto';
import type { ApiKey } from './types.js';

/**
 * Generates a secure random API key with an optional prefix.
 *
 * @param prefix - Key prefix (default: 'agento_sk'). Format: `{prefix}_{hex}`
 * @returns Object with plaintext `key` and SHA-256 `keyHash`
 *
 * @example
 * ```ts
 * const { key, keyHash } = generateApiKey();
 * // key:     "agento_sk_a1b2c3d4e5f6..."
 * // keyHash: "f0e1d2c3b4a5..." (store this in DB)
 * ```
 */
export function generateApiKey(prefix = 'agento_sk'): ApiKey {
  const bytes = randomBytes(32);
  const token = bytes.toString('hex');
  const key = `${prefix}_${token}`;
  const keyHash = createHash('sha256').update(key).digest('hex');

  return { key, keyHash };
}
