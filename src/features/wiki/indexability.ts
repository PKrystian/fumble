import type { Locale } from '@/i18n/locales';

export const WIKI_CONTENT_LOCALE: Locale = 'pl';

export function isWikiPageIndexable(page: { html?: string | null }): boolean {
  const text = (page.html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
  return Boolean(text) && text !== 'nothing here' && text !== 'brak treści';
}
