import type { Locale } from '@/i18n/locales';

export async function loadBookTitle(
  id: string,
  chapter: number,
  locale: Locale,
): Promise<string | null> {
  const [{ getBook }, { localizedBookName }] = await Promise.all([
    import('@/features/books/data'),
    import('@/data/compendium/sources'),
  ]);
  const book = getBook(id);
  return book && chapter < book.contents.length ? localizedBookName(book, locale) : null;
}
