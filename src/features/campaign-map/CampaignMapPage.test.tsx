import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CampaignMapPage } from './CampaignMapPage';

const mocks = vi.hoisted(() => ({
  campaignId: 'grobowiec-zaglady' as string | undefined,
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ campaignId: mocks.campaignId }),
}));

vi.mock('@/i18n/path', () => ({
  Link: ({ children, to, ...props }: React.ComponentProps<'a'> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/i18n/useT', () => ({
  useT: () => ({
    t: (key: string, vars?: Record<string, string | number>) =>
      vars ? `${key}:${Object.values(vars).join('/')}` : key,
  }),
}));

vi.mock('@/seo/useSeo', () => ({
  useSeo: vi.fn(),
}));

describe('CampaignMapPage', () => {
  beforeEach(() => {
    mocks.campaignId = 'grobowiec-zaglady';
    localStorage.clear();
  });

  it('renders the Chult map controls without release metadata', () => {
    const { container } = render(<CampaignMapPage />);
    expect(screen.getByRole('heading', { name: 'wiki.chultMap' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'wiki.chultMapAlt' })).toHaveAttribute(
      'src',
      '/campaign-maps/chultmap.jpg',
    );
    expect(screen.queryByText('wiki.chultMapDescription')).toBeNull();
    expect(screen.queryByText('wiki.chultMapReadOnly')).toBeNull();
    expect(screen.queryByText('wiki.chultMapUpdateHint')).toBeNull();
    expect(screen.queryByText('wiki.chultMapRevealed')).toBeNull();
    expect(screen.getByRole('group', { name: 'wiki.mapControls' })).toBeInTheDocument();
    const gridToggle = screen.getByRole('button', { name: 'wiki.mapGridShow' });
    expect(gridToggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(gridToggle);
    expect(screen.getByRole('button', { name: 'wiki.mapGridHide' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(container.querySelector('.wiki-chult-map__grid-lines')).toBeInTheDocument();
    expect(container.querySelector('.wiki-chult-map__grid-line')).toHaveAttribute(
      'd',
      expect.stringContaining('M '),
    );
    fireEvent.click(screen.getByRole('button', { name: 'wiki.mapGridHide' }));
    expect(screen.getByRole('button', { name: 'wiki.mapGridShow' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(
      container.querySelector('.wiki-chult-map__grid-lines'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'wiki.mapZoomOut' })).toBeDisabled();
    expect(screen.getByText('wiki.mapZoomLevel:100')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'wiki.mapZoomIn' }));
    expect(screen.getByText('wiki.mapZoomLevel:125')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'wiki.mapZoomOut' }));
    expect(screen.getByText('wiki.mapZoomLevel:100')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'wiki.mapResetView' }));
    expect(screen.getByText('wiki.mapZoomLevel:100')).toBeInTheDocument();

    const viewport = container.querySelector<HTMLElement>('.wiki-chult-map__viewport');
    expect(viewport).not.toBeNull();
    fireEvent.wheel(viewport!, { deltaY: -100 });
    expect(screen.getByText('wiki.mapZoomLevel:125')).toBeInTheDocument();
    fireEvent.wheel(viewport!, { deltaY: 100 });
    expect(screen.getByText('wiki.mapZoomLevel:100')).toBeInTheDocument();
  });

  it('shows an unavailable state for unknown campaigns', () => {
    mocks.campaignId = 'missing';
    render(<CampaignMapPage />);
    expect(
      screen.getByRole('heading', { name: 'wiki.mapUnavailable' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /wiki.backToCampaigns/ })).toHaveAttribute(
      'href',
      '/wiki',
    );
  });

  it('shows an unavailable state when no campaign is selected', () => {
    mocks.campaignId = undefined;
    render(<CampaignMapPage />);
    expect(
      screen.getByRole('heading', { name: 'wiki.mapUnavailable' }),
    ).toBeInTheDocument();
  });

  it('pans a zoomed map and resets the view', () => {
    const { container } = render(<CampaignMapPage />);
    const viewport = container.querySelector<HTMLElement>('.wiki-chult-map__viewport');
    const canvas = container.querySelector<HTMLElement>('.wiki-chult-map__canvas');
    expect(viewport).not.toBeNull();
    expect(canvas).not.toBeNull();

    fireEvent.pointerDown(viewport!, { pointerId: 1, clientX: 10, clientY: 10 });
    expect(viewport).not.toHaveClass('wiki-chult-map__viewport--dragging');
    fireEvent.pointerUp(viewport!, { pointerId: 2 });
    fireEvent.pointerMove(viewport!, { pointerId: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'wiki.mapZoomIn' }));
    fireEvent.pointerDown(viewport!, { clientX: 10, clientY: 10 });
    expect(viewport).toHaveClass('wiki-chult-map__viewport--dragging');
    fireEvent.pointerMove(viewport!, { pointerId: 2, clientX: 20, clientY: 20 });
    fireEvent.pointerMove(viewport!, { clientX: 40, clientY: 40 });
    expect(canvas?.style.transform).toContain('translate3d(0px, 0px');
    fireEvent.pointerUp(viewport!);
    expect(viewport).not.toHaveClass('wiki-chult-map__viewport--dragging');
    fireEvent.pointerDown(viewport!, { clientX: 0, clientY: 0 });
    fireEvent.pointerMove(viewport!, { clientX: 0, clientY: 0 });
    fireEvent.pointerUp(viewport!);
    fireEvent.click(screen.getByRole('button', { name: 'wiki.mapResetView' }));
    expect(canvas).toHaveStyle({ transform: 'translate3d(0px, 0px, 0) scale(1)' });
  });

  it('edits hexes locally and exports the generated ranges', async () => {
    const { container } = render(<CampaignMapPage />);
    fireEvent.click(screen.getByRole('button', { name: 'wiki.mapEditorOpen' }));

    const hiddenHex = container.querySelector<HTMLElement>(
      '.wiki-chult-map__hex:not(.wiki-chult-map__hex--revealed)',
    );
    const initialRevealedCount = container.querySelectorAll(
      '.wiki-chult-map__hex--revealed',
    ).length;
    expect(hiddenHex).not.toBeNull();
    fireEvent.keyDown(hiddenHex!, { key: 'Tab' });
    fireEvent.click(hiddenHex!);
    expect(hiddenHex).toHaveClass('wiki-chult-map__hex--revealed');
    expect(
      screen.getByText(`wiki.mapEditorState:${initialRevealedCount + 1}/6120`),
    ).toBeInTheDocument();

    const saved = JSON.parse(
      localStorage.getItem('fumble-campaign-map-editor:grobowiec-zaglady') ?? '[]',
    ) as number[];
    expect(saved).toContain(0);

    fireEvent.keyDown(hiddenHex!, { key: ' ' });
    expect(hiddenHex).not.toHaveClass('wiki-chult-map__hex--revealed');
    const clipboard = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboard },
    });
    fireEvent.click(screen.getByRole('button', { name: 'wiki.mapEditorCopyRanges' }));
    await waitFor(() =>
      expect(clipboard).toHaveBeenCalledWith(expect.stringContaining('revealedRanges')),
    );
    expect(screen.getByText('wiki.mapEditorCopied')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'wiki.mapEditorReset' }));
    expect(
      localStorage.getItem('fumble-campaign-map-editor:grobowiec-zaglady'),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'wiki.mapEditorClose' }));
    expect(
      screen.queryByRole('complementary', { name: 'wiki.mapEditorTitle' }),
    ).toBeNull();
  }, 30000);
});
