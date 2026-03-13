/**
 * MCP Tools: Cart Management
 *
 * Tools for AI agents to create and manage shopping carts.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CommerceProvider, ScopeChecker, Logger } from '@agentojs/core';
import type { Address, Cart } from '@agentojs/core';
import { formatPrice } from '@agentojs/core';
import { checkMcpScope } from '../scope-check.js';

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, '');

const AddressSchema = z.object({
  first_name: z.string().max(200).transform(stripHtml),
  last_name: z.string().max(200).transform(stripHtml),
  address_1: z.string().max(2000).transform(stripHtml),
  address_2: z.string().max(2000).transform(stripHtml).optional(),
  city: z.string().max(200).transform(stripHtml),
  province: z.string().max(200).transform(stripHtml).optional(),
  postal_code: z.string().max(200),
  country_code: z.string().regex(/^[a-z]{2}$/),
  phone: z.string().max(50).optional(),
});

function toAddress(input: z.infer<typeof AddressSchema>): Address {
  return {
    first_name: input.first_name,
    last_name: input.last_name,
    address_1: input.address_1,
    address_2: input.address_2 ?? null,
    city: input.city,
    province: input.province ?? null,
    postal_code: input.postal_code,
    country_code: input.country_code,
    phone: input.phone ?? null,
  };
}

function formatCartResponse(cart: Cart) {
  const cur = cart.currency_code ?? '';
  return {
    cart_id: cart.id,
    items: (cart.items ?? []).map((item: any) => ({
      id: item.id,
      title: item.title,
      variant_id: item.variant_id,
      quantity: item.quantity,
      unit_price: item.unit_price ?? 0,
      total: item.total ?? 0,
      formatted_unit_price: formatPrice(item.unit_price, cur),
      formatted_total: formatPrice(item.total, cur),
    })),
    currency: cur,
    subtotal: cart.subtotal ?? 0,
    tax: cart.tax_total ?? 0,
    shipping: cart.shipping_total ?? 0,
    discount: cart.discount_total ?? 0,
    total: cart.total ?? 0,
    formatted_subtotal: formatPrice(cart.subtotal, cur),
    formatted_tax: formatPrice(cart.tax_total, cur),
    formatted_shipping: formatPrice(cart.shipping_total, cur),
    formatted_discount: formatPrice(cart.discount_total, cur),
    formatted_total: formatPrice(cart.total, cur),
    has_shipping_address: !!cart.shipping_address,
    has_email: !!cart.email,
    shipping_methods: (cart.shipping_methods ?? []).map((sm: any) => ({
      name: sm.name,
      price: sm.price ?? 0,
      formatted_price: formatPrice(sm.price, cur),
    })),
  };
}

export function registerCartTools(
  server: McpServer,
  provider: CommerceProvider,
  scopeChecker?: ScopeChecker,
  logger?: Logger,
): void {
  server.tool(
    'create_cart',
    'Create a new shopping cart with one or more items. Returns the cart with calculated totals.',
    {
      region_id: z
        .string()
        .max(200)
        .describe('Region ID (determines currency, tax, shipping options)'),
      items: z
        .array(
          z.object({
            variant_id: z.string().max(200).describe('Product variant ID'),
            quantity: z.number().min(1).max(999).describe('Quantity to add'),
          }),
        )
        .min(1)
        .describe('Items to add to the cart'),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async (params) => {
      const scopeError = checkMcpScope(scopeChecker, 'cart:write');
      if (scopeError) return scopeError;

      logger?.log(
        `create_cart: region=${params.region_id}, items=${params.items.length}`,
      );

      try {
        const cart = await provider.createCart(params.region_id, params.items);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(formatCartResponse(cart), null, 2),
            },
          ],
        };
      } catch (error) {
        logger?.error(`create_cart failed: ${error}`);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error creating cart: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'get_cart',
    'Get the current state of a shopping cart including items, totals, and checkout readiness.',
    {
      cart_id: z.string().max(200).describe('The cart ID'),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async (params) => {
      const scopeError = checkMcpScope(scopeChecker, 'cart:read');
      if (scopeError) return scopeError;

      logger?.log(`get_cart: ${params.cart_id}`);

      try {
        const cart = await provider.getCart(params.cart_id);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(formatCartResponse(cart), null, 2),
            },
          ],
        };
      } catch (error) {
        logger?.error(`get_cart failed: ${error}`);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error getting cart: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'update_cart',
    'Update cart details: set customer email, shipping address, or billing address. Required before checkout.',
    {
      cart_id: z.string().max(200).describe('The cart ID'),
      email: z.string().email().max(500).optional().describe('Customer email'),
      shipping_address: AddressSchema.optional().describe('Shipping address'),
      billing_address: AddressSchema.optional().describe(
        'Billing address (defaults to shipping address if not set)',
      ),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    async (params) => {
      const scopeError = checkMcpScope(scopeChecker, 'cart:write');
      if (scopeError) return scopeError;

      logger?.log(`update_cart: ${params.cart_id}`);

      try {
        const cart = await provider.updateCart(params.cart_id, {
          email: params.email,
          shipping_address: params.shipping_address
            ? toAddress(params.shipping_address)
            : undefined,
          billing_address: params.billing_address
            ? toAddress(params.billing_address)
            : undefined,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(formatCartResponse(cart), null, 2),
            },
          ],
        };
      } catch (error) {
        logger?.error(`update_cart failed: ${error}`);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error updating cart: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'add_to_cart',
    'Add a product variant to an existing cart.',
    {
      cart_id: z.string().max(200).describe('The cart ID'),
      variant_id: z.string().max(200).describe('Product variant ID to add'),
      quantity: z.number().min(1).max(999).default(1).describe('Quantity to add'),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async (params) => {
      const scopeError = checkMcpScope(scopeChecker, 'cart:write');
      if (scopeError) return scopeError;

      logger?.log(
        `add_to_cart: cart=${params.cart_id}, variant=${params.variant_id}`,
      );

      try {
        const cart = await provider.addLineItem(
          params.cart_id,
          params.variant_id,
          params.quantity,
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(formatCartResponse(cart), null, 2),
            },
          ],
        };
      } catch (error) {
        logger?.error(`add_to_cart failed: ${error}`);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error adding to cart: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'remove_from_cart',
    'Remove a line item from the cart.',
    {
      cart_id: z.string().max(200).describe('The cart ID'),
      line_item_id: z.string().max(200).describe('Line item ID to remove'),
    },
    { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    async (params) => {
      const scopeError = checkMcpScope(scopeChecker, 'cart:write');
      if (scopeError) return scopeError;

      logger?.log(
        `remove_from_cart: cart=${params.cart_id}, item=${params.line_item_id}`,
      );

      try {
        const cart = await provider.removeLineItem(
          params.cart_id,
          params.line_item_id,
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(formatCartResponse(cart), null, 2),
            },
          ],
        };
      } catch (error) {
        logger?.error(`remove_from_cart failed: ${error}`);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error removing from cart: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'get_shipping_options',
    'Get available shipping options for a cart. Cart must have a shipping address set first.',
    {
      cart_id: z.string().max(200).describe('The cart ID'),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async (params) => {
      const scopeError = checkMcpScope(scopeChecker, 'cart:read');
      if (scopeError) return scopeError;

      logger?.log(`get_shipping_options: ${params.cart_id}`);

      try {
        const options = await provider.getShippingOptions(params.cart_id);

        // Get cart currency for formatting
        const cart = await provider.getCart(params.cart_id);
        const cur = cart.currency_code;

        const simplified = options.map((opt) => ({
          id: opt.id,
          name: opt.name,
          price: opt.amount,
          formatted_price: formatPrice(opt.amount, cur),
        }));

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ shipping_options: simplified }, null, 2),
            },
          ],
        };
      } catch (error) {
        logger?.error(`get_shipping_options failed: ${error}`);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error getting shipping options: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'select_shipping',
    'Select a shipping method for the cart. Use get_shipping_options first to see available options.',
    {
      cart_id: z.string().max(200).describe('The cart ID'),
      option_id: z.string().max(200).describe('Shipping option ID to select'),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    async (params) => {
      const scopeError = checkMcpScope(scopeChecker, 'cart:write');
      if (scopeError) return scopeError;

      logger?.log(
        `select_shipping: cart=${params.cart_id}, option=${params.option_id}`,
      );

      try {
        const cart = await provider.addShippingMethod(
          params.cart_id,
          params.option_id,
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(formatCartResponse(cart), null, 2),
            },
          ],
        };
      } catch (error) {
        logger?.error(`select_shipping failed: ${error}`);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error selecting shipping: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
