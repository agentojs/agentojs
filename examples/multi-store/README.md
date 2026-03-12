# Multi-Store Example

Connects to multiple commerce backends (Medusa + WooCommerce) and searches products across both using the same interface. This is the key value proposition of agentojs.

## Why this matters

Without agentojs, you would need to write separate code for each platform:

```typescript
// Without agentojs -- platform-specific code everywhere
const medusaProducts = await fetch('http://medusa/store/products?q=shirt');
const wcProducts = await fetch('https://wc/wp-json/wc/store/v1/products?search=shirt');
// Different response formats, different auth, different pagination...
```

With agentojs, one function works with any backend:

```typescript
// With agentojs -- one interface for all platforms
async function search(backend: CommerceBackend, query: string) {
  return backend.searchProducts({ query, limit: 10, offset: 0 });
}
```

## Prerequisites

- A Medusa.js v2 instance (or any supported backend)
- A WooCommerce store with REST API credentials

## Setup

```bash
cd examples/multi-store
pnpm install
```

## Run

```bash
export MEDUSA_URL=http://localhost:9000
export MEDUSA_API_KEY=sk_your_key
export WC_URL=https://your-store.com
export WC_CONSUMER_KEY=ck_your_key
export WC_CONSUMER_SECRET=cs_your_secret
npx tsx index.ts [search_query]
```

The search query defaults to "shirt" if not provided.

## What it does

1. Connects to both Medusa and WooCommerce stores
2. Searches for products matching the query across both stores in parallel
3. Aggregates results from all backends
4. Finds the cheapest product across all stores

## Expected output

```
Searching for "shirt" across 2 store(s)...

--- Medusa Store ---
  Found 3 product(s) matching "shirt":
    - Cotton T-Shirt (19.50 USD)
    - Polo Shirt (29.99 USD)
    - Dress Shirt (45.00 USD)

--- WooCommerce Store ---
  Found 2 product(s) matching "shirt":
    - V-Neck Tee (15.00 USD)
    - Hawaiian Shirt (35.00 USD)

=== Summary ===
Total products found: 5
Cheapest: V-Neck Tee at 15.00 USD
```
