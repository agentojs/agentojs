/**
 * @agentojs/nestjs — Middleware
 *
 * NestJS middleware that delegates to the agentMiddleware Express router
 * from @agentojs/express. Mounts protocol routes (MCP, UCP, ACP) under
 * the configured basePath.
 */

import { Inject, Injectable } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { agentMiddleware } from '@agentojs/express';
import type { Router } from 'express';
import { AGENTOJS_OPTIONS } from './constants.js';
import type { AgentOJSModuleOptions } from './types.js';

@Injectable()
export class AgentOJSMiddleware implements NestMiddleware {
  private readonly router: Router;

  constructor(
    @Inject(AGENTOJS_OPTIONS) options: AgentOJSModuleOptions,
  ) {
    this.router = agentMiddleware({
      store: options.store,
      provider: options.provider,
      scopeChecker: options.scopeChecker,
      webhookEmitter: options.webhookEmitter,
      logger: options.logger,
      stripeSecretKey: options.stripeSecretKey,
      stripePublishableKey: options.stripePublishableKey,
      stripeWebhookSecret: options.stripeWebhookSecret,
      enableMcp: options.enableMcp,
      enableUcp: options.enableUcp,
      enableAcp: options.enableAcp,
    });
  }

  use(req: Request, res: Response, next: NextFunction): void {
    this.router(req, res, next);
  }
}
