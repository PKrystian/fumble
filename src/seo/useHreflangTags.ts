import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/i18n/locales';
import { localizePath, stripLocale } from '@/i18n/path';
import { setCanonical, setHreflangAlternates, setMetaContent } from './head';

export const SITE_URL = 'https://fumble.krystianpinczak.com';

export function useHreflangTags(): void {
  const location = useLocation();

  useEffect(() => {
    const { rest } = stripLocale(location.pathname);
    const canonicalLocale = stripLocale(location.pathname).locale;
    const canonical = `${SITE_URL}${localizePath(rest, canonicalLocale)}`;
    setCanonical(canonical);
    setMetaContent('meta[property="og:url"]', 'property', 'og:url', canonical);
    setHreflangAlternates([
      ...SUPPORTED_LOCALES.map((l) => ({
        hreflang: l.code,
        href: `${SITE_URL}${localizePath(rest, l.code)}`,
      })),
      { hreflang: 'x-default', href: `${SITE_URL}${localizePath(rest, DEFAULT_LOCALE)}` },
    ]);
  }, [location.pathname]);
}
