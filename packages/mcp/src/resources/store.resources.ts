/**
 * MCP Resources: Store Information
 *
 * Read-only resources that agents can access for store context.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { StoreInfo, Logger } from '@agentojs/core';

export function registerStoreResources(
  server: McpServer,
  store: StoreInfo,
  logger?: Logger,
): void {
  server.resource(
    'store-info',
    'store://info',
    {
      description:
        'Basic store information: name, URL, currency, supported regions',
      mimeType: 'application/json',
    },
    async () => {
      logger?.debug('Resource: store://info');

      return {
        contents: [
          {
            uri: 'store://info',
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                name: store.name,
                slug: store.slug,
                default_currency: store.currency,
                default_country: store.country,
                protocols: {
                  mcp: true,
                  ucp: true,
                  acp: true,
                },
                capabilities: [
                  'product_search',
                  'cart_management',
                  'checkout',
                  'order_tracking',
                  'shipping_options',
                ],
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.resource(
    'store-policies',
    'store://policies',
    {
      description:
        'Store policies: shipping, returns, refunds, privacy, and terms of service',
      mimeType: 'application/json',
    },
    async () => {
      logger?.debug('Resource: store://policies');

      return {
        contents: [
          {
            uri: 'store://policies',
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                shipping: {
                  title: 'Shipping Policy',
                  content:
                    'Standard shipping: 5-7 business days. Express shipping: 2-3 business days. Free shipping on orders over $50.',
                  free_shipping_threshold: 50,
                  estimated_delivery: {
                    standard: '5-7 business days',
                    express: '2-3 business days',
                  },
                },
                returns: {
                  title: 'Return Policy',
                  content:
                    '30-day return policy for unused items in original packaging. Return shipping is free.',
                  window_days: 30,
                  conditions: [
                    'Item must be unused',
                    'Original packaging required',
                    'Receipt or proof of purchase required',
                  ],
                  free_return_shipping: true,
                },
                refunds: {
                  title: 'Refund Policy',
                  content:
                    'Refunds are processed within 5-10 business days after receiving the returned item.',
                  processing_time: '5-10 business days',
                },
                privacy: {
                  title: 'Privacy Policy',
                  content:
                    'We respect your privacy. Customer data is encrypted and never shared with third parties without consent.',
                  data_retention: 'As long as account is active',
                  gdpr_compliant: true,
                },
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.resource(
    'agent-guide',
    'store://agent-guide',
    {
      description:
        'Instructions for AI agents on how to interact with this store: available flows, best practices, and limitations',
      mimeType: 'text/markdown',
    },
    async () => {
      logger?.debug('Resource: store://agent-guide');

      return {
        contents: [
          {
            uri: 'store://agent-guide',
            mimeType: 'text/markdown',
            text: `# ${store.name} — Agent Guide

## Available Shopping Flow

1. **Browse**: Use \`search_products\` to find products or \`get_collections\` to browse categories
2. **Product Details**: Use \`get_product\` for full details, pricing, and availability
3. **Regions**: Use \`get_regions\` to find the customer's region (needed for cart creation)
4. **Cart**: Use \`create_cart\` with a region_id and items to start shopping
5. **Cart Updates**: Use \`update_cart\` to set email and shipping address
6. **Shipping**: Use \`get_shipping_options\` then \`select_shipping\` to choose delivery method
7. **Payment**: Use \`create_payment_session\` to initialize payment
8. **Complete**: Use \`complete_checkout\` to place the order
9. **Track**: Use \`get_order\` to check order status and tracking

## Important Notes

- Prices are returned in the store's base currency (${store.currency})
- Always confirm the total with the customer before completing checkout
- Cart requires: items, email, shipping address, and shipping method before checkout

## Supported Protocols

- **MCP**: Full shopping flow via MCP tools (you're using this now)
- **UCP**: REST API at /stores/${store.slug}/ucp (discovery: /.well-known/ucp)
- **ACP**: Checkout REST API at /stores/${store.slug}/acp/checkout
`,
          },
        ],
      };
    },
  );
}
