/**
 * MCP Tools: Checkout & Payment
 *
 * Tools for AI agents to initiate payment and complete checkout.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CommerceProvider, StoreInfo, ScopeChecker, WebhookEmitter, Logger } from '@agentojs/core';
import { formatPrice } from '@agentojs/core';
import { checkMcpScope } from '../scope-check.js';

export function registerCheckoutTools(
  server: McpServer,
  provider: CommerceProvider,
  store: StoreInfo,
  webhookEmitter?: WebhookEmitter,
  scopeChecker?: ScopeChecker,
  logger?: Logger,
): void {
  server.tool(
    'create_payment_session',
    'Initialize Stripe payment for a cart. The cart must have: items, email, shipping address, and shipping method. Returns a payment URL the customer can use to pay.',
    {
      cart_id: z.string().max(200).describe('The cart ID'),
    },
    { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    async (params) => {
      const scopeError = checkMcpScope(scopeChecker, 'checkout:write');
      if (scopeError) return scopeError;

      logger?.log(`create_payment_session: ${params.cart_id}`);

      try {
        const session = await provider.initializePayment(
          params.cart_id,
          'pp_stripe_stripe',
        );

        const clientSecret = session.data?.client_secret as string | undefined;
        if (!clientSecret) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: No client_secret returned from payment provider. Ensure Stripe is configured in your Medusa instance.',
              },
            ],
            isError: true,
          };
        }

        // Fetch cart to include order summary in payment URL
        const cart = await provider.getCart(params.cart_id);
        const totalAmount = cart.total ?? 0;
        const currencyCode = cart.currency_code ?? session.currency_code ?? '';
        const cartItems = (cart.items ?? []).map((item) => ({
          t: item.title,
          q: item.quantity,
          p: item.unit_price,
          img: item.thumbnail || null,
        }));
        const itemsB64 = Buffer.from(JSON.stringify(cartItems)).toString('base64');

        const baseUrl =
          process.env.FRONTEND_URL ||
          'https://agentomcp-production-050d.up.railway.app';
        const paymentUrl = `${baseUrl}/pay.html?cs=${encodeURIComponent(clientSecret)}&pk=${encodeURIComponent(store.stripeKey || '')}&amount=${totalAmount}&currency=${currencyCode}&store=${encodeURIComponent(store.name)}&items=${encodeURIComponent(itemsB64)}&slug=${encodeURIComponent(store.slug)}&cart_id=${encodeURIComponent(params.cart_id)}`;

        const total = totalAmount || undefined;

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  payment_url: paymentUrl,
                  total,
                  formatted_total: total ? formatPrice(total, currencyCode) : undefined,
                  currency: currencyCode,
                  message:
                    'Share this payment URL with the customer to complete their purchase.',
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        logger?.error(`create_payment_session failed: ${error}`);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error creating payment session: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'complete_checkout',
    'Complete the checkout and place the order. The cart must have a paid payment session. Returns the created order with order ID and confirmation details.',
    {
      cart_id: z.string().max(200).describe('The cart ID to complete'),
    },
    { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    async (params) => {
      const scopeError = checkMcpScope(scopeChecker, 'checkout:write');
      if (scopeError) return scopeError;

      logger?.log(`complete_checkout: ${params.cart_id}`);

      try {
        const order = await provider.completeCart(params.cart_id);

        // Fire-and-forget webhook on checkout.completed
        if (webhookEmitter && store.webhookUrl) {
          webhookEmitter(
            store.webhookUrl,
            store.webhookSecret ?? null,
            'checkout.completed',
            {
              protocol: 'mcp',
              order_id: order.id,
              display_id: order.display_id,
              status: order.status,
              email: order.email,
              total: order.total,
              currency: order.currency_code,
              store_slug: store.slug,
            },
          );
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  order_id: order.id,
                  display_id: order.display_id,
                  status: order.status,
                  email: order.email,
                  total: order.total,
                  formatted_total: formatPrice(order.total, order.currency_code),
                  currency: order.currency_code,
                  items: order.items.map((item) => ({
                    title: item.title,
                    quantity: item.quantity,
                    total: item.total,
                    formatted_total: formatPrice(item.total, order.currency_code),
                  })),
                  shipping_address: order.shipping_address,
                  message: `Order #${order.display_id} placed successfully!`,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        // If cart is already completed, try to look up the order
        if (
          errorMessage.toLowerCase().includes('completed') ||
          errorMessage.toLowerCase().includes('order')
        ) {
          logger?.warn(
            `Cart ${params.cart_id} may already be completed, attempting order lookup`,
          );
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    cart_id: params.cart_id,
                    status: 'already_completed',
                    message:
                      'This cart has already been completed. Use get_order with the order ID to retrieve order details.',
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        logger?.error(`complete_checkout failed: ${error}`);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error completing checkout: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
