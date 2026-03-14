# create-agentojs-app

[![npm version](https://img.shields.io/npm/v/create-agentojs-app.svg)](https://www.npmjs.com/package/create-agentojs-app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Scaffold a new [AgentOJS](https://agentojs.com) project in seconds.

## Usage

```bash
npx create-agentojs-app
```

The CLI will walk you through four interactive prompts:

1. **Project name** — directory to create (default: `my-agentojs-app`)
2. **Commerce backend** — Medusa.js v2 / WooCommerce / Shopify / Generic REST API
3. **Protocols** — MCP (Claude), UCP (Gemini), ACP (ChatGPT) — all enabled by default
4. **Package manager** — npm / pnpm / yarn

### Non-Interactive Mode

Skip prompts with `--yes` (or `-y`):

```bash
npx create-agentojs-app my-shop --yes
```

Defaults: Medusa backend, all protocols, npm.

## Options

| Flag | Description |
|------|-------------|
| `--yes`, `-y` | Use defaults, skip interactive prompts |
| First positional arg | Project name (e.g. `my-shop`) |

## What Gets Generated

```
my-shop/
  package.json        # Dependencies for your chosen backend + protocols
  tsconfig.json       # TypeScript config (ESM, ES2022)
  src/
    index.ts          # createAgent() server — ready to run
  .env.example        # Environment variables for your backend
  README.md           # Project-specific setup instructions
```

### Generated `src/index.ts`

The entry point creates an AgentOJS agent with your chosen backend and protocols:

```ts
import { createAgent } from '@agentojs/core';
import { MedusaProvider } from '@agentojs/medusa';

const agent = await createAgent({
  store: {
    name: process.env.STORE_NAME || 'my-shop',
    slug: process.env.STORE_SLUG || 'my-shop',
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

## Examples

### Interactive

```bash
$ npx create-agentojs-app

create-agentojs-app — Scaffold a new AgentOJS project

✔ Project name … my-store
✔ Commerce backend › WooCommerce
✔ Protocols to enable › MCP (Claude), UCP (Gemini)
✔ Package manager › pnpm

Scaffolding project in /Users/you/my-store...

  Success! Project created successfully.

  Backend:   woocommerce
  Protocols: MCP, UCP
  Directory: /Users/you/my-store

  Next steps:

  1. cd my-store
  2. cp .env.example .env
     Edit .env and fill in your backend credentials
  3. pnpm install
  4. pnpm dev

  Docs: https://agentojs.com/guide/cli
```

### Non-Interactive

```bash
npx create-agentojs-app my-api --yes
# Creates my-api/ with Medusa + all protocols + npm
```

## After Scaffolding

```bash
cd my-shop
cp .env.example .env      # Fill in your backend credentials
npm install
npm run dev               # Starts server on http://localhost:3100
```

Your AgentOJS server exposes:

- **MCP** (Claude): `POST /mcp`
- **UCP** (Gemini): `GET /ucp/products`, `POST /ucp/cart`, etc.
- **ACP** (ChatGPT): `POST /acp/checkout_sessions`, etc.
- **Health**: `GET /health`

## Learn More

- [AgentOJS Documentation](https://agentojs.com)
- [CLI Guide](https://agentojs.com/guide/cli)
- [GitHub](https://github.com/agentojs/agentojs)

## License

MIT
