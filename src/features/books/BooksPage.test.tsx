import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BooksPage, FilterRow } from './BooksPage';
import { sortDocs, typeLabel } from './filters';

const mocks = vi.hoisted(() => ({
  mode: 'all',
  locale: 'en',
  books: [
    {
      id: 'new-core',
      name: 'New Core',
      source: 'XPHB',
      group: 'core',
      type: 'book',
      published: '2024-09-17',
      cover: 'cover.webp',
      contents: [{ name: 'Only' }],
    },
    {
      id: 'old-core',
      name: 'Old Core',
      source: 'DMG',
      group: 'core',
      type: 'book',
      published: '2014-01-01',
      contents: [{ name: 'One' }, { name: 'Two' }],
    },
    {
      id: 'mystery',
      name: 'Mystery Guide',
      source: 'OTHER',
      group: 'mystery',
      type: 'book',
      contents: [{ name: 'One' }],
    },
  ],
  adventures: [
    {
      id: 'quest',
      name: 'Quest',
      source: 'OTHER',
      group: 'setting',
      type: 'adventure',
      published: '2025-01-01',
      storyline: 'Saga',
      contents: [{ name: 'One' }],
    },
  ],
}));

vi.mock('./data', () => ({
  books: mocks.books,
  adventures: mocks.adventures,
  localizedBookStoryline: (storyline: string | undefined) => storyline,
}));

vi.mock('@/features/ui/contentModeStore', () => ({
  useContentModeStore: (selector: (state: { mode: string }) => unknown) =>
    selector({ mode: mocks.mode }),
}));

vi.mock('@/data/compendium/images', () => ({
  imageUrl: (value: string) => `/images/${value}`,
}));

vi.mock('@/data/compendium/sources', () => ({
  localizedBookName: (doc: { name: string }, locale: string) =>
    locale === 'pl' ? `PŁ ${doc.name}` : doc.name,
}));

vi.mock('@/i18n/path', () => ({
  Link: ({ children, to }: React.ComponentProps<'a'> & { to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock('@/i18n/useT', () => ({
  useT: () => ({
    locale: mocks.locale,
    t: (key: string) => key,
  }),
}));

vi.mock('@/seo/useSeo', () => ({
  useSeo: vi.fn(),
}));

describe('BooksPage', () => {
  const renderPage = (path = '/books') =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <BooksPage />
      </MemoryRouter>,
    );

  beforeEach(() => {
    mocks.mode = 'all';
    mocks.locale = 'en';
  });

  it('renders editions, covers and fallback artwork', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: 'books.edition2024' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'books.edition2014' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('presentation')).toHaveAttribute('src', '/images/cover.webp');
    expect(screen.getByText('Saga')).toBeInTheDocument();
    expect(screen.getByText('2024 · XPHB')).toBeInTheDocument();
    expect(screen.getByText('books.chapterOther')).toBeInTheDocument();
    expect(screen.getByText('mystery (1)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /New Core/ })).toHaveAttribute(
      'href',
      '/books/new-core',
    );
  });

  it('searches localized names and reports empty results', () => {
    mocks.locale = 'pl';
    renderPage();
    const search = screen.getByLabelText('books.searchLabel');
    fireEvent.change(search, { target: { value: '  pl quest  ' } });
    expect(screen.getByText('PŁ Quest')).toBeInTheDocument();
    expect(screen.queryByText('PŁ New Core')).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'missing' } });
    expect(screen.getByText('books.noMatches')).toBeInTheDocument();
    fireEvent.click(
      screen.getAllByRole('button', { name: 'common.clearSearch' }).at(-1)!,
    );
    expect(search).toHaveValue('');
  });

  it('restores search and filters from the URL', () => {
    renderPage('/books?q=quest&format=adventure');
    expect(screen.getByLabelText('books.searchLabel')).toHaveValue('quest');
    expect(screen.getByText('Quest')).toBeInTheDocument();
    expect(screen.queryByText('New Core')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'books.filters' }));
    expect(screen.getByRole('button', { name: 'books.adventures' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('toggles format and type filters and resets them', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'books.filters' }));
    fireEvent.click(screen.getByRole('button', { name: 'books.adventures' }));
    expect(screen.getByText('Quest')).toBeInTheDocument();
    expect(screen.queryByText('New Core')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'core' }));
    expect(screen.getByText('books.noMatchesFiltered')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'core' }));
    fireEvent.click(screen.getByRole('button', { name: 'setting' }));
    expect(screen.getByText('Quest')).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'books.resetFilters',
      }),
    );
    expect(screen.getByText('New Core')).toBeInTheDocument();
  });

  it('ignores unknown facets and sorts the whole catalog with an edition override', () => {
    mocks.mode = '2024';
    renderPage('/books?type=unknown&format=unknown&edition=all&sort=oldest');
    expect(screen.getByLabelText('books.filterEdition')).toHaveValue('all');
    expect(screen.getByLabelText('books.sort')).toHaveValue('oldest');
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/books/old-core',
      '/books/new-core',
      '/books/quest',
      '/books/mystery',
    ]);
    fireEvent.change(screen.getByLabelText('books.sort'), { target: { value: 'title' } });
    expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '/books/mystery');
  });

  it('replaces a failed cover', () => {
    renderPage();
    const cover = screen.getByRole('presentation');
    fireEvent.error(cover);
    expect(cover).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /New Core/ })).toBeInTheDocument();
  });

  it('filters books by content edition', () => {
    mocks.mode = '2024';
    renderPage();
    expect(screen.getByText('New Core')).toBeInTheDocument();
    expect(screen.queryByText('Old Core')).not.toBeInTheDocument();
  });

  it('offers both editions when the inherited edition excludes a matching title', () => {
    mocks.mode = '2024';
    renderPage('/books?q=old');
    expect(screen.getByText('books.noMatches')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'books.showBothEditions' }));
    expect(screen.getByText('Old Core')).toBeInTheDocument();
    expect(screen.getByLabelText('books.searchLabel')).toHaveValue('old');
  });

  it('sorts equal source ranks by date and name', () => {
    const docs = [
      {
        id: 'beta',
        name: 'Beta',
        source: 'OTHER',
        group: 'other',
        type: 'book' as const,
        published: '2024-01-01',
        contents: [],
      },
      {
        id: 'alpha',
        name: 'Alpha',
        source: 'OTHER',
        group: 'other',
        type: 'book' as const,
        contents: [],
      },
      {
        id: 'gamma',
        name: 'Gamma',
        source: 'OTHER',
        group: 'other',
        type: 'book' as const,
        contents: [],
      },
    ];

    expect(sortDocs(docs).map((doc) => doc.id)).toEqual(['beta', 'alpha', 'gamma']);
    expect(sortDocs([docs[0]!, { ...docs[0]!, id: 'core', source: 'XPHB' }])[0]?.id).toBe(
      'core',
    );
    expect(typeLabel('core', () => 'Core books')).toBe('Core books');
  });

  it('hides filter rows with only one option', () => {
    const { container } = render(
      <FilterRow
        label="Format"
        options={[{ value: 'book', label: 'Book' }]}
        selected={[]}
        onToggle={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
