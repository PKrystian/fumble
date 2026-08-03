import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookReaderPage } from './BookReaderPage';

const mocks = vi.hoisted(() => ({
  getBook: vi.fn(),
  loadBookData: vi.fn(),
  buildOutline: vi.fn(),
  renderAnchors: true,
  renderPageIds: false,
  extraPage: false,
}));

vi.mock('./data', () => ({
  getBook: (...args: unknown[]) => mocks.getBook(...args),
  loadBookData: (...args: unknown[]) => mocks.loadBookData(...args),
  buildOutline: (...args: unknown[]) => mocks.buildOutline(...args),
}));

vi.mock('@/features/compendium/EntryRenderer', () => ({
  EntryRenderer: ({ entries }: { entries: Array<{ name?: string; page?: number }> }) => (
    <>
      {entries.map((entry, index) => (
        <div key={index}>
          <h2
            id={mocks.renderPageIds ? `page-${entry.page}` : undefined}
            data-entry-name={
              mocks.renderAnchors
                ? entry.name?.toLowerCase().replaceAll(' ', '-')
                : undefined
            }
            data-page={entry.page}
          >
            {entry.name}
          </h2>
          {mocks.extraPage && <span data-page="100" />}
        </div>
      ))}
    </>
  ),
}));

const book = {
  id: 'test-book',
  name: 'Test Book',
  source: 'XPHB',
  author: 'Author',
  contents: [{ name: 'Loading One' }, { name: 'Loading Two' }],
};

const chapters = [
  { type: 'entries', name: 'First Chapter', page: 10, entries: [] },
  { type: 'entries', name: 'Second Chapter', page: 20, entries: [] },
];

function renderReader(path = '/books/test-book/0') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/books" element={<p>Books landing</p>} />
        <Route path="/books/:id/:chapter?" element={<BookReaderPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BookReaderPage', () => {
  beforeEach(() => {
    mocks.getBook.mockReset();
    mocks.loadBookData.mockReset();
    mocks.buildOutline.mockReset();
    mocks.getBook.mockReturnValue(book);
    mocks.loadBookData.mockResolvedValue(chapters);
    mocks.renderAnchors = true;
    mocks.renderPageIds = false;
    mocks.extraPage = false;
    mocks.buildOutline
      .mockReturnValueOnce([
        {
          name: 'Topic',
          children: [{ name: 'Nested Topic', children: [] }],
        },
      ])
      .mockReturnValue([]);
    Element.prototype.scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollTo = vi.fn();
  });

  it('loads a chapter, renders its outline and toggles reader controls', async () => {
    renderReader();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    await screen.findByRole('heading', { name: 'First Chapter' });

    expect(screen.getByText('Author')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Topic' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Nested Topic/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse First Chapter' }));
    expect(screen.queryByRole('link', { name: 'Topic' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Expand First Chapter' }));

    fireEvent.click(screen.getByRole('button', { name: 'This chapter' }));
    expect(screen.getAllByRole('heading', { name: /Chapter/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Whole book' }));
    expect(screen.getAllByRole('heading', { name: 'First Chapter' })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Full width' }));
    expect(screen.getByRole('button', { name: 'Comfortable width' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('selects a chapter from a target page and supports previous navigation', async () => {
    renderReader('/books/test-book?chapter=ignored&page=21');
    await screen.findByRole('heading', { name: 'Second Chapter' });
    expect(screen.getByRole('link', { name: /^← First Chapter$/ })).toHaveAttribute(
      'href',
      '/books/test-book/0/',
    );
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
  });

  it('scrolls to named headings and falls back to heading text', async () => {
    mocks.renderAnchors = false;
    renderReader('/books/test-book/0?name=First%20Chapter');
    await screen.findByRole('heading', { name: 'First Chapter' });
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
  });

  it('scrolls to the nearest earlier page when the exact page is absent', async () => {
    renderReader('/books/test-book?chapter=ignored&page=15');
    const heading = await screen.findByRole('heading', { name: 'First Chapter' });
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(heading.getAttribute('data-page')).toBe('10');
  });

  it('returns to the top when no heading or page target exists', async () => {
    renderReader();
    await screen.findByRole('heading', { name: 'First Chapter' });
    await waitFor(() =>
      expect(HTMLElement.prototype.scrollTo).toHaveBeenCalledWith({ top: 0 }),
    );
  });

  it('returns to the top when a named heading is missing', async () => {
    mocks.renderAnchors = false;
    renderReader('/books/test-book/0?name=Missing');
    const heading = await screen.findByRole('heading', { name: 'First Chapter' });
    Object.defineProperty(heading, 'textContent', { configurable: true, value: null });
    await waitFor(() =>
      expect(HTMLElement.prototype.scrollTo).toHaveBeenCalledWith({ top: 0 }),
    );
  });

  it('ignores chapters without page metadata when selecting by page', async () => {
    mocks.loadBookData.mockResolvedValue([
      { type: 'entries', name: 'Unpaged', entries: [] },
      chapters[1]!,
    ]);
    renderReader('/books/test-book?page=5');
    await screen.findByRole('heading', { name: 'Unpaged' });
  });

  it('scrolls directly to an exact page anchor', async () => {
    mocks.renderPageIds = true;
    renderReader('/books/test-book?page=10');
    await screen.findByRole('heading', { name: 'First Chapter' });
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
  });

  it('skips page markers after the requested page', async () => {
    mocks.extraPage = true;
    renderReader('/books/test-book?page=15');
    await screen.findByRole('heading', { name: 'First Chapter' });
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
  });

  it('scrolls to the selected chapter when whole-book mode is enabled', async () => {
    renderReader('/books/test-book/1');
    await screen.findByRole('heading', { name: 'Second Chapter' });
    vi.mocked(Element.prototype.scrollIntoView).mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'This chapter' }));
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
  });

  it('uses fallback chapter titles and handles books without authors', async () => {
    mocks.getBook.mockReturnValue({ ...book, author: undefined });
    mocks.buildOutline.mockReset();
    mocks.buildOutline.mockReturnValue(undefined as never);
    mocks.loadBookData.mockResolvedValue([
      { type: 'entries', entries: [] },
      { type: 'entries', page: 8, entries: [] },
    ]);
    renderReader('/books/test-book/1');
    await screen.findByRole('link', { name: '2. Chapter 2' });
    expect(screen.queryByText('Author')).toBeNull();
    expect(screen.getAllByRole('link', { name: /Chapter 1$/ })).toHaveLength(2);
  });

  it('shows a loading failure', async () => {
    mocks.loadBookData.mockRejectedValue(new Error('failed'));
    renderReader();
    expect(await screen.findByText('Could not load this document.')).toBeInTheDocument();
  });

  it('redirects when the book is unknown', async () => {
    mocks.getBook.mockReturnValue(undefined);
    renderReader('/books/missing');
    expect(await screen.findByText('Books landing')).toBeInTheDocument();
    expect(mocks.loadBookData).not.toHaveBeenCalled();
  });

  it('redirects when no book id parameter is present', async () => {
    render(
      <MemoryRouter initialEntries={['/reader']}>
        <Routes>
          <Route path="/books" element={<p>Books landing</p>} />
          <Route path="/reader" element={<BookReaderPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Books landing')).toBeInTheDocument();
    expect(mocks.getBook).not.toHaveBeenCalled();
  });

  it('ignores a completed load after unmounting', async () => {
    let resolve: (value: typeof chapters) => void = () => undefined;
    mocks.loadBookData.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { unmount } = renderReader();
    unmount();
    resolve(chapters);
    await Promise.resolve();
  });

  it('ignores a failed load after unmounting', async () => {
    let reject: (reason: Error) => void = () => undefined;
    mocks.loadBookData.mockReturnValue(
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
    );
    const { unmount } = renderReader();
    unmount();
    reject(new Error('late failure'));
    await Promise.resolve();
  });
});
