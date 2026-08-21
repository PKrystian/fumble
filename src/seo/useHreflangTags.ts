import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from '@/i18n/locales';
import { localizePath, stripLocale } from '@/i18n/pathUtils';
import {
  removeCanonical,
  removeHreflangAlternates,
  removeMeta,
  setCanonical,
  setHreflangAlternates,
  setMetaContent,
} from './head';

export const SITE_URL = 'https://fumble.krystianpinczak.com';
const DEFAULT_ALTERNATE_LOCALES = SUPPORTED_LOCALES.map(({ code }) => code);

export function useHreflangTags(
  enabled = true,
  alternateLocales: readonly Locale[] = DEFAULT_ALTERNATE_LOCALES,
): void {
  const location = useLocation();

  useEffect(() => {
    if (!enabled) {
      removeCanonical();
      removeHreflangAlternates();
      removeMeta('meta[property="og:url"]');
      return;
    }
    const { rest } = stripLocale(location.pathname);
    const canonicalLocale = stripLocale(location.pathname).locale;
    const canonical = `${SITE_URL}${localizePath(rest, canonicalLocale)}`;
    setCanonical(canonical);
    setMetaContent('meta[property="og:url"]', 'property', 'og:url', canonical);
    setHreflangAlternates([
      ...alternateLocales.map((locale) => ({
        hreflang: locale,
        href: `${SITE_URL}${localizePath(rest, locale)}`,
      })),
      ...(alternateLocales.includes(DEFAULT_LOCALE)
        ? [
            {
              hreflang: 'x-default',
              href: `${SITE_URL}${localizePath(rest, DEFAULT_LOCALE)}`,
            },
          ]
        : []),
    ]);
  }, [alternateLocales, enabled, location.pathname]);
}
