/**
 * Generic Car Dealer Example
 *
 * Demonstrates how to connect a hypothetical car dealer REST API
 * using @agentojs/generic with custom field mapping.
 *
 * The dealer API returns vehicles in a non-standard format:
 *   { vehicles: [{ vehicle_name, msrp, vin, ... }] }
 *
 * We map these fields to the standard CommerceBackend Product shape.
 *
 * Usage:
 *   export DEALER_URL=https://api.dealer.example.com
 *   export DEALER_API_KEY=your_api_key
 *   npx tsx index.ts
 */

import { GenericRESTBackend } from '@agentojs/generic';
import type { GenericFieldMap, GenericEndpointsMap } from '@agentojs/generic';
import type { Product, PaginatedResponse } from '@agentojs/core';

// Custom field mapping: dealer API fields -> CommerceBackend fields
const fieldMap: GenericFieldMap = {
  product: {
    title: 'vehicle_name',        // dealer uses "vehicle_name" instead of "title"
    description: 'vehicle_desc',  // dealer uses "vehicle_desc"
    handle: 'vin',                // use VIN as the product handle/slug
    'variants.0.prices.0.amount': 'msrp',            // MSRP in cents
    'variants.0.prices.0.currency_code': 'currency',  // e.g. "usd"
    'variants.0.sku': 'stock_number',                  // dealer stock number
  },
};

// Custom endpoints: the dealer API uses /vehicles instead of /products
const endpointsMap: GenericEndpointsMap = {
  products: '/vehicles',
  product: '/vehicles/:id',
  collections: '/categories',       // vehicle categories (SUV, Sedan, Truck)
  collection: '/categories/:id',
};

async function main() {
  const backend = new GenericRESTBackend({
    baseUrl: process.env.DEALER_URL || 'https://api.dealer.example.com',
    apiKey: process.env.DEALER_API_KEY || 'test_key',
    endpointsMap,
    fieldMap,
  });

  // Health check
  const healthy = await backend.healthCheck();
  console.log('Dealer API healthy:', healthy);

  if (!healthy) {
    console.error('Dealer API is not reachable. Check DEALER_URL and DEALER_API_KEY.');
    process.exit(1);
  }

  // Search vehicles (mapped to products)
  const results: PaginatedResponse<Product> = await backend.searchProducts({
    q: 'SUV',
    limit: 10,
    offset: 0,
  });

  console.log(`\nFound ${results.count} vehicle(s):`);
  for (const vehicle of results.data) {
    const price = vehicle.variants?.[0]?.prices?.[0];
    const priceStr = price
      ? `$${(price.amount / 100).toLocaleString()}`
      : 'price TBD';
    console.log(`  - ${vehicle.title} (${priceStr}) [VIN: ${vehicle.handle}]`);
  }

  // Get vehicle details
  if (results.data.length > 0) {
    const vehicle = await backend.getProduct(results.data[0].id);
    console.log(`\nVehicle details:`);
    console.log(`  Name: ${vehicle.title}`);
    console.log(`  Description: ${vehicle.description || 'N/A'}`);
    console.log(`  VIN: ${vehicle.handle}`);
    console.log(`  Stock #: ${vehicle.variants?.[0]?.sku || 'N/A'}`);
  }

  // List categories
  const categories = await backend.getCollections();
  console.log(`\nVehicle categories:`);
  for (const cat of categories) {
    console.log(`  - ${cat.title}`);
  }
}

main().catch(console.error);
