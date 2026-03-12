# WooCommerce Basic Example

Connects to a WooCommerce store, searches for products, creates a cart, and adds an item.

## Prerequisites

- A WooCommerce store with the Store API enabled (WooCommerce 8.3+)
- REST API credentials (Consumer Key + Consumer Secret) from WooCommerce > Settings > Advanced > REST API

## Setup

```bash
cd examples/woocommerce-basic
pnpm install
```

## Run

```bash
export WC_URL=https://your-store.com
export WC_CONSUMER_KEY=ck_your_consumer_key
export WC_CONSUMER_SECRET=cs_your_consumer_secret
npx tsx index.ts
```

## What it does

1. Performs a health check against the WooCommerce store
2. Searches for the first 10 products
3. Creates an empty cart
4. Adds the first product to the cart
5. Lists all product categories (collections)

## How WooCommerce cart works

WooCommerce uses a Cart-Token (JWT) to track cart sessions. The `@agentojs/woocommerce` adapter handles this internally -- you work with a simple UUID cart ID while the adapter manages the real Cart-Token header.

## Expected output

```
Store healthy: true

Found 12 product(s):
  - Beanie [15] (18.00 USD)
  - Belt [16] (55.00 USD)
  ...

Cart created: a1b2c3d4-...

Added "Beanie" to cart.
Cart items: 1
  - Beanie x1

Found 4 collection(s):
  - Accessories (accessories)
  - Clothing (clothing)
  ...
```
