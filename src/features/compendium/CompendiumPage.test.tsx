import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFumbleHomebrewStore } from '@/features/homebrew/fumbleHomebrewStore';
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
      {
        id: 'source',
        label: 'Source',
        valuesFor: (item: { source?: string }) => (item.source ? [item.source] : []),
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
      <button type="button" onClick={() => onToggle('missing', 'Value')}>
        Toggle missing
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
      <button type="button" onClick={() => onSortField('name')}>
        Sort name
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
        <Route path="/compendium/:category/:id/:subclass" element={<CompendiumPage />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

function LocationProbe() {
  const location = useLocation();
  return (
    <output>
      {location.pathname}
      {location.search}
    </output>
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

const fumble = {
  id: 'fumble-rule',
  name: 'Fumble Rule',
  source: 'Fumble',
  srd: false,
  _fumble: true,
  category: 'species',
  subtitle: 'Fumble rule',
  entries: ['Fumble body'],
};

describe('CompendiumPage', () => {
  beforeEach(() => {
    mocks.result = { status: 'ready', items: [official] };
    useFumbleHomebrewStore.setState({
      showInCompendium: false,
      compendiumCampaigns: null,
      compendiumCategories: null,
    });
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
    fireEvent.click(screen.getByRole('button', { name: 'Random' }));
  });

  it('keeps a selected detail area stable while data loads or fails', () => {
    mocks.result = { status: 'loading', items: [] };
    const loading = renderPage('/compendium/species/dragon');
    expect(loading.container.querySelector('[aria-busy="true"]')).not.toBeNull();
    loading.unmount();

    mocks.result = { status: 'error', items: [] };
    renderPage('/compendium/species/dragon');
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load data.');
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
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    fireEvent.click(screen.getByRole('button', { name: 'Random' }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'dragon' } });
    const dragon = screen.getByRole('link', { name: /Dragon/ });
    expect(dragon).toBeInTheDocument();
    expect(dragon).toHaveAttribute('href', '/compendium/species/dragon/?q=dragon');
    fireEvent.click(dragon);
    expect(screen.getByRole('status')).toHaveTextContent(
      '/compendium/species/dragon/?q=dragon',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Toggle Large' }));
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Large' }));
    fireEvent.click(screen.getByRole('button', { name: 'Toggle missing' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sort source' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sort name' }));
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

  it('opens an item without adding an empty search query', () => {
    renderPage('/compendium/species');
    fireEvent.click(screen.getByRole('link', { name: /Dragon/ }));
    expect(screen.getByRole('status')).toHaveTextContent('/compendium/species/dragon/');
  });

  it('keeps a direct Fumble link available while the library is hidden', () => {
    mocks.result = { status: 'ready', items: [fumble] };

    renderPage('/compendium/species/fumble-rule');

    expect(screen.getByRole('heading', { name: 'Fumble Rule' })).toBeInTheDocument();
    expect(screen.getByText('Fumble body')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Fumble Rule/ })).toBeInTheDocument();
  });

  it('updates the URL after a search change', () => {
    vi.useFakeTimers();
    renderPage('/compendium/species');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'dragon' } });
    act(() => vi.runAllTimers());
    expect(screen.getByRole('status')).toHaveTextContent('/compendium/species?q=dragon');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    act(() => vi.runAllTimers());
    expect(screen.getByRole('status')).toHaveTextContent('/compendium/species');
    vi.useRealTimers();
  });

  it('cancels a pending search update when unmounted', () => {
    vi.useFakeTimers();
    const view = renderPage('/compendium/species');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'dragon' } });
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });

  it('evaluates valid and invalid sort parameters', () => {
    const validName = renderPage('/compendium/species?sort=name');
    validName.unmount();
    const validFilter = renderPage('/compendium/species?sort=size');
    validFilter.unmount();
    const validSource = renderPage('/compendium/species?sort=source');
    validSource.unmount();
    renderPage('/compendium/species?sort=invalid');
    expect(screen.getByRole('heading', { name: 'Compendium' })).toBeInTheDocument();
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

  it('keeps constrained artwork sized by its CSS bounds', () => {
    mocks.result = {
      status: 'ready',
      items: [
        {
          ...official,
          image: 'classes/TEST/TestClass.webp',
          token: undefined,
          gallery: [],
        },
      ],
    };

    renderPage('/compendium/species/dragon');
    const image = screen.getByAltText('Dragon');
    Object.defineProperties(image, {
      naturalWidth: { configurable: true, value: 1700 },
      naturalHeight: { configurable: true, value: 2160 },
    });
    fireEvent.load(image);
    expect(image).toHaveAttribute('width', '440');
    expect(image).toHaveAttribute('height', '558');
    expect(image).toHaveClass('h-auto', 'max-h-80', 'max-w-full');
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
    expect(plain.container.querySelector('a[href*="/books/hb/"]')).toBeNull();
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
