import type { Product, ProductVariant } from '@agentojs/core';
import type { StoreInfo } from '@agentojs/core';
import type { AcpFeedItem } from './types.js';

interface CachedFeed {
  data: AcpFeedItem[];
  cachedAt: number;
}

const FEED_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Builds ACP product feed items from a product list.
 * Includes in-memory caching with 5-minute TTL keyed by store slug.
 */
export class AcpFeedBuilder {
  private readonly feedCache = new Map<string, CachedFeed>();

  /**
   * Gets cached feed for a store slug, or null if expired/missing.
   */
  getCached(storeSlug: string): AcpFeedItem[] | null {
    const cached = this.feedCache.get(storeSlug);
    if (cached && Date.now() - cached.cachedAt < FEED_CACHE_TTL_MS) {
      return cached.data;
    }
    return null;
  }

  /**
   * Caches feed items for a store slug.
   */
  cache(storeSlug: string, items: AcpFeedItem[]): void {
    this.feedCache.set(storeSlug, { data: items, cachedAt: Date.now() });
  }

  /**
   * Clears the feed cache for a specific store or all stores.
   */
  clearCache(storeSlug?: string): void {
    if (storeSlug) {
      this.feedCache.delete(storeSlug);
    } else {
      this.feedCache.clear();
    }
  }
}

/**
 * Transforms Product[] to ACP feed items.
 * Each variant becomes a separate feed item with group_id linking to the parent product.
 */
export function buildFeedItems(
  products: Product[],
  store: StoreInfo,
): AcpFeedItem[] {
  const items: AcpFeedItem[] = [];
  const currency = store.currency?.toUpperCase() || 'USD';
  const country = store.country?.toUpperCase() || 'US';
  const sellerUrl = store.backendUrl || '';

  for (const product of products) {
    if (product.status !== 'published') continue;

    const hasVariants = product.variants.length > 1;

    if (product.variants.length === 0) {
      items.push(
        buildSingleItem(product, null, store, currency, country, sellerUrl, false),
      );
      continue;
    }

    for (const variant of product.variants) {
      items.push(
        buildSingleItem(product, variant, store, currency, country, sellerUrl, hasVariants),
      );
    }
  }

  return items;
}

function buildSingleItem(
  product: Product,
  variant: ProductVariant | null,
  store: StoreInfo,
  currency: string,
  country: string,
  sellerUrl: string,
  hasVariations: boolean,
): AcpFeedItem {
  const variantId = variant?.id || product.id;
  const price = resolvePrice(variant, currency);
  const inStock = variant
    ? !variant.manage_inventory || variant.inventory_quantity > 0 || variant.allow_backorder
    : true;

  const item: AcpFeedItem = {
    item_id: variantId,
    title: hasVariations && variant
      ? `${product.title} - ${variant.title}`
      : product.title,
    description: product.description || '',
    url: sellerUrl ? `${sellerUrl}/products/${product.handle || product.id}` : '',
    brand: '',
    availability: inStock ? 'in_stock' : 'out_of_stock',
    price: { amount: price, currency },
    image_url: product.thumbnail || '',
    target_countries: [country],
    store_country: country,
    seller_name: store.name,
    seller_url: sellerUrl,
    is_eligible_search: inStock,
    is_eligible_checkout: inStock,
  };

  if (hasVariations && variant) {
    item.group_id = product.id;
    item.listing_has_variations = true;
    if (variant.options && Object.keys(variant.options).length > 0) {
      item.variant_dict = variant.options as Record<string, string>;
    }
  }

  return item;
}

function resolvePrice(
  variant: ProductVariant | null,
  currency: string,
): number {
  if (!variant || !variant.prices || variant.prices.length === 0) return 0;

  const lowerCurrency = currency.toLowerCase();
  const match = variant.prices.find(
    (p) => p.currency_code?.toLowerCase() === lowerCurrency,
  );
  if (match) return match.amount;

  return variant.prices[0].amount;
}
