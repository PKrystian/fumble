import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/i18n/locales';
import { localizePath, stripLocale } from '@/i18n/path';
import { setCanonical, setHreflangAlternates } from './head';

export const SITE_URL = 'https://pkrystian.github.io/fumble';

export function useHreflangTags(): void {
  const location = useLocation();

  useEffect(() => {
    const { rest } = stripLocale(location.pathname);
    const canonicalLocale = stripLocale(location.pathname).locale;
    setCanonical(`${SITE_URL}${localizePath(rest, canonicalLocale)}`);
    setHreflangAlternates([
      ...SUPPORTED_LOCALES.map((l) => ({
        hreflang: l.code,
        href: `${SITE_URL}${localizePath(rest, l.code)}`,
      })),
      { hreflang: 'x-default', href: `${SITE_URL}${localizePath(rest, DEFAULT_LOCALE)}` },
    ]);
  }, [location.pathname]);
}
