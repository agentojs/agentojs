import type { Logger } from '@agentojs/core';

interface CachedResponse {
  statusCode: number;
  body: unknown;
  endpoint: string;
  bodyHash: string;
  createdAt: number;
}

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * In-memory idempotency cache for ACP requests.
 * If same Idempotency-Key + same endpoint → return cached response.
 * If same Idempotency-Key + different request body → returns conflict error.
 *
 * Uses setInterval-based cleanup (24h TTL) instead of NestJS @Cron.
 */
export class IdempotencyCache {
  private readonly cache = new Map<string, CachedResponse>();
  private readonly logger?: Logger;
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(logger?: Logger) {
    this.logger = logger;
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
    // Prevent the timer from keeping the process alive
    if (this.cleanupTimer && typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Check if a cached response exists for this idempotency key.
   * Returns the cached response if found, or null if not cached.
   * Returns { conflict: true } if same key used with different body.
   */
  get(
    idempotencyKey: string,
    endpoint: string,
    body: unknown,
  ): { statusCode: number; body: unknown } | { conflict: true; message: string } | null {
    const cached = this.cache.get(idempotencyKey);
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() - cached.createdAt > TTL_MS) {
      this.cache.delete(idempotencyKey);
      return null;
    }

    // Same key but different body → conflict
    const currentHash = this.hashBody(body);
    if (cached.bodyHash !== currentHash || cached.endpoint !== endpoint) {
      return {
        conflict: true,
        message: 'Idempotency-Key has already been used with a different request body or endpoint',
      };
    }

    // Same key + same body → return cached response
    return { statusCode: cached.statusCode, body: cached.body };
  }

  /**
   * Check if an idempotency key exists in the cache.
   */
  has(idempotencyKey: string): boolean {
    const cached = this.cache.get(idempotencyKey);
    if (!cached) return false;
    if (Date.now() - cached.createdAt > TTL_MS) {
      this.cache.delete(idempotencyKey);
      return false;
    }
    return true;
  }

  /**
   * Store a response for an idempotency key.
   */
  set(
    idempotencyKey: string,
    endpoint: string,
    body: unknown,
    statusCode: number,
    responseBody: unknown,
  ): void {
    this.cache.set(idempotencyKey, {
      statusCode,
      body: responseBody,
      endpoint,
      bodyHash: this.hashBody(body),
      createdAt: Date.now(),
    });
  }

  /**
   * Cleanup expired entries.
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache) {
      if (now - entry.createdAt > TTL_MS) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger?.debug?.(`Cleaned ${cleaned} expired idempotency entries`);
    }
  }

  /**
   * Stops the cleanup timer. Call this when shutting down.
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Returns the number of cached entries.
   */
  get size(): number {
    return this.cache.size;
  }

  private hashBody(body: unknown): string {
    return JSON.stringify(body ?? {});
  }
}
