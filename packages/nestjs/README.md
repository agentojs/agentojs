# @agentojs/nestjs

[![npm](https://img.shields.io/npm/v/@agentojs/nestjs)](https://www.npmjs.com/package/@agentojs/nestjs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

NestJS integration module for [AgentOJS](https://agentojs.com) — adds MCP, UCP, and ACP protocol endpoints to your NestJS application with a single module import.

## Installation

```bash
npm install @agentojs/nestjs @agentojs/core @agentojs/express @agentojs/mcp @agentojs/ucp @agentojs/acp
```

## Quick Start

### Synchronous Configuration — `register()`

```typescript
import { Module } from '@nestjs/common';
import { AgentOJSModule } from '@agentojs/nestjs';
import { MedusaProvider } from '@agentojs/medusa';

@Module({
  imports: [
    AgentOJSModule.register({
      store: {
        slug: 'my-store',
        name: 'My Store',
        currency: 'usd',
        country: 'us',
        backendUrl: 'http://localhost:9000',
      },
      provider: new MedusaProvider({
        backendUrl: 'http://localhost:9000',
        apiKey: 'sk_medusa_key',
      }),
      // Optional: disable specific protocols
      enableMcp: true,
      enableUcp: true,
      enableAcp: false,
      // Optional: change base path (default: '/ai')
      basePath: '/ai',
    }),
  ],
})
export class AppModule {}
```

This mounts the following endpoints under `/ai`:
- `POST /ai/mcp` — MCP protocol (Claude)
- `GET/POST /ai/ucp/*` — UCP protocol (Gemini)
- `GET/POST /ai/acp/*` — ACP protocol (ChatGPT)

### Async Configuration — `registerAsync()`

Use `registerAsync()` when your configuration depends on injected services (e.g., `ConfigService`):

```typescript
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
          slug: config.get('STORE_SLUG')!,
          name: config.get('STORE_NAME')!,
          currency: 'usd',
          country: 'us',
          backendUrl: config.get('MEDUSA_URL')!,
        },
        provider: new MedusaProvider({
          backendUrl: config.get('MEDUSA_URL')!,
          apiKey: config.get('MEDUSA_API_KEY')!,
        }),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## Health Indicator

Integrate with [@nestjs/terminus](https://docs.nestjs.com/recipes/terminus) to monitor your commerce provider connectivity.

```bash
npm install @nestjs/terminus
```

```typescript
import { Controller, Get, Module } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TerminusModule } from '@nestjs/terminus';
import { AgentOJSModule, AgentOJSHealthIndicator } from '@agentojs/nestjs';

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

@Module({
  imports: [
    TerminusModule,
    AgentOJSModule.register({
      store: { /* ... */ },
      provider: new MedusaProvider({ /* ... */ }),
    }),
  ],
  controllers: [HealthController],
  providers: [AgentOJSHealthIndicator],
})
export class HealthModule {}
```

The health indicator calls `provider.healthCheck()` and reports the result as a Terminus health check.

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `store` | `StoreInfo` | — | Store metadata (slug, name, currency, country, backendUrl) |
| `provider` | `CommerceProvider` | — | Commerce backend provider instance |
| `basePath` | `string` | `'/ai'` | Base path for protocol routes |
| `enableMcp` | `boolean` | `true` | Enable MCP protocol (Claude) |
| `enableUcp` | `boolean` | `true` | Enable UCP protocol (Gemini) |
| `enableAcp` | `boolean` | `true` | Enable ACP protocol (ChatGPT) |
| `scopeChecker` | `ScopeChecker` | — | Optional scope authorization |
| `webhookEmitter` | `WebhookEmitter` | — | Optional webhook event emitter |
| `logger` | `Logger` | — | Optional logger |
| `stripeSecretKey` | `string` | — | Stripe secret key for ACP |
| `stripePublishableKey` | `string` | — | Stripe publishable key for ACP |
| `stripeWebhookSecret` | `string` | — | Stripe webhook secret for ACP |

## API Reference

Full API documentation: [agentojs.com](https://agentojs.com)

## License

MIT
