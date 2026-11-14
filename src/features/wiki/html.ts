import DOMPurify from 'dompurify';
import { translate } from '@/i18n/translate';
import { prepareWikiRoot } from './content';
import type { Locale } from '@/i18n/locales';

function prepareWikiImages(html: string): string {
  let first = true;
  return html.replace(/<img\b([^>]*)>/gi, (_, attributes: string) => {
    const loading = /\bloading\s*=/.test(attributes)
      ? ''
      : ` loading="${first ? 'eager' : 'lazy'}"`;
    const priority =
      first && !/\bfetchpriority\s*=/.test(attributes) ? ' fetchpriority="high"' : '';
    const decoding = /\bdecoding\s*=/.test(attributes) ? '' : ' decoding="async"';
    first = false;
    return `<img${attributes}${loading}${priority}${decoding}>`;
  });
}

export function sanitizeWikiHtml(
  html: string,
  imageLabel = translate('en', 'common.imageViewer'),
  locale: Locale = 'en',
  search = '',
): string {
  const root = document.createElement('div');
  root.innerHTML = DOMPurify.sanitize(prepareWikiImages(html), {
    ADD_ATTR: ['target', 'loading', 'fetchpriority', 'decoding'],
  });
  prepareWikiRoot(
    root,
    locale,
    {
      image: imageLabel,
      table: translate(locale, 'wiki.tableScroll'),
      locked: translate(locale, 'wiki.notYetUnlocked'),
      empty: translate(locale, 'wiki.emptyPage'),
    },
    import.meta.env.BASE_URL,
    search,
  );
  return root.innerHTML;
}
