import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSidebarStore } from '@/features/ui/sidebarStore';

vi.mock('@/features/search/GlobalSearch', () => ({
  GlobalSearch: ({ compact }: { compact: boolean }) => (
    <span>{compact ? 'Compact search' : 'Full search'}</span>
  ),
}));
vi.mock('@/features/ui/ContentModeSwitcher', () => ({
  ContentModeSwitcher: ({ compact }: { compact: boolean }) => (
    <span>{compact ? 'Compact content' : 'Full content'}</span>
  ),
}));
vi.mock('@/features/ui/LanguageSwitcher', () => ({
  LanguageSwitcher: ({ compact }: { compact: boolean }) => (
    <span>{compact ? 'Compact language' : 'Full language'}</span>
  ),
}));

import { Sidebar } from './Sidebar';

const renderSidebar = (node: React.ReactNode, path = '/') =>
  render(<MemoryRouter initialEntries={[path]}>{node}</MemoryRouter>);

describe('Sidebar', () => {
  beforeEach(() => useSidebarStore.setState({ collapsed: false }));

  it('renders expanded navigation and toggles to compact controls', () => {
    renderSidebar(<Sidebar />);
    expect(screen.getByText('Fumble')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to home page' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByText('Full search')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(screen.queryByText('Fumble')).toBeNull();
    expect(screen.getByText('Compact search')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
    expect(screen.getByTitle('Home')).toBeInTheDocument();
  });

  it('stays labeled when collapse is disabled and reports navigation', () => {
    const onNavigate = vi.fn();
    useSidebarStore.setState({ collapsed: true });
    renderSidebar(<Sidebar collapsible={false} onNavigate={onNavigate} />, '/dice/');
    expect(screen.getByText('Full language')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sidebar/i })).toBeNull();
    fireEvent.click(screen.getByRole('link', { name: 'Return to home page' }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('link', { name: 'Home' }));
    expect(onNavigate).toHaveBeenCalledTimes(2);
  });

  it('marks the current page without an edge strip', () => {
    const { container } = renderSidebar(<Sidebar />, '/dice/');
    const current = screen.getByRole('link', { current: 'page' });
    expect(current).toHaveTextContent('Dice Roller');
    expect(current.querySelector('.bg-arcane-700')).not.toBeNull();
    expect(container.querySelector('[class*="w-[3px]"]')).toBeNull();
  });

  it('marks Compendium for the hub and for categories outside the menu', () => {
    const hub = renderSidebar(<Sidebar />, '/pl/compendium/');
    expect(screen.getByRole('link', { current: 'page' })).toHaveTextContent('Kompendium');
    hub.unmount();

    const other = renderSidebar(<Sidebar />, '/compendium/deities/tyr');
    expect(screen.getByRole('link', { current: 'page' })).toHaveTextContent('Compendium');
    other.unmount();

    const listed = renderSidebar(<Sidebar />, '/compendium/spells/fireball');
    expect(screen.getByRole('link', { current: 'page' })).toHaveTextContent('Spells');
    listed.unmount();

    useSidebarStore.setState({ collapsed: true });
    renderSidebar(<Sidebar />, '/dice');
    expect(screen.getByTitle('Compendium')).not.toHaveAttribute('aria-current');
  });

  it('renders inactive navigation states', () => {
    renderSidebar(<Sidebar />, '/not-a-route');
    expect(screen.queryByRole('link', { current: 'page' })).toBeNull();
  });
});
