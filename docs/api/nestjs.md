# @agentojs/nestjs

NestJS integration module for AgentOJS — mount all three AI commerce protocols (MCP, UCP, ACP) as NestJS middleware.

## Installation

```bash
npm install @agentojs/nestjs @agentojs/core @agentojs/mcp @agentojs/ucp @agentojs/acp @agentojs/express
```

Peer dependencies: `@nestjs/common ^11.0.0`, `@nestjs/core ^11.0.0`, `express ^4.0.0 || ^5.0.0`.

Optional: `@nestjs/terminus ^11.0.0` (for health checks).

## `AgentOJSModule.register(options)`

Synchronous registration — use when all configuration values are available at import time.

```ts
import { Module } from '@nestjs/common';
import { AgentOJSModule } from '@agentojs/nestjs';
import { MedusaProvider } from '@agentojs/medusa';

@Module({
  imports: [
    AgentOJSModule.register({
      store: {
        name: 'My Store',
        slug: 'my-store',
        currency: 'usd',
        country: 'us',
        backendUrl: 'http://localhost:9000',
      },
      provider: new MedusaProvider({
        backendUrl: 'http://localhost:9000',
        apiKey: 'sk-medusa-key',
      }),
      basePath: '/ai',
    }),
  ],
})
export class AppModule {}
```

This mounts protocol handlers at:
- **`POST /ai/mcp`** — MCP (Claude)
- **`GET/POST /ai/ucp/*`** — UCP (Gemini)
- **`GET/POST /ai/acp/*`** — ACP (ChatGPT)

## `AgentOJSModule.registerAsync(options)`

Asynchronous registration — use with `@nestjs/config` or other async providers.

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AgentOJSModule } from '@agentojs/nestjs';
import { MedusaProvider } from '@agentojs/medusa';

@Module({
  imports: [
    ConfigModule.forRoot(),
    AgentOJSModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        store: {
          name: config.get('STORE_NAME', 'My Store'),
          slug: config.get('STORE_SLUG', 'my-store'),
          currency: config.get('STORE_CURRENCY', 'usd'),
          country: config.get('STORE_COUNTRY', 'us'),
          backendUrl: config.get('MEDUSA_URL', 'http://localhost:9000'),
        },
        provider: new MedusaProvider({
          backendUrl: config.get('MEDUSA_URL', 'http://localhost:9000'),
          apiKey: config.get('MEDUSA_API_KEY', ''),
        }),
        stripeSecretKey: config.get('STRIPE_SECRET_KEY'),
        stripePublishableKey: config.get('STRIPE_PUBLISHABLE_KEY'),
        stripeWebhookSecret: config.get('STRIPE_WEBHOOK_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### `AgentOJSAsyncModuleOptions`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `imports` | `ModuleMetadata['imports']` | No | NestJS modules to import (e.g. `ConfigModule`) |
| `useFactory` | `(...args) => AgentOJSModuleOptions \| Promise<...>` | Yes | Factory function returning module options |
| `inject` | `InjectionToken[]` | No | Dependencies to inject into the factory |

## `AgentOJSModuleOptions`

Full configuration reference for both `register()` and `registerAsync()`:

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `store` | `StoreInfo` | Yes | — | Store metadata (name, slug, currency, country, backendUrl) |
| `provider` | `CommerceProvider` | Yes | — | Commerce backend provider instance |
| `basePath` | `string` | No | `'/ai'` | Base path for all protocol routes |
| `scopeChecker` | `ScopeChecker` | No | — | Function to check API key scopes |
| `webhookEmitter` | `WebhookEmitter` | No | — | Emits events on checkout/order completion |
| `logger` | `Logger` | No | — | Custom logger instance |
| `stripeSecretKey` | `string` | No | — | Stripe secret key (required for ACP payments) |
| `stripePublishableKey` | `string` | No | — | Stripe publishable key (returned to ChatGPT) |
| `stripeWebhookSecret` | `string` | No | — | Stripe webhook signing secret |
| `enableMcp` | `boolean` | No | `true` | Enable MCP protocol (Claude) |
| `enableUcp` | `boolean` | No | `true` | Enable UCP protocol (Gemini) |
| `enableAcp` | `boolean` | No | `true` | Enable ACP protocol (ChatGPT) |

## `AgentOJSHealthIndicator`

Health check integration for [`@nestjs/terminus`](https://docs.nestjs.com/recipes/terminus). Verifies that the commerce provider is reachable by calling `searchProducts()`.

```ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { AgentOJSHealthIndicator } from '@agentojs/nestjs';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private agentojs: AgentOJSHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.agentojs.check('commerce'),
    ]);
  }
}
```

### `check(key?)`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `key` | `string` | `'agentojs'` | Key for the health check result |

**Returns:** `HealthIndicatorResult` — `{ [key]: { status: 'up' } }` if the provider is healthy, throws `HealthCheckError` otherwise.

::: tip
`AgentOJSHealthIndicator` is automatically registered as a provider when you import `AgentOJSModule`. Just inject it where needed.
:::

## `AgentOJSMiddleware`

The internal NestJS middleware class that wraps [`agentMiddleware()`](/api/express) from `@agentojs/express`. Automatically configured by `AgentOJSModule` — you don't need to use it directly.

## `AGENTOJS_OPTIONS`

Injection token for accessing the module options anywhere in your NestJS app:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { AGENTOJS_OPTIONS, AgentOJSModuleOptions } from '@agentojs/nestjs';

@Injectable()
export class MyService {
  constructor(
    @Inject(AGENTOJS_OPTIONS) private readonly options: AgentOJSModuleOptions,
  ) {
    console.log('Store slug:', options.store.slug);
  }
}
```

## Selective Protocols

Enable only the protocols you need:

```ts
AgentOJSModule.register({
  store,
  provider,
  enableMcp: true,
  enableUcp: false,
  enableAcp: false,
})
```

## Full Example

See the [NestJS example](/guide/getting-started#nestjs) for a complete working application, or check the [`examples/nestjs-basic`](https://github.com/agentojs/agentojs/tree/main/examples/nestjs-basic) directory.

::: tip
For simpler setups without NestJS, use [`agentMiddleware()`](/api/express) from `@agentojs/express` or [`createAgent()`](/guide/getting-started) from `@agentojs/core`.
:::
