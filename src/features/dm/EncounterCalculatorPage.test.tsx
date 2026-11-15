import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatMonsterCrDisplay } from '@/data/transform/format';
import { emptyEncounterData } from './encounterModel';
import { useEncounterStore } from './encounterStore';
import { EncounterCalculatorPage } from './EncounterCalculatorPage';

const mocks = vi.hoisted(() => ({
  items: [] as unknown[],
  status: 'ready',
  retryKey: 0,
}));
vi.mock('@/features/compendium/useCategoryItems', () => ({
  useCategoryItems: (
    _category: unknown,
    _include: boolean,
    _id: unknown,
    _other: unknown,
    retryKey: number,
  ) => {
    mocks.retryKey = retryKey;
    return { status: mocks.status, items: mocks.items };
  },
}));
vi.mock('@/seo/useSeo', () => ({ useSeo: vi.fn() }));

const monster = (id: string, name: string, cr = '1', habitat = 'Forest') => ({
  id,
  name,
  cr,
  habitat,
  source: 'XMM',
  ac: '14',
  hp: '20 (4d8 + 2)',
  dex: 14,
});

describe('EncounterCalculatorPage', () => {
  const renderPage = (path = '/dm/encounter/') =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <EncounterCalculatorPage />
      </MemoryRouter>,
    );
  const search = (value: string) =>
    fireEvent.change(screen.getByRole('searchbox'), { target: { value } });
  const add = (name: string) =>
    fireEvent.click(screen.getByRole('button', { name: name + ' - add to encounter' }));
  const summary = () => screen.getByRole('region', { name: 'Current draft' });

  beforeEach(() => {
    const raw = localStorage.getItem('fumble-encounter');
    if (raw === null && useEncounterStore.getState().blocked)
      useEncounterStore.getState().retryRead();
    useEncounterStore.getState().restore(emptyEncounterData());
    mocks.items = [];
    mocks.status = 'ready';
    mocks.retryKey = 0;
  });

  it('keeps malformed party fields editable and restores the budget after correction', async () => {
    renderPage();
    const level = screen.getByRole('spinbutton', { name: 'Level' });
    const count = screen.getByRole('spinbutton', { name: 'Count' });
    fireEvent.change(level, { target: { value: '1.5' } });
    fireEvent.change(count, { target: { value: '-1' } });
    expect(level).toHaveAttribute('aria-invalid', 'true');
    expect(count).toHaveAttribute('aria-invalid', 'true');
    expect(within(summary()).getByText('Budget comparison unavailable')).toBeVisible();
    fireEvent.change(level, { target: { value: '99' } });
    expect(level).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(level, { target: { value: '1' } });
    fireEvent.change(count, { target: { value: '4' } });
    expect(within(summary()).getByText('400 XP remaining')).toBeVisible();
    const addGroup = screen.getByRole('button', { name: 'Add level group' });
    fireEvent.click(addGroup);
    expect(within(summary()).getByText('500 XP remaining')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Remove party group 2' }));
    await waitFor(() => expect(addGroup).toHaveFocus());
  });

  it('handles zero, missing, and alternative XP and moves focus after roster edits', async () => {
    mocks.items = [
      { ...monster('shrieker', 'Shrieker', '0'), crDisplay: '0 (XP 0; PB +2)' },
      { id: 'manual', name: 'Manual entry', source: 'HB' },
      {
        ...monster('dragon', 'Dragon', '14'),
        crDisplay: '14 (XP 11,500, or 13,000 in lair; PB +5)',
      },
    ];
    renderPage();
    search('shrieker');
    add('Shrieker');
    expect(screen.getByRole('searchbox')).toHaveFocus();
    expect(screen.getByRole('searchbox')).toHaveValue('shrieker');
    expect(within(summary()).getByText('400 XP remaining')).toBeVisible();
    search('manual');
    add('Manual entry');
    expect(within(summary()).getByText('Known encounter XP')).toBeVisible();
    expect(within(summary()).getByText(/unknown XP/)).toBeVisible();
    search('dragon');
    add('Dragon');
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'In its lair (13,000 XP each)' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'More Dragon' }));
    expect(within(summary()).getByText('26,000')).toBeVisible();
    const removeDragon = screen.getByRole('button', { name: 'Remove Dragon' });
    fireEvent.click(screen.getByRole('button', { name: 'Remove Manual entry' }));
    await waitFor(() => expect(removeDragon).toHaveFocus());
    expect(within(summary()).getByText('Above the high budget')).toBeVisible();
  });

  it('uses the active habitat and only the XP left in the selected budget', () => {
    mocks.items = [
      monster('expensive', 'Forest boss', '2'),
      monster('fits', 'Forest creature', '1'),
      monster('urban', 'Town creature', '1', 'Urban'),
    ];
    renderPage();
    fireEvent.change(screen.getByRole('combobox', { name: 'Habitat' }), {
      target: { value: 'Forest' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Target difficulty' }), {
      target: { value: 'moderate' },
    });
    const roll = screen.getByRole('button', { name: 'Add random monster' });
    fireEvent.click(roll);
    expect(within(summary()).getByText('100 XP remaining')).toBeVisible();
    fireEvent.click(roll);
    expect(
      screen.getByText(
        'No matching creature can be added within the remaining XP budget.',
      ),
    ).toBeVisible();
    expect(useEncounterStore.getState().data.draft.monsters).toMatchObject([
      { id: 'fits', count: 1 },
    ]);
  });

  it('paginates, sorts and searches localized and original names', () => {
    mocks.items = [
      ...Array.from({ length: 12 }, (_, index) =>
        monster('frog-' + index, 'Żaba ' + index, '1/4', 'Any'),
      ),
      { ...monster('frog', 'Żaba', '0', 'Swamp'), englishName: 'Frog' },
    ];
    renderPage('/pl/dm/encounter/');
    search(' zaba ');
    expect(screen.getByText('Pasujące stworzenia: 13')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Następna strona' }));
    expect(screen.getByText('Strona 2 z 2')).toBeVisible();
    fireEvent.change(screen.getByRole('combobox', { name: 'Sortuj wyniki' }), {
      target: { value: 'cr' },
    });
    expect(
      screen.getAllByRole('button', { name: /dodaj do starcia/ })[0],
    ).toHaveAccessibleName('Żaba - dodaj do starcia');
    search('frog');
    expect(screen.getByRole('button', { name: 'Żaba - dodaj do starcia' })).toBeVisible();
    fireEvent.change(screen.getByRole('combobox', { name: 'Siedlisko' }), {
      target: { value: 'Any' },
    });
    expect(screen.getByText(/Brak pasujących stworzeń/)).toBeVisible();
  });

  it('counts Polish Homebrew lair XP and excludes variants that exceed the remainder', () => {
    mocks.items = [
      {
        ...monster('creature', 'Potwór', '2', 'Las'),
        source: 'Homebrew',
        crDisplay: formatMonsterCrDisplay({ cr: '2', xp: 450, xpLair: 650 }, 'pl'),
      },
    ];
    renderPage('/pl/dm/encounter/?habitat=Forest');
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Liczba' }), {
      target: { value: '11' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Potwór - dodaj do starcia' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /W legowisku/ }));
    expect(screen.getByText('Pozostało 450 PD')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj losowego potwora' }));
    expect(screen.getByText(/Żadne pasujące stworzenie/)).toBeVisible();
  });

  it('offers retry on load error and explains a missing linked creature', () => {
    mocks.status = 'error';
    renderPage('/dm/encounter/?monster=missing');
    expect(screen.getByRole('alert')).toHaveTextContent('The Bestiary could not load');
    mocks.status = 'ready';
    fireEvent.click(screen.getByRole('button', { name: 'Retry Bestiary' }));
    expect(mocks.retryKey).toBe(1);
    expect(screen.getByText('The linked creature could not be found.')).toBeVisible();
  });
});
