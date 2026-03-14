/**
 * Express Custom Example
 *
 * Advanced example demonstrating manual Express setup with agentMiddleware.
 * Shows: custom middleware, GenericRESTProvider with a public API
 * (no credentials needed), selective protocol enablement (MCP + UCP only),
 * and custom routes alongside AI endpoints.
 *
 * Usage:
 *   cp .env.example .env
 *   npm run dev
 */

import 'dotenv/config';
import express from 'express';
import { agentMiddleware } from '@agentojs/express';
import { GenericRESTProvider } from '@agentojs/generic';
import { ConsoleLogger } from '@agentojs/core';

const PORT = parseInt(process.env.PORT || '3100', 10);
const API_URL = process.env.API_URL || 'https://fakestoreapi.com';

const logger = new ConsoleLogger();

// --- Custom request logging middleware ---
function requestLogger(
  req: express.Request,
  _res: express.Response,
  next: express.NextFunction,
): void {
  const timestamp = new Date().toISOString();
  logger.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
}

// --- Commerce provider: GenericRESTProvider with public API ---
const provider = new GenericRESTProvider({
  baseUrl: API_URL,
  apiKey: '', // fakestoreapi.com requires no authentication
  endpointsMap: {
    products: '/products',
    product: '/products/:id',
    collections: '/products/categories',
    collection: '/products/category/:id',
  },
});

// --- Store metadata ---
const store = {
  slug: 'fake-store',
  name: 'FakeStore Demo',
  currency: 'usd',
  country: 'us',
  backendUrl: API_URL,
};

// --- Build Express app manually ---
const app = express();

// Apply custom middleware globally
app.use(requestLogger);

// Custom health endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', store: store.name, uptime: process.uptime() });
});

// Custom root page with available endpoints
app.get('/', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head><title>${store.name} — AgentOJS</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto;">
  <h1>${store.name}</h1>
  <p>Agentic middleware powered by <strong>AgentOJS</strong> with GenericRESTProvider.</p>
  <h2>Available Endpoints</h2>
  <table style="border-collapse: collapse; width: 100%;">
    <tr style="border-bottom: 1px solid #ccc;">
      <th style="text-align: left; padding: 8px;">Protocol</th>
      <th style="text-align: left; padding: 8px;">Endpoint</th>
      <th style="text-align: left; padding: 8px;">Method</th>
    </tr>
    <tr><td style="padding: 8px;">MCP</td><td style="padding: 8px;"><code>/ai/mcp</code></td><td style="padding: 8px;">POST</td></tr>
    <tr><td style="padding: 8px;">UCP</td><td style="padding: 8px;"><code>/ai/ucp/*</code></td><td style="padding: 8px;">GET / POST</td></tr>
    <tr><td style="padding: 8px;">Health</td><td style="padding: 8px;"><code>/health</code></td><td style="padding: 8px;">GET</td></tr>
  </table>
  <h2>Backend</h2>
  <p>Connected to <a href="${API_URL}">${API_URL}</a> (public API, no credentials required).</p>
</body>
</html>`);
});

// Mount agentMiddleware at /ai with MCP + UCP only (no ACP)
app.use(
  '/ai',
  agentMiddleware({
    store,
    provider,
    logger,
    enableMcp: true,
    enableUcp: true,
    enableAcp: false,
  }),
);

// --- Start server ---
app.listen(PORT, () => {
  console.log(`\nExpress Custom Example — AgentOJS server running on port ${PORT}`);
  console.log('\nAvailable endpoints:');
  console.log(`  Root   →  GET  http://localhost:${PORT}/`);
  console.log(`  Health →  GET  http://localhost:${PORT}/health`);
  console.log(`  MCP    →  POST http://localhost:${PORT}/ai/mcp`);
  console.log(`  UCP    →  GET  http://localhost:${PORT}/ai/ucp/products`);
  console.log('\nACP is disabled in this example (no Stripe keys needed).');
  console.log(`Backend: ${API_URL} (public API, no credentials required)`);
});
