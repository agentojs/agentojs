import { describe, it, expect } from 'vitest';
import { formatPrice, toMinorUnits, fromMinorUnits, getCurrencyDecimals } from '../currency.js';

describe('currency utilities', () => {
  describe('getCurrencyDecimals', () => {
    it('returns 0 for JPY', () => {
      expect(getCurrencyDecimals('jpy')).toBe(0);
    });

    it('returns 0 for KRW', () => {
      expect(getCurrencyDecimals('KRW')).toBe(0);
    });

    it('returns 3 for BHD', () => {
      expect(getCurrencyDecimals('bhd')).toBe(3);
    });

    it('returns 2 for USD', () => {
      expect(getCurrencyDecimals('usd')).toBe(2);
    });

    it('returns 2 for EUR', () => {
      expect(getCurrencyDecimals('eur')).toBe(2);
    });
  });

  describe('formatPrice', () => {
    it('formats USD cents correctly', () => {
      expect(formatPrice(1999, 'usd')).toBe('1,999.00 USD');
    });

    it('formats zero-decimal currency (JPY)', () => {
      expect(formatPrice(500, 'jpy')).toBe('500 JPY');
    });

    it('returns dash for null amount', () => {
      expect(formatPrice(null, 'usd')).toBe('—');
    });

    it('returns dash for undefined currency', () => {
      expect(formatPrice(100, undefined)).toBe('—');
    });

    it('returns dash for both null', () => {
      expect(formatPrice(null, null)).toBe('—');
    });
  });

  describe('toMinorUnits', () => {
    it('converts USD to cents', () => {
      expect(toMinorUnits(19.99, 'usd')).toBe(1999);
    });

    it('passes JPY through unchanged', () => {
      expect(toMinorUnits(500, 'jpy')).toBe(500);
    });

    it('converts BHD (3 decimals)', () => {
      expect(toMinorUnits(1.234, 'bhd')).toBe(1234);
    });

    it('rounds correctly', () => {
      expect(toMinorUnits(19.999, 'usd')).toBe(2000);
    });
  });

  describe('fromMinorUnits', () => {
    it('converts cents to USD', () => {
      expect(fromMinorUnits(1999, 'usd')).toBe(19.99);
    });

    it('passes JPY through unchanged', () => {
      expect(fromMinorUnits(500, 'jpy')).toBe(500);
    });

    it('converts BHD (3 decimals)', () => {
      expect(fromMinorUnits(1234, 'bhd')).toBe(1.234);
    });
  });
});
