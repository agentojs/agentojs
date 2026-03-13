import { Router } from 'express';
import type { CommerceProvider, StoreInfo, Logger } from '@agentojs/core';
import { AcpFeedBuilder, buildFeedItems } from '../feed-builder.js';

const FEED_FETCH_LIMIT = 500;

export function createFeedRoutes(
  provider: CommerceProvider,
  store: StoreInfo,
  logger?: Logger,
): Router {
  const router = Router();
  const feedBuilder = new AcpFeedBuilder();

  // GET / — product feed
  router.get('/', async (_req, res, next) => {
    try {
      // Check cache
      const cached = feedBuilder.getCached(store.slug);
      if (cached) {
        logger?.debug?.(`Feed cache hit for store ${store.slug}`);
        res.json(cached);
        return;
      }

      // Fetch all products
      const result = await provider.searchProducts({ limit: FEED_FETCH_LIMIT });
      const products = result.data;

      // Transform to ACP feed format
      const feedItems = buildFeedItems(products, store);

      // Cache the result
      feedBuilder.cache(store.slug, feedItems);

      logger?.log(`Feed generated for store ${store.slug}: ${feedItems.length} items`);

      res.json(feedItems);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
