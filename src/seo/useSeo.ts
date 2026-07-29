import { useEffect } from 'react';
import { setDocumentTitle, setMetaContent, setMetaDescription } from './head';

const SITE_NAME = 'Fumble';
const DEFAULT_DESCRIPTION =
  'Free, no-login Dungeons & Dragons 2024 toolkit with character sheets, compendium, dice, DM tools, books, and a campaign wiki.';

export function useSeo(title: string, description?: string, indexable = true): void {
  useEffect(() => {
    const fullTitle = `${title} - ${SITE_NAME}`;
    const fullDescription = description || DEFAULT_DESCRIPTION;
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
  }, [title, description, indexable]);
}
