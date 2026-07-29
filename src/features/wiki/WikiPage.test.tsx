import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WikiPage } from './WikiPage';

const mocks = vi.hoisted(() => ({
  slug: undefined as string | undefined,
  navigate: vi.fn(),
  wiki: {
    status: 'ready',
    data: {
      pages: [
        {
          slug: 'home',
          title: 'Campaign Home',
          category: 'Main',
          html: '<p>Welcome %BASE%</p><a data-wiki-link="lore"><span>Lore link</span></a>',
        },
        {
          slug: 'lore',
          title: 'Lore',
          category: 'Main',
          html: '<a data-wiki-link="">Empty target</a><span>Plain text</span>',
        },
        {
          slug: 'npc',
          title: 'NPC',
          category: 'People',
          html: '<p>Person</p>',
        },
      ],
    },
  } as {
    status: 'loading' | 'ready' | 'error';
    data: { pages: Array<Record<string, string>> } | null;
  },
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ slug: mocks.slug }),
}));

vi.mock('@/i18n/path', () => ({
  Link: ({ children, to, ...props }: React.ComponentProps<'a'> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => mocks.navigate,
}));

vi.mock('./useWiki', () => ({
  useWiki: () => mocks.wiki,
}));

vi.mock('./html', () => ({
  sanitizeWikiHtml: (html: string) => html,
}));

vi.mock('@/i18n/useT', () => ({
  useT: () => ({ t: (key: string) => key }),
}));

vi.mock('@/seo/useSeo', () => ({
  useSeo: vi.fn(),
}));

describe('WikiPage', () => {
  beforeEach(() => {
    mocks.slug = undefined;
    mocks.navigate.mockReset();
    mocks.wiki.status = 'ready';
    mocks.wiki.data = {
      pages: [
        {
          slug: 'home',
          title: 'Campaign Home',
          category: 'Main',
          html: '<p>Welcome %BASE%</p><a data-wiki-link="lore"><span>Lore link</span></a>',
        },
        {
          slug: 'lore',
          title: 'Lore',
          category: 'Main',
          html: '<a data-wiki-link="">Empty target</a><span>Plain text</span>',
        },
        {
          slug: 'npc',
          title: 'NPC',
          category: 'People',
          html: '<p>Person</p>',
        },
      ],
    };
  });

  it('renders loading, error and empty states', () => {
    mocks.wiki.status = 'loading';
    const view = render(<WikiPage />);
    expect(screen.getByText('wiki.loading')).toBeInTheDocument();

    mocks.wiki.status = 'error';
    view.rerender(<WikiPage />);
    expect(screen.getByText('wiki.campaignWiki')).toBeInTheDocument();

    mocks.wiki.status = 'ready';
    mocks.wiki.data = { pages: [] };
    view.rerender(<WikiPage />);
    expect(screen.getByText(/npm run wiki:build/).parentElement).toHaveTextContent(
      'wiki.noContentYet',
    );

    mocks.wiki.data = null;
    view.rerender(<WikiPage />);
    expect(screen.getByText(/npm run wiki:build/).parentElement).toHaveTextContent(
      'wiki.noContentYet',
    );
  });

  it('groups pages and follows internal wiki links', () => {
    render(<WikiPage />);
    expect(screen.getByRole('heading', { name: 'Campaign Home' })).toBeInTheDocument();
    expect(screen.getAllByText('Main')).toHaveLength(1);
    expect(screen.getByText('People')).toBeInTheDocument();
    expect(screen.getByText(/Welcome/)).toHaveTextContent('Welcome /');

    fireEvent.click(screen.getByText('Lore link'));
    expect(mocks.navigate).toHaveBeenCalledWith('/wiki/lore');
    fireEvent.click(screen.getByText(/Welcome/));
    expect(mocks.navigate).toHaveBeenCalledTimes(1);
  });

  it('selects an explicit page and ignores empty wiki targets', () => {
    mocks.slug = 'lore';
    render(<WikiPage />);
    expect(screen.getByRole('heading', { name: 'Lore' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('Empty target'));
    fireEvent.click(screen.getByText('Plain text'));
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('falls back to the home page and then the first page', () => {
    mocks.slug = 'missing';
    const view = render(<WikiPage />);
    expect(screen.getByRole('heading', { name: 'Campaign Home' })).toBeInTheDocument();

    mocks.wiki.data = {
      pages: [
        {
          slug: 'first',
          title: 'First',
          category: 'Only',
          html: '<p>First body</p>',
        },
      ],
    };
    view.rerender(<WikiPage />);
    expect(screen.getByRole('heading', { name: 'First' })).toBeInTheDocument();
  });
});
