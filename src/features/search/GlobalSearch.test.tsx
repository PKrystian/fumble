import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalSearch } from './GlobalSearch';

const mocks = vi.hoisted(() => ({
  setOpen: vi.fn(),
}));

vi.mock('./searchStore', () => ({
  useSearchStore: (selector: (state: typeof mocks) => unknown) => selector(mocks),
}));

vi.mock('@/i18n/useT', () => ({
  useT: () => ({ t: (key: string) => key }),
}));

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
