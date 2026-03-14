# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] — 2026-03-14

### Added
- **Protocol extraction** — MCP, UCP, and ACP split into standalone packages (`@agentojs/mcp`, `@agentojs/ucp`, `@agentojs/acp`)
- **Express middleware** — `@agentojs/express` mounts all three protocols on a single Express app
- **NestJS integration** — `@agentojs/nestjs` module with `AgentojsModule.register()` for NestJS 11 apps
- **Shopify adapter** — `@agentojs/shopify` for Shopify Storefront API (GraphQL)
- **CLI scaffold** — `create-agentojs-app` interactive project generator
- **`createAgent()` API** — one-liner to spin up an Express server with all protocols
- **`agentMiddleware()`** — mount protocols on an existing Express app with fine-grained control
- **428 tests** across all packages (Vitest)
- **Examples** — `medusa-basic`, `shopify-basic`, `express-custom` runnable projects

### Changed
- Core package now exports `createAgent()` factory alongside types and interfaces
- Provider packages are pure peer dependencies — no bundled protocol logic

## [0.2.0] — 2026-02-15

### Changed
- Renamed providers for clarity: `MedusaBackend` → `MedusaProvider`, `WooCommerceBackend` → `WooCommerceProvider`, `GenericRESTBackend` → `GenericRESTProvider`
- Improved SEO descriptions across all package.json files
- Added `agentic middleware` keyword to all packages

## [0.1.0] — 2026-01-20

### Added
- Initial release of AgentOJS monorepo
- `@agentojs/core` — TypeScript types and `CommerceProvider` interface
- `@agentojs/medusa` — Medusa.js v2 Store API adapter
- `@agentojs/woocommerce` — WooCommerce dual-API adapter (Store API + REST API)
- `@agentojs/generic` — Generic REST API adapter with configurable field mapping
- Unified product, cart, checkout, and order normalization
- MIT license
