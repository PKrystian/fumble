import DOMPurify from 'dompurify';
import { translate } from '@/i18n/translate';

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
): string {
  const root = document.createElement('div');
  root.innerHTML = DOMPurify.sanitize(prepareWikiImages(html), {
    ADD_ATTR: ['target', 'loading', 'fetchpriority', 'decoding'],
  });
  for (const image of root.querySelectorAll('img')) {
    if (image.closest('a')) continue;
    const link = document.createElement('a');
    link.href = image.getAttribute('src') ?? '';
    link.className = 'artwork-trigger';
    link.dataset.imageViewer = '';
    link.setAttribute('aria-label', image.alt || imageLabel);
    image.replaceWith(link);
    link.append(image);
  }
  return root.innerHTML;
}
