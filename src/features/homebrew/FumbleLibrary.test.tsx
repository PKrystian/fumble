import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
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

describe('FumbleLibrary', () => {
  beforeEach(() => {
    localStorage.clear();
    useFumbleHomebrewStore.setState({ showInCompendium: false });
  });

  it('lists localized entries and links them to Compendium routes', () => {
    render(
      <MemoryRouter>
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

    const toggle = screen.getByRole('checkbox', {
      name: /Show Fumble homebrew in the Compendium/,
    });
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();

    fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), {
      target: { value: 'no such entry' },
    });
    expect(screen.getByText('No Fumble entries match this search.')).toBeInTheDocument();
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

    expect(screen.getByRole('link', { name: /Flanking/ })).toBeInTheDocument();
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

  it('stores search and category filters in the URL history', () => {
    render(
      <MemoryRouter initialEntries={['/fumble-homebrew']}>
        <FumbleLibrary />
        <HistoryControls />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), {
      target: { value: 'witch' },
    });
    expect(screen.getByTestId('location')).toHaveTextContent('?q=witch');

    fireEvent.click(screen.getByRole('button', { name: 'Classes' }));
    expect(screen.getByTestId('location')).toHaveTextContent('?category=classes&q=witch');

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByTestId('location')).toHaveTextContent('?q=witch');
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveValue('witch');
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
    expect(screen.getByRole('link', { name: /Zerth Warrior/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Allied Hunter/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Crystal of Possibilities/ }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All campaigns' }));
    expect(screen.getByTestId('location')).toHaveTextContent('');
    expect(
      screen.getByRole('link', { name: /Crystal of Possibilities/ }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Seven Fugitives' }));
    expect(screen.getByTestId('location')).toHaveTextContent('?campaign=siedmiu-zbiegow');
    expect(screen.getByRole('link', { name: /Pneumatic Pistol/ })).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Stellar Meteorite Fragment/ }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Border Wanderers' }));
    expect(screen.getByTestId('location')).toHaveTextContent('?campaign=wedrowcy-granic');
    expect(screen.getByRole('link', { name: /Armed Gloves/ })).toBeInTheDocument();
  });

  it('shows the English search name in Polish', () => {
    render(
      <MemoryRouter initialEntries={['/pl/homebrew']}>
        <FumbleLibrary />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /WiedźmaWitch/ })).toHaveAttribute(
      'href',
      '/pl/compendium/classes/witch/',
    );
  });
});
