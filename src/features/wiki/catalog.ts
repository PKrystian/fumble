import { normalizeSearchText } from '@/data/compendium/searchText';
import type { Locale } from '@/i18n/locales';
import type { WikiPage } from './types';
import { wikiText } from './content';
import { isWikiPageIndexable } from './indexability';

export const WIKI_PAGE_SIZE = 50;

export function wikiCatalog(
  pages: WikiPage[],
  locale: Locale,
  query: string,
  category: string,
  uncategorized = false,
) {
  const term = normalizeSearchText(query.trim());
  return pages
    .filter(isWikiPageIndexable)
    .filter(
      (page) =>
        (!category || page.category === category) &&
        (!uncategorized || !page.category) &&
        (!term ||
          normalizeSearchText(`${page.title} ${wikiText(page.html)}`).includes(term)),
    )
    .sort(
      (a, b) =>
        a.category.localeCompare(b.category, locale) ||
        a.title.localeCompare(b.title, locale) ||
        a.slug.localeCompare(b.slug),
    );
}

export function wikiPageCount(count: number, locale: Locale): string {
  return `wiki.pageCount.${new Intl.PluralRules(locale).select(count)}`;
}
