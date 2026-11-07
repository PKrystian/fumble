import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { translate, useT } from '@/i18n/useT';
import { SUPPORTED_LOCALES, type Locale } from '@/i18n/locales';
import {
  clipMetaDescription,
  removeStructuredData,
  setDocumentTitle,
  setMetaContent,
  setMetaDescription,
  setStructuredData,
} from './head';
import { SITE_URL, useHreflangTags } from './useHreflangTags';
import { localizePath, stripLocale } from '@/i18n/pathUtils';
import { isSearchVariant } from './queryRobots';

const SITE_NAME = 'Fumble';
const DEFAULT_ALTERNATE_LOCALES = SUPPORTED_LOCALES.map(({ code }) => code);

export function useSeo(
  title: string,
  description?: string,
  indexable: boolean | 'pending' = true,
  alternateLocales: readonly Locale[] = DEFAULT_ALTERNATE_LOCALES,
  canonicalPath?: string,
): void {
  const { locale } = useT();
  const location = useLocation();
  const searchVariant = isSearchVariant(location.pathname, location.search);
  const allowIndexing = indexable === true || canonicalPath !== undefined;
  useHreflangTags(
    indexable === 'pending' ? 'pending' : allowIndexing && !searchVariant,
    alternateLocales,
    canonicalPath,
  );
  useEffect(() => {
    if (indexable === 'pending') return;
    const fullTitle = title === SITE_NAME ? SITE_NAME : `${title} - ${SITE_NAME}`;
    const fullDescription = clipMetaDescription(
      description || translate(locale, 'seo.defaultDescription'),
    );
    const robots = allowIndexing
      ? searchVariant
        ? 'noindex, follow'
        : 'index, follow'
      : 'noindex, nofollow';
    setDocumentTitle(fullTitle);
    setMetaDescription(fullDescription);
    setMetaContent('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMetaContent(
      'meta[property="og:description"]',
      'property',
      'og:description',
      fullDescription,
    );
    setMetaContent(
      'meta[property="og:locale"]',
      'property',
      'og:locale',
      locale === 'pl' ? 'pl_PL' : 'en_US',
    );
    setMetaContent('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
    setMetaContent(
      'meta[name="twitter:description"]',
      'name',
      'twitter:description',
      fullDescription,
    );
    setMetaContent(
      'meta[property="og:image:alt"]',
      'property',
      'og:image:alt',
      fullTitle,
    );
    setMetaContent(
      'meta[name="twitter:image:alt"]',
      'name',
      'twitter:image:alt',
      fullTitle,
    );
    setMetaContent('meta[name="robots"]', 'name', 'robots', robots);

    if (!indexable || searchVariant || canonicalPath) {
      removeStructuredData();
      return;
    }

    const canonical = `${SITE_URL}${localizePath(stripLocale(location.pathname).rest, locale)}`;
    if (
      document.getElementById('fumble-seo-structured-data')?.dataset.prerenderedUrl ===
      canonical
    )
      return;
    const webPage = {
      '@type': 'WebPage',
      '@id': canonical,
      url: canonical,
      name: fullTitle,
      description: fullDescription,
      inLanguage: locale,
    };
    const graph: Record<string, unknown>[] = [webPage];
    if (stripLocale(location.pathname).rest === '/') {
      graph.unshift({
        '@type': 'WebSite',
        '@id': `${canonical}#website`,
        name: SITE_NAME,
        url: canonical,
        inLanguage: locale,
      });
      graph.push({
        '@type': 'SoftwareApplication',
        '@id': `${canonical}#application`,
        name: SITE_NAME,
        url: canonical,
        applicationCategory: 'GameApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        description: fullDescription,
      });
    }
    setStructuredData({ '@context': 'https://schema.org', '@graph': graph });
  }, [
    title,
    description,
    indexable,
    locale,
    location.pathname,
    searchVariant,
    allowIndexing,
    canonicalPath,
  ]);
}
