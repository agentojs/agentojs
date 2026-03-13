import type { Cart, ShippingOption } from '@agentojs/core';
import type { StoreInfo } from '@agentojs/core';
import type {
  AcpSession,
  AcpCheckoutSessionResponse,
  AcpLineItem,
  AcpTotal,
  AcpFulfillmentOption,
  AcpLink,
  AcpMessage,
} from './types.js';

/**
 * AcpResponseFormatter — builds strict ACP-compliant checkout session responses.
 *
 * All monetary amounts are in minor units (cents).
 * Cart data from commerce backend is already in minor units.
 */
export class AcpResponseFormatter {
  /**
   * Builds the full ACP checkout session response.
   */
  buildCheckoutSession(
    sessionId: string,
    session: AcpSession,
    cart: Cart,
    shippingOptions?: ShippingOption[],
    store?: StoreInfo,
  ): AcpCheckoutSessionResponse {
    const response: AcpCheckoutSessionResponse = {
      id: sessionId,
      status: session.status,
      currency: cart.currency_code,
      line_items: this.buildLineItems(cart),
      totals: this.buildTotals(cart),
      fulfillment_options: shippingOptions
        ? this.buildFulfillmentOptions(shippingOptions)
        : [],
      payment_provider: session.paymentProvider,
      messages: [],
      links: this.buildLinks(store),
    };

    if (session.buyer) {
      response.buyer = session.buyer;
    }
    if (session.fulfillmentAddress) {
      response.fulfillment_address = session.fulfillmentAddress;
    }
    if (session.fulfillmentOptionId) {
      response.selected_fulfillment_option_id = session.fulfillmentOptionId;
    }
    if (session.paymentMethod) {
      response.payment_method = session.paymentMethod;
    }

    return response;
  }

  /**
   * Builds ACP totals array from cart data.
   */
  buildTotals(cart: Cart): AcpTotal[] {
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
   * Builds ACP line items from cart items.
   */
  buildLineItems(cart: Cart): AcpLineItem[] {
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
   * Builds ACP fulfillment options from shipping options.
   */
  buildFulfillmentOptions(
    shippingOptions: ShippingOption[],
  ): AcpFulfillmentOption[] {
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
   * Builds ACP links (terms_of_use, privacy_policy).
   */
  buildLinks(store?: StoreInfo): AcpLink[] {
    const baseUrl = store?.backendUrl || '';
    return [
      {
        type: 'terms_of_use',
        url: baseUrl ? `${baseUrl}/terms` : '',
      },
      {
        type: 'privacy_policy',
        url: baseUrl ? `${baseUrl}/privacy` : '',
      },
    ];
  }

  /**
   * Builds ACP messages array from errors.
   */
  buildMessages(
    errors?: Array<{ code: string; param?: string; content: string }>,
  ): AcpMessage[] {
    if (!errors || errors.length === 0) return [];

    return errors.map((err) => ({
      type: 'error',
      code: err.code,
      ...(err.param ? { param: err.param } : {}),
      content_type: 'plain',
      content: err.content,
    }));
  }
}
