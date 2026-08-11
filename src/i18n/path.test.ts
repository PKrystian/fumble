import { describe, expect, it } from 'vitest';
import { localizePath, stripLocale } from './pathUtils';
import { rememberedLocaleTarget } from './localeTarget';

describe('stripLocale', () => {
  it('treats a root path as English with no prefix', () => {
    expect(stripLocale('/')).toEqual({ locale: 'en', rest: '/' });
    expect(stripLocale('')).toEqual({ locale: 'en', rest: '/' });
  });

  it('treats an unprefixed path as English', () => {
    expect(stripLocale('/compendium/spells/fireball')).toEqual({
      locale: 'en',
      rest: '/compendium/spells/fireball',
    });
  });

  it('strips a locale prefix and keeps the rest', () => {
    expect(stripLocale('/pl/compendium/spells/fireball')).toEqual({
      locale: 'pl',
      rest: '/compendium/spells/fireball',
    });
  });

  it('treats the bare locale prefix as its root', () => {
    expect(stripLocale('/pl')).toEqual({ locale: 'pl', rest: '/' });
  });

  it('handles a trailing slash on the bare locale prefix', () => {
    expect(stripLocale('/pl/')).toEqual({ locale: 'pl', rest: '/' });
  });

  it('does not false-positive on a path that merely starts with the locale code', () => {
    expect(stripLocale('/players')).toEqual({ locale: 'en', rest: '/players' });
  });
});

describe('localizePath', () => {
  it('leaves English paths unprefixed', () => {
    expect(localizePath('/compendium/spells', 'en')).toBe('/compendium/spells/');
  });

  it('prefixes non-English locales', () => {
    expect(localizePath('/compendium/spells', 'pl')).toBe('/pl/compendium/spells/');
  });

  it('maps root to the bare locale prefix', () => {
    expect(localizePath('/', 'pl')).toBe('/pl/');
  });

  it('adds a leading slash if missing', () => {
    expect(localizePath('character', 'pl')).toBe('/pl/character/');
  });
});

describe('rememberedLocaleTarget', () => {
  it('localizes the English root while preserving search and hash', () => {
    expect(rememberedLocaleTarget('/', '?from=bookmark', '#top', 'pl')).toBe(
      '/pl/?from=bookmark#top',
    );
  });

  it('localizes every English path while preserving search and hash', () => {
    expect(
      rememberedLocaleTarget(
        '/compendium/bestiary/azaka-stormfang/',
        '?page=2',
        '#actions',
        'pl',
      ),
    ).toBe('/pl/compendium/bestiary/azaka-stormfang/?page=2#actions');
  });

  it('leaves explicit and default locale paths unchanged', () => {
    expect(rememberedLocaleTarget('/pl/', '', '', 'pl')).toBeNull();
    expect(rememberedLocaleTarget('/pl/compendium/', '', '', 'pl')).toBeNull();
    expect(rememberedLocaleTarget('/compendium/', '', '', 'en')).toBeNull();
    expect(rememberedLocaleTarget('/', '', '', 'en')).toBeNull();
  });
});

describe('stripLocale + localizePath round-trip', () => {
  it('recovers the original path after stripping and re-localizing to the same locale', () => {
    const original = '/pl/books/xphb/2/';
    const { locale, rest } = stripLocale(original);
    expect(localizePath(rest, locale)).toBe(original);
  });

  it('switches locale while preserving the rest of the path', () => {
    const { rest } = stripLocale('/pl/compendium/conditions/blinded');
    expect(localizePath(rest, 'en')).toBe('/compendium/conditions/blinded/');
  });
});
