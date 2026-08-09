import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchPalette } from './SearchPalette';

const mocks = vi.hoisted(() => ({
  open: true,
  setOpen: vi.fn(),
  navigate: vi.fn(),
  load: vi.fn(),
  query: '',
  results: [
    {
      kind: 'homebrew',
      name: 'Brew Spell',
      englishName: 'Brew Spell EN',
      subtitle: 'Custom',
      categoryLabel: 'Spells',
      to: '/homebrew/one',
    },
    {
      kind: 'wiki',
      name: 'Wiki Note',
      categoryLabel: 'Wiki',
      to: '/wiki/note',
    },
    {
      kind: 'compendium',
      name: 'Core Spell',
      categoryLabel: 'Spells',
      to: '/compendium/spells/core',
    },
  ],
}));

vi.mock('./searchStore', () => ({
  useSearchStore: (selector: (state: typeof mocks) => unknown) => selector(mocks),
}));

vi.mock('./searchIndex', () => ({
  loadSearchIndex: (...args: unknown[]) => mocks.load(...args),
  buildHomebrewResults: () => [],
  buildPool: () => [],
  searchResults: (_pool: unknown, query: string) =>
    query === 'none' ? [] : query.trim() ? mocks.results : [],
}));

vi.mock('@/features/homebrew/store', () => ({
  useHomebrewStore: (selector: (state: { entries: never[] }) => unknown) =>
    selector({ entries: [] }),
}));

vi.mock('@/features/ui/contentModeStore', () => ({
  useContentModeStore: (selector: (state: { mode: string }) => unknown) =>
    selector({ mode: 'all' }),
}));

vi.mock('@/features/ui/OriginalName', () => ({
  OriginalName: ({ name }: { name?: string }) => <span>{name}</span>,
}));

vi.mock('@/i18n/pathUtils', () => ({
  useLocale: () => 'en',
  useNavigate: () => mocks.navigate,
}));

vi.mock('@/i18n/useT', () => ({
  useT: () => ({ t: (key: string) => key }),
}));

describe('SearchPalette', () => {
  beforeEach(() => {
    mocks.open = true;
    mocks.setOpen.mockReset();
    mocks.navigate.mockReset();
    mocks.load.mockReset();
    mocks.load.mockResolvedValue({});
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('renders nothing while closed', () => {
    mocks.open = false;
    const { container } = render(<SearchPalette />);
    expect(container).toBeEmptyDOMElement();
    expect(mocks.load).not.toHaveBeenCalled();
  });

  it('shows hints, empty results and all result kinds', async () => {
    render(<SearchPalette />);
    expect(screen.getByText('search.hint')).toBeInTheDocument();
    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith('en'));

    const input = screen.getByRole('searchbox', { name: 'search.title' });
    await waitFor(() => expect(input).toHaveFocus());
    fireEvent.change(input, { target: { value: 'none' } });
    expect(screen.getByText('search.noResults')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'spell' } });
    expect(screen.getByText('Brew Spell')).toBeInTheDocument();
    expect(screen.getByText('Wiki Note')).toBeInTheDocument();
    expect(screen.getByText('Core Spell')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Brew Spell EN')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.clearSearch' }));
    expect(input).toHaveValue('');
    fireEvent.change(input, { target: { value: 'spell' } });

    fireEvent.mouseMove(screen.getByRole('button', { name: /Wiki Note/ }));
    fireEvent.click(screen.getByRole('button', { name: /Wiki Note/ }));
    expect(mocks.setOpen).toHaveBeenCalledWith(false);
    expect(mocks.navigate).toHaveBeenCalledWith('/wiki/note');
  });

  it('handles keyboard navigation and closing controls', () => {
    render(<SearchPalette />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'search.title' }), {
      target: { value: 'spell' },
    });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(mocks.navigate).toHaveBeenCalledWith('/compendium/spells/core');
    fireEvent.keyDown(window, { key: 'ArrowUp' });

    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'Other' });
    fireEvent.click(screen.getAllByRole('button', { name: 'common.close' })[0]!);
    fireEvent.click(screen.getAllByRole('button', { name: 'common.close' })[1]!);
    expect(mocks.setOpen).toHaveBeenCalledWith(false);
  });

  it('ignores a missing active result and a late index load', async () => {
    let resolveLoad: ((value: object) => void) | undefined;
    mocks.load.mockReturnValue(
      new Promise<object>((resolve) => {
        resolveLoad = resolve;
      }),
    );
    const view = render(<SearchPalette />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(mocks.navigate).not.toHaveBeenCalled();
    view.unmount();
    resolveLoad?.({});
    await Promise.resolve();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
