# Errors

Each adapter package exports its own error class. All error classes extend the standard JavaScript `Error`.

## MedusaApiError

Thrown by `MedusaBackend` when the Medusa v2 API returns a non-OK response.

```ts
import { MedusaApiError } from '@agentojs/medusa'
```

```ts
class MedusaApiError extends Error {
  status: number    // HTTP status code (e.g. 404, 500)
  body: string      // Response body text
  url: string       // Request URL that failed
}
```

**Message format:** `Medusa API error {status}: {body} ({url})`

### Handling

```ts
import { MedusaBackend, MedusaApiError } from '@agentojs/medusa'

const backend = new MedusaBackend({
  backendUrl: 'http://localhost:9000',
  apiKey: 'pk_...',
})

try {
  const product = await backend.getProduct('nonexistent')
} catch (err) {
  if (err instanceof MedusaApiError) {
    console.error(`HTTP ${err.status} at ${err.url}`)
    console.error(`Body: ${err.body}`)

    if (err.status === 404) {
      // Product not found
    } else if (err.status === 401) {
      // Invalid API key
    }
  }
}
```

### Common Status Codes

| Status | Meaning |
|---|---|
| 400 | Bad request (invalid parameters) |
| 401 | Unauthorized (invalid or missing API key) |
| 404 | Resource not found |
| 409 | Conflict (e.g. cart already completed) |
| 500 | Internal Medusa server error |

## WooCommerceApiError

Thrown by `WooCommerceBackend` when the WooCommerce REST API or Store API returns a non-OK response.

```ts
import { WooCommerceApiError } from '@agentojs/woocommerce'
```

```ts
class WooCommerceApiError extends Error {
  status: number    // HTTP status code
  body: string      // Response body text
  url: string       // Request URL that failed
}
```

**Message format:** `WooCommerce API error {status} at {url}: {body}`

### Handling

```ts
import { WooCommerceBackend, WooCommerceApiError } from '@agentojs/woocommerce'

const backend = new WooCommerceBackend({
  baseUrl: 'https://myshop.com',
  consumerKey: 'ck_...',
  consumerSecret: 'cs_...',
})

try {
  const product = await backend.getProduct('nonexistent')
} catch (err) {
  if (err instanceof WooCommerceApiError) {
    console.error(`HTTP ${err.status} at ${err.url}`)
    console.error(`Body: ${err.body}`)

    if (err.status === 404) {
      // Product not found
    } else if (err.status === 401) {
      // Invalid consumer key/secret
    }
  }
}
```

### Common Status Codes

| Status | Meaning |
|---|---|
| 400 | Bad request |
| 401 | Unauthorized (invalid consumer key/secret) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource not found |
| 500 | Internal WooCommerce server error |

## GenericBackendNotImplementedError

Thrown by `GenericRESTBackend` when a method is called that the remote API does not support (i.e. the endpoint is not configured or returns an error).

```ts
import { GenericBackendNotImplementedError } from '@agentojs/generic'
```

```ts
class GenericBackendNotImplementedError extends Error {
  // constructor(method: string)
}
```

**Message format:** `Generic REST backend does not support "{method}". Configure the remote API to provide this endpoint, or use a specialized backend (medusa, woocommerce).`

### Handling

```ts
import { GenericRESTBackend, GenericBackendNotImplementedError } from '@agentojs/generic'

const backend = new GenericRESTBackend({
  baseUrl: 'https://api.example.com',
  apiKey: 'test',
})

try {
  const cart = await backend.createCart('us', [])
} catch (err) {
  if (err instanceof GenericBackendNotImplementedError) {
    // This API doesn't support cart operations
    console.log(err.message)
  }
}
```

## Network Errors

All adapters use `fetch()` internally. If the backend is unreachable, you will get a standard `TypeError` (e.g. `fetch failed`) rather than an adapter-specific error.

```ts
try {
  const products = await backend.searchProducts({ q: 'test' })
} catch (err) {
  if (err instanceof MedusaApiError) {
    // API responded with an error status
  } else if (err instanceof TypeError) {
    // Network error — backend unreachable
    console.error('Cannot connect to backend:', err.message)
  }
}
```

::: tip
`healthCheck()` is the exception — it catches all errors and returns `false` instead of throwing. Use it to check connectivity before making other calls.
:::

## Error Hierarchy

```
Error
├── MedusaApiError              (@agentojs/medusa)
├── WooCommerceApiError          (@agentojs/woocommerce)
├── GenericBackendNotImplementedError  (@agentojs/generic)
└── TypeError                    (network errors from fetch)
```
