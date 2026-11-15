import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FumbleLibrary } from './FumbleLibrary';
import { useFumbleHomebrewStore } from './fumbleHomebrewStore';

function HistoryControls() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <output data-testid="location">{location.search}</output>
      <button type="button" onClick={() => navigate(-1)}>
        Back
      </button>
    </>
  );
}

describe('FumbleLibrary', { timeout: 30_000 }, () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
    localStorage.clear();
    useFumbleHomebrewStore.setState({
      showInCompendium: false,
      compendiumCampaigns: null,
      compendiumCategories: null,
    });
  });

  it('lists localized entries and links them to Compendium routes', () => {
    render(
      <MemoryRouter initialEntries={['/fumble-homebrew?category=classes']}>
        <FumbleLibrary />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Fumble homebrew library' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^WitchHomebrew/ })).toHaveAttribute(
      'href',
      '/compendium/classes/witch/',
    );
    expect(screen.getByRole('link', { name: /Zerth Warrior/ })).toHaveAttribute(
      'href',
      '/compendium/classes/monk/zerth-warrior/',
    );
    expect(screen.queryByRole('link', { name: /Oathbreaker/ })).not.toBeInTheDocument();
  });

  it('toggles Compendium visibility and handles an empty search', () => {
    render(
      <MemoryRouter>
        <FumbleLibrary />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'In the Compendium: disabled' }));
    const toggle = screen.getByRole('checkbox', {
      name: /Show Fumble homebrew in the Compendium/,
    });
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), {
      target: { value: 'no such entry' },
    });
    expect(screen.getByText('No Fumble entries match this search.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'In the Compendium: enabled · 364 entries' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Clear search' }).at(-1)!);
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });

  it('configures the campaigns and content types shown in the Compendium', () => {
    render(
      <MemoryRouter>
        <FumbleLibrary />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'In the Compendium: disabled' }));
    fireEvent.click(screen.getByRole('button', { name: 'Configure Compendium content' }));
    expect(
      screen.getByRole('dialog', { name: 'Configure Fumble visibility' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Tomb of Annihilation' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Classes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save visibility' }));

    expect(useFumbleHomebrewStore.getState()).toMatchObject({
      compendiumCampaigns: expect.not.arrayContaining(['grobowiec-zaglady']),
      compendiumCategories: expect.not.arrayContaining(['classes']),
    });
  });

  it('filters the catalog by category', () => {
    render(
      <MemoryRouter>
        <FumbleLibrary />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Classes' }));

    expect(screen.getByRole('link', { name: /^WitchHomebrew/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Flanking/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All Fumble content' }));

    expect(screen.getAllByRole('link')).toHaveLength(50);
  });

  it('keeps firearms separate from ordinary items', () => {
    render(
      <MemoryRouter>
        <FumbleLibrary />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Firearms' }));

    expect(screen.getByRole('link', { name: /Pneumatic Pistol/ })).toHaveAttribute(
      'href',
      '/compendium/firearms/pneumatic-pistol/',
    );
    expect(
      screen.queryByRole('link', { name: /Stellar Meteorite Fragment/ }),
    ).not.toBeInTheDocument();
  });

  it('exposes the imported Talent categories', () => {
    render(
      <MemoryRouter>
        <FumbleLibrary />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Psionics' }));
    expect(screen.getByRole('link', { name: /Adapt/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Apothecary/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    expect(screen.getByRole('link', { name: /Manifest a Power/ })).toBeInTheDocument();
  });

  it('stores search and category filters in the URL history', () => {
    render(
      <MemoryRouter initialEntries={['/fumble-homebrew']}>
        <FumbleLibrary />
        <HistoryControls />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), {
      target: { value: 'witch' },
    });
    expect(screen.getByTestId('location')).toHaveTextContent('?q=witch');
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), {
      target: { value: 'witch' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Classes' }));
    expect(screen.getByTestId('location')).toHaveTextContent('?category=classes&q=witch');

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByTestId('location')).toHaveTextContent('?q=witch');
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('witch');
    expect(screen.getByRole('button', { name: 'Classes' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('filters by campaign and persists the selection in the URL', () => {
    render(
      <MemoryRouter initialEntries={['/fumble-homebrew']}>
        <FumbleLibrary />
        <HistoryControls />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tomb of Annihilation' }));
    expect(screen.getByTestId('location')).toHaveTextContent(
      '?campaign=grobowiec-zaglady',
    );
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'Zerth Warrior' },
    });
    expect(
      screen.getByRole('link', { name: /^Monk: Zerth Warrior/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Allied Hunter/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Crystal of Possibilities/ }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All campaigns' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByTestId('location')).toHaveTextContent('');
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'Crystal of Possibilities' },
    });
    expect(
      screen.getByRole('link', { name: /^Crystal of Possibilities/ }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    fireEvent.click(screen.getByRole('button', { name: 'Seven Fugitives' }));
    expect(screen.getByTestId('location')).toHaveTextContent('?campaign=siedmiu-zbiegow');
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'Pneumatic Pistol' },
    });
    expect(screen.getByRole('link', { name: /^Pneumatic Pistol/ })).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Stellar Meteorite Fragment/ }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Border Wanderers' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByTestId('location')).toHaveTextContent('?campaign=wedrowcy-granic');
    expect(screen.getByRole('link', { name: /Armed Gloves/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(
      screen.queryByRole('button', { name: 'Reset filters' }),
    ).not.toBeInTheDocument();
  });

  it('shows the English search name in Polish', () => {
    render(
      <MemoryRouter initialEntries={['/pl/fumble-homebrew?q=Witch']}>
        <FumbleLibrary />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /WiedźmaWitch/ })).toHaveAttribute(
      'href',
      '/pl/compendium/classes/witch/',
    );
  });

  it('paginates results, restores history, and resets the page when sorting or searching', () => {
    render(
      <MemoryRouter initialEntries={['/fumble-homebrew']}>
        <FumbleLibrary />
        <HistoryControls />
      </MemoryRouter>,
    );
    const firstPage = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(firstPage).toHaveLength(50);
    expect(screen.getByText(/Showing 1-50/).parentElement).toHaveTextContent(
      '364 of 364 Showing 1-50',
    );
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByTestId('location')).toHaveTextContent('?page=2');
    expect(screen.getByRole('region', { name: 'Browse Fumble homebrew' })).toHaveFocus();
    expect(
      screen
        .getAllByRole('link')
        .every((link) => !firstPage.includes(link.getAttribute('href'))),
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(
      firstPage,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort by' }), {
      target: { value: 'category' },
    });
    expect(screen.getByTestId('location')).toHaveTextContent('?sort=category');
    expect(screen.getAllByRole('link')[0]).toHaveAttribute(
      'href',
      expect.stringContaining('/actions/'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'witch' } });
    expect(screen.getByTestId('location')).toHaveTextContent('?q=witch&sort=category');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'name' } });
    expect(screen.getByTestId('location')).toHaveTextContent('?q=witch');
    expect(screen.getAllByRole('link')[0]).toHaveAttribute(
      'href',
      '/compendium/classes/witch/',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('combobox')).toHaveValue('category');
  });

  it('clamps stale pages and ignores unsupported URL filters and sorts', () => {
    const view = render(
      <MemoryRouter
        initialEntries={['/fumble-homebrew?page=999&sort=bad&category=bad&campaign=bad']}
      >
        <FumbleLibrary />
      </MemoryRouter>,
    );
    expect(screen.getByText('Page 8 of 8')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(14);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByRole('combobox')).toHaveValue('name');
    view.unmount();
    render(
      <MemoryRouter initialEntries={['/fumble-homebrew?page=abc']}>
        <FumbleLibrary />
      </MemoryRouter>,
    );
    expect(screen.getByText('Page 1 of 8')).toBeInTheDocument();
  });

  it('searches localized metadata and describes subclasses using the localized parent', () => {
    render(
      <MemoryRouter
        initialEntries={['/pl/fumble-homebrew?category=classes&q=Kość Wytrzymałości']}
      >
        <FumbleLibrary />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /^WiedźmaWitch/ })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'Wojownik Zerth' },
    });
    expect(screen.getByText('Podklasa: Mnich - Tradycja Mnicha')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /^Mnich: Wojownik Zerth/ }),
    ).not.toHaveTextContent('{@');
  });

  it('resets only filters when a valid query has no matches in the selected category', () => {
    render(
      <MemoryRouter
        initialEntries={['/fumble-homebrew?category=species&q=Witch&sort=category']}
      >
        <FumbleLibrary />
        <HistoryControls />
      </MemoryRouter>,
    );
    expect(screen.getByText('No Fumble entries match this search.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Filters (1)' }));
    expect(screen.getByRole('button', { name: 'Filters (1)' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Filters (1)' }));
    expect(screen.getByRole('button', { name: 'Filters (1)' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(screen.getByRole('searchbox')).toHaveValue('Witch');
    expect(screen.getByTestId('location')).toHaveTextContent('?q=Witch&sort=category');
    expect(screen.getByRole('link', { name: /^WitchHomebrew/ })).toBeInTheDocument();
  });

  it('keeps visibility settings separate from browsing and cancels unsaved changes', () => {
    render(
      <MemoryRouter initialEntries={['/fumble-homebrew?q=Witch']}>
        <FumbleLibrary />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'In the Compendium: disabled' }));
    fireEvent.click(screen.getByRole('button', { name: 'Configure Compendium content' }));
    expect(screen.getByText(/Saving keeps your selection/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear campaigns' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(useFumbleHomebrewStore.getState().compendiumCampaigns).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Configure Compendium content' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear content types' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save visibility' }));
    expect(useFumbleHomebrewStore.getState().showInCompendium).toBe(false);
    expect(screen.getByRole('link', { name: /^WitchHomebrew/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(
      screen.getByRole('button', { name: 'In the Compendium: enabled · 0 entries' }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'In the Compendium: enabled · 0 entries' }),
    );
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});
