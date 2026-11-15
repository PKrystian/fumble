import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRollStore } from '@/features/dice/rollStore';
import { useSearchStore } from '@/features/search/searchStore';
import { HomePage } from './HomePage';

const mocks = vi.hoisted(() => ({ loadBookTitle: vi.fn() }));
vi.mock('./bookTitle', () => ({ loadBookTitle: mocks.loadBookTitle }));

const stored = (state: unknown, version = 1) => JSON.stringify({ version, state });

const renderHome = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <HomePage />
    </MemoryRouter>,
  );

function seed() {
  localStorage.setItem(
    'fumble-characters',
    stored({
      characters: {
        a: { id: 'a', name: 'Mira', level: 5, updatedAt: 2, createdAt: 1 },
        b: { id: 'b', name: '', level: 1, updatedAt: 1 },
      },
    }),
  );
  localStorage.setItem(
    'fumble-book-reading',
    stored({
      positions: { phb: { chapter: 3, section: 'rest', updatedAt: 1 } },
      wholeBook: false,
      wide: false,
    }),
  );
  localStorage.setItem(
    'fumble-sessions',
    stored({ sessions: [{ id: 's', title: '', createdAt: 1 }], selectedSessionId: 's' }),
  );
  localStorage.setItem(
    'fumble-initiative',
    stored(
      {
        combatants: [
          {
            id: 'x',
            name: 'Goblin',
            initiative: 12,
            ac: null,
            hpCurrent: null,
            hpMax: null,
            conditions: '',
            isPlayer: false,
          },
        ],
        round: 0,
        turnId: null,
      },
      2,
    ),
  );
  localStorage.setItem(
    'fumble-encounter',
    stored({ draft: { name: '', monsters: [{ count: 2 }] } }),
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.loadBookTitle.mockReset();
    mocks.loadBookTitle.mockResolvedValue("Player's Handbook");
    useSearchStore.setState({ open: false });
    useRollStore.setState({ log: [], dockOpen: false });
  });

  it('shows the first steps, search and every tool without local data', () => {
    renderHome();
    expect(screen.getByRole('heading', { level: 1, name: 'Fumble' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Continue' })).toBeNull();
    const start = screen.getByRole('region', { name: 'Start here' });
    expect(
      within(start).getByRole('link', { name: 'Create a character' }),
    ).toHaveAttribute('href', '/character/');
    expect(
      within(start).getByRole('link', { name: 'Browse the compendium' }),
    ).toHaveAttribute('href', '/compendium/');
    expect(within(start).getByRole('link', { name: 'Roll dice' })).toHaveAttribute(
      'href',
      '/dice/',
    );

    for (const name of [
      'Player',
      'Rules and references',
      'Dungeon Master',
      'Campaign',
      'Utilities',
    ])
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    const rules = screen.getByRole('region', { name: 'Rules and references' });
    expect(within(rules).getAllByRole('link')[0]).toHaveAttribute('href', '/compendium/');
    expect(
      screen.getByRole('link', { name: /^Characters Create, import/ }),
    ).toHaveAttribute('href', '/character/');
    expect(screen.getAllByRole('link', { name: /Dice Roller/ })).toHaveLength(1);
    expect(mocks.loadBookTitle).not.toHaveBeenCalled();
    expect(screen.queryByRole('complementary')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(screen.getByText('Search spells, monsters, and tools')).toBeVisible();
    expect(useSearchStore.getState().open).toBe(true);
  });

  it('continues from saved characters, reading, journal, initiative and encounter', async () => {
    seed();
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    renderHome();
    const region = screen.getByRole('region', { name: 'Continue' });
    expect(screen.queryByRole('heading', { name: 'Start here' })).toBeNull();
    expect(
      within(region).getByRole('link', { name: 'Mira Character, level 5' }),
    ).toHaveAttribute('href', '/character/a/');
    expect(
      within(region).getByRole('link', { name: 'Unnamed Character, level 1' }),
    ).toHaveAttribute('href', '/character/b/');
    expect(
      within(region).getByRole('link', { name: 'Books Continue reading' }),
    ).toBeVisible();
    expect(
      await within(region).findByRole('link', {
        name: "Player's Handbook Continue reading",
      }),
    ).toHaveAttribute('href', '/books/phb/3/#section=rest');
    expect(mocks.loadBookTitle).toHaveBeenCalledWith('phb', 3, 'en');
    expect(
      within(region).getByRole('link', { name: 'Untitled session Session journal' }),
    ).toHaveAttribute('href', '/session-log/');
    expect(
      within(region).getByRole('link', {
        name: 'Initiative Not started, participants: 1',
      }),
    ).toHaveAttribute('href', '/dm/initiative/');
    expect(
      within(region).getByRole('link', {
        name: 'Encounter draft Encounter, creatures: 2',
      }),
    ).toHaveAttribute('href', '/dm/encounter/');
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
    expect(screen.getByRole('complementary', { name: 'Data backup' })).toBeVisible();
  });

  it('uses Polish labels and named saved items', async () => {
    seed();
    localStorage.setItem(
      'fumble-sessions',
      stored({ sessions: [{ id: 's', title: 'Krypta', createdAt: 1 }] }),
    );
    localStorage.setItem(
      'fumble-encounter',
      stored({ draft: { name: 'Zasadzka', monsters: [{ count: 4 }] } }),
    );
    const initiative = JSON.parse(localStorage.getItem('fumble-initiative')!) as {
      state: { round: number; turnId: string | null };
    };
    initiative.state.round = 3;
    initiative.state.turnId = 'x';
    localStorage.setItem('fumble-initiative', JSON.stringify(initiative));
    renderHome('/pl/');
    const region = screen.getByRole('region', { name: 'Kontynuuj' });
    expect(
      within(region).getByRole('link', { name: 'Mira Postać, poziom 5' }),
    ).toHaveAttribute('href', '/pl/character/a/');
    expect(
      within(region).getByRole('link', { name: 'Krypta Dziennik sesji' }),
    ).toBeVisible();
    expect(
      within(region).getByRole('link', { name: 'Inicjatywa Runda 3, uczestnicy: 1' }),
    ).toBeVisible();
    expect(
      within(region).getByRole('link', { name: 'Zasadzka Starcie, stworzenia: 4' }),
    ).toBeVisible();
    await waitFor(() => expect(mocks.loadBookTitle).toHaveBeenCalledWith('phb', 3, 'pl'));
    expect(await within(region).findByText('Czytaj dalej')).toBeVisible();
    expect(screen.getByText('Szukaj czarów, potworów i narzędzi')).toBeVisible();
  });

  it('hides a reading position whose book is gone or cannot be loaded', async () => {
    localStorage.setItem(
      'fumble-book-reading',
      stored({
        positions: { gone: { chapter: 0, updatedAt: 1 } },
        wholeBook: false,
        wide: false,
      }),
    );
    mocks.loadBookTitle.mockResolvedValueOnce(null);
    const view = renderHome();
    expect(screen.getByRole('link', { name: 'Books Continue reading' })).toHaveAttribute(
      'href',
      '/books/gone/0/',
    );
    expect(await screen.findByRole('heading', { name: 'Start here' })).toBeVisible();
    view.unmount();

    mocks.loadBookTitle.mockRejectedValueOnce(new Error('offline'));
    renderHome();
    expect(await screen.findByRole('heading', { name: 'Start here' })).toBeVisible();
  });

  it('refreshes after another tab changes data and ignores a late title', async () => {
    let resolve: (name: string) => void = () => undefined;
    mocks.loadBookTitle.mockReturnValue(
      new Promise<string>((done) => {
        resolve = done;
      }),
    );
    const view = renderHome();
    expect(screen.getByRole('heading', { name: 'Start here' })).toBeVisible();
    seed();
    act(() => {
      window.dispatchEvent(new Event('storage'));
    });
    expect(screen.getByRole('heading', { name: 'Continue' })).toBeVisible();
    localStorage.clear();
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(screen.getByRole('heading', { name: 'Start here' })).toBeVisible();
    view.unmount();
    await act(async () => {
      resolve('Late');
      await Promise.resolve();
    });
    act(() => {
      window.dispatchEvent(new Event('storage'));
    });
    expect(screen.queryByText('Late')).toBeNull();
  });
});
