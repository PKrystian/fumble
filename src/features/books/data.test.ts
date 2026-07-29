import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BookIndexEntry } from '@/data/compendium/types';
import { adventures, books, buildOutline, getBook, loadBookData } from './data';

const book = (id: string): BookIndexEntry =>
  ({
    id,
    name: 'Test Book',
    source: 'TEST',
    type: 'book',
  }) as BookIndexEntry;

describe('book data', () => {
  afterEach(() => vi.restoreAllMocks());

  it('separates books and adventures and finds entries', () => {
    expect(books.length).toBeGreaterThan(0);
    expect(adventures.length).toBeGreaterThan(0);
    expect(getBook(books[0]!.id)).toEqual(books[0]);
    expect(getBook('missing-book')).toBeUndefined();
  });

  it('builds a bounded section outline', () => {
    const entries = [
      'text',
      {
        type: 'section',
        name: 'Chapter',
        entries: [
          {
            type: 'entries',
            name: 'Topic',
            entries: [{ type: 'section', name: 'Too deep', entries: [] }],
          },
        ],
      },
      { type: 'table', caption: 'Ignored', rows: [] },
    ];
    expect(buildOutline(entries)).toEqual([
      { name: 'Chapter', children: [{ name: 'Topic', children: [] }] },
    ]);
    expect(buildOutline(undefined)).toEqual([]);
    expect(buildOutline(entries, 0)).toEqual([]);
  });

  it('loads English chapters and caches requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ type: 'section', name: 'Chapter' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const entry = book('coverage-english');
    const first = loadBookData(entry, 'en');
    const second = loadBookData(entry, 'en');
    expect(second).toBe(first);
    await expect(first).resolves.toEqual([{ type: 'section', name: 'Chapter' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('merges localized overlays recursively', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: 'chapter',
                type: 'section',
                name: 'Chapter',
                entries: [{ id: 'topic', type: 'entries', name: 'Topic', entries: [] }],
              },
            ],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              '0:chapter': { name: 'Rozdział' },
              '0:topic': { name: 'Temat' },
            },
          }),
      });
    vi.stubGlobal('fetch', fetchMock);
    await expect(loadBookData(book('coverage-polish'), 'pl')).resolves.toMatchObject([
      {
        name: 'Rozdział',
        entries: [{ name: 'Temat' }],
      },
    ]);
  });

  it('falls back when an overlay cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: ['Chapter'] }),
        })
        .mockRejectedValueOnce(new Error('offline')),
    );
    await expect(loadBookData(book('coverage-fallback'), 'pl')).resolves.toEqual([
      'Chapter',
    ]);
  });

  it('keeps untranslated leaf entries and primitive chapter content', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [
                'Text',
                { type: 'entries', name: 'No id', entries: [] },
                { id: 'leaf', type: 'entries', name: 'Leaf' },
              ],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { unrelated: { name: 'Other' } } }),
        }),
    );
    await expect(loadBookData(book('coverage-leaves'), 'pl')).resolves.toEqual([
      'Text',
      { type: 'entries', name: 'No id', entries: [] },
      { id: 'leaf', type: 'entries', name: 'Leaf' },
    ]);
  });

  it('falls back when the overlay response is unsuccessful', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({ ok: false }),
    );
    await expect(loadBookData(book('coverage-overlay-http'), 'pl')).resolves.toEqual([]);
  });

  it('rejects failed source requests', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(loadBookData(book('coverage-missing'), 'en')).rejects.toThrow(
      'HTTP 404',
    );
  });
});
