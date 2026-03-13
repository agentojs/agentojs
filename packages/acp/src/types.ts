/**
 * ACP checkout session statuses per OpenAI ACP spec.
 */
export type AcpSessionStatus =
  | 'not_ready_for_payment'
  | 'ready_for_payment'
  | 'completed'
  | 'canceled';

/**
 * Buyer information captured during the checkout flow.
 */
export interface AcpBuyerInfo {
  email?: string;
  name?: string;
  phone?: string;
}

/**
 * Fulfillment address in ACP format.
 */
export interface AcpFulfillmentAddress {
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
 * Payment method details stored after PaymentIntent creation.
 */
export interface AcpPaymentMethod {
  type: string;
  payment_intent_id: string;
  client_secret: string;
  publishable_key: string;
}

/**
 * ACP checkout session — extended with buyer info, address, and payment provider config.
 */
export interface AcpSession {
  cartId: string;
  storeSlug: string;
  status: AcpSessionStatus;
  buyer?: AcpBuyerInfo;
  fulfillmentAddress?: AcpFulfillmentAddress;
  fulfillmentOptionId?: string;
  paymentProvider: {
    provider: string;
    supported_payment_methods: string[];
  };
  paymentMethod?: AcpPaymentMethod;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ACP line item in the checkout session response.
 */
export interface AcpLineItem {
  id: string;
  item: { id: string; quantity: number };
  base_amount: number;
  discount: number;
  subtotal: number;
  tax: number;
  total: number;
}

/**
 * ACP total entry (items_base_amount, subtotal, fulfillment, tax, total).
 */
export interface AcpTotal {
  type: string;
  display_text: string;
  amount: number;
}

/**
 * ACP fulfillment option.
 */
export interface AcpFulfillmentOption {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  subtotal: number;
  tax: number;
  total: number;
}

/**
 * ACP link (terms_of_use, privacy_policy).
 */
export interface AcpLink {
  type: string;
  url: string;
}

/**
 * ACP message (error, info).
 */
export interface AcpMessage {
  type: string;
  code: string;
  param?: string;
  content_type: string;
  content: string;
}

/**
 * Full ACP checkout session response object.
 */
export interface AcpCheckoutSessionResponse {
  id: string;
  status: string;
  currency: string;
  line_items: AcpLineItem[];
  totals: AcpTotal[];
  fulfillment_options: AcpFulfillmentOption[];
  payment_provider: {
    provider: string;
    supported_payment_methods: string[];
  };
  buyer?: {
    email?: string;
    name?: string;
    phone?: string;
  };
  fulfillment_address?: AcpFulfillmentAddress;
  selected_fulfillment_option_id?: string;
  payment_method?: AcpPaymentMethod;
  messages: AcpMessage[];
  links: AcpLink[];
  order?: {
    id: string;
    checkout_session_id: string;
    permalink_url: string;
  };
}

/**
 * ACP feed item per OpenAI spec.
 */
export interface AcpFeedItem {
  item_id: string;
  title: string;
  description: string;
  url: string;
  brand: string;
  availability: 'in_stock' | 'out_of_stock' | 'preorder';
  price: { amount: number; currency: string };
  image_url: string;
  target_countries: string[];
  store_country: string;
  seller_name: string;
  seller_url: string;
  is_eligible_search: boolean;
  is_eligible_checkout: boolean;
  group_id?: string;
  variant_dict?: Record<string, string>;
  listing_has_variations?: boolean;
}

/**
 * ACP order statuses for webhook events.
 */
export type AcpOrderStatus =
  | 'created'
  | 'manual_review'
  | 'confirmed'
  | 'canceled'
  | 'shipped'
  | 'fulfilled';

/**
 * ACP order event data for webhooks.
 */
export interface AcpOrderEventData {
  type: 'order';
  checkout_session_id: string;
  permalink_url: string;
  status: AcpOrderStatus;
  refunds: unknown[];
}

/**
 * ACP webhook event types.
 */
export type AcpWebhookEventType = 'order_created' | 'order_updated';
