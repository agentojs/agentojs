/** Core commerce types used across all AI commerce agent adapters. */

export interface Product {
  id: string;
  title: string;
  description: string;
  handle: string;
  thumbnail: string | null;
  images: ProductImage[];
  variants: ProductVariant[];
  options: ProductOption[];
  collection_id: string | null;
  categories: ProductCategory[];
  tags: ProductTag[];
  status: 'draft' | 'published' | 'proposed' | 'rejected';
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  prices: Price[];
  options: Record<string, string>;
  inventory_quantity: number;
  allow_backorder: boolean;
  manage_inventory: boolean;
  weight: number | null;
  length: number | null;
  height: number | null;
  width: number | null;
  metadata: Record<string, unknown>;
}

export interface Price {
  id: string;
  amount: number;
  currency_code: string;
  min_quantity: number | null;
  max_quantity: number | null;
}

export interface ProductImage {
  id: string;
  url: string;
  metadata: Record<string, unknown>;
}

export interface ProductOption {
  id: string;
  title: string;
  values: string[];
}

export interface ProductCategory {
  id: string;
  name: string;
  handle: string;
}

export interface ProductTag {
  id: string;
  value: string;
}

export interface Collection {
  id: string;
  title: string;
  handle: string;
  products: Product[];
}

export interface Cart {
  id: string;
  items: LineItem[];
  region_id: string;
  currency_code: string;
  subtotal: number;
  tax_total: number;
  shipping_total: number;
  discount_total: number;
  total: number;
  shipping_address: Address | null;
  billing_address: Address | null;
  email: string | null;
  shipping_methods: ShippingMethod[];
  payment_sessions: PaymentSession[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LineItem {
  id: string;
  cart_id: string;
  variant_id: string;
  product_id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  total: number;
  metadata: Record<string, unknown>;
}

export interface Address {
  first_name: string;
  last_name: string;
  address_1: string;
  address_2: string | null;
  city: string;
  province: string | null;
  postal_code: string;
  country_code: string;
  phone: string | null;
}

export interface ShippingMethod {
  id: string;
  shipping_option_id: string;
  name: string;
  price: number;
}

export interface ShippingOption {
  id: string;
  name: string;
  amount: number;
  region_id: string;
}

export interface PaymentSession {
  id: string;
  provider_id: string;
  status: 'pending' | 'authorized' | 'requires_more';
  amount?: number;
  currency_code?: string;
  data: Record<string, unknown>;
}

export interface Order {
  id: string;
  display_id: number;
  status:
    | 'pending'
    | 'completed'
    | 'archived'
    | 'canceled'
    | 'requires_action';
  fulfillment_status:
    | 'not_fulfilled'
    | 'partially_fulfilled'
    | 'fulfilled'
    | 'partially_shipped'
    | 'shipped'
    | 'partially_returned'
    | 'returned'
    | 'canceled'
    | 'requires_action';
  payment_status:
    | 'not_paid'
    | 'awaiting'
    | 'captured'
    | 'partially_refunded'
    | 'refunded'
    | 'canceled'
    | 'requires_action';
  items: LineItem[];
  currency_code: string;
  subtotal: number;
  tax_total: number;
  shipping_total: number;
  total: number;
  email: string;
  shipping_address: Address;
  fulfillments: Fulfillment[];
  created_at: string;
  updated_at: string;
}

export interface Fulfillment {
  id: string;
  order_id: string;
  tracking_numbers: string[];
  tracking_links: TrackingLink[];
  items: FulfillmentItem[];
  shipped_at: string | null;
  created_at: string;
}

export interface TrackingLink {
  tracking_number: string;
  url: string;
}

export interface FulfillmentItem {
  item_id: string;
  quantity: number;
}

export interface Region {
  id: string;
  name: string;
  currency_code: string;
  countries: Country[];
}

export interface Country {
  iso_2: string;
  name: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  offset: number;
  limit: number;
}

export interface ProductSearchFilters {
  q?: string;
  category_id?: string[];
  collection_id?: string[];
  tags?: string[];
  price_min?: number;
  price_max?: number;
  currency_code?: string;
  limit?: number;
  offset?: number;
}

export interface OrderListFilters {
  email?: string;
  status?: string;
  limit?: number;
  offset?: number;
}
