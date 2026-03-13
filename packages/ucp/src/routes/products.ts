import { Router } from 'express';
import type { CommerceProvider, Logger } from '@agentojs/core';

export function createProductRoutes(
  provider: CommerceProvider,
  logger?: Logger,
): Router {
  const router = Router();

  // GET /products — search products
  router.get('/', async (req, res, next) => {
    try {
      const q = req.query.q as string | undefined;
      const categoryId = req.query.category_id as string | undefined;
      const limitStr = req.query.limit as string | undefined;
      const offsetStr = req.query.offset as string | undefined;

      const limit = limitStr ? Math.min(parseInt(limitStr, 10) || 20, 100) : 20;
      const offset = offsetStr ? parseInt(offsetStr, 10) || 0 : 0;

      const result = await provider.searchProducts({
        q,
        category_id: categoryId ? [categoryId] : undefined,
        limit,
        offset,
      });

      res.json({
        products: result.data,
        total: result.count,
        offset: result.offset,
        limit: result.limit,
      });
    } catch (error) {
      next(error);
    }
  });

  // GET /products/:id — get product detail
  router.get('/:id', async (req, res, next) => {
    try {
      const product = await provider.getProduct(req.params.id);
      res.json({ product });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('404') || error.message.includes('not found'))
      ) {
        res.status(404).json({ error: `Product '${req.params.id}' not found` });
        return;
      }
      next(error);
    }
  });

  return router;
}
