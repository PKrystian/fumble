import { describe, expect, it } from 'vitest';
import { isLocale } from './locales';

describe('isLocale', () => {
  it('accepts supported locale codes', () => {
    expect(isLocale('en')).toBe(true);
    expect(isLocale('pl')).toBe(true);
  });

  it('rejects unsupported values', () => {
    expect(isLocale('de')).toBe(false);
    expect(isLocale('')).toBe(false);
  });
});
