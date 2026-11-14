import { fireEvent, render as renderView, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLightbox } from '@/features/ui/lightboxStore';
import { useSeo } from '@/seo/useSeo';
import { WikiPage } from './WikiPage';

function render(element: ReactElement) {
  return renderView(element, { wrapper: MemoryRouter });
}

function page(slug: string, title: string, category: string, html: string) {
  return {
    campaignId: 'glod-smoka',
    slug,
    title,
    category,
    html,
  };
}

const mocks = vi.hoisted(() => ({
  campaignId: undefined as string | undefined,
  slug: undefined as string | undefined,
  locale: 'pl' as 'en' | 'pl',
  navigate: vi.fn(),
  maps: [] as Array<{ campaignId: string; id: string }>,
  wiki: {
    status: 'ready',
    data: {
      campaigns: [
        {
          id: 'glod-smoka',
          title: 'Głód Smoka',
          pages: [
            page(
              'home',
              'Campaign Home',
              'Main',
              '<p>Welcome %BASE%</p><a data-wiki-link="glod-smoka/lore"><span>Lore link</span></a>',
            ),
            page(
              'lore',
              'Lore',
              'Main',
              '<a data-wiki-link="">Empty target</a><span>Plain text</span>',
            ),
            page('npc', 'NPC', 'People', '<p>Person</p>'),
          ],
        },
      ],
    },
  } as {
    status: 'loading' | 'ready' | 'error';
    data: {
      campaigns: Array<{
        id: string;
        title: string;
        pages: Array<Record<string, string>>;
      }>;
    } | null;
  },
}));

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useParams: () => ({ campaignId: mocks.campaignId, slug: mocks.slug }),
}));

vi.mock('@/features/campaign-map/maps', () => ({
  CAMPAIGN_MAPS: mocks.maps,
  getCampaignMap: (campaignId: string) =>
    mocks.maps.find((map) => map.campaignId === campaignId) ?? null,
}));

vi.mock('@/i18n/path', () => ({
  Link: ({ children, to, ...props }: React.ComponentProps<'a'> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/i18n/pathUtils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/pathUtils')>()),
  useNavigate: () => mocks.navigate,
}));

vi.mock('./useWiki', () => ({
  useWiki: () => mocks.wiki,
}));

vi.mock('@/i18n/useT', () => ({
  useT: () => ({ locale: mocks.locale, t: (key: string) => key }),
}));

vi.mock('@/seo/useSeo', () => ({
  useSeo: vi.fn(),
}));

describe('WikiPage', () => {
  beforeEach(() => {
    mocks.campaignId = undefined;
    mocks.slug = undefined;
    mocks.locale = 'pl';
    mocks.maps.length = 0;
    mocks.navigate.mockReset();
    useLightbox.getState().close();
    mocks.wiki.status = 'ready';
    mocks.wiki.data = {
      campaigns: [
        {
          id: 'glod-smoka',
          title: 'Głód Smoka',
          pages: [
            page(
              'home',
              'Campaign Home',
              'Main',
              '<p>Welcome %BASE%</p><a data-wiki-link="glod-smoka/lore"><span>Lore link</span></a>',
            ),
            page(
              'lore',
              'Lore',
              'Main',
              '<a data-wiki-link="">Empty target</a><span>Plain text</span>',
            ),
            page('npc', 'NPC', 'People', '<p>Person</p>'),
          ],
        },
      ],
    };
    vi.mocked(useSeo).mockClear();
  });

  it('renders loading, error and empty states', () => {
    mocks.wiki.status = 'loading';
    const view = render(<WikiPage />);
    expect(screen.getByText('wiki.loading')).toBeInTheDocument();

    mocks.wiki.status = 'error';
    view.rerender(<WikiPage />);
    expect(screen.getByText('wiki.campaignWiki')).toBeInTheDocument();

    mocks.wiki.status = 'ready';
    mocks.wiki.data = { campaigns: [] };
    view.rerender(<WikiPage />);
    expect(screen.getByText('wiki.noCampaigns')).toBeInTheDocument();

    mocks.wiki.data = null;
    view.rerender(<WikiPage />);
    expect(screen.getByText('wiki.noCampaigns')).toBeInTheDocument();

    mocks.wiki.data = {
      campaigns: [
        {
          id: 'glod-smoka',
          title: 'Głód Smoka',
          pages: [page('home', 'Campaign Home', 'Main', '<p>First body</p>')],
        },
      ],
    };
    mocks.campaignId = 'missing';
    view.rerender(<WikiPage />);
    expect(screen.getByRole('heading', { name: 'notFound.title' })).toBeInTheDocument();
  });

  it('renders campaign landings with and without a map', () => {
    mocks.wiki.data = {
      campaigns: [{ id: 'empty', title: 'Empty Campaign', pages: [] }],
    };
    mocks.campaignId = 'empty';
    const view = render(<WikiPage />);
    expect(screen.getByRole('heading', { name: 'Empty Campaign' })).toBeInTheDocument();
    expect(screen.getByText('wiki.campaignNoPages')).toBeInTheDocument();
    expect(screen.queryByText('wiki.campaignDescription')).toBeNull();

    mocks.maps.push({ campaignId: 'empty', id: 'chult' });
    view.rerender(<WikiPage />);
    expect(screen.getByRole('link', { name: /wiki.chultMap/ })).toHaveAttribute(
      'href',
      '/wiki/empty/map',
    );
  });

  it('groups pages and follows internal wiki links', () => {
    render(<WikiPage />);
    expect(screen.getByRole('heading', { name: 'Campaign Home' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'People' })).toBeInTheDocument();
    expect(screen.getByText(/Welcome/)).toHaveTextContent('Welcome /');

    fireEvent.click(screen.getByText('Lore link'));
    expect(mocks.navigate).toHaveBeenCalledWith('/wiki/glod-smoka/lore');
    fireEvent.click(screen.getByText(/Welcome/));
    expect(mocks.navigate).toHaveBeenCalledTimes(1);
  });

  it('shows the campaign chooser when more than one campaign is available', () => {
    mocks.wiki.data = {
      campaigns: [
        ...(mocks.wiki.data?.campaigns ?? []),
        { id: 'second', title: 'Second Campaign', pages: [] },
      ],
    };
    render(<WikiPage />);
    expect(
      screen.getByRole('heading', { name: 'wiki.chooseCampaign' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Głód Smoka/ })).toHaveAttribute(
      'href',
      '/wiki/glod-smoka',
    );
  });

  it('shows map details in the campaign chooser', () => {
    mocks.maps.push({ campaignId: 'glod-smoka', id: 'chult' });
    mocks.wiki.data = {
      campaigns: [
        ...(mocks.wiki.data?.campaigns ?? []),
        { id: 'second', title: 'Second Campaign', pages: [] },
      ],
    };
    const view = render(<WikiPage />);
    expect(screen.getByText('wiki.chultMap')).toBeInTheDocument();

    mocks.campaignId = 'glod-smoka';
    view.rerender(<WikiPage />);
    expect(
      screen.getByRole('navigation', { name: 'wiki.breadcrumbs' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'wiki.backToCampaigns' })).toHaveAttribute(
      'href',
      '/wiki',
    );
    expect(screen.getByRole('link', { name: /wiki.chultMap/ })).toHaveAttribute(
      'href',
      '/wiki/glod-smoka/map',
    );
  });

  it('selects an explicit page and ignores empty wiki targets', () => {
    mocks.campaignId = 'glod-smoka';
    mocks.slug = 'lore';
    render(<WikiPage />);
    expect(screen.getByRole('heading', { name: 'Lore' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('Empty target'));
    fireEvent.click(screen.getByText('Plain text'));
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('creates bounded excerpts and falls back for empty wiki pages', () => {
    mocks.campaignId = 'glod-smoka';
    mocks.slug = 'lore';
    mocks.wiki.data = {
      campaigns: [
        {
          id: 'glod-smoka',
          title: 'Głód Smoka',
          pages: [page('lore', 'Lore', 'Long', `<p>${'A'.repeat(200)}</p>`)],
        },
      ],
    };

    const view = render(<WikiPage />);
    expect(useSeo).toHaveBeenLastCalledWith(
      'Lore',
      expect.stringMatching(/\.\.\.$/),
      true,
      ['pl'],
    );

    mocks.wiki.data = {
      campaigns: [
        {
          id: 'glod-smoka',
          title: 'Głód Smoka',
          pages: [page('lore', 'Lore', '', '')],
        },
      ],
    };
    view.rerender(<WikiPage />);
    expect(useSeo).toHaveBeenLastCalledWith(
      'Głód Smoka',
      'wiki.campaignNoPages',
      false,
      [],
    );
  });

  it('does not index wiki content under a non-source locale', () => {
    mocks.locale = 'en';
    mocks.campaignId = 'glod-smoka';
    mocks.slug = 'lore';
    render(<WikiPage />);
    expect(useSeo).toHaveBeenLastCalledWith(
      'Lore',
      'Main. Empty target Plain text',
      false,
      [],
    );
  });

  it('opens wiki images in the lightbox', () => {
    mocks.campaignId = 'glod-smoka';
    mocks.slug = 'npc';
    mocks.wiki.data = {
      campaigns: [
        {
          id: 'glod-smoka',
          title: 'Głód Smoka',
          pages: [
            page(
              'npc',
              'NPC',
              'People',
              '<aside><img src="%BASE%wiki-assets/glod-smoka/npc.png" alt="NPC portrait"></aside>',
            ),
          ],
        },
      ],
    };

    render(<WikiPage />);
    fireEvent.click(screen.getByRole('img', { name: 'NPC portrait' }));
    useLightbox.getState().close();
    fireEvent.click(screen.getByRole('link', { name: 'NPC portrait' }));

    expect(useLightbox.getState()).toMatchObject({
      src: expect.stringContaining('/wiki-assets/glod-smoka/npc.png'),
      caption: 'NPC portrait',
    });
  });

  it('supports legacy page paths and rejects unknown page paths', () => {
    mocks.campaignId = 'lore';
    render(<WikiPage />);
    expect(screen.getByRole('heading', { name: 'Lore' })).toBeInTheDocument();

    mocks.campaignId = 'glod-smoka';
    mocks.slug = undefined;
    const view = render(<WikiPage />);
    expect(screen.getByRole('heading', { name: 'Campaign Home' })).toBeInTheDocument();

    mocks.slug = 'missing';
    view.rerender(<WikiPage />);
    expect(screen.getByRole('heading', { name: 'notFound.title' })).toBeInTheDocument();

    mocks.wiki.data = {
      campaigns: [
        {
          id: 'glod-smoka',
          title: 'Głód Smoka',
          pages: [page('first', 'First', 'Only', '<p>First body</p>')],
        },
      ],
    };
    mocks.slug = 'first';
    view.rerender(<WikiPage />);
    expect(screen.getByRole('heading', { name: 'First' })).toBeInTheDocument();
  });

  it('opens the catalog with focus containment and restores focus on Escape', () => {
    render(<WikiPage />);
    const trigger = screen.getByRole('button', { name: 'wiki.allPages' });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    fireEvent.change(within(dialog).getByRole('searchbox'), {
      target: { value: 'Person' },
    });
    expect(within(dialog).getByRole('link', { name: 'NPC' })).toHaveAttribute(
      'href',
      '/wiki/glod-smoka/npc?q=Person',
    );
    expect(within(dialog).queryByRole('link', { name: 'Lore' })).toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('link', { name: 'NPC' }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('preserves modified link clicks, renders contents, and removes failed artwork', () => {
    mocks.campaignId = 'glod-smoka';
    mocks.slug = 'npc';
    mocks.wiki.data!.campaigns[0]!.pages = [
      page(
        'npc',
        'NPC',
        '',
        '<aside class="wiki-infobox"><h3>Portrait</h3><img src="x" alt="Failed"></aside><h2>A</h2><h3>B</h3><h2>C</h2><a data-wiki-link="glod-smoka/lore">Lore link</a><a href="https://example.test" target="_blank">External</a><a href="file" download>Download</a>',
      ),
    ];
    render(<WikiPage />);
    expect(screen.getByText('wiki.contents')).toBeInTheDocument();
    const link = screen.getByText('Lore link');
    expect(link).toHaveAttribute('href', '/pl/wiki/glod-smoka/lore/');
    for (const modifier of [
      { ctrlKey: true },
      { metaKey: true },
      { altKey: true },
      { shiftKey: true },
      { button: 1 },
    ])
      fireEvent.click(link, modifier);
    fireEvent.click(screen.getByText('External'));
    fireEvent.click(screen.getByText('Download'));
    expect(mocks.navigate).not.toHaveBeenCalled();
    fireEvent.error(screen.getByRole('img', { name: 'Failed' }));
    expect(screen.queryByText('Portrait')).toBeNull();
    fireEvent.error(screen.getByRole('heading', { name: 'A' }));
  });

  it('uses a named landing for an empty starter page and retries load failures', () => {
    mocks.campaignId = 'glod-smoka';
    mocks.slug = 'home';
    mocks.wiki.data!.campaigns[0]!.pages = [
      page('home', 'Home', 'General', '<p>Nothing here</p>'),
    ];
    const view = render(<WikiPage />);
    expect(screen.getByRole('heading', { name: 'Głód Smoka' })).toBeInTheDocument();
    expect(screen.queryByText('Home')).toBeNull();
    mocks.maps.push({ campaignId: 'glod-smoka', id: 'chult' });
    view.rerender(<WikiPage />);
    expect(useSeo).toHaveBeenLastCalledWith(
      'Głód Smoka',
      'wiki.campaignNoPages',
      false,
      [],
    );
    mocks.wiki.status = 'error';
    view.rerender(<WikiPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('wiki.loadError');
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
  });

  it('restores a section bookmark and keeps metadata when only its artwork fails', () => {
    mocks.campaignId = 'glod-smoka';
    mocks.slug = 'npc';
    mocks.wiki.data!.campaigns[0]!.pages = [
      page(
        'npc',
        'NPC',
        '',
        '<aside class="wiki-infobox"><img src="x" alt="Failed"><p class="wiki-infobox-summary">Summary</p></aside><a href="/else"><img src="y" alt="Linked"></a><h2>Bookmark</h2>',
      ),
    ];
    const view = renderView(
      <MemoryRouter initialEntries={['/#wiki-section-bookmark']}>
        <WikiPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Bookmark' })).toHaveFocus();
    fireEvent.error(screen.getByRole('img', { name: 'Failed' }));
    fireEvent.error(screen.getByRole('img', { name: 'Linked' }));
    expect(screen.getByText('Summary')).toBeInTheDocument();
    view.unmount();
    renderView(
      <MemoryRouter initialEntries={['/#missing']}>
        <WikiPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'NPC', level: 1 })).toBeInTheDocument();
  });
});
