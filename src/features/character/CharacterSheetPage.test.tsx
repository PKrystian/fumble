import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useRollStore } from '@/features/dice/rollStore';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CHARACTERS_KEY, serializeCharacters } from './characterData';
import { CharacterSheetPage } from './CharacterSheetPage';
import { useLayoutStore } from './layoutStore';
import { createCharacter, type Character } from './model';
import { useCharacterStore } from './store';

const mocks = vi.hoisted(() => ({
  fill: vi.fn(),
  download: vi.fn(),
  downloadBlob: vi.fn(),
  dnd: {} as Record<string, (event: unknown) => void>,
}));

vi.mock('./pdfExport', () => ({
  fillCharacterSheetPdf: (...args: unknown[]) => mocks.fill(...args),
}));

vi.mock('@/features/storage/downloadFile', () => ({
  downloadTextFile: (...args: unknown[]) => mocks.download(...args),
  downloadBlob: (...args: unknown[]) => mocks.downloadBlob(...args),
}));

vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>();
  return {
    ...actual,
    DndContext: (props: Parameters<typeof actual.DndContext>[0]) => {
      if (props.onDragEnd) Object.assign(mocks.dnd, props);
      return <actual.DndContext {...props} />;
    },
  };
});

vi.mock('@/features/compendium/categories', () => ({
  getCategory: (id: string) => ({ id }),
}));

vi.mock('@/features/compendium/useCategoryItems', () => ({
  useCategoryItems: (category: { id: string }) => ({
    status: 'ready',
    items:
      category.id === 'classes'
        ? [{ id: 'barbarian', name: 'Barbarian', source: 'XPHB' }]
        : category.id === 'species'
          ? [{ id: 'dwarf', name: 'Dwarf', source: 'XPHB' }]
          : [],
  }),
}));

vi.mock('./compendiumSync', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./compendiumSync')>();
  const cls = {
    id: 'barbarian',
    name: 'Barbarian',
    hitDie: 'd12',
    savingThrows: 'Strength, Constitution',
    armorProficiencies: 'Light, Medium, Shield',
    weaponProficiencies: 'Simple, Martial',
    toolProficiencies: '',
    subclasses: [],
    features: [{ name: 'Rage', level: 1, entries: ['Fury'] }],
  };
  return {
    ...actual,
    useClassEntryPair: (value: string) => ({
      localized: value ? cls : undefined,
      english: value ? cls : undefined,
      ready: true,
    }),
    useClassEntry: (value: string) => (value ? cls : undefined),
    useSpeciesEntryPair: () => ({
      localized: undefined,
      english: undefined,
      ready: true,
    }),
    useBackgroundEntryPair: () => ({
      localized: undefined,
      english: undefined,
      ready: true,
    }),
    useSpellIndex: () => ({ index: new Map(), ready: true }),
  };
});

function seed(character: Character) {
  localStorage.setItem(
    CHARACTERS_KEY,
    serializeCharacters({
      characters: { [character.id]: character },
      order: [character.id],
    }),
  );
  useCharacterStore.getState().reloadStored();
}

function mount(id: string, path = `/character/${id}`) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/character/:id" element={<CharacterSheetPage />} />
        <Route path="/pl/character/:id" element={<CharacterSheetPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function setWide(wide: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: wide,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe('CharacterSheetPage', () => {
  beforeEach(() => {
    localStorage.clear();
    useLayoutStore.getState().reset();
    mocks.fill.mockReset();
    mocks.download.mockReset();
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn(() => 'blob:sheet'),
        revokeObjectURL: vi.fn(),
      }),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('explains a missing character', () => {
    seed(createCharacter('Other'));
    mount('missing');
    expect(
      screen.getByRole('heading', { name: 'Character not found' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to characters' })).toHaveAttribute(
      'href',
      '/character/',
    );
  });

  it('synchronizes class data and shows the status bar', async () => {
    const hero = { ...createCharacter('Mira'), className: 'barbarian', species: 'dwarf' };
    seed(hero);
    mount(hero.id);
    expect(screen.getByRole('heading', { level: 1, name: 'Mira' })).toBeInTheDocument();
    expect(screen.getByText('Level 1 - Barbarian - Dwarf')).toBeInTheDocument();
    await waitFor(() =>
      expect(
        useCharacterStore.getState().characters[hero.id]!.savingThrowProficiencies,
      ).toEqual(['str', 'con']),
    );
    const status = screen.getByRole('region', { name: 'Character status' });
    expect(status).toHaveTextContent('HP0/0');
    act(() =>
      useCharacterStore
        .getState()
        .updateCharacter(hero.id, { hp: { current: 3, max: 9, temp: 2 } }),
    );
    expect(status).toHaveTextContent('HP3/9+2 temp');
    fireEvent.click(within(status).getByRole('button', { name: 'Roll Initiative +0' }));
    expect(useRollStore.getState().log[0]!.label).toBe('Mira: Initiative');
    fireEvent.click(screen.getAllByRole('button', { name: 'Heroic Inspiration' })[0]!);
    expect(useCharacterStore.getState().characters[hero.id]!.inspiration).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Character Settings' }));
    expect(
      screen.getByRole('dialog', { name: 'Character Settings' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('exports JSON and filled PDFs with clear feedback', async () => {
    const hero = {
      ...createCharacter('Mira/Ola'),
      className: 'barbarian',
      subclass: 'Berserker|XPHB',
    };
    seed(hero);
    mount(hero.id);
    fireEvent.click(screen.getByRole('button', { name: 'Export options' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Export JSON' }));
    expect(mocks.download).toHaveBeenCalledWith(
      expect.stringContaining('"layout"'),
      'Mira Ola.json',
    );
    expect(screen.getByText('Character download started.')).toBeInTheDocument();

    mocks.download.mockImplementationOnce(() => {
      throw new Error('blocked');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Export options' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Export JSON' }));
    expect(screen.getByRole('alert')).toHaveTextContent('The file could not be created.');

    mocks.fill.mockResolvedValue(new Blob(['pdf']));
    fireEvent.click(screen.getByRole('button', { name: 'Export options' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Sheet PDF (2024)' }));
    });
    await waitFor(() =>
      expect(screen.getByText('The 2024 sheet download started.')).toBeInTheDocument(),
    );
    expect(mocks.fill).toHaveBeenCalledWith(
      expect.objectContaining({ id: hero.id }),
      '2024',
      { className: 'Barbarian', subclass: 'Berserker', species: '', background: '' },
    );
    expect(mocks.downloadBlob).toHaveBeenCalledWith(
      expect.any(Blob),
      'Mira Ola-2024.pdf',
    );

    mocks.fill.mockRejectedValue(new Error('broken'));
    fireEvent.click(screen.getByRole('button', { name: 'Export options' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Sheet PDF (2014)' }));
    });
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Could not fill the 2014 character sheet.',
      ),
    );
  });

  it('reorders desktop panels by dragging', () => {
    const hero = createCharacter('');
    seed(hero);
    mount(hero.id);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Unnamed' }),
    ).toBeInTheDocument();
    act(() => mocks.dnd.onDragStart!({ active: { id: 'skills' } }));
    act(() => mocks.dnd.onDragEnd!({ active: { id: 'skills' }, over: null }));
    act(() => mocks.dnd.onDragStart!({ active: { id: 'skills' } }));
    act(() => mocks.dnd.onDragCancel!({}));
    act(() =>
      mocks.dnd.onDragEnd!({ active: { id: 'skills' }, over: { id: 'unknown' } }),
    );
    expect(useLayoutStore.getState().zones.right[0]).toBe('skills');
    act(() => mocks.dnd.onDragEnd!({ active: { id: 'skills' }, over: { id: 'combat' } }));
    expect(useLayoutStore.getState().zones.center[0]).toBe('skills');
  });

  it('uses the narrow order with collapsible panels', () => {
    setWide(false);
    const hero = createCharacter('Mira');
    seed(hero);
    mount(hero.id, `/pl/character/${hero.id}`);
    const panels = [...document.querySelectorAll('[data-panel]')].map(
      (element) => (element as HTMLElement).dataset.panel,
    );
    expect(panels.slice(0, 3)).toEqual(['hitPoints', 'combat', 'tabs']);
    expect(screen.getByRole('button', { name: 'Umiejętności' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Ułóż panel: Punkty wytrzymałości' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Przesuń w dół' }));
    expect(
      screen.getByText('Panel Punkty wytrzymałości jest teraz na pozycji 2.'),
    ).toBeInTheDocument();
  });
});
