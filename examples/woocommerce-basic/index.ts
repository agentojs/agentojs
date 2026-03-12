/**
 * WooCommerce Basic Example
 *
 * Connects to a WooCommerce store, searches for products,
 * creates a cart, and adds an item.
 *
 * Usage:
 *   export WC_URL=https://your-store.com
 *   export WC_CONSUMER_KEY=ck_...
 *   export WC_CONSUMER_SECRET=cs_...
 *   npx tsx index.ts
 */

import { WooCommerceBackend } from '@agentojs/woocommerce';
import type { Product, Cart, PaginatedResponse } from '@agentojs/core';

async function main() {
  const backend = new WooCommerceBackend({
    baseUrl: process.env.WC_URL || 'https://your-store.com',
    consumerKey: process.env.WC_CONSUMER_KEY || 'ck_test',
    consumerSecret: process.env.WC_CONSUMER_SECRET || 'cs_test',
  });

  // Health check
  const healthy = await backend.healthCheck();
  console.log('Store healthy:', healthy);

  if (!healthy) {
    console.error('Store is not reachable. Check WC_URL and credentials.');
    process.exit(1);
  }

  // Search products
  const results: PaginatedResponse<Product> = await backend.searchProducts({
    q: '',
    limit: 10,
    offset: 0,
  });

  console.log(`\nFound ${results.count} product(s):`);
  for (const product of results.data) {
    const price = product.variants?.[0]?.prices?.[0];
    const priceStr = price
      ? `${(price.amount / 100).toFixed(2)} ${price.currency_code}`
      : 'no price';
    console.log(`  - ${product.title} [${product.id}] (${priceStr})`);
  }

  // Create a cart
  const cart: Cart = await backend.createCart('default', []);
  console.log(`\nCart created: ${cart.id}`);

  // Add first product to cart
  if (results.data.length > 0) {
    const variantId = results.data[0].variants?.[0]?.id;

    if (variantId) {
      const updatedCart = await backend.addLineItem(cart.id, variantId, 1);

      console.log(`\nAdded "${results.data[0].title}" to cart.`);
      console.log(`Cart items: ${updatedCart.items?.length || 0}`);

      for (const item of updatedCart.items || []) {
        console.log(`  - ${item.title} x${item.quantity}`);
      }
    } else {
      console.log(`Product "${results.data[0].title}" has no variants, skipping cart add.`);
    }
  }

  // List collections (categories)
  const collections = await backend.getCollections();
  console.log(`\nFound ${collections.length} collection(s):`);
  for (const col of collections) {
    console.log(`  - ${col.title} (${col.handle})`);
  }
}

main().catch(console.error);
