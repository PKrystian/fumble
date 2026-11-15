import { describe, expect, it, vi } from 'vitest';
import { loadBookTitle } from './bookTitle';

vi.mock('@/features/books/data', () => ({
  getBook: (id: string) =>
    id === 'phb' ? { id, name: 'Handbook', contents: [{}, {}] } : undefined,
}));
vi.mock('@/data/compendium/sources', () => ({
  localizedBookName: (book: { name: string }, locale: string) => `${book.name} ${locale}`,
}));

describe('loadBookTitle', () => {
  it('returns the localized title of a stored chapter', async () => {
    await expect(loadBookTitle('phb', 1, 'pl')).resolves.toBe('Handbook pl');
  });

  it('rejects unknown books and chapters outside the book', async () => {
    await expect(loadBookTitle('missing', 0, 'en')).resolves.toBeNull();
    await expect(loadBookTitle('phb', 2, 'en')).resolves.toBeNull();
  });
});
