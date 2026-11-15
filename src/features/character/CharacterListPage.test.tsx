import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDialogStore } from '@/features/ui/confirmStore';
import { CHARACTER_PAGE_SIZE, CharacterListPage } from './CharacterListPage';
import { CHARACTERS_KEY, serializeCharacters } from './characterData';
import { useLayoutStore } from './layoutStore';
import { createCharacter, type Character } from './model';
import { useCharacterStore } from './store';

const mocks = vi.hoisted(() => ({ download: vi.fn() }));

vi.mock('@/features/storage/downloadFile', () => ({
  downloadTextFile: (...args: unknown[]) => mocks.download(...args),
}));

vi.mock('@/features/compendium/categories', () => ({
  getCategory: (id: string) => ({ id }),
}));

vi.mock('@/features/compendium/useCategoryItems', () => ({
  useCategoryItems: (category: { id: string }) => ({
    status: 'ready',
    items:
      category.id === 'classes'
        ? [{ id: 'wizard', name: 'Czarodziej', englishName: 'Wizard', source: 'XPHB' }]
        : category.id === 'species'
          ? [{ id: 'elf', name: 'Elf', source: 'XPHB' }]
          : [{ id: 'sage', name: 'Sage', source: 'XPHB' }],
  }),
}));

function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

function seed(characters: Character[]) {
  localStorage.setItem(
    CHARACTERS_KEY,
    serializeCharacters({
      characters: Object.fromEntries(characters.map((c) => [c.id, c])),
      order: characters.map((c) => c.id),
    }),
  );
  useCharacterStore.getState().reloadStored();
}

function mount(path = '/character') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/character" element={<CharacterListPage />} />
        <Route path="/character/:id" element={<p>sheet</p>} />
      </Routes>
      <Location />
    </MemoryRouter>,
  );
}

function hero(name: string, changes: Partial<Character> = {}): Character {
  return { ...createCharacter(name), ...changes };
}

async function answer(value: boolean) {
  await act(async () => useDialogStore.getState().respond(value));
}

function names() {
  const { characters, order } = useCharacterStore.getState();
  return order.map((id) => characters[id]!.name);
}

describe('CharacterListPage', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.download.mockReset();
    useLayoutStore.getState().reset();
    seed([]);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates the first character from the empty state', () => {
    mount();
    expect(
      screen.getByText('No characters yet. Create one to get started.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Import and export' })).toHaveAttribute(
      'href',
      '/data/',
    );
    fireEvent.click(screen.getByRole('button', { name: 'New Character' }));
    expect(screen.getByTestId('location')).toHaveTextContent(
      `/character/${useCharacterStore.getState().order[0]}`,
    );
  });

  it('searches, filters, sorts and paginates characters', () => {
    const list = [
      hero('Żaneta', { className: 'wizard', level: 3, updatedAt: 3 }),
      hero('Bram', { species: 'elf', role: 'dm', level: 9, updatedAt: 9 }),
      hero('', { background: 'sage', level: 1, updatedAt: 1 }),
      ...Array.from({ length: CHARACTER_PAGE_SIZE }, (_, index) =>
        hero(`Hero ${String(index).padStart(2, '0')}`, { updatedAt: 0 }),
      ),
    ];
    seed(list);
    mount();
    const status = screen.getByText(/Showing 1-50 of 53/);
    expect(status).toHaveTextContent(
      'Showing 1-50 of 53 matching characters (53 saved).',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByTestId('location')).toHaveTextContent('page=2');
    expect(screen.getByText(/Showing 51-53/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/character');
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

    const search = screen.getByRole('searchbox', { name: 'Search characters' });
    fireEvent.change(search, { target: { value: 'zaneta' } });
    expect(screen.getByTestId('location')).not.toHaveTextContent('page');
    fireEvent.click(
      within(screen.getByRole('region', { name: 'Find characters' })).getByRole(
        'button',
        {
          name: 'Clear search',
        },
      ),
    );
    fireEvent.change(search, { target: { value: 'zaneta' } });
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByText('Level 3 - Czarodziej')).toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'wizard' } });
    expect(screen.getAllByRole('article')).toHaveLength(1);
    fireEvent.change(search, { target: { value: 'ELF' } });
    expect(screen.getByText('Level 9 - Elf')).toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'sage' } });
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Unnamed')).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'nobody' } });
    expect(
      screen.getByText('No characters match your search and filters.'),
    ).toBeInTheDocument();
    expect(screen.getByText('No matching characters (53 saved).')).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByText(/No characters match/).parentElement!).getByRole('button', {
        name: 'Clear search',
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'DM characters' }));
    expect(screen.getByTestId('location')).toHaveTextContent('role=dm');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByText('DM')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Party' }));
    expect(screen.getAllByRole('article')).toHaveLength(50);
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    fireEvent.click(screen.getByRole('button', { name: 'Party' }));
    fireEvent.change(search, { target: { value: 'bram' } });
    const empty = screen.getByText(/No characters match/).parentElement!;
    fireEvent.click(within(empty).getByRole('button', { name: 'Reset filters' }));
    expect(screen.getByTestId('location')).not.toHaveTextContent('role');
    fireEvent.click(screen.getByRole('button', { name: 'Party' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Reset filters' })[0]!);
    fireEvent.change(search, { target: { value: '' } });

    const sort = screen.getByRole('combobox', { name: 'Sort characters' });
    fireEvent.change(sort, { target: { value: 'level' } });
    expect(screen.getAllByRole('article')[0]).toHaveTextContent('Bram');
    fireEvent.change(sort, { target: { value: 'updated' } });
    expect(screen.getAllByRole('article')[0]).toHaveTextContent('Bram');
    expect(screen.getAllByRole('article')[1]).toHaveTextContent('Żaneta');
    fireEvent.change(sort, { target: { value: 'name' } });
    expect(screen.getAllByRole('article')[0]).toHaveTextContent('Bram');
    fireEvent.change(sort, { target: { value: 'manual' } });
    expect(screen.getAllByRole('article')[0]).toHaveTextContent('Żaneta');
  });

  it('shows legacy class and species names', () => {
    seed([
      hero('Legacy', { className: 'Wizard', species: 'Unknown folk' }),
      hero('Blank', { className: 'missing-id' }),
    ]);
    mount();
    expect(screen.getByText('Level 1 - Czarodziej - Unknown folk')).toBeInTheDocument();
    expect(screen.getByText('Level 1 - missing-id')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search characters' }), {
      target: { value: 'unknown folk' },
    });
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  it('keeps an out-of-range page and invalid URL values safe', () => {
    seed([hero('Solo')]);
    mount('/character?page=9&sort=bad&role=bad');
    expect(screen.getByText(/Showing 1-1 of 1/)).toBeInTheDocument();
    cleanupAndMount('/character?page=x');
    expect(screen.getAllByText(/Showing 1-1 of 1/).length).toBeGreaterThan(0);
  });

  it('duplicates, exports and deletes with undo', async () => {
    const mira = hero('Mira');
    seed([mira, hero('Ola')]);
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate Mira' }));
    expect(names()).toEqual(['Mira', 'Mira (copy)', 'Ola']);
    expect(screen.getByText('Created a copy of Mira.')).toBeInTheDocument();
    const copyId = useCharacterStore.getState().order[1]!;
    await waitFor(() =>
      expect(document.activeElement).toHaveAttribute('data-character-open', copyId),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export Mira' }));
    expect(mocks.download).toHaveBeenCalledWith(
      expect.stringContaining('"Mira"'),
      'Mira.json',
    );
    mocks.download.mockImplementation(() => {
      throw new Error('blocked');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Export Mira' }));
    expect(screen.getByRole('alert')).toHaveTextContent('The file could not be created.');

    fireEvent.click(screen.getByRole('button', { name: 'Delete Ola' }));
    expect(useDialogStore.getState().request?.initialFocus).toBe('cancel');
    await answer(false);
    expect(names()).toContain('Ola');
    fireEvent.click(screen.getByRole('button', { name: 'Delete Ola' }));
    await answer(true);
    expect(names()).not.toContain('Ola');
    expect(screen.getByText('Ola deleted.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo deletion' }));
    expect(names()).toEqual(['Mira', 'Mira (copy)', 'Ola']);
    expect(screen.getByText('Character restored.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Ola' }));
    await answer(true);
    act(() => useCharacterStore.setState({ deleted: { character: mira, index: 0 } }));
    fireEvent.click(screen.getByRole('button', { name: 'Undo deletion' }));
    expect(screen.getByText('Ola deleted.')).toBeInTheDocument();
  });

  it('opens a character from its card', () => {
    const mira = hero('Mira', { portrait: 'data:image/jpeg;base64,x' });
    seed([mira]);
    mount();
    expect(document.querySelector('article img')).toHaveAttribute('src', mira.portrait);
    fireEvent.click(screen.getByRole('button', { name: /^Mira/ }));
    expect(screen.getByTestId('location')).toHaveTextContent(`/character/${mira.id}`);
  });

  it('shows storage problems with recovery actions', async () => {
    localStorage.setItem(CHARACTERS_KEY, '{broken');
    useCharacterStore.getState().reloadStored();
    mount();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Saved characters could not be read.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Download saved original' }));
    expect(mocks.download).toHaveBeenCalledWith(
      '{broken',
      'fumble-characters-original.json',
    );
    expect(screen.getByText('Download started.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Load saved version' }));
    expect(
      screen.getByText('The saved characters still cannot be read.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Replace saved characters' }));
    await answer(false);
    expect(localStorage.getItem(CHARACTERS_KEY)).toBe('{broken');
    fireEvent.click(screen.getByRole('button', { name: 'Replace saved characters' }));
    localStorage.setItem(CHARACTERS_KEY, '{changed');
    await answer(true);
    expect(screen.getByText(/changed again/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Replace saved characters' }));
    await answer(true);
    expect(screen.getByText('Saved characters replaced.')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(CHARACTERS_KEY)!).version).toBe(3);
  });

  it('retries failed saves and resolves conflicts', async () => {
    seed([hero('Mira')]);
    mount();
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    act(() => {
      useCharacterStore.getState().addCharacter('Pending');
    });
    expect(screen.getByRole('alert')).toHaveTextContent('could not be saved');
    fireEvent.click(screen.getByRole('button', { name: 'Retry saving' }));
    expect(
      screen.getByText('Saving failed again. Download your characters to keep a copy.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Download current characters' }));
    expect(mocks.download).toHaveBeenLastCalledWith(
      expect.stringContaining('Pending'),
      'fumble-characters-current.json',
    );
    mocks.download.mockImplementationOnce(() => {
      throw new Error('blocked');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Download current characters' }));
    expect(screen.getByText('The file could not be created.')).toBeInTheDocument();
    setItem.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: 'Retry saving' }));
    expect(screen.getByText('Characters saved.')).toBeInTheDocument();

    localStorage.setItem(
      CHARACTERS_KEY,
      serializeCharacters({ characters: {}, order: [] }),
    );
    act(() => {
      useCharacterStore.getState().addCharacter('Local');
    });
    expect(screen.getByRole('alert')).toHaveTextContent('changed in another tab');
    fireEvent.click(screen.getByRole('button', { name: 'Load saved version' }));
    await answer(false);
    expect(names()).toContain('Local');
    fireEvent.click(screen.getByRole('button', { name: 'Load saved version' }));
    await answer(true);
    expect(names()).toEqual([]);
    expect(screen.getByText('Saved characters loaded.')).toBeInTheDocument();
  });
});

function cleanupAndMount(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/character" element={<CharacterListPage />} />
      </Routes>
    </MemoryRouter>,
  );
}
