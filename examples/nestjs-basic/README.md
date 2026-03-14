# NestJS + AgentOJS Example

A minimal NestJS application that exposes a Medusa.js v2 store to AI agents via MCP, UCP, and ACP protocols.

## Prerequisites

- Node.js 20+
- A running [Medusa v2](https://docs.medusajs.com/) backend

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Copy the environment file and configure:

```bash
cp .env.example .env
# Edit .env with your Medusa URL and publishable API key
```

3. Run in development mode:

```bash
pnpm dev
```

## How It Works

`AppModule` imports `AgentOJSModule.register()` which:

- Creates a `MedusaProvider` connected to your Medusa backend
- Mounts all three AI protocol handlers as NestJS middleware at `/ai`
- Automatically configures routes for MCP, UCP, and ACP

## Testing

```bash
# MCP (Claude) — send a JSON-RPC initialize request
curl -X POST http://localhost:3100/ai/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'

# UCP (Gemini) — list products
curl http://localhost:3100/ai/ucp/products

# ACP (ChatGPT) — get product feed
curl http://localhost:3100/ai/acp/feed
```

## Configuration

See [`@agentojs/nestjs` API reference](https://agentojs.com/api/nestjs) for all configuration options including `registerAsync()`, health checks, and selective protocol enabling.
