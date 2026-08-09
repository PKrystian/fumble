import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { loadReferenceHint, loadReferenceName, resolveReference } = vi.hoisted(() => ({
  loadReferenceHint: vi.fn(),
  loadReferenceName: vi.fn(),
  resolveReference: vi.fn(),
}));

vi.mock('./referenceHint', () => ({
  loadReferenceHint,
  loadReferenceName,
  resolveReference,
}));

import { ReferenceLink } from './ReferenceLink';

const renderLink = () =>
  render(
    <MemoryRouter>
      <ReferenceLink category="spells" slug="fireball" label="Fireball" />
    </MemoryRouter>,
  );

describe('ReferenceLink', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    loadReferenceHint.mockReset();
    loadReferenceName.mockReset();
    resolveReference.mockReset();
    loadReferenceName.mockResolvedValue(null);
    loadReferenceHint.mockResolvedValue(null);
    resolveReference.mockResolvedValue({
      item: { id: 'fireball', name: 'Fireball' },
      slug: 'fireball',
    });
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('replaces an English label with a loaded localized name', async () => {
    loadReferenceName.mockResolvedValue('Kula Ognia');
    renderLink();
    await act(async () => undefined);
    expect(screen.getByRole('link', { name: 'Kula Ognia' })).toHaveAttribute(
      'href',
      '/compendium/spells/fireball/',
    );
  });

  it('shows loading and resolved details below a high link', async () => {
    let resolveHint!: (value: {
      name: string;
      englishName: string;
      subtitle: string;
      description: string;
    }) => void;
    loadReferenceHint.mockReturnValue(
      new Promise((resolve) => {
        resolveHint = resolve;
      }),
    );
    renderLink();
    await act(async () => undefined);
    const link = screen.getByRole('link');
    vi.spyOn(link, 'getBoundingClientRect').mockReturnValue({
      left: 40,
      top: 100,
      bottom: 120,
      right: 80,
      width: 40,
      height: 20,
      x: 40,
      y: 100,
      toJSON: () => ({}),
    });

    fireEvent.mouseEnter(link);
    act(() => vi.advanceTimersByTime(220));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Loading');
    expect(screen.getByRole('tooltip')).toHaveStyle({ top: '128px', left: '40px' });

    await act(async () =>
      resolveHint({
        name: 'Kula Ognia',
        englishName: 'Fireball',
        subtitle: '3rd-level evocation',
        description: 'A bright streak flashes.',
      }),
    );
    expect(screen.getByRole('tooltip')).toHaveTextContent('Kula Ognia');
    expect(screen.getByRole('tooltip')).toHaveTextContent('3rd-level evocation');
    expect(screen.getByRole('tooltip')).toHaveTextContent('A bright streak flashes.');

    fireEvent.scroll(window);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('places a fallback tooltip above and clamps its left edge', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 200 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    renderLink();
    await act(async () => undefined);
    const link = screen.getByRole('link');
    vi.spyOn(link, 'getBoundingClientRect').mockReturnValue({
      left: 500,
      top: 300,
      bottom: 320,
      right: 540,
      width: 40,
      height: 20,
      x: 500,
      y: 300,
      toJSON: () => ({}),
    });

    fireEvent.focus(link);
    act(() => vi.advanceTimersByTime(220));
    await act(async () => undefined);
    expect(screen.getByRole('tooltip')).toHaveStyle({
      bottom: '508px',
      left: '8px',
    });
    expect(screen.getByRole('tooltip')).toHaveTextContent('Open to view the full entry.');

    fireEvent.resize(window);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('cancels pending timers and shows previews on touch devices', async () => {
    renderLink();
    await act(async () => undefined);
    const link = screen.getByRole('link');
    fireEvent.mouseEnter(link);
    fireEvent.mouseEnter(link);
    fireEvent.mouseLeave(link);
    act(() => vi.advanceTimersByTime(220));
    expect(screen.queryByRole('tooltip')).toBeNull();

    vi.mocked(window.matchMedia).mockReturnValue({ matches: false } as MediaQueryList);
    fireEvent.mouseEnter(link);
    act(() => vi.advanceTimersByTime(220));
    await act(async () => undefined);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Open to view the full entry.');
  });

  it('ignores a localized name resolved after unmounting', async () => {
    let resolveName!: (value: string) => void;
    loadReferenceName.mockReturnValue(
      new Promise((resolve) => {
        resolveName = resolve;
      }),
    );
    const { unmount } = renderLink();
    unmount();
    await act(async () => resolveName('Kula Ognia'));
  });

  it('renders unresolved references as text instead of a broken link', async () => {
    resolveReference.mockResolvedValue(null);
    renderLink();
    await act(async () => undefined);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Fireball')).toBeInTheDocument();
  });
});
