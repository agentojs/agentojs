/**
 * API key validation — format, length, and prefix checking.
 */

import type { ApiKeyValidation } from './types.js';

/** Minimum length for the token part of an API key. */
const MIN_TOKEN_LENGTH = 20;

/**
 * Validates an API key's format, length, and prefix.
 *
 * Expected format: `{prefix}_{base64url_token}`
 * - Must contain at least one underscore
 * - Token part must be at least 20 characters
 * - Key must not be empty
 *
 * @param key - The API key to validate
 * @returns Validation result with `valid`, optional `prefix`, and optional `error`
 */
export function validateApiKey(key: string): ApiKeyValidation {
  if (!key || typeof key !== 'string') {
    return { valid: false, error: 'API key is required' };
  }

  const trimmed = key.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'API key is empty' };
  }

  const lastUnderscore = trimmed.lastIndexOf('_');
  if (lastUnderscore === -1) {
    return { valid: false, error: 'API key must contain a prefix separated by underscore' };
  }

  const prefix = trimmed.substring(0, lastUnderscore);
  const token = trimmed.substring(lastUnderscore + 1);

  if (prefix.length === 0) {
    return { valid: false, error: 'API key prefix is empty' };
  }

  if (token.length < MIN_TOKEN_LENGTH) {
    return { valid: false, error: `API key token must be at least ${MIN_TOKEN_LENGTH} characters` };
  }

  return { valid: true, prefix };
}
