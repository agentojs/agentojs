---
layout: home

hero:
  name: AgentOJS
  text: One SDK. Three AI protocols. Any commerce backend.
  tagline: Open-source agentic middleware — connect Medusa, WooCommerce, Shopify, or any REST API to Claude (MCP), ChatGPT (ACP), and Gemini (UCP). Zero commission.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/agentojs/agentojs

features:
  - title: MCP Protocol
    details: Expose your catalog as Claude-native tools and resources. 15 tools across products, cart, checkout, and orders — ready for Claude Desktop and the Claude Directory.
  - title: UCP Protocol
    details: REST endpoints for Google Gemini agents. Standards-compliant Universal Commerce Protocol with typed JSON responses and session management.
  - title: ACP Protocol
    details: OpenAI Agent Commerce Protocol with Stripe-powered checkout sessions. Let ChatGPT users browse and buy directly in conversation.
  - title: Express Middleware
    details: One-line integration — agentMiddleware() mounts all three protocols on any Express app. Or use createAgent() for a zero-config server.
  - title: 9 Packages, One Ecosystem
    details: Core types, 4 commerce providers (Medusa, WooCommerce, Shopify, Generic), 3 protocol handlers (MCP, UCP, ACP), and Express middleware — all MIT licensed.
  - title: Self-hosted & Open Source
    details: Run on your own infrastructure with zero lock-in, zero commission, full data control. MIT licensed, TypeScript-first, zero runtime dependencies.
---

## Why AgentOJS?

AI agents are becoming the new storefront. **57% of e-commerce runs outside Shopify** — and those merchants need a way to connect to Claude, ChatGPT, and Gemini. AgentOJS is the middleware that bridges that gap.

| | Shopify MCP | Firmly.ai | DIY | **AgentOJS** |
|---|---|---|---|---|
| Platforms | Shopify only | Closed SaaS | Manual | **Any** |
| Protocols supported | MCP only | Unknown | Manual each | **MCP + UCP + ACP** |
| Open source | No | No | N/A | **MIT** |
| Self-hosted | No | No | Yes | **Yes** |
| Commission | Shopify fees | Unknown | None | **None** |

## Quick Start

Connect a Medusa.js store to all three AI protocols in one file:

```typescript
import { createAgent } from '@agentojs/core';
import { MedusaProvider } from '@agentojs/medusa';

const agent = await createAgent({
  store: {
    name: 'My Store',
    slug: 'my-store',
    currency: 'usd',
    country: 'us',
    backendUrl: 'https://your-medusa-store.com',
  },
  provider: new MedusaProvider({
    backendUrl: 'https://your-medusa-store.com',
    apiKey: 'pk_your_publishable_key',
  }),
});

await agent.start(3100);
// MCP  → POST /mcp
// UCP  → /ucp/*
// ACP  → /acp/*
```

Swap `MedusaProvider` for `WooCommerceProvider`, `ShopifyProvider`, or `GenericRESTProvider` — same API, same protocols.

## The 9 Packages

| Package | Description |
|---------|-------------|
| `@agentojs/core` | CommerceProvider interface, types, `createAgent()` factory |
| `@agentojs/medusa` | Medusa.js v2 Store API provider |
| `@agentojs/woocommerce` | WooCommerce dual-API provider (Store API + REST v3) |
| `@agentojs/shopify` | Shopify Storefront API provider *(coming soon)* |
| `@agentojs/generic` | Any REST API with configurable field mapping |
| `@agentojs/mcp` | MCP protocol server (15 tools + 3 resources for Claude) |
| `@agentojs/ucp` | UCP protocol router (REST endpoints for Gemini) |
| `@agentojs/acp` | ACP protocol router (checkout sessions for ChatGPT) |
| `@agentojs/express` | Express middleware — mounts all protocols in one line |

## Architecture

```
              AI Agents
    ┌─────────┼─────────┐
  Claude    Gemini   ChatGPT
    │         │         │
   MCP       UCP       ACP
    │         │         │
    └─────────┼─────────┘
              │
  ┌───────────┴───────────┐
  │   @agentojs/express   │  ← agentMiddleware() or createAgent()
  ├───────────────────────┤
  │  @agentojs/mcp        │  ← 15 tools + 3 resources
  │  @agentojs/ucp        │  ← REST endpoints
  │  @agentojs/acp        │  ← Stripe checkout sessions
  ├───────────────────────┤
  │   @agentojs/core      │  ← CommerceProvider interface + types
  ├───┬───┬───┬───────────┤
  │   │   │   │           │
  medusa woo shopify generic
```

## CommerceProvider Interface

Every adapter implements 19 methods across 7 categories:

| Category | Methods |
|----------|---------|
| Products | `searchProducts`, `getProduct`, `getCollections`, `getCollection` |
| Cart | `createCart`, `getCart`, `updateCart`, `addLineItem`, `removeLineItem` |
| Shipping | `getShippingOptions`, `addShippingMethod` |
| Checkout | `createPaymentSessions`, `selectPaymentSession`, `initializePayment`, `completeCart` |
| Orders | `getOrder`, `listOrders` |
| Regions | `getRegions` |
| Health | `healthCheck` |
