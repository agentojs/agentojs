/**
 * Shopify Basic Example
 *
 * Demonstrates using ShopifyProvider with createAgent() to serve
 * all three AI protocols (MCP, UCP, ACP) from a single Express server.
 *
 * Usage:
 *   cp .env.example .env   # fill in your Shopify credentials
 *   npm run dev
 */

import 'dotenv/config';
import { createAgent, ConsoleLogger } from '@agentojs/core';
import { ShopifyProvider } from '@agentojs/shopify';

const PORT = parseInt(process.env.PORT || '3100', 10);

async function main() {
  const storeDomain = process.env.SHOPIFY_DOMAIN || 'my-store.myshopify.com';

  const provider = new ShopifyProvider({
    storeDomain,
    storefrontAccessToken: process.env.STOREFRONT_ACCESS_TOKEN || 'your-token',
  });

  const agent = await createAgent({
    store: {
      slug: process.env.STORE_SLUG || 'my-shopify',
      name: process.env.STORE_NAME || 'My Shopify Store',
      currency: process.env.STORE_CURRENCY || 'usd',
      country: process.env.STORE_COUNTRY || 'us',
      backendUrl: `https://${storeDomain}`,
    },
    provider,
    logger: new ConsoleLogger(),
    port: PORT,
  });

  await agent.start(PORT);

  console.log(`\nShopify Basic Example — AgentOJS server running on port ${PORT}`);
  console.log('\nAvailable endpoints:');
  console.log(`  MCP  →  POST http://localhost:${PORT}/mcp`);
  console.log(`  UCP  →  GET  http://localhost:${PORT}/ucp/products`);
  console.log(`  ACP  →  GET  http://localhost:${PORT}/acp/feeds`);
  console.log(`  Health → GET  http://localhost:${PORT}/health`);
  console.log('\nNote: Shopify checkout returns a checkoutUrl — payments');
  console.log('are completed on the Shopify-hosted checkout page.');
}

main().catch(console.error);
