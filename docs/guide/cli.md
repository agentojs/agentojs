# CLI Tool

`create-agentojs-app` is the official scaffolding CLI for AgentOJS. It generates a fully configured TypeScript project that connects your e-commerce backend to AI agents via MCP, UCP, and ACP protocols.

## Quick Start

```bash
npx create-agentojs-app
```

The interactive wizard walks you through four choices:

1. **Project name** — the directory to create (default: `my-agentojs-app`)
2. **Commerce backend** — Medusa.js v2, WooCommerce, Shopify, or Generic REST API
3. **Protocols** — MCP (Claude), UCP (Gemini), ACP (ChatGPT) — all enabled by default
4. **Package manager** — npm, pnpm, or yarn

## Non-Interactive Mode

Skip prompts with `--yes` (or `-y`) to accept defaults:

```bash
npx create-agentojs-app my-store --yes
```

Default values when using `--yes`:

| Option | Default |
|--------|---------|
| Project name | `my-agentojs-app` (or positional argument) |
| Backend | Medusa.js v2 |
| Protocols | All three (MCP, UCP, ACP) |
| Package manager | npm |

## Options

| Flag | Description |
|------|-------------|
| `--yes`, `-y` | Use defaults, skip interactive prompts |
| First positional arg | Project name (e.g. `my-store`) |

## Generated Project Structure

```
my-store/
  package.json        # Dependencies for your chosen backend + protocols
  tsconfig.json       # TypeScript config (ESM, ES2022)
  src/
    index.ts          # createAgent() server — ready to run
  .env.example        # Environment variables for your backend
  README.md           # Project-specific setup instructions
```

### Entry Point

The generated `src/index.ts` creates an AgentOJS agent with your chosen backend and protocols:

```typescript
import { createAgent } from '@agentojs/core';
import { MedusaProvider } from '@agentojs/medusa';

const agent = await createAgent({
  store: {
    name: process.env.STORE_NAME || 'my-store',
    slug: process.env.STORE_SLUG || 'my-store',
    currency: 'usd',
    country: 'us',
    backendUrl: process.env.BACKEND_URL || 'http://localhost:9000',
  },
  provider: new MedusaProvider({
    backendUrl: process.env.BACKEND_URL!,
    apiKey: process.env.API_KEY!,
  }),
  enableMcp: true,
  enableUcp: true,
  enableAcp: true,
});

const port = parseInt(process.env.PORT || '3100', 10);
await agent.start(port);
```

### Environment Variables

Each backend generates a `.env.example` with the relevant configuration. For example, Medusa:

```env
STORE_NAME=My Store
STORE_SLUG=my-store
BACKEND_URL=http://localhost:9000
API_KEY=your-medusa-api-key
PORT=3100
```

WooCommerce:

```env
STORE_NAME=My Store
STORE_SLUG=my-store
WC_URL=https://your-store.com
WC_CONSUMER_KEY=ck_your_consumer_key
WC_CONSUMER_SECRET=cs_your_consumer_secret
PORT=3100
```

## After Scaffolding

Once the project is created, follow the steps printed by the CLI:

```bash
cd my-store
cp .env.example .env      # Fill in your backend credentials
npm install
npm run dev               # Starts server on http://localhost:3100
```

Your AgentOJS server exposes these endpoints:

- **MCP** (Claude): `POST /mcp` — StreamableHTTP transport for Claude tools and resources
- **UCP** (Gemini): `GET /ucp/products`, `POST /ucp/cart`, etc. — REST endpoints for Google/Gemini
- **ACP** (ChatGPT): `POST /acp/checkout_sessions`, etc. — Checkout sessions for ChatGPT
- **Health**: `GET /health`

## Examples

### Medusa with All Protocols

```bash
npx create-agentojs-app medusa-agent --yes
cd medusa-agent
cp .env.example .env
# Set BACKEND_URL and API_KEY in .env
npm install && npm run dev
```

### WooCommerce (Interactive)

```bash
npx create-agentojs-app
# Choose "WooCommerce" as backend
# Select desired protocols
# Pick your package manager
```

### MCP-Only Agent

```bash
npx create-agentojs-app
# In the protocols multiselect, choose only "MCP (Claude)"
```

### Using pnpm

```bash
npx create-agentojs-app my-shop
# Select pnpm as package manager
cd my-shop
cp .env.example .env
pnpm install
pnpm dev
```

## Requirements

- Node.js >= 20.0.0

## Next Steps

- [Getting Started](/guide/getting-started) — AgentOJS overview and `createAgent()` API
- [Medusa Guide](/guide/medusa) — Connect to a Medusa.js v2 store
- [WooCommerce Guide](/guide/woocommerce) — Connect to a WooCommerce site
- [Generic REST Guide](/guide/generic) — Connect to any REST API
- [Custom Provider](/guide/custom-provider) — Implement your own adapter
