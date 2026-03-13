/**
 * @agentojs/nestjs — Health Indicator
 *
 * NestJS Terminus health indicator that checks the commerce provider
 * connectivity. Requires @nestjs/terminus as an optional peer dependency.
 *
 * Usage:
 * ```ts
 * @Module({
 *   imports: [
 *     TerminusModule,
 *     AgentOJSModule.register({ store, provider }),
 *   ],
 *   controllers: [HealthController],
 *   providers: [AgentOJSHealthIndicator],
 * })
 * export class HealthModule {}
 * ```
 */

import { Inject, Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import type { CommerceProvider } from '@agentojs/core';
import { AGENTOJS_OPTIONS } from './constants.js';
import type { AgentOJSModuleOptions } from './types.js';

@Injectable()
export class AgentOJSHealthIndicator extends HealthIndicator {
  private readonly provider: CommerceProvider;

  constructor(
    @Inject(AGENTOJS_OPTIONS) options: AgentOJSModuleOptions,
  ) {
    super();
    this.provider = options.provider;
  }

  /**
   * Check commerce provider health by calling provider.healthCheck().
   *
   * @param key - The key used in the health indicator result (default: 'agentojs')
   * @returns HealthIndicatorResult
   * @throws HealthCheckError if provider is unreachable
   */
  async check(key = 'agentojs'): Promise<HealthIndicatorResult> {
    try {
      const isHealthy = await this.provider.healthCheck();
      const result = this.getStatus(key, isHealthy);

      if (isHealthy) {
        return result;
      }

      throw new HealthCheckError('AgentOJS health check failed', result);
    } catch (error) {
      if (error instanceof HealthCheckError) {
        throw error;
      }
      const result = this.getStatus(key, false, {
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new HealthCheckError('AgentOJS health check failed', result);
    }
  }
}
