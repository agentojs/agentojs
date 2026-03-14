# @agentojs/auth

Lightweight API key utilities — generate, hash, validate, and authenticate requests with Express middleware.

## Installation

```bash
npm install @agentojs/auth
```

No external dependencies — uses Node.js built-in `crypto` module.

## `generateApiKey(prefix?)`

Generates a cryptographically secure API key using `crypto.randomBytes(32)`.

```ts
import { generateApiKey } from '@agentojs/auth';

const { key, keyHash } = generateApiKey();
// key:     "agento_sk_a1b2c3d4e5f6..."  (show to user once)
// keyHash: "f0e1d2c3b4a5..."            (store in database)

// Custom prefix
const { key: liveKey } = generateApiKey('myapp_live');
// "myapp_live_a1b2c3d4..."
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `prefix` | `string` | `'agento_sk'` | Key prefix (format: `{prefix}_{hex}`) |

**Returns:** `ApiKey` — `{ key: string, keyHash: string }`

## `hashApiKey(key)`

Computes SHA-256 hash of an API key for secure database storage.

```ts
import { hashApiKey } from '@agentojs/auth';

const hash = hashApiKey('agento_sk_a1b2c3...');
// "f0e1d2c3b4a5..." (64-character hex string)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Plaintext API key |

**Returns:** `string` — 64-character hex-encoded SHA-256 hash.

## `compareApiKey(key, hash)`

Constant-time comparison of an API key against a stored hash. Safe against timing attacks.

```ts
import { compareApiKey } from '@agentojs/auth';

const isValid = compareApiKey(userKey, storedHash);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Plaintext API key to check |
| `hash` | `string` | Stored SHA-256 hash |

**Returns:** `boolean` — `true` if the key matches the hash.

## `validateApiKey(key)`

Validates an API key's format. Checks for prefix, underscore separator, and minimum token length (20 characters).

```ts
import { validateApiKey } from '@agentojs/auth';

validateApiKey('agento_sk_a1b2c3d4e5f6...');
// { valid: true, prefix: 'agento_sk' }

validateApiKey('bad-key');
// { valid: false, error: 'API key must contain a prefix separated by underscore' }

validateApiKey('prefix_short');
// { valid: false, error: 'API key token must be at least 20 characters' }
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | API key to validate |

**Returns:** `ApiKeyValidation` — `{ valid: boolean, prefix?: string, error?: string }`

## `createAuthMiddleware(options)`

Creates Express middleware that authenticates requests via API key. Extracts the key from:

1. `Authorization: Bearer <key>` header
2. `X-API-Key: <key>` header

On success, sets `req.apiKey` and `req.scopes` on the request. On failure, responds with 401.

```ts
import express from 'express';
import { createAuthMiddleware, hashApiKey } from '@agentojs/auth';

const app = express();

app.use(createAuthMiddleware({
  validateKey: async (key) => {
    // Look up the key hash in your database
    const hash = hashApiKey(key);
    const record = await db.apiKeys.findOne({ where: { keyHash: hash } });

    if (!record || !record.isActive) {
      return { valid: false };
    }

    return { valid: true, scopes: record.scopes };
  },
}));

// Protected route — req.apiKey and req.scopes are set
app.get('/api/products', (req, res) => {
  console.log('Authenticated with key:', req.apiKey);
  console.log('Scopes:', req.scopes);
  res.json({ products: [] });
});
```

### `AuthMiddlewareOptions`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `validateKey` | `(key: string) => Promise<{ valid: boolean; scopes?: string[] }>` | Yes | Async function to validate a key and return scopes |

## Types

### `ApiKey`

```ts
interface ApiKey {
  key: string;      // Plaintext key (show once, never store)
  keyHash: string;  // SHA-256 hash (store in database)
}
```

### `ApiKeyValidation`

```ts
interface ApiKeyValidation {
  valid: boolean;
  prefix?: string;  // Extracted prefix (e.g. 'agento_sk')
  error?: string;   // Error message if invalid
}
```

### `AuthenticatedRequest`

```ts
interface AuthenticatedRequest {
  apiKey?: string;   // The validated API key
  scopes?: string[]; // Scopes granted to this key
}
```

## Full Example with AgentOJS

```ts
import express from 'express';
import { agentMiddleware } from '@agentojs/express';
import { createAuthMiddleware, hashApiKey } from '@agentojs/auth';
import { MedusaProvider } from '@agentojs/medusa';

const app = express();

// Public health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Protect AI endpoints with API key auth
app.use('/ai', createAuthMiddleware({
  validateKey: async (key) => {
    const hash = hashApiKey(key);
    const record = await db.findApiKey(hash);
    if (!record) return { valid: false };
    return { valid: true, scopes: record.scopes };
  },
}));

// Mount AI protocols (only accessible with valid API key)
app.use('/ai', agentMiddleware({
  store: { name: 'My Store', slug: 'my-store', currency: 'usd', country: 'us', backendUrl: 'http://localhost:9000' },
  provider: new MedusaProvider({ backendUrl: 'http://localhost:9000', apiKey: 'key' }),
}));

app.listen(3100);
```
