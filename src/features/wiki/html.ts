import DOMPurify from 'dompurify';

export function sanitizeWikiHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['target'],
  });
}
