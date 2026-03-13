/**
 * @agentojs/nestjs — Module
 *
 * NestJS dynamic module that integrates AgentOJS protocol endpoints
 * (MCP, UCP, ACP) into a NestJS application.
 *
 * Usage:
 * ```ts
 * @Module({
 *   imports: [
 *     AgentOJSModule.register({
 *       store: { slug: 'my-store', name: 'My Store', currency: 'usd', country: 'us', backendUrl: '...' },
 *       provider: new MedusaProvider({ backendUrl, apiKey }),
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */

import { Inject, Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { AgentOJSMiddleware } from './agentojs.middleware.js';
import { AGENTOJS_OPTIONS } from './constants.js';
import type { AgentOJSModuleOptions, AgentOJSAsyncModuleOptions } from './types.js';

@Module({})
export class AgentOJSModule implements NestModule {
  constructor(
    @Inject(AGENTOJS_OPTIONS) private readonly options: AgentOJSModuleOptions,
  ) {}

  /**
   * Register AgentOJS module with synchronous configuration.
   */
  static register(options: AgentOJSModuleOptions): DynamicModule {
    return {
      module: AgentOJSModule,
      providers: [
        {
          provide: AGENTOJS_OPTIONS,
          useValue: options,
        },
        AgentOJSMiddleware,
      ],
      exports: [AGENTOJS_OPTIONS],
    };
  }

  /**
   * Register AgentOJS module with async configuration (e.g. useFactory + inject).
   */
  static registerAsync(options: AgentOJSAsyncModuleOptions): DynamicModule {
    return {
      module: AgentOJSModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: AGENTOJS_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        AgentOJSMiddleware,
      ],
      exports: [AGENTOJS_OPTIONS],
    };
  }

  configure(consumer: MiddlewareConsumer): void {
    const basePath = this.options.basePath ?? '/ai';
    consumer
      .apply(AgentOJSMiddleware)
      .forRoutes(`${basePath}/(.*)`);
  }
}
