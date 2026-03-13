/**
 * MCP Tools: Order Management
 *
 * Tools for AI agents to check order status and manage post-purchase.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CommerceProvider, ScopeChecker, Logger } from '@agentojs/core';
import { formatPrice } from '@agentojs/core';
import { checkMcpScope } from '../scope-check.js';

export function registerOrderTools(
  server: McpServer,
  provider: CommerceProvider,
  scopeChecker?: ScopeChecker,
  logger?: Logger,
): void {
  server.tool(
    'list_orders',
    'List orders with optional filtering by email or status. Returns paginated order summaries.',
    {
      email: z.string().email().max(500).optional().describe('Filter orders by customer email'),
      status: z
        .string()
        .max(200)
        .optional()
        .describe(
          'Filter by order status (pending, completed, archived, canceled)',
        ),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .default(10)
        .describe('Number of orders to return (default 10, max 100)'),
      offset: z
        .number()
        .min(0)
        .optional()
        .default(0)
        .describe('Offset for pagination (default 0)'),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async (params) => {
      const scopeError = checkMcpScope(scopeChecker, 'orders:read');
      if (scopeError) return scopeError;

      logger?.log(
        `list_orders: email=${params.email ?? '*'}, status=${params.status ?? '*'}, limit=${params.limit}, offset=${params.offset}`,
      );

      try {
        const result = await provider.listOrders({
          email: params.email,
          status: params.status,
          limit: params.limit,
          offset: params.offset,
        });

        const orders = result.data.map((order) => ({
          order_id: order.id,
          display_id: order.display_id,
          status: order.status,
          payment_status: order.payment_status,
          email: order.email,
          total: order.total,
          formatted_total: formatPrice(order.total, order.currency_code),
          item_count: order.items.length,
          created_at: order.created_at,
        }));

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  orders,
                  pagination: {
                    total: result.count,
                    limit: result.limit,
                    offset: result.offset,
                    has_more: result.offset + result.limit < result.count,
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        logger?.error(`list_orders failed: ${error}`);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error listing orders: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'get_order',
    'Get the status and details of an order including fulfillment tracking, payment status, and item details.',
    {
      order_id: z.string().max(200).describe('The order ID'),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async (params) => {
      const scopeError = checkMcpScope(scopeChecker, 'orders:read');
      if (scopeError) return scopeError;

      logger?.log(`get_order: ${params.order_id}`);

      try {
        const order = await provider.getOrder(params.order_id);

        const cur = order.currency_code;
        const result = {
          order_id: order.id,
          display_id: order.display_id,
          status: order.status,
          payment_status: order.payment_status,
          fulfillment_status: order.fulfillment_status,
          email: order.email,
          currency: cur,
          subtotal: order.subtotal,
          tax: order.tax_total,
          shipping: order.shipping_total,
          total: order.total,
          formatted_subtotal: formatPrice(order.subtotal, cur),
          formatted_tax: formatPrice(order.tax_total, cur),
          formatted_shipping: formatPrice(order.shipping_total, cur),
          formatted_total: formatPrice(order.total, cur),
          items: order.items.map((item) => ({
            title: item.title,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total,
            formatted_unit_price: formatPrice(item.unit_price, cur),
            formatted_total: formatPrice(item.total, cur),
          })),
          shipping_address: order.shipping_address,
          fulfillments: order.fulfillments.map((f) => ({
            id: f.id,
            tracking_numbers: f.tracking_numbers,
            tracking_links: f.tracking_links,
            items: f.items.map((fi) => ({
              item_id: fi.item_id,
              quantity: fi.quantity,
            })),
            shipped_at: f.shipped_at,
          })),
          created_at: order.created_at,
        };

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger?.error(`get_order failed: ${error}`);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error getting order: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'get_regions',
    'List available store regions with their currencies and supported countries. Use region_id when creating a cart.',
    {},
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async () => {
      const scopeError = checkMcpScope(scopeChecker, 'orders:read');
      if (scopeError) return scopeError;

      logger?.log('get_regions');

      try {
        const regions = await provider.getRegions();

        const simplified = regions.map((r) => ({
          id: r.id,
          name: r.name,
          currency: r.currency_code,
          countries: r.countries.map((c) => ({
            code: c.iso_2,
            name: c.name,
          })),
        }));

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ regions: simplified }, null, 2),
            },
          ],
        };
      } catch (error) {
        logger?.error(`get_regions failed: ${error}`);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error getting regions: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
