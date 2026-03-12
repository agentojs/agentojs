# Medusa Basic Example

Connects to a Medusa.js v2 store, searches for products, and prints the results.

## Prerequisites

- A running Medusa.js v2 instance
- A publishable API key from your Medusa admin

## Setup

```bash
cd examples/medusa-basic
pnpm install
```

## Run

```bash
export MEDUSA_URL=http://localhost:9000
export MEDUSA_API_KEY=sk_your_publishable_key
npx tsx index.ts
```

## What it does

1. Performs a health check against the Medusa store
2. Lists available regions with their currencies
3. Searches for the first 10 products
4. Displays detailed info for the first product found

## Expected output

```
Store healthy: true

Found 2 region(s):
  - EU (eur)
  - NA (usd)

Found 5 product(s):
  - T-Shirt (19.50 usd)
  - Hoodie (39.99 usd)
  ...

Product details: T-Shirt
  Description: A comfortable cotton t-shirt
  Variants: 3
  Images: 2
```
