import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSearchStore } from '@/features/search/searchStore';
import { useSidebarStore } from '@/features/ui/sidebarStore';

vi.mock('./Sidebar', () => ({
  Sidebar: ({ onNavigate }: { onNavigate?: () => void }) => (
    <button type="button" onClick={onNavigate}>
      Sidebar
    </button>
  ),
}));
vi.mock('@/features/dice/RollResultDock', () => ({
  RollResultDock: () => <div>Roll dock</div>,
}));
vi.mock('@/features/ui/ConfirmDialog', () => ({
  ConfirmDialog: () => <div>Confirm dialog</div>,
}));
vi.mock('@/features/ui/Lightbox', () => ({ Lightbox: () => <div>Lightbox</div> }));
vi.mock('@/features/search/SearchPalette', () => ({
  SearchPalette: () => <div>Search palette</div>,
}));

import { AppLayout } from './AppLayout';

const renderLayout = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="*" element={<div>Page content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

function NavigationProbe() {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate('/next')}>
        Next page
      </button>
      <button type="button" onClick={() => navigate('/compendium/classes/wizard/evoker')}>
        Select subclass
      </button>
    </>
  );
}

describe('AppLayout', () => {
  beforeEach(() => {
    useSidebarStore.setState({ collapsed: false });
    useSearchStore.setState({ open: false });
  });

  it('renders page content and changes desktop width with sidebar state', () => {
    const { container, rerender } = renderLayout();
    expect(screen.getByText('Page content')).toBeInTheDocument();
    expect(container.querySelector('aside')).toHaveClass('w-64');

    useSidebarStore.setState({ collapsed: true });
    rerender(
      <MemoryRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="*" element={<div>Page content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(container.querySelector('aside')).toHaveClass('w-16');
  });

  it('keeps prerendered content on compendium routes', () => {
    const prerendered = document.createElement('main');
    prerendered.id = 'prerendered-content';
    document.body.append(prerendered);
    const view = renderLayout('/compendium/species');

    expect(document.getElementById('prerendered-content')).toBe(prerendered);
    view.unmount();
    prerendered.remove();
  });

  it('opens and closes the mobile sidebar from every control', () => {
    renderLayout();
    const menu = screen.getByRole('button', { name: 'Open menu' });
    fireEvent.click(menu);
    expect(
      screen
        .getAllByRole('button', { name: 'Close menu' })
        .find((button) => button.hasAttribute('aria-expanded')),
    ).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getAllByRole('button', { name: 'Close menu' })[0]!);
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Sidebar' })[1]!);
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
  });

  it('lazy-loads the search palette when opened', async () => {
    useSearchStore.setState({ open: true });
    renderLayout();
    await waitFor(() => expect(screen.getByText('Search palette')).toBeInTheDocument());
  });

  it('returns the app scroll container to the top after navigation', () => {
    render(
      <MemoryRouter initialEntries={['/start']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="*" element={<NavigationProbe />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const main = document.getElementById('main-content');
    expect(main).not.toBeNull();
    main!.scrollTop = 480;

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

    expect(main).toHaveProperty('scrollTop', 0);
  });

  it('handles a missing app scroll container', () => {
    const getElementById = vi.spyOn(document, 'getElementById').mockReturnValue(null);

    renderLayout('/start');

    getElementById.mockRestore();
  });

  it('keeps the current position when selecting a class subclass', () => {
    render(
      <MemoryRouter initialEntries={['/compendium/classes/wizard']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="*" element={<NavigationProbe />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const main = document.getElementById('main-content');
    expect(main).not.toBeNull();
    main!.scrollTop = 480;

    fireEvent.click(screen.getByRole('button', { name: 'Select subclass' }));

    expect(main).toHaveProperty('scrollTop', 480);
  });
});
