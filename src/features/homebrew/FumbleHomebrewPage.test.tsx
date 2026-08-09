import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { FumbleHomebrewPage } from './FumbleHomebrewPage';
import { useFumbleHomebrewStore } from './fumbleHomebrewStore';

describe('FumbleHomebrewPage', () => {
  beforeEach(() => {
    localStorage.clear();
    useFumbleHomebrewStore.setState({
      showInCompendium: false,
      compendiumCampaigns: null,
      compendiumCategories: null,
    });
  });

  it('renders the campaign homebrew library as its own page', () => {
    render(
      <MemoryRouter initialEntries={['/pl/fumble-homebrew']}>
        <FumbleHomebrewPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Biblioteka homebrew Fumble', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^WiedźmaWitch/ })).toHaveAttribute(
      'href',
      '/pl/compendium/classes/witch/',
    );
    expect(screen.getByRole('textbox', { name: 'Szukaj' })).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Zasady kampanii, opcje, klasy, linie krwi, podklasy i przedmioty utrzymywane przez twórców Fumble.',
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        'Domyślnie wyłączone. Bezpośrednie linki do wpisów Fumble nadal działają po wyłączeniu.',
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Linki otwierają zwykłe wpisy Kompendium.'),
    ).not.toBeInTheDocument();
  }, 30_000);
});
