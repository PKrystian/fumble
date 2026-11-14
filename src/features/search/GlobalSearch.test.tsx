import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalSearch } from './GlobalSearch';

const mocks = vi.hoisted(() => ({
  setOpen: vi.fn(),
  paletteLoads: vi.fn(),
}));

vi.mock('./searchStore', () => ({
  useSearchStore: (selector: (state: typeof mocks) => unknown) => selector(mocks),
}));

vi.mock('@/i18n/useT', () => ({
  useT: () => ({ t: (key: string) => key }),
}));

vi.mock('./SearchPalette', () => {
  mocks.paletteLoads();
  return { SearchPalette: () => null };
});

describe('GlobalSearch', () => {
  beforeEach(() => {
    mocks.setOpen.mockReset();
  });

  it('opens from the full and compact buttons', () => {
    const view = render(<GlobalSearch />);
    expect(screen.getByText('search.placeholder')).toBeInTheDocument();
    expect(screen.getByText('search.shortcut')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'search.title' }));

    view.rerender(<GlobalSearch compact />);
    expect(screen.queryByText('search.placeholder')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'search.title' }));
    expect(mocks.setOpen).toHaveBeenCalledTimes(2);
  });

  it('shows a custom placeholder and preloads the palette before it opens', async () => {
    const view = render(<GlobalSearch placeholder="Find tools" />);
    expect(screen.getByText('Find tools')).toBeInTheDocument();
    expect(screen.queryByText('search.placeholder')).not.toBeInTheDocument();
    expect(mocks.paletteLoads).not.toHaveBeenCalled();
    mocks.paletteLoads.mockImplementationOnce(() => {
      throw new Error('offline');
    });
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'search.title' }));
    await vi.waitFor(() => expect(mocks.paletteLoads).toHaveBeenCalledOnce());
    fireEvent.focus(screen.getByRole('button', { name: 'search.title' }));
    await vi.waitFor(() => expect(mocks.paletteLoads).toHaveBeenCalledTimes(2));

    view.rerender(<GlobalSearch compact />);
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'search.title' }));
    fireEvent.focus(screen.getByRole('button', { name: 'search.title' }));
    expect(mocks.setOpen).not.toHaveBeenCalled();
  });

  it('handles Ctrl-K and Meta-K but ignores other shortcuts', () => {
    const view = render(<GlobalSearch />);
    fireEvent.keyDown(window, { ctrlKey: true, key: 'K' });
    fireEvent.keyDown(window, { metaKey: true, key: 'k' });
    fireEvent.keyDown(window, { ctrlKey: true, key: 'x' });
    fireEvent.keyDown(window, { key: 'k' });
    expect(mocks.setOpen).toHaveBeenCalledTimes(2);

    view.unmount();
    fireEvent.keyDown(window, { ctrlKey: true, key: 'k' });
    expect(mocks.setOpen).toHaveBeenCalledTimes(2);
  });
});
