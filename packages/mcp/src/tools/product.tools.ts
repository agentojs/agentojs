/**
 * MCP Tools: Product Discovery
 *
 * Tools for AI agents to search and browse the product catalog.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CommerceProvider, ScopeChecker, Logger } from '@agentojs/core';
import { formatPrice } from '@agentojs/core';
import { checkMcpScope } from '../scope-check.js';

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, '');

export function registerProductTools(
  server: McpServer,
  provider: CommerceProvider,
  scopeChecker?: ScopeChecker,
  logger?: Logger,
): void {
  server.tool(
    'search_products',
    'Search the product catalog by keyword, category, or price range. Returns a paginated list of products with variants and prices.',
    {
      query: z
        .string()
        .max(500)
        .transform(stripHtml)
        .optional()
        .describe("Search query (e.g., 'running shoes', 'blue t-shirt')"),
      category_id: z
        .array(z.string().max(200))
        .optional()
        .describe('Filter by category IDs'),
      collection_id: z
        .array(z.string().max(200))
        .optional()
        .describe('Filter by collection IDs'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .default(20)
        .describe('Number of results to return (max 100)'),
      offset: z
        .number()
        .min(0)
        .default(0)
        .describe('Pagination offset'),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async (params) => {
      const scopeError = checkMcpScope(scopeChecker, 'products:read');
      if (scopeError) return scopeError;

      logger?.log(`search_products: query=${params.query ?? ''}`);

      try {
        const results = await provider.searchProducts({
          q: params.query,
          category_id: params.category_id,
          collection_id: params.collection_id,
          limit: params.limit,
          offset: params.offset,
        });

        const simplified = results.data.map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          handle: p.handle,
          thumbnail: p.thumbnail,
          variants: (p.variants || []).map((v: any) => {
            const prices: Array<{ amount: number; currency: string; formatted: string }> = [];
            if (v.calculated_price) {
              const amt = v.calculated_price.calculated_amount;
              const cur = v.calculated_price.currency_code;
              prices.push({ amount: amt, currency: cur, formatted: formatPrice(amt, cur) });
            } else if (v.prices) {
              for (const pr of v.prices) {
                prices.push({ amount: pr.amount, currency: pr.currency_code, formatted: formatPrice(pr.amount, pr.currency_code) });
              }
            }
            return {
              id: v.id,
              title: v.title,
              sku: v.sku,
              prices,
              in_stock: !v.manage_inventory || v.allow_backorder,
            };
          }),
          categories: (p.categories || []).map((c: any) => c.name),
          tags: (p.tags || []).map((t: any) => t.value),
        }));

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  products: simplified,
                  total: results.count,
                  showing: `${results.offset + 1}-${Math.min(results.offset + results.limit, results.count)} of ${results.count}`,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        logger?.error(`search_products failed: ${error}`);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error searching products: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'get_product',
    'Get detailed information about a specific product including all variants, options, prices, images, and inventory status.',
    {
      product_id: z.string().max(200).describe('The product ID'),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async (params) => {
      const scopeError = checkMcpScope(scopeChecker, 'products:read');
      if (scopeError) return scopeError;

      logger?.log(`get_product: ${params.product_id}`);

      try {
        const product = await provider.getProduct(params.product_id);

        const p = product as any;
        const detailed = {
          id: p.id,
          title: p.title,
          description: p.description,
          handle: p.handle,
          images: (p.images || []).map((img: any) => img.url),
          options: (p.options || []).map((opt: any) => ({
            name: opt.title,
            values: (opt.values || []).map((v: any) => v.value || v),
          })),
          variants: (p.variants || []).map((v: any) => {
            const prices: Array<{ amount: number; currency: string; formatted: string }> = [];
            if (v.calculated_price) {
              const amt = v.calculated_price.calculated_amount;
              const cur = v.calculated_price.currency_code;
              prices.push({ amount: amt, currency: cur, formatted: formatPrice(amt, cur) });
            } else if (v.prices) {
              for (const pr of v.prices) {
                prices.push({ amount: pr.amount, currency: pr.currency_code, formatted: formatPrice(pr.amount, pr.currency_code) });
              }
            }
            return {
              id: v.id,
              title: v.title,
              sku: v.sku,
              options: v.options,
              prices,
              in_stock: !v.manage_inventory || v.allow_backorder,
              weight: v.weight,
              dimensions: v.length
                ? { length: v.length, width: v.width, height: v.height }
                : null,
            };
          }),
          categories: (p.categories || []).map((c: any) => ({
            id: c.id,
            name: c.name,
          })),
          tags: (p.tags || []).map((t: any) => t.value),
          metadata: p.metadata,
        };

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(detailed, null, 2),
            },
          ],
        };
      } catch (error) {
        logger?.error(`get_product failed: ${error}`);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error getting product: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'get_collections',
    "List all product collections available in the store. Collections group related products together (e.g., 'Summer 2026', 'Best Sellers').",
    {},
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async () => {
      const scopeError = checkMcpScope(scopeChecker, 'products:read');
      if (scopeError) return scopeError;

      logger?.log('get_collections');

      try {
        const collections = await provider.getCollections();

        const simplified = collections.map((c) => ({
          id: c.id,
          title: c.title,
          handle: c.handle,
        }));

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ collections: simplified }, null, 2),
            },
          ],
        };
      } catch (error) {
        logger?.error(`get_collections failed: ${error}`);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error getting collections: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
