import { describe, expect, it, vi } from 'vitest';
import {
  buildOutline,
  books,
  getBook,
  loadBookData,
  localizedBookStoryline,
  type BookOverlay,
} from './data';

describe('book data localization', () => {
  it('localizes indexed storylines on the Polish route', () => {
    expect(localizedBookStoryline('Tales from the Yawning Portal', 'pl')).toBe(
      'Opowieści z Ziewającego Portalu',
    );
    expect(localizedBookStoryline('Tales from the Yawning Portal', 'en')).toBe(
      'Tales from the Yawning Portal',
    );
  });

  it('keeps unknown storylines available as a fallback', () => {
    expect(localizedBookStoryline('Custom campaign', 'pl')).toBe('Custom campaign');
    expect(localizedBookStoryline(undefined, 'pl')).toBeUndefined();
  });

  it('builds outlines only from named section entries', () => {
    expect(
      buildOutline([
        'plain',
        {
          type: 'section',
          name: 'Chapter',
          entries: [{ type: 'entries', name: 'Part' }],
        },
        { type: 'item', name: 'Item' },
      ]),
    ).toEqual([{ name: 'Chapter', children: [{ name: 'Part', children: [] }] }]);
    expect(buildOutline(undefined)).toEqual([]);
    expect(buildOutline([{ type: 'section', name: 'Chapter' }], 0)).toEqual([]);
  });

  it('finds indexed books and returns undefined for unknown ids', () => {
    expect(getBook(books[0]!.id)).toBe(books[0]);
    expect(getBook('missing-book')).toBeUndefined();
  });

  it('loads English data and reuses its cached promise', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: [{ type: 'section', name: 'Chapter' }] }),
    });
    const entry = { id: 'cache-test', type: 'book' } as never;
    const first = loadBookData(entry, 'en');
    expect(loadBookData(entry, 'en')).toBe(first);
    await expect(first).resolves.toEqual([{ type: 'section', name: 'Chapter' }]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('applies nested Polish overlays and preserves untranslated entries', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: [
            {
              type: 'section',
              id: 'chapter',
              name: 'Chapter',
              entries: [
                { type: 'entries', id: 'child', name: 'Child', entries: ['English'] },
                'Plain',
              ],
            },
            { type: 'section', name: 'No id' },
            { type: 'section', id: 'untranslated', name: 'No entries' },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            '0:chapter': { name: 'Rozdział' },
            '0:child': { name: 'Dziecko', entries: ['Polski'] },
          } satisfies BookOverlay,
        }),
      });

    await expect(
      loadBookData({ id: 'overlay-test', type: 'book' } as never, 'pl'),
    ).resolves.toEqual([
      {
        type: 'section',
        id: 'chapter',
        name: 'Rozdział',
        entries: [
          { type: 'entries', id: 'child', name: 'Dziecko', entries: ['Polski'] },
          'Plain',
        ],
      },
      { type: 'section', name: 'No id' },
      { type: 'section', id: 'untranslated', name: 'No entries' },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falls back when the overlay is unavailable or malformed', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: vi
          .fn()
          .mockResolvedValue({ data: [{ type: 'section', name: 'Original' }] }),
      })
      .mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(
      loadBookData({ id: 'overlay-missing', type: 'book' } as never, 'pl'),
    ).resolves.toEqual([{ type: 'section', name: 'Original' }]);

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: vi
          .fn()
          .mockResolvedValue({ data: [{ type: 'section', name: 'Original' }] }),
      })
      .mockRejectedValueOnce(new Error('offline'));
    await expect(
      loadBookData({ id: 'overlay-failed', type: 'book' } as never, 'pl'),
    ).resolves.toEqual([{ type: 'section', name: 'Original' }]);
  });

  it('rejects failed book requests and accepts missing data arrays', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });
    await expect(
      loadBookData({ id: 'book-failed', type: 'book' } as never, 'en'),
    ).rejects.toThrow('HTTP 503');

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });
    await expect(
      loadBookData({ id: 'book-empty', type: 'book' } as never, 'en'),
    ).resolves.toEqual([]);
  });
});
