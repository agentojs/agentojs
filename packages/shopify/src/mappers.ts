/**
 * Mappers — convert Shopify Storefront API types to @agentojs/core types.
 */

import type {
  Product,
  ProductVariant,
  ProductImage,
  ProductOption,
  Collection,
  Cart,
  LineItem,
  ShippingOption,
} from '@agentojs/core';

import type {
  ShopifyProduct,
  ShopifyProductVariant,
  ShopifyImage,
  ShopifyProductOption,
  ShopifyCollection,
  ShopifyCart,
  ShopifyCartLine,
  ShopifyDeliveryOption,
  ShopifyMoneyV2,
} from './types.js';

/** Convert Shopify money string to integer cents. */
function toCents(money: ShopifyMoneyV2): number {
  return Math.round(parseFloat(money.amount) * 100);
}

export function mapImage(img: ShopifyImage): ProductImage {
  return {
    id: img.id,
    url: img.url,
    metadata: { altText: img.altText, width: img.width, height: img.height },
  };
}

export function mapOption(opt: ShopifyProductOption): ProductOption {
  return {
    id: opt.id,
    title: opt.name,
    values: opt.values,
  };
}

export function mapVariant(v: ShopifyProductVariant): ProductVariant {
  const options: Record<string, string> = {};
  for (const opt of v.selectedOptions) {
    options[opt.name] = opt.value;
  }

  return {
    id: v.id,
    title: v.title,
    sku: v.sku,
    barcode: v.barcode,
    prices: [
      {
        id: v.id,
        amount: toCents(v.price),
        currency_code: v.price.currencyCode.toLowerCase(),
        min_quantity: null,
        max_quantity: null,
      },
    ],
    options,
    inventory_quantity: v.quantityAvailable ?? 0,
    allow_backorder: false,
    manage_inventory: true,
    weight: v.weight,
    length: null,
    height: null,
    width: null,
    metadata: { availableForSale: v.availableForSale },
  };
}

export function mapProduct(p: ShopifyProduct): Product {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    handle: p.handle,
    thumbnail: p.featuredImage?.url ?? null,
    images: p.images.edges.map((e) => mapImage(e.node)),
    variants: p.variants.edges.map((e) => mapVariant(e.node)),
    options: p.options.map(mapOption),
    collection_id: p.collections.edges[0]?.node.id ?? null,
    categories: [],
    tags: p.tags.map((t, i) => ({ id: `tag_${i}`, value: t })),
    status: 'published',
    metadata: { vendor: p.vendor, productType: p.productType },
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

export function mapCollection(c: ShopifyCollection): Collection {
  return {
    id: c.id,
    title: c.title,
    handle: c.handle,
    products: c.products?.edges?.map((e) => mapProduct(e.node)) ?? [],
  };
}

export function mapLineItem(line: ShopifyCartLine, cartId: string): LineItem {
  return {
    id: line.id,
    cart_id: cartId,
    variant_id: line.merchandise.id,
    product_id: line.merchandise.product.id,
    title: line.merchandise.product.title,
    description: line.merchandise.product.description,
    thumbnail: line.merchandise.product.featuredImage?.url ?? null,
    quantity: line.quantity,
    unit_price: toCents(line.merchandise.price),
    subtotal: toCents(line.cost.subtotalAmount),
    total: toCents(line.cost.totalAmount),
    metadata: {},
  };
}

export function mapCart(c: ShopifyCart): Cart {
  const items = c.lines.edges.map((e) => mapLineItem(e.node, c.id));
  const addr = c.buyerIdentity?.deliveryAddressPreferences?.[0];

  return {
    id: c.id,
    items,
    region_id: c.buyerIdentity?.countryCode ?? '',
    currency_code: c.cost.totalAmount.currencyCode.toLowerCase(),
    subtotal: toCents(c.cost.subtotalAmount),
    tax_total: c.cost.totalTaxAmount ? toCents(c.cost.totalTaxAmount) : 0,
    shipping_total: 0,
    discount_total: 0,
    total: toCents(c.cost.totalAmount),
    shipping_address: addr
      ? {
          first_name: '',
          last_name: '',
          address_1: addr.address1 ?? '',
          address_2: addr.address2 ?? null,
          city: addr.city ?? '',
          province: addr.provinceCode ?? null,
          postal_code: addr.zip ?? '',
          country_code: addr.countryCode ?? '',
          phone: null,
        }
      : null,
    billing_address: null,
    email: c.buyerIdentity?.email ?? null,
    shipping_methods: [],
    payment_sessions: [],
    metadata: { checkoutUrl: c.checkoutUrl },
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

export function mapDeliveryOption(opt: ShopifyDeliveryOption): ShippingOption {
  return {
    id: opt.handle,
    name: opt.title,
    amount: toCents(opt.estimatedCost),
    region_id: '',
  };
}
