import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompendiumPage } from './CompendiumPage';

const mocks = vi.hoisted(() => ({
  result: { status: 'ready', items: [] } as {
    status: 'loading' | 'ready' | 'error';
    items: Array<Record<string, unknown>>;
  },
  openLightbox: vi.fn(),
  getBook: vi.fn(),
  category: {
    id: 'species',
    label: 'Species',
    load: vi.fn(),
    subtitle: (item: { size?: string }) => item.size ?? '',
    renderDetail: (item: { name: string }) => `Detail ${item.name}`,
    filters: [
      {
        id: 'size',
        label: 'Size',
        valuesFor: (item: { size?: string }) => (item.size ? [item.size] : []),
      },
    ],
  },
}));

vi.mock('./categories', () => ({
  categories: [mocks.category, { ...mocks.category, id: 'items', label: 'Items' }],
  getCategory: (id: string) => (id === 'species' ? mocks.category : undefined),
}));

vi.mock('./useCategoryItems', () => ({
  useCategoryItems: () => mocks.result,
}));

vi.mock('./FilterBar', () => ({
  FilterBar: ({
    onToggle,
    onClear,
    onRandom,
    onSortField,
    onToggleSortDir,
  }: {
    onToggle: (id: string, value: string) => void;
    onClear: () => void;
    onRandom: () => void;
    onSortField: (value: string) => void;
    onToggleSortDir: () => void;
  }) => (
    <div>
      <button type="button" onClick={() => onToggle('size', 'Large')}>
        Toggle Large
      </button>
      <button type="button" onClick={onClear}>
        Clear filters
      </button>
      <button type="button" onClick={onRandom}>
        Random
      </button>
      <button type="button" onClick={() => onSortField('source')}>
        Sort source
      </button>
      <button type="button" onClick={onToggleSortDir}>
        Sort direction
      </button>
    </div>
  ),
}));

vi.mock('@/features/ui/lightboxStore', () => ({
  useLightbox: (selector: (state: { open: typeof mocks.openLightbox }) => unknown) =>
    selector({ open: mocks.openLightbox }),
}));

vi.mock('@/features/books/data', () => ({
  getBook: (...args: unknown[]) => mocks.getBook(...args),
}));

vi.mock('./EntryRenderer', () => ({
  EntryRenderer: ({ entries }: { entries: string[] }) => <p>{entries.join(',')}</p>,
}));

function renderPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/compendium" element={<CompendiumPage />} />
        <Route path="/compendium/:category" element={<CompendiumPage />} />
        <Route path="/compendium/:category/:id" element={<CompendiumPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const official = {
  id: 'dragon',
  name: 'Dragon',
  englishName: 'Dragon',
  source: 'XPHB',
  page: 12,
  size: 'Large',
  image: 'dragon.webp',
  token: 'dragon-token.webp',
  ua: true,
  lore: ['Lore text'],
  gallery: [
    { path: 'dragon.webp' },
    { path: 'other.webp', title: 'Other', credit: 'Artist' },
    { path: 'plain.webp' },
  ],
  otherVersions: [{ id: 'dragon-old', source: 'PHB' }],
};

describe('CompendiumPage', () => {
  beforeEach(() => {
    mocks.result = { status: 'ready', items: [official] };
    mocks.openLightbox.mockReset();
    mocks.getBook.mockReset();
    mocks.getBook.mockReturnValue({ id: 'xphb' });
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  it('redirects missing and unknown categories to the first category', () => {
    renderPage('/compendium');
    expect(screen.getByRole('heading', { name: 'Compendium' })).toBeInTheDocument();
    renderPage('/compendium/unknown');
    expect(screen.getAllByRole('heading', { name: 'Compendium' })).toHaveLength(2);
  });

  it('shows loading, error and empty states', () => {
    mocks.result = { status: 'loading', items: [] };
    const loading = renderPage('/compendium/species');
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
    loading.unmount();

    mocks.result = { status: 'error', items: [] };
    const error = renderPage('/compendium/species');
    expect(screen.getByText('Failed to load data.')).toBeInTheDocument();
    error.unmount();

    mocks.result = { status: 'ready', items: [] };
    renderPage('/compendium/species');
    expect(screen.getByText('No matches.')).toBeInTheDocument();
  });

  it('searches, filters, sorts and selects a random item', () => {
    mocks.result.items.push({
      ...official,
      id: 'wyvern',
      name: 'Wyvern',
      englishName: 'Wyvern',
      source: 'PHB',
    });
    renderPage('/compendium/species');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'missing' } });
    expect(screen.getByText('No matches.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Random' }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'dragon' } });
    expect(screen.getByRole('link', { name: /Dragon/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Toggle Large' }));
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Large' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sort source' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sort direction' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sort direction' }));
    fireEvent.click(screen.getByRole('button', { name: 'Random' }));
    expect(screen.getByText('Detail Dragon')).toBeInTheDocument();
  });

  it('restores search, filters and sorting from the URL', () => {
    mocks.result.items.push({
      ...official,
      id: 'wyvern',
      name: 'Wyvern',
      englishName: 'Wyvern',
      size: 'Medium',
    });
    renderPage('/compendium/species?q=dragon&size=Large&sort=size&order=desc');
    expect(screen.getByRole('searchbox')).toHaveValue('dragon');
    expect(screen.getByRole('link', { name: /Dragon/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Wyvern/ })).not.toBeInTheDocument();
  });

  it('renders rich selected entry media, lore, gallery and source links', () => {
    const { container } = renderPage('/compendium/species/dragon');
    expect(screen.getByText('Detail Dragon')).toBeInTheDocument();
    expect(screen.getByText('Lore text')).toBeInTheDocument();
    expect(screen.getByText(/Artist/)).toBeInTheDocument();
    expect(screen.getByText('Unearthed Arcana')).toBeInTheDocument();

    const images = screen.getAllByRole('img');
    for (const image of images) fireEvent.click(image);
    expect(mocks.openLightbox).toHaveBeenCalledTimes(images.length);

    fireEvent.error(images[0]!);
    expect(images[0]).toHaveStyle({ display: 'none' });
    fireEvent.error(screen.getByTitle('Token'));
    const galleryImage = screen.getByAltText('Other');
    fireEvent.error(galleryImage);
    expect(galleryImage.closest('figure')).toHaveStyle({ display: 'none' });

    expect(container.querySelector('a[href*="/books/xphb"]')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: /Player's Handbook \(2014\)/ }),
    ).toBeInTheDocument();
  });

  it('renders manual and imported homebrew variants', () => {
    mocks.result = {
      status: 'ready',
      items: [
        {
          ...official,
          id: 'manual',
          name: 'Manual',
          _homebrew: true,
          _manual: true,
          subtitle: 'Own subtitle',
          body: 'Own body',
          entries: [],
          image: undefined,
          token: undefined,
          lore: [],
          gallery: [],
        },
        {
          ...official,
          id: 'imported',
          name: 'Imported',
          _homebrew: true,
          _manual: false,
          image: undefined,
          token: undefined,
          lore: [],
          gallery: [],
        },
      ],
    };
    const manual = renderPage('/compendium/species/manual');
    expect(screen.getAllByText('Own subtitle')).toHaveLength(2);
    manual.unmount();
    renderPage('/compendium/species/imported');
    expect(screen.getAllByText('Homebrew').length).toBeGreaterThan(0);
  });

  it('renders linked and plain sources without page numbers', () => {
    mocks.result = {
      status: 'ready',
      items: [{ ...official, id: 'linked', page: undefined }],
    };
    const linked = renderPage('/compendium/species/linked');
    expect(linked.container.querySelector('a[href*="/books/xphb"]')).toBeTruthy();
    linked.unmount();

    mocks.getBook.mockReturnValue(undefined);
    mocks.result = {
      status: 'ready',
      items: [{ ...official, id: 'plain', source: 'HB' }],
    };
    const plain = renderPage('/compendium/species/plain');
    expect(plain.container.querySelector('a[href*="/books/"]')).toBeNull();
    plain.unmount();

    mocks.result = {
      status: 'ready',
      items: [{ ...official, id: 'plain-empty', source: 'HB', page: undefined }],
    };
    renderPage('/compendium/species/plain-empty');
    expect(screen.getByText('HB')).toBeInTheDocument();
  });

  it('renders a category without configured filters', () => {
    const filters = mocks.category.filters;
    Reflect.deleteProperty(mocks.category, 'filters');
    const view = renderPage('/compendium/species');
    expect(screen.getAllByText('Dragon')).not.toHaveLength(0);
    view.unmount();
    mocks.category.filters = filters;
  });
});
