/**
 * GenericFieldMapper — configurable field mapping for arbitrary REST API responses.
 *
 * Transforms raw JSON objects from any REST API into standard Product, Cart,
 * and Order types. Supports custom field paths (dot-notation for nested access)
 * via GenericFieldMap, with sensible fallback chains for common naming patterns.
 *
 * Usage:
 *   const mapper = new GenericFieldMapper({ product: { title: 'vehicle_name' } });
 *   const product = mapper.mapProduct(rawJson);
 */

import type {
  Product,
  ProductVariant,
  Cart,
  Order,
  Address,
  LineItem,
} from '@agentojs/core';
import type { GenericFieldMap } from './types.js';

// ─── Helpers ──────────────────────────────────────────────────────

/** Safely resolve a dot-separated path on an object: 'pricing.retail_price' → obj.pricing.retail_price */
export function getField(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/** Safe string coercion with fallback. */
function str(val: unknown, fallback = ''): string {
  if (val == null) return fallback;
  return String(val);
}

/** Safe number coercion with fallback. */
function num(val: unknown, fallback = 0): number {
  if (val == null) return fallback;
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}

/**
 * Resolve a field value from a raw object using custom fieldMap + fallback chain.
 * If fieldMap defines a mapping for the target field, try that path first.
 * Then fall back to the provided default field names.
 */
function resolve(
  obj: Record<string, unknown>,
  targetField: string,
  fieldMap: Record<string, string> | undefined,
  ...fallbacks: string[]
): unknown {
  // 1. Try custom mapping first (if defined)
  if (fieldMap?.[targetField]) {
    const val = getField(obj, fieldMap[targetField]);
    if (val !== undefined && val !== null) return val;
  }

  // 2. Try fallback chain
  for (const key of fallbacks) {
    const val = key.includes('.') ? getField(obj, key) : obj[key];
    if (val !== undefined && val !== null) return val;
  }

  return undefined;
}

// ─── Mapper ───────────────────────────────────────────────────────

export class GenericFieldMapper {
  private readonly productMap: Record<string, string> | undefined;
  private readonly cartMap: Record<string, string> | undefined;
  private readonly orderMap: Record<string, string> | undefined;

  constructor(fieldMap?: GenericFieldMap) {
    this.productMap = fieldMap?.product;
    this.cartMap = fieldMap?.cart;
    this.orderMap = fieldMap?.order;
  }

  // ─── Product ────────────────────────────────────────────────────

  mapProduct(raw: unknown): Product {
    const obj = (raw ?? {}) as Record<string, unknown>;
    const fm = this.productMap;

    const id = str(resolve(obj, 'id', fm, 'id', 'product_id', 'item_id'));
    const title = str(
      resolve(obj, 'title', fm, 'title', 'name', 'product_name', 'vehicle_name'),
    );
    const description = str(
      resolve(obj, 'description', fm, 'description', 'body_html', 'short_description'),
    );
    const handle = str(resolve(obj, 'handle', fm, 'handle', 'slug', 'sku') ?? id);
    const thumbnail =
      str(
        resolve(
          obj,
          'thumbnail',
          fm,
          'thumbnail',
          'image',
          'image_url',
          'photo_url',
          'featured_image',
        ),
        '',
      ) || null;

    const variants = this.mapVariants(obj);

    // Images
    const rawImages = (resolve(obj, 'images', fm, 'images') as unknown[]) ?? [];
    const images = Array.isArray(rawImages)
      ? rawImages.map((img, i) => ({
          id: str(
            typeof img === 'object' && img
              ? (img as Record<string, unknown>).id
              : `img-${i}`,
          ),
          url: str(
            typeof img === 'string'
              ? img
              : typeof img === 'object' && img
                ? (img as Record<string, unknown>).url ||
                  (img as Record<string, unknown>).src
                : '',
          ),
          metadata: {},
        }))
      : [];

    // Categories
    const rawCategories =
      (resolve(obj, 'categories', fm, 'categories') as unknown[]) ?? [];
    const categories = Array.isArray(rawCategories)
      ? rawCategories.map((cat) => {
          const c = (cat ?? {}) as Record<string, unknown>;
          return {
            id: str(c.id),
            name: str(c.name),
            handle: str(c.handle || c.slug),
          };
        })
      : [];

    // Tags
    const rawTags = (resolve(obj, 'tags', fm, 'tags') as unknown[]) ?? [];
    const tags = Array.isArray(rawTags)
      ? rawTags.map((tag) => {
          if (typeof tag === 'string') return { id: tag, value: tag };
          const t = (tag ?? {}) as Record<string, unknown>;
          return { id: str(t.id), value: str(t.value || t.name) };
        })
      : [];

    return {
      id,
      title,
      description,
      handle,
      thumbnail,
      images,
      variants,
      options: [],
      collection_id:
        str(resolve(obj, 'collection_id', fm, 'collection_id'), '') || null,
      categories,
      tags,
      status:
        (resolve(obj, 'status', fm, 'status') as Product['status']) ?? 'published',
      metadata: (obj.metadata as Record<string, unknown>) ?? {},
      created_at:
        str(resolve(obj, 'created_at', fm, 'created_at', 'createdAt')) ||
        new Date().toISOString(),
      updated_at:
        str(resolve(obj, 'updated_at', fm, 'updated_at', 'updatedAt')) ||
        new Date().toISOString(),
    };
  }

  private mapVariants(obj: Record<string, unknown>): ProductVariant[] {
    const fm = this.productMap;
    const rawVariants = resolve(obj, 'variants', fm, 'variants') as
      | unknown[]
      | undefined;

    if (Array.isArray(rawVariants) && rawVariants.length > 0) {
      return rawVariants.map((v) => {
        const vObj = (v ?? {}) as Record<string, unknown>;
        return this.mapSingleVariant(vObj);
      });
    }

    // No variants array — create a default variant from the product itself
    const price = num(
      resolve(obj, 'price', fm, 'price', 'msrp', 'retail_price', 'pricing.amount'),
    );
    const currency =
      str(
        resolve(
          obj,
          'currency_code',
          fm,
          'currency_code',
          'currency',
          'pricing.currency',
        ),
      ) || 'USD';

    return [
      {
        id: str(resolve(obj, 'id', fm, 'id', 'product_id', 'item_id')),
        title: 'Default',
        sku: str(resolve(obj, 'sku', fm, 'sku'), '') || null,
        barcode: null,
        prices: [
          {
            id: `price-${str(obj.id)}`,
            amount: price,
            currency_code: currency.toLowerCase(),
            min_quantity: null,
            max_quantity: null,
          },
        ],
        options: {},
        inventory_quantity: num(
          resolve(
            obj,
            'inventory_quantity',
            fm,
            'inventory_quantity',
            'stock',
            'qty',
          ),
          0,
        ),
        allow_backorder: false,
        manage_inventory: true,
        weight: null,
        length: null,
        height: null,
        width: null,
        metadata: {},
      },
    ];
  }

  private mapSingleVariant(vObj: Record<string, unknown>): ProductVariant {
    const price = num(vObj.price ?? vObj.amount ?? vObj.msrp);
    const currency = str(vObj.currency_code ?? vObj.currency) || 'USD';

    const rawPrices = vObj.prices as unknown[] | undefined;
    const prices =
      Array.isArray(rawPrices) && rawPrices.length > 0
        ? rawPrices.map((p) => {
            const pObj = (p ?? {}) as Record<string, unknown>;
            return {
              id: str(pObj.id),
              amount: num(pObj.amount),
              currency_code:
                str(pObj.currency_code) || currency.toLowerCase(),
              min_quantity:
                pObj.min_quantity != null ? num(pObj.min_quantity) : null,
              max_quantity:
                pObj.max_quantity != null ? num(pObj.max_quantity) : null,
            };
          })
        : [
            {
              id: `price-${str(vObj.id)}`,
              amount: price,
              currency_code: currency.toLowerCase(),
              min_quantity: null,
              max_quantity: null,
            },
          ];

    return {
      id: str(vObj.id || vObj.variant_id),
      title: str(vObj.title || vObj.name || 'Default'),
      sku: str(vObj.sku, '') || null,
      barcode: str(vObj.barcode, '') || null,
      prices,
      options: (vObj.options as Record<string, string>) ?? {},
      inventory_quantity: num(
        vObj.inventory_quantity ?? vObj.stock ?? vObj.qty,
        0,
      ),
      allow_backorder: Boolean(vObj.allow_backorder),
      manage_inventory: vObj.manage_inventory !== false,
      weight: vObj.weight != null ? num(vObj.weight) : null,
      length: vObj.length != null ? num(vObj.length) : null,
      height: vObj.height != null ? num(vObj.height) : null,
      width: vObj.width != null ? num(vObj.width) : null,
      metadata: (vObj.metadata as Record<string, unknown>) ?? {},
    };
  }

  // ─── Cart ───────────────────────────────────────────────────────

  mapCart(raw: unknown): Cart {
    const obj = (raw ?? {}) as Record<string, unknown>;
    const fm = this.cartMap;

    const rawItems = resolve(obj, 'items', fm, 'items', 'line_items') as
      | unknown[]
      | undefined;
    const items: LineItem[] = Array.isArray(rawItems)
      ? rawItems.map((item) => {
          const i = (item ?? {}) as Record<string, unknown>;
          return {
            id: str(i.id),
            cart_id: str(i.cart_id || obj.id),
            variant_id: str(i.variant_id),
            product_id: str(i.product_id),
            title: str(i.title || i.name),
            description: str(i.description),
            thumbnail: str(i.thumbnail, '') || null,
            quantity: num(i.quantity, 1),
            unit_price: num(i.unit_price || i.price),
            subtotal: num(i.subtotal),
            total: num(i.total || i.subtotal),
            metadata: (i.metadata as Record<string, unknown>) ?? {},
          };
        })
      : [];

    return {
      id: str(resolve(obj, 'id', fm, 'id', 'cart_id')),
      items,
      region_id: str(resolve(obj, 'region_id', fm, 'region_id'), 'default'),
      currency_code: str(
        resolve(obj, 'currency_code', fm, 'currency_code', 'currency'),
        'usd',
      ),
      subtotal: num(resolve(obj, 'subtotal', fm, 'subtotal')),
      tax_total: num(resolve(obj, 'tax_total', fm, 'tax_total', 'tax')),
      shipping_total: num(
        resolve(obj, 'shipping_total', fm, 'shipping_total', 'shipping'),
      ),
      discount_total: num(
        resolve(obj, 'discount_total', fm, 'discount_total', 'discount'),
      ),
      total: num(resolve(obj, 'total', fm, 'total')),
      shipping_address: this.mapAddress(
        resolve(obj, 'shipping_address', fm, 'shipping_address'),
      ),
      billing_address: this.mapAddress(
        resolve(obj, 'billing_address', fm, 'billing_address'),
      ),
      email: str(resolve(obj, 'email', fm, 'email'), '') || null,
      shipping_methods: [],
      payment_sessions: [],
      metadata: (obj.metadata as Record<string, unknown>) ?? {},
      created_at:
        str(resolve(obj, 'created_at', fm, 'created_at', 'createdAt')) ||
        new Date().toISOString(),
      updated_at:
        str(resolve(obj, 'updated_at', fm, 'updated_at', 'updatedAt')) ||
        new Date().toISOString(),
    };
  }

  // ─── Order ──────────────────────────────────────────────────────

  mapOrder(raw: unknown): Order {
    const obj = (raw ?? {}) as Record<string, unknown>;
    const fm = this.orderMap;

    const rawItems = resolve(obj, 'items', fm, 'items', 'line_items') as
      | unknown[]
      | undefined;
    const items: LineItem[] = Array.isArray(rawItems)
      ? rawItems.map((item) => {
          const i = (item ?? {}) as Record<string, unknown>;
          return {
            id: str(i.id),
            cart_id: str(i.cart_id),
            variant_id: str(i.variant_id),
            product_id: str(i.product_id),
            title: str(i.title || i.name),
            description: str(i.description),
            thumbnail: str(i.thumbnail, '') || null,
            quantity: num(i.quantity, 1),
            unit_price: num(i.unit_price || i.price),
            subtotal: num(i.subtotal),
            total: num(i.total || i.subtotal),
            metadata: (i.metadata as Record<string, unknown>) ?? {},
          };
        })
      : [];

    return {
      id: str(resolve(obj, 'id', fm, 'id', 'order_id')),
      display_id: num(
        resolve(obj, 'display_id', fm, 'display_id', 'order_number'),
        0,
      ),
      status:
        (resolve(obj, 'status', fm, 'status') as Order['status']) ?? 'pending',
      fulfillment_status:
        (resolve(
          obj,
          'fulfillment_status',
          fm,
          'fulfillment_status',
        ) as Order['fulfillment_status']) ?? 'not_fulfilled',
      payment_status:
        (resolve(
          obj,
          'payment_status',
          fm,
          'payment_status',
        ) as Order['payment_status']) ?? 'not_paid',
      items,
      currency_code: str(
        resolve(obj, 'currency_code', fm, 'currency_code', 'currency'),
        'usd',
      ),
      subtotal: num(resolve(obj, 'subtotal', fm, 'subtotal')),
      tax_total: num(resolve(obj, 'tax_total', fm, 'tax_total', 'tax')),
      shipping_total: num(
        resolve(obj, 'shipping_total', fm, 'shipping_total', 'shipping'),
      ),
      total: num(resolve(obj, 'total', fm, 'total')),
      email: str(resolve(obj, 'email', fm, 'email')),
      shipping_address: this.mapAddress(
        resolve(obj, 'shipping_address', fm, 'shipping_address'),
      ) ?? {
        first_name: '',
        last_name: '',
        address_1: '',
        address_2: null,
        city: '',
        province: null,
        postal_code: '',
        country_code: '',
        phone: null,
      },
      fulfillments: [],
      created_at:
        str(resolve(obj, 'created_at', fm, 'created_at', 'createdAt')) ||
        new Date().toISOString(),
      updated_at:
        str(resolve(obj, 'updated_at', fm, 'updated_at', 'updatedAt')) ||
        new Date().toISOString(),
    };
  }

  // ─── Address ────────────────────────────────────────────────────

  mapAddress(raw: unknown): Address | null {
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Record<string, unknown>;
    return {
      first_name: str(obj.first_name || obj.firstName),
      last_name: str(obj.last_name || obj.lastName),
      address_1: str(obj.address_1 || obj.address || obj.line_one),
      address_2: str(obj.address_2 || obj.line_two, '') || null,
      city: str(obj.city),
      province: str(obj.province || obj.state, '') || null,
      postal_code: str(obj.postal_code || obj.zip || obj.zipcode),
      country_code: str(obj.country_code || obj.country),
      phone: str(obj.phone || obj.phone_number, '') || null,
    };
  }
}
