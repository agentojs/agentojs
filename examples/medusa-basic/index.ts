/**
 * Medusa Basic Example
 *
 * Connects to a Medusa.js v2 store, searches for products,
 * and prints the results.
 *
 * Usage:
 *   export MEDUSA_URL=http://localhost:9000
 *   export MEDUSA_API_KEY=sk_your_key
 *   npx tsx index.ts
 */

import { MedusaBackend } from '@agentojs/medusa';
import type { Product, PaginatedResponse } from '@agentojs/core';

async function main() {
  const backend = new MedusaBackend({
    backendUrl: process.env.MEDUSA_URL || 'http://localhost:9000',
    apiKey: process.env.MEDUSA_API_KEY || 'sk_test_key',
  });

  // Health check
  const healthy = await backend.healthCheck();
  console.log('Store healthy:', healthy);

  if (!healthy) {
    console.error('Store is not reachable. Check MEDUSA_URL and MEDUSA_API_KEY.');
    process.exit(1);
  }

  // List regions
  const regions = await backend.getRegions();
  console.log(`\nFound ${regions.length} region(s):`);
  for (const region of regions) {
    console.log(`  - ${region.name} (${region.currency_code})`);
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
    console.log(`  - ${product.title} (${priceStr})`);
  }

  // Get first product details
  if (results.data.length > 0) {
    const product = await backend.getProduct(results.data[0].id);
    console.log(`\nProduct details: ${product.title}`);
    console.log(`  Description: ${product.description || 'N/A'}`);
    console.log(`  Variants: ${product.variants?.length || 0}`);
    console.log(`  Images: ${product.images?.length || 0}`);
  }
}

main().catch(console.error);
