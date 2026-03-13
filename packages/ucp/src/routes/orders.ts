import { Router } from 'express';
import type { CommerceProvider, Logger } from '@agentojs/core';

export function createOrderRoutes(
  provider: CommerceProvider,
  logger?: Logger,
): Router {
  const router = Router();

  // GET /:id — get order by ID
  router.get('/:id', async (req, res, next) => {
    try {
      const order = await provider.getOrder(req.params.id);
      res.json({ order });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('404') || error.message.includes('not found'))
      ) {
        res.status(404).json({ error: `Order '${req.params.id}' not found` });
        return;
      }
      next(error);
    }
  });

  return router;
}
