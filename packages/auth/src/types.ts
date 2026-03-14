/**
 * Types for @agentojs/auth — API key utilities.
 */

/** Generated API key with its hash for storage. */
export interface ApiKey {
  /** The plaintext API key (show to user once, never store). */
  key: string;
  /** SHA-256 hash of the key (store in database). */
  keyHash: string;
}

/** Validation result for an API key. */
export interface ApiKeyValidation {
  /** Whether the key format is valid. */
  valid: boolean;
  /** Extracted prefix (e.g. 'agento_sk') if present. */
  prefix?: string;
  /** Error message if invalid. */
  error?: string;
}

/** Options for the auth middleware factory. */
export interface AuthMiddlewareOptions {
  /** Async function to validate an API key and return scopes. */
  validateKey: (key: string) => Promise<{
    valid: boolean;
    scopes?: string[];
  }>;
}

/** Express Request extended with API key auth properties. */
export interface AuthenticatedRequest {
  /** The validated API key. */
  apiKey?: string;
  /** Scopes granted to this key. */
  scopes?: string[];
}
