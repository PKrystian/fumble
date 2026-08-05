import DOMPurify from 'dompurify';

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

export function sanitizeWikiHtml(html: string): string {
  return DOMPurify.sanitize(prepareWikiImages(html), {
    ADD_ATTR: ['target', 'loading', 'fetchpriority', 'decoding'],
  });
}
