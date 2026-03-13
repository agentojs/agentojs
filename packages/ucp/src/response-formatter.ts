import type { Cart, ShippingOption } from '@agentojs/core';
import type { StoreInfo } from '@agentojs/core';
import type {
  UcpSession,
  UcpLineItem,
  UcpTotal,
  UcpFulfillmentMethod,
  UcpCheckoutSessionResponse,
  UcpMessage,
} from './types.js';

/**
 * UcpResponseFormatter — builds UCP-compliant checkout-session responses.
 *
 * All monetary amounts are in minor units (cents).
 * Cart data from the commerce backend is already in minor units,
 * so amounts pass through directly.
 */
export class UcpResponseFormatter {
  /**
   * Builds the full UCP checkout-session response.
   * Uses global ID format: gid://{host}/Checkout/{session_id}
   */
  formatCart(
    sessionId: string,
    session: UcpSession,
    cart: Cart,
    store: StoreInfo,
    shippingOptions?: ShippingOption[],
  ): UcpCheckoutSessionResponse {
    const host = new URL(store.backendUrl).host;
    const globalId = `gid://${host}/Checkout/${sessionId}`;

    const response: UcpCheckoutSessionResponse = {
      id: globalId,
      status: session.status,
      currency: cart.currency_code,
      line_items: this.buildLineItems(cart),
      totals: this.buildTotals(cart),
      fulfillment: {
        methods: shippingOptions
          ? this.buildFulfillmentMethods(shippingOptions)
          : [],
      },
      payment: {
        provider: 'stripe',
        supported_methods: ['card'],
      },
      messages: [],
    };

    if (session.buyer) {
      response.buyer = session.buyer;
    }
    if (session.fulfillmentAddress) {
      response.fulfillment.address = session.fulfillmentAddress;
    }
    if (session.fulfillmentMethodId) {
      response.fulfillment.selected_method_id = session.fulfillmentMethodId;
    }

    return response;
  }

  /**
   * Formats shipping options for a UCP response.
   */
  formatShippingOptions(
    options: ShippingOption[],
    store: StoreInfo,
  ): UcpFulfillmentMethod[] {
    return this.buildFulfillmentMethods(options);
  }

  /**
   * Formats a checkout session response for a completed order.
   */
  formatCheckoutSession(
    sessionId: string,
    session: UcpSession,
    cart: Cart,
    store: StoreInfo,
    orderId?: string,
    shippingOptions?: ShippingOption[],
  ): UcpCheckoutSessionResponse {
    const response = this.formatCart(sessionId, session, cart, store, shippingOptions);

    if (orderId) {
      response.order = {
        id: orderId,
        checkout_session_id: response.id,
        permalink_url: `${store.backendUrl}/orders/${orderId}`,
      };
    }

    return response;
  }

  /**
   * Builds UCP totals array from cart data.
   * Amounts are already in minor units from the commerce backend.
   */
  buildTotals(cart: Cart): UcpTotal[] {
    const itemsBase = cart.items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0,
    );

    return [
      {
        type: 'items_base_amount',
        display_text: 'Items',
        amount: itemsBase,
      },
      {
        type: 'subtotal',
        display_text: 'Subtotal',
        amount: cart.subtotal,
      },
      {
        type: 'fulfillment',
        display_text: 'Shipping',
        amount: cart.shipping_total,
      },
      {
        type: 'tax',
        display_text: 'Tax',
        amount: cart.tax_total,
      },
      {
        type: 'total',
        display_text: 'Total',
        amount: cart.total,
      },
    ];
  }

  /**
   * Builds UCP line items from cart items.
   */
  buildLineItems(cart: Cart): UcpLineItem[] {
    return cart.items.map((item) => {
      const baseAmount = item.unit_price * item.quantity;
      const discount = baseAmount - item.subtotal;

      return {
        id: item.id,
        item: {
          id: item.variant_id,
          quantity: item.quantity,
        },
        base_amount: baseAmount,
        discount: discount > 0 ? discount : 0,
        subtotal: item.subtotal,
        tax: item.total - item.subtotal,
        total: item.total,
      };
    });
  }

  /**
   * Builds UCP fulfillment methods from shipping options.
   */
  buildFulfillmentMethods(
    shippingOptions: ShippingOption[],
  ): UcpFulfillmentMethod[] {
    return shippingOptions.map((opt) => ({
      type: 'shipping',
      id: opt.id,
      title: opt.name,
      subtitle: '',
      subtotal: opt.amount,
      tax: 0,
      total: opt.amount,
    }));
  }

  /**
   * Builds UCP messages array from errors.
   */
  buildMessages(
    errors?: Array<{ code: string; content: string }>,
  ): UcpMessage[] {
    if (!errors || errors.length === 0) return [];

    return errors.map((err) => ({
      type: 'error',
      code: err.code,
      content: err.content,
    }));
  }
}
