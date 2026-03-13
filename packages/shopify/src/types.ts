/** Raw Shopify Storefront API GraphQL response types. */

export interface ShopifyGraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string; locations?: Array<{ line: number; column: number }> }>;
}

export interface ShopifyConnection<T> {
  edges: Array<{ node: T; cursor: string }>;
  pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean };
}

export interface ShopifyMoneyV2 {
  amount: string;
  currencyCode: string;
}

export interface ShopifyImage {
  id: string;
  url: string;
  altText: string | null;
  width: number;
  height: number;
}

export interface ShopifyProductOption {
  id: string;
  name: string;
  values: string[];
}

export interface ShopifyProductVariant {
  id: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  price: ShopifyMoneyV2;
  compareAtPrice: ShopifyMoneyV2 | null;
  availableForSale: boolean;
  quantityAvailable: number | null;
  weight: number | null;
  weightUnit: string | null;
  selectedOptions: Array<{ name: string; value: string }>;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  handle: string;
  productType: string;
  tags: string[];
  vendor: string;
  featuredImage: ShopifyImage | null;
  images: ShopifyConnection<ShopifyImage>;
  variants: ShopifyConnection<ShopifyProductVariant>;
  options: ShopifyProductOption[];
  collections: ShopifyConnection<{ id: string; title: string; handle: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface ShopifyCollection {
  id: string;
  title: string;
  handle: string;
  description: string;
  image: ShopifyImage | null;
  products: ShopifyConnection<ShopifyProduct>;
}

export interface ShopifyCartLine {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    product: {
      id: string;
      title: string;
      description: string;
      featuredImage: ShopifyImage | null;
    };
    price: ShopifyMoneyV2;
  };
  cost: {
    totalAmount: ShopifyMoneyV2;
    subtotalAmount: ShopifyMoneyV2;
  };
}

export interface ShopifyDeliveryOption {
  handle: string;
  title: string;
  estimatedCost: ShopifyMoneyV2;
}

export interface ShopifyDeliveryGroup {
  id: string;
  deliveryOptions: ShopifyDeliveryOption[];
  selectedDeliveryOption: ShopifyDeliveryOption | null;
}

export interface ShopifyCart {
  id: string;
  checkoutUrl: string;
  lines: ShopifyConnection<ShopifyCartLine>;
  cost: {
    totalAmount: ShopifyMoneyV2;
    subtotalAmount: ShopifyMoneyV2;
    totalTaxAmount: ShopifyMoneyV2 | null;
  };
  buyerIdentity: {
    email: string | null;
    countryCode: string | null;
    deliveryAddressPreferences: Array<{
      address1: string | null;
      address2: string | null;
      city: string | null;
      provinceCode: string | null;
      zip: string | null;
      countryCode: string | null;
    }> | null;
  } | null;
  deliveryGroups: ShopifyConnection<ShopifyDeliveryGroup>;
  createdAt: string;
  updatedAt: string;
}
