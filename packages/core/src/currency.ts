/**
 * ISO 4217 currency formatting utilities.
 *
 * Prices in minor units (e.g., cents for USD, øre for NOK).
 * This utility converts to the main unit and formats for display.
 */

const ZERO_DECIMAL = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW',
  'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

const THREE_DECIMAL = new Set([
  'BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND',
]);

export function getCurrencyDecimals(currencyCode: string): number {
  const upper = currencyCode.toUpperCase();
  if (ZERO_DECIMAL.has(upper)) return 0;
  if (THREE_DECIMAL.has(upper)) return 3;
  return 2;
}

/**
 * Converts a major-unit amount to minor units (e.g., 23.85 USD → 2385).
 * Zero-decimal currencies (JPY, KRW) pass through unchanged.
 */
export function toMinorUnits(amount: number, currency: string): number {
  const decimals = getCurrencyDecimals(currency);
  if (decimals === 0) return amount;
  return Math.round(amount * 10 ** decimals);
}

/**
 * Converts minor units back to major units (e.g., 2385 → 23.85 USD).
 * Zero-decimal currencies pass through unchanged.
 */
export function fromMinorUnits(amount: number, currency: string): number {
  const decimals = getCurrencyDecimals(currency);
  if (decimals === 0) return amount;
  return amount / 10 ** decimals;
}

export function formatPrice(
  amount: number | undefined | null,
  currencyCode: string | undefined | null,
): string {
  if (amount == null || currencyCode == null) return '—';
  const decimals = getCurrencyDecimals(currencyCode);
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${formatted} ${currencyCode.toUpperCase()}`;
}
