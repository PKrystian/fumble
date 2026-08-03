import { useEffect } from 'react';
import { translate, useT } from '@/i18n/useT';
import { setDocumentTitle, setMetaContent, setMetaDescription } from './head';

const SITE_NAME = 'Fumble';

export function useSeo(title: string, description?: string, indexable = true): void {
  const { locale } = useT();
  useEffect(() => {
    const fullTitle = title === SITE_NAME ? SITE_NAME : `${title} - ${SITE_NAME}`;
    const fullDescription = description || translate(locale, 'seo.defaultDescription');
    setDocumentTitle(fullTitle);
    setMetaDescription(fullDescription);
    setMetaContent('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMetaContent(
      'meta[property="og:description"]',
      'property',
      'og:description',
      fullDescription,
    );
    setMetaContent('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
    setMetaContent(
      'meta[name="twitter:description"]',
      'name',
      'twitter:description',
      fullDescription,
    );
    setMetaContent(
      'meta[name="robots"]',
      'name',
      'robots',
      indexable ? 'index, follow' : 'noindex, nofollow',
    );
  }, [title, description, indexable, locale]);
}
