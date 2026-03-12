/**
 * Multi-Store Example
 *
 * Demonstrates the key value proposition of agentojs: one interface,
 * multiple backends. Connects to both Medusa and WooCommerce stores,
 * searches for products across both, and compares results.
 *
 * Usage:
 *   export MEDUSA_URL=http://localhost:9000
 *   export MEDUSA_API_KEY=sk_your_key
 *   export WC_URL=https://your-store.com
 *   export WC_CONSUMER_KEY=ck_...
 *   export WC_CONSUMER_SECRET=cs_...
 *   npx tsx index.ts
 */

import { MedusaBackend } from '@agentojs/medusa';
import { WooCommerceBackend } from '@agentojs/woocommerce';
import type { CommerceBackend, Product, PaginatedResponse } from '@agentojs/core';

// A generic function that works with ANY CommerceBackend implementation.
// This is the power of agentojs -- write logic once, use with any store.
async function searchAndDisplay(
  name: string,
  backend: CommerceBackend,
  query: string,
): Promise<Product[]> {
  console.log(`\n--- ${name} ---`);

  const healthy = await backend.healthCheck();
  if (!healthy) {
    console.log(`  [offline] ${name} is not reachable, skipping.`);
    return [];
  }

  const results: PaginatedResponse<Product> = await backend.searchProducts({
    q: query,
    limit: 5,
    offset: 0,
  });

  console.log(`  Found ${results.count} product(s) matching "${query}":`);
  for (const product of results.data) {
    const price = product.variants?.[0]?.prices?.[0];
    const priceStr = price
      ? `${(price.amount / 100).toFixed(2)} ${price.currency_code?.toUpperCase()}`
      : 'no price';
    console.log(`    - ${product.title} (${priceStr})`);
  }

  return results.data;
}

async function main() {
  // Configure stores -- each uses a different backend
  const stores: Array<{ name: string; backend: CommerceBackend }> = [
    {
      name: 'Medusa Store',
      backend: new MedusaBackend({
        backendUrl: process.env.MEDUSA_URL || 'http://localhost:9000',
        apiKey: process.env.MEDUSA_API_KEY || 'sk_test_key',
      }),
    },
    {
      name: 'WooCommerce Store',
      backend: new WooCommerceBackend({
        baseUrl: process.env.WC_URL || 'https://your-store.com',
        consumerKey: process.env.WC_CONSUMER_KEY || 'ck_test',
        consumerSecret: process.env.WC_CONSUMER_SECRET || 'cs_test',
      }),
    },
  ];

  const query = process.argv[2] || 'shirt';
  console.log(`Searching for "${query}" across ${stores.length} store(s)...`);

  // Search all stores in parallel -- same function, different backends
  const results = await Promise.allSettled(
    stores.map((store) => searchAndDisplay(store.name, store.backend, query)),
  );

  // Aggregate results
  const allProducts: Product[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allProducts.push(...result.value);
    }
  }

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Total products found: ${allProducts.length}`);

  if (allProducts.length > 0) {
    // Sort by price (lowest first)
    const withPrices = allProducts
      .filter((p) => p.variants?.[0]?.prices?.[0]?.amount != null)
      .sort((a, b) => {
        const priceA = a.variants![0].prices![0].amount;
        const priceB = b.variants![0].prices![0].amount;
        return priceA - priceB;
      });

    if (withPrices.length > 0) {
      const cheapest = withPrices[0];
      const cheapestPrice = cheapest.variants![0].prices![0];
      console.log(
        `Cheapest: ${cheapest.title} at ${(cheapestPrice.amount / 100).toFixed(2)} ${cheapestPrice.currency_code?.toUpperCase()}`,
      );
    }
  }
}

main().catch(console.error);
