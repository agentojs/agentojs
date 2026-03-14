# @agentojs/auth

Lightweight API key utilities for AgentOJS — generate, hash, validate, and authenticate.

## Installation

```bash
npm install @agentojs/auth
```

No external dependencies — uses Node.js built-in `crypto` module.

## Quick Start

```ts
import {
  generateApiKey,
  hashApiKey,
  compareApiKey,
  validateApiKey,
  createAuthMiddleware,
} from '@agentojs/auth';

// Generate a new API key
const { key, keyHash } = generateApiKey();
// key:     "agento_sk_dGVzdC1rZXktZGF0YS0zMi1ieXRlcy1sb25n..."
// keyHash: "a1b2c3..." (store this in your database)

// Validate key format
const result = validateApiKey(key);
// { valid: true, prefix: "agento_sk" }

// Later: verify a key against stored hash
const isValid = compareApiKey(userProvidedKey, storedHash);
```

## API Reference

### `generateApiKey(prefix?)`

Generates a cryptographically secure API key using `crypto.randomBytes(32)`.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `prefix` | `string` | `'agento_sk'` | Key prefix |

**Returns:** `{ key: string, keyHash: string }`

### `hashApiKey(key)`

Computes SHA-256 hash of an API key for database storage.

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Plaintext API key |

**Returns:** `string` — 64-character hex hash.

### `compareApiKey(key, hash)`

Constant-time comparison of an API key against a stored hash. Safe against timing attacks.

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Plaintext API key |
| `hash` | `string` | Stored SHA-256 hash |

**Returns:** `boolean`

### `validateApiKey(key)`

Checks API key format: must have a prefix, underscore separator, and token of sufficient length.

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | API key to validate |

**Returns:** `{ valid: boolean, prefix?: string, error?: string }`

### `createAuthMiddleware(options)`

Creates Express middleware that authenticates requests via API key.

Extracts key from `Authorization: Bearer <key>` or `X-API-Key` header.

```ts
import express from 'express';
import { createAuthMiddleware, hashApiKey } from '@agentojs/auth';

const app = express();

app.use(createAuthMiddleware({
  validateKey: async (key) => {
    const hash = hashApiKey(key);
    const record = await db.findByHash(hash);
    if (!record) return { valid: false };
    return { valid: true, scopes: record.scopes };
  },
}));

app.get('/protected', (req, res) => {
  res.json({ apiKey: req.apiKey, scopes: req.scopes });
});
```

## License

MIT
