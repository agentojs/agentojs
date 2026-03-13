/**
 * UCP (Universal Checkout Protocol) types.
 *
 * Defines session statuses, buyer info, fulfillment addresses,
 * and checkout session response shapes per Google UCP spec.
 */

/**
 * UCP checkout session statuses per Google UCP spec.
 */
export type UcpSessionStatus =
  | 'incomplete'
  | 'completed'
  | 'requires_escalation'
  | 'canceled';

/**
 * Buyer information captured during the UCP checkout flow.
 */
export interface UcpBuyerInfo {
  email?: string;
  name?: string;
  phone?: string;
}

/**
 * Fulfillment address in UCP format.
 */
export interface UcpFulfillmentAddress {
  name?: string;
  line_one: string;
  line_two?: string;
  city: string;
  state?: string;
  country: string;
  postal_code: string;
  phone_number?: string;
}

/**
 * UCP checkout session — stores cart reference, buyer info, fulfillment, and status.
 */
export interface UcpSession {
  cartId: string;
  storeSlug: string;
  status: UcpSessionStatus;
  buyer?: UcpBuyerInfo;
  fulfillmentAddress?: UcpFulfillmentAddress;
  fulfillmentMethodId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * UCP line item in the checkout-session response.
 */
export interface UcpLineItem {
  id: string;
  item: { id: string; quantity: number };
  base_amount: number;
  discount: number;
  subtotal: number;
  tax: number;
  total: number;
}

/**
 * UCP total entry (items_base_amount, subtotal, fulfillment, tax, total).
 */
export interface UcpTotal {
  type: string;
  display_text: string;
  amount: number;
}

/**
 * UCP fulfillment method.
 */
export interface UcpFulfillmentMethod {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  subtotal: number;
  tax: number;
  total: number;
}

/**
 * Full UCP checkout-session response object.
 */
export interface UcpCheckoutSessionResponse {
  id: string;
  status: string;
  currency: string;
  line_items: UcpLineItem[];
  totals: UcpTotal[];
  fulfillment: {
    methods: UcpFulfillmentMethod[];
    selected_method_id?: string;
    address?: UcpFulfillmentAddress;
  };
  payment: {
    provider: string;
    supported_methods: string[];
  };
  buyer?: {
    email?: string;
    name?: string;
    phone?: string;
  };
  messages: UcpMessage[];
  order?: {
    id: string;
    checkout_session_id: string;
    permalink_url: string;
  };
}

/**
 * UCP message (error, info).
 */
export interface UcpMessage {
  type: string;
  code: string;
  content: string;
}

/**
 * Options for creating a UCP session from items.
 */
export interface UcpFulfillmentOption {
  id: string;
  title: string;
  amount: number;
}
