/**
 * Medusa Basic Example
 *
 * Demonstrates using MedusaProvider with createAgent() to serve
 * all three AI protocols (MCP, UCP, ACP) from a single Express server.
 *
 * Usage:
 *   cp .env.example .env   # fill in your Medusa credentials
 *   npm run dev
 */

import 'dotenv/config';
import { createAgent, ConsoleLogger } from '@agentojs/core';
import { MedusaProvider } from '@agentojs/medusa';

const PORT = parseInt(process.env.PORT || '3100', 10);

async function main() {
  const provider = new MedusaProvider({
    backendUrl: process.env.MEDUSA_URL || 'http://localhost:9000',
    apiKey: process.env.MEDUSA_API_KEY || 'your-publishable-api-key',
  });

  const agent = await createAgent({
    store: {
      slug: process.env.STORE_SLUG || 'my-store',
      name: process.env.STORE_NAME || 'My Store',
      currency: process.env.STORE_CURRENCY || 'usd',
      country: process.env.STORE_COUNTRY || 'us',
      backendUrl: process.env.MEDUSA_URL || 'http://localhost:9000',
    },
    provider,
    logger: new ConsoleLogger(),
    port: PORT,
  });

  await agent.start(PORT);

  console.log(`\nMedusa Basic Example — AgentOJS server running on port ${PORT}`);
  console.log('\nAvailable endpoints:');
  console.log(`  MCP  →  POST http://localhost:${PORT}/mcp`);
  console.log(`  UCP  →  GET  http://localhost:${PORT}/ucp/products`);
  console.log(`  ACP  →  GET  http://localhost:${PORT}/acp/feeds`);
  console.log(`  Health → GET  http://localhost:${PORT}/health`);
}

main().catch(console.error);
