#!/usr/bin/env node

/**
 * Test import script — verifies all @agentojs packages can be imported
 * and their exports are accessible.
 *
 * Usage: pnpm -r build && node examples/test-import.mjs
 */

// @agentojs/core — type-only package, but dist/index.js still exports empty
import * as core from '../packages/core/dist/index.js';

// @agentojs/medusa
import { MedusaBackend, MedusaApiError } from '../packages/medusa/dist/index.js';

// @agentojs/woocommerce
import { WooCommerceBackend, WooCommerceApiError } from '../packages/woocommerce/dist/index.js';

// @agentojs/generic
import {
  GenericRESTBackend,
  GenericBackendNotImplementedError,
  GenericFieldMapper,
  getField,
} from '../packages/generic/dist/index.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${message}`);
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

console.log('--- @agentojs/core ---');
assert(typeof core === 'object', 'core module is importable');

console.log('\n--- @agentojs/medusa ---');
assert(typeof MedusaBackend === 'function', 'MedusaBackend is a class/constructor');
assert(typeof MedusaApiError === 'function', 'MedusaApiError is a class/constructor');

const medusa = new MedusaBackend({ backendUrl: 'http://localhost:9000', apiKey: 'test' });
assert(typeof medusa.searchProducts === 'function', 'MedusaBackend has searchProducts method');
assert(typeof medusa.getProduct === 'function', 'MedusaBackend has getProduct method');
assert(typeof medusa.createCart === 'function', 'MedusaBackend has createCart method');
assert(typeof medusa.healthCheck === 'function', 'MedusaBackend has healthCheck method');

console.log('\n--- @agentojs/woocommerce ---');
assert(typeof WooCommerceBackend === 'function', 'WooCommerceBackend is a class/constructor');
assert(typeof WooCommerceApiError === 'function', 'WooCommerceApiError is a class/constructor');

const woo = new WooCommerceBackend({
  baseUrl: 'http://localhost:8080',
  consumerKey: 'ck_test',
  consumerSecret: 'cs_test',
});
assert(typeof woo.searchProducts === 'function', 'WooCommerceBackend has searchProducts method');
assert(typeof woo.getProduct === 'function', 'WooCommerceBackend has getProduct method');
assert(typeof woo.createCart === 'function', 'WooCommerceBackend has createCart method');
assert(typeof woo.healthCheck === 'function', 'WooCommerceBackend has healthCheck method');

console.log('\n--- @agentojs/generic ---');
assert(typeof GenericRESTBackend === 'function', 'GenericRESTBackend is a class/constructor');
assert(typeof GenericBackendNotImplementedError === 'function', 'GenericBackendNotImplementedError is a class/constructor');
assert(typeof GenericFieldMapper === 'function', 'GenericFieldMapper is a class/constructor');
assert(typeof getField === 'function', 'getField is a function');

const generic = new GenericRESTBackend({
  baseUrl: 'http://localhost:4000/api',
  apiKey: 'test',
  endpoints: {},
});
assert(typeof generic.searchProducts === 'function', 'GenericRESTBackend has searchProducts method');
assert(typeof generic.getProduct === 'function', 'GenericRESTBackend has getProduct method');
assert(typeof generic.healthCheck === 'function', 'GenericRESTBackend has healthCheck method');

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);

if (failed > 0) {
  process.exit(1);
}
