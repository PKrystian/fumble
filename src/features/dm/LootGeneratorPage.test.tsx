import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCharacter, type Character } from '@/features/character/model';
import type { ItemEntry } from '@/data/compendium/types';
import { translate } from '@/i18n/translate';
import { useContentModeStore } from '@/features/ui/contentModeStore';
import { LootGeneratorPage } from './LootGeneratorPage';
import { emptyLootData } from './lootData';
import { useLootStore } from './lootStore';

const mocks = vi.hoisted(() => ({
  status: 'ready',
  items: [] as ItemEntry[],
  characters: [] as Character[],
  locale: 'en' as 'en' | 'pl',
  rollFailure: false,
  retry: vi.fn(),
}));
vi.mock('@/features/compendium/useCategoryItems', () => ({
  useCategoryItems: (...args: unknown[]) => {
    mocks.retry(args[4]);
    return { status: mocks.status, items: mocks.items };
  },
}));
vi.mock('@/features/compendium/categories', () => ({
  getCategory: () => ({ id: 'items' }),
}));
vi.mock('@/features/character/store', () => ({
  useCharacterList: () => mocks.characters,
}));
vi.mock('@/features/dice/engine', () => ({
  rollExpression: () => (mocks.rollFailure ? null : { total: 2 }),
}));
vi.mock('@/i18n/useT', () => ({
  useT: () => ({
    locale: mocks.locale,
    t: (key: string, vars?: Record<string, string | number>) =>
      translate(mocks.locale, key, vars),
  }),
}));
vi.mock('@/seo/useSeo', () => ({ useSeo: vi.fn() }));

function item(id: string, rarity: string, extra: Partial<ItemEntry> = {}): ItemEntry {
  return {
    id,
    name: id,
    source: 'XDMG',
    srd: true,
    type: 'Wondrous Item',
    rarity,
    attunement: '',
    weight: '',
    value: '',
    damage: '',
    ac: '',
    properties: '',
    range: '',
    entries: [],
    ...extra,
  };
}
function renderPage() {
  return render(
    <MemoryRouter>
      <LootGeneratorPage />
    </MemoryRouter>,
  );
}
const button = (name: string) => screen.getByRole('button', { name });

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  mocks.status = 'ready';
  mocks.locale = 'en';
  mocks.characters = [];
  mocks.rollFailure = false;
  mocks.items = [
    item('common', 'Common'),
    item('uncommon', 'Uncommon'),
    item('rare', 'Rare'),
    item('legendary', 'Legendary'),
  ];
  mocks.retry.mockClear();
  useLootStore.setState({
    data: emptyLootData(),
    saved: true,
    blocked: false,
    raw: null,
  });
  useContentModeStore.setState({ mode: 'all' });
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
});

describe('loot generator workflow', () => {
  it('validates manual groups and restores keyboard focus after removal', () => {
    renderPage();
    for (const value of ['', '0', '-1', '1.5', '1001']) {
      fireEvent.change(screen.getByRole('spinbutton', { name: 'Characters' }), {
        target: { value },
      });
      expect(button('Major Reward')).toBeDisabled();
      expect(screen.getByText('Enter an integer from 1 to 1000.')).toBeVisible();
    }
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Characters' }), {
      target: { value: '3' },
    });
    for (const value of ['', '0', '21', '-1', '2.5']) {
      fireEvent.change(screen.getByRole('spinbutton', { name: 'Level' }), {
        target: { value },
      });
      expect(button('Major Reward')).toBeDisabled();
    }
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Level' }), {
      target: { value: '6' },
    });
    fireEvent.click(button('Add level group'));
    expect(screen.getAllByRole('spinbutton')).toHaveLength(4);
    fireEvent.change(screen.getAllByRole('spinbutton', { name: 'Characters' })[1]!, {
      target: { value: '2' },
    });
    fireEvent.change(screen.getAllByRole('spinbutton', { name: 'Level' })[1]!, {
      target: { value: '8' },
    });
    expect(screen.getByText('Effective Tier 2 - average level 7')).toBeVisible();
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove level group' })[1]!);
    expect(button('Add level group')).toHaveFocus();
    expect(button('Major Reward')).toBeEnabled();
    fireEvent.click(button('Minor Reward'));
    expect(useLootStore.getState().data.history[0]!.context).toMatchObject({
      reward: 'minor',
      tierId: 2,
      partySize: 3,
    });
  });

  it('preserves results, settings and original reroll parameters across modes and remounts', () => {
    const view = renderPage();
    fireEvent.click(button('Tier'));
    fireEvent.click(button('Generate Hoard'));
    const original = structuredClone(useLootStore.getState().data.history[0]!);
    expect(original.gold).toBe(20);
    fireEvent.click(button('Tier'));
    expect(useLootStore.getState().data.history).toHaveLength(1);
    fireEvent.click(button('Tier 4 Levels 17-20'));
    expect(screen.getByText(/The form has changed/)).toBeVisible();
    fireEvent.click(button('Reroll items'));
    expect(useLootStore.getState().data.history[0]).toMatchObject({
      gold: original.gold,
      gemValue: original.gemValue,
      context: original.context,
    });
    expect(
      useLootStore
        .getState()
        .data.history[0]!.items.every((row) => row.item.rarity !== 'Legendary'),
    ).toBe(true);
    fireEvent.click(button('Wildcard'));
    fireEvent.click(button('Tier 2 Levels 5-10'));
    expect(screen.getByRole('heading', { name: 'Hoard' })).toBeVisible();
    view.unmount();
    useLootStore.getState().reload();
    renderPage();
    expect(button('Wildcard')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Hoard' })).toBeVisible();
    fireEvent.click(button('Roll Wildcard Loot'));
    expect(useLootStore.getState().data.history).toHaveLength(2);
    fireEvent.click(button('Party'));
    fireEvent.click(button('Major Reward'));
    expect(useLootStore.getState().data.history).toHaveLength(3);
  });

  it('handles empty, loading and failed catalogs with retry without discarding stored rewards', () => {
    const view = renderPage();
    fireEvent.click(button('Major Reward'));
    mocks.status = 'loading';
    view.rerender(
      <MemoryRouter>
        <LootGeneratorPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Loading items...')).toBeVisible();
    expect(button('Major Reward')).toBeDisabled();
    mocks.status = 'error';
    view.rerender(
      <MemoryRouter>
        <LootGeneratorPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/could not be loaded/)).toBeVisible();
    fireEvent.click(button('Retry loading items'));
    expect(mocks.retry).toHaveBeenLastCalledWith(1);
    expect(useLootStore.getState().data.history).toHaveLength(1);
    mocks.status = 'ready';
    mocks.items = [];
    view.rerender(
      <MemoryRouter>
        <LootGeneratorPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('No eligible items in this content edition.')).toBeVisible();
    expect(button('Reroll items')).toBeDisabled();
    mocks.items = [item('artifact', 'Artifact')];
    view.rerender(
      <MemoryRouter>
        <LootGeneratorPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/No items match these reward settings/)).toBeVisible();
    mocks.items = [item('rare', 'Rare')];
    view.rerender(
      <MemoryRouter>
        <LootGeneratorPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Level' }), {
      target: { value: '6' },
    });
    expect(screen.getByText(/No items match a minor reward/)).toBeVisible();
    expect(button('Minor Reward')).toBeDisabled();
    expect(button('Major Reward')).toBeEnabled();
  });

  it('reports generation and reroll errors without replacing the previous reward', () => {
    renderPage();
    fireEvent.click(button('Major Reward'));
    const original = structuredClone(useLootStore.getState().data.history[0]);
    mocks.rollFailure = true;
    fireEvent.click(button('Major Reward'));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The reward could not be generated.',
    );
    fireEvent.click(button('Reroll items'));
    expect(useLootStore.getState().data.history[0]).toEqual(original);
    mocks.rollFailure = false;
    fireEvent.click(button('Reroll items'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('skips incomplete homebrew, honors edition and requires an opt-in for unknown rarities', () => {
    mocks.items = [
      item('old', 'Common', { source: 'TCE' }),
      item('new', 'Common'),
      item('unknown', 'Varies'),
      { id: 'manual', name: 'My item', source: 'Homebrew', srd: false } as ItemEntry,
    ];
    useContentModeStore.setState({ mode: '2024' });
    renderPage();
    expect(screen.getByText('Incomplete entries skipped: 1')).toBeInTheDocument();
    fireEvent.click(button('Major Reward'));
    expect(
      useLootStore.getState().data.history[0]!.items.map((row) => row.item.id),
    ).toEqual(['new']);
    fireEvent.click(button('Wildcard'));
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'Include items with unknown or variable rarity',
      }),
    );
    fireEvent.click(button('Roll Wildcard Loot'));
    expect(
      useLootStore.getState().data.history[0]!.items.map((row) => row.item.id),
    ).toContain('unknown');
  });

  it('keeps the same canonical common pool and stored result when changing locale', () => {
    mocks.locale = 'pl';
    mocks.items = [
      item('common', 'Pospolita', {
        name: 'Przedmiot',
        englishName: 'Item',
        _filterData: { name: 'Item', type: 'Wondrous Item', rarity: 'Common' },
      }),
    ];
    const view = renderPage();
    fireEvent.click(button('Mała nagroda'));
    expect(screen.getByRole('link', { name: 'Przedmiot' })).toBeVisible();
    const original = structuredClone(useLootStore.getState().data);
    mocks.locale = 'en';
    mocks.items = [item('common', 'Common', { name: 'Item' })];
    view.rerender(
      <MemoryRouter>
        <LootGeneratorPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Item' })).toBeVisible();
    expect(useLootStore.getState().data).toEqual(original);
  });

  it('shows the empty saved party and disables party rewards', () => {
    renderPage();
    fireEvent.click(button('Saved characters'));
    expect(screen.getByRole('link', { name: 'Create your party' })).toHaveAttribute(
      'href',
      '/character/',
    );
    expect(button('Major Reward')).toBeDisabled();
    fireEvent.click(button('Manual party'));
    expect(button('Major Reward')).toBeEnabled();
  });

  it('searches and sorts large parties, preserves hidden selections and excludes DM sheets by default', () => {
    mocks.characters = Array.from({ length: 60 }, (_, index) => ({
      ...createCharacter(`Hero ${String(index).padStart(2, '0')}`),
      level: (index % 20) + 1,
    }));
    mocks.characters[0] = {
      ...mocks.characters[0]!,
      name: 'Żółw',
      className: 'Wizard',
      subclass: 'Evoker',
    };
    mocks.characters[2]!.name = 'Twin';
    mocks.characters[3]!.name = 'Twin';
    mocks.characters.push({ ...createCharacter('DM'), role: 'dm' });
    const view = renderPage();
    fireEvent.click(button('Saved characters'));
    expect(
      screen.getByText(
        '60 selected of 61 saved characters. 60 match the current filters.',
      ),
    ).toBeVisible();
    expect(screen.getAllByRole('checkbox')).toHaveLength(50);
    fireEvent.click(button('Next characters'));
    expect(screen.getAllByRole('checkbox')).toHaveLength(10);
    fireEvent.click(button('Previous characters'));
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort characters' }), {
      target: { value: 'level' },
    });
    expect(screen.getAllByRole('checkbox')[0]).toHaveAccessibleName(/Lvl 20/);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search characters' }), {
      target: { value: '  ZOLW  ' },
    });
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    fireEvent.click(button('Deselect matching characters'));
    expect(useLootStore.getState().data.settings.selectedIds).toHaveLength(59);
    fireEvent.click(button('Select matching characters'));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Evoker' } });
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    fireEvent.click(button('Clear search'));
    fireEvent.change(screen.getByRole('combobox', { name: 'Character role' }), {
      target: { value: 'dm' },
    });
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    fireEvent.click(button('Select matching characters'));
    fireEvent.change(screen.getByRole('combobox', { name: 'Character role' }), {
      target: { value: 'all' },
    });
    fireEvent.click(button('Deselect matching characters'));
    expect(button('Major Reward')).toBeDisabled();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'missing' } });
    expect(screen.getByText(/No characters match this search/)).toBeVisible();
    act(() =>
      useLootStore.getState().updateSettings({ selectedIds: [mocks.characters[0]!.id] }),
    );
    mocks.characters = [{ ...mocks.characters[0]!, level: 99 }];
    view.rerender(
      <MemoryRouter>
        <LootGeneratorPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Enter an integer from 1 to 20.');
  });

  it('renames rewards, divides known value and exports with feedback and failure recovery', async () => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:loot'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    renderPage();
    fireEvent.click(button('Major Reward'));
    fireEvent.click(button('Rename reward'));
    fireEvent.change(screen.getByRole('textbox', { name: 'Reward name' }), {
      target: { value: '  Dragon hoard  ' },
    });
    fireEvent.submit(
      screen.getByRole('textbox', { name: 'Reward name' }).closest('form')!,
    );
    expect(screen.getByRole('heading', { name: 'Dragon hoard' })).toBeVisible();
    fireEvent.click(button('Rename reward'));
    fireEvent.click(button('Cancel'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Divide coins and valuables' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Number of shares' }), {
      target: { value: '3' },
    });
    expect(screen.getByText('Per share: 13.33 gp')).toBeVisible();
    expect(screen.getByText('Remaining: 0.01 gp')).toBeVisible();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Number of shares' }), {
      target: { value: '0' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Enter an integer');
    fireEvent.click(button('Copy reward'));
    await waitFor(() => expect(screen.getByText(/Reward copied with/)).toBeVisible());
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Dragon hoard'));
    writeText.mockRejectedValueOnce(new Error('denied'));
    fireEvent.click(button('Copy reward'));
    await waitFor(() => expect(screen.getByText(/could not be copied/)).toBeVisible());
    fireEvent.click(button('Download reward'));
    expect(click).toHaveBeenCalledOnce();
    click.mockImplementation(() => {
      throw new Error('failed');
    });
    fireEvent.click(button('Download reward'));
    expect(screen.getByText(/The download failed/)).toBeVisible();
  });

  it('offers eligible variant bases, preserves chosen snapshots and flags missing catalog entries', () => {
    const base = item('Club', '', {
      source: 'XPHB',
      type: 'Melee Weapon',
      weaponCategory: 'simple',
    });
    const sword = item('Sword', '', {
      source: 'XPHB',
      type: 'Melee Weapon',
      weaponCategory: 'martial',
    });
    const variant = item('Magic weapon', 'Common', {
      type: 'Generic Variant',
      attunement: 'Requires attunement by a wizard',
      variant: {
        baseItems: [
          { name: 'Club', source: 'XPHB' },
          { name: 'Sword', source: 'XPHB' },
        ],
      },
    });
    mocks.items = [variant, base, sword];
    mocks.characters = [
      {
        ...createCharacter('Wizard'),
        className: 'Wizard',
        weaponProficiencies: 'Simple weapons',
      },
    ];
    const view = renderPage();
    fireEvent.click(button('Saved characters'));
    fireEvent.click(button('Minor Reward'));
    expect(screen.getByText(/Their matches are provisional/)).toBeVisible();
    expect(screen.getByText('Check attunement and other requirements.')).toBeVisible();
    const select = screen.getByRole('combobox', { name: 'Base item for Magic weapon' });
    expect(screen.queryByRole('option', { name: /^Sword/ })).not.toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'Club' } });
    expect(useLootStore.getState().data.history[0]!.items[0]!.base!.id).toBe('Club');
    expect(screen.getByText('Proficiency matches: Wizard')).toBeVisible();
    mocks.items = [variant];
    view.rerender(
      <MemoryRouter>
        <LootGeneratorPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('option', { name: 'Club' })).toBeInTheDocument();
    expect(screen.getByText(/original base choices are no longer/)).toBeVisible();
    mocks.items = [];
    view.rerender(
      <MemoryRouter>
        <LootGeneratorPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/This entry is no longer in the catalog/)).toBeVisible();
    act(() =>
      useLootStore.getState().updateResult(useLootStore.getState().data.selectedId!, {
        items: [{ item: variant, baseIds: ['Club'], base: null }],
      }),
    );
    expect(
      screen.getByText(/No eligible base items are currently available/),
    ).toBeVisible();
    expect(
      screen.getByRole('combobox', { name: 'Base item for Magic weapon' }),
    ).toBeDisabled();
    mocks.items = [variant, base];
    view.rerender(
      <MemoryRouter>
        <LootGeneratorPage />
      </MemoryRouter>,
    );
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Base item for Magic weapon' }),
      { target: { value: 'Club' } },
    );
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Base item for Magic weapon' }),
      { target: { value: '' } },
    );
    expect(useLootStore.getState().data.history[0]!.items[0]!.base).toBeNull();
  });

  it('explains a legitimate reward without items, missing proficiencies and a blocked save', () => {
    mocks.items = [item('Common potion', 'Common')];
    mocks.characters = [
      { ...createCharacter(), name: '', level: 2, armorProficiencies: 'Light armor' },
    ];
    renderPage();
    fireEvent.click(button('Saved characters'));
    fireEvent.click(button('Major Reward'));
    expect(screen.getByText(/Proficiency matches: Unnamed/)).toBeVisible();
    const id = useLootStore.getState().data.selectedId!;
    act(() => useLootStore.getState().updateResult(id, { items: [] }));
    expect(screen.getByText('No items this time.')).toBeVisible();
    act(() => useLootStore.setState({ blocked: true, saved: false, raw: null }));
    expect(button('Major Reward')).toBeDisabled();
    expect(button('Reroll items')).toBeDisabled();
  });

  it('sorts armor bases and reports a preserved item that no stored party member can use', () => {
    const padded = item('Padded', '', { source: 'XPHB', type: 'Light Armor' });
    const leather = item('Leather', '', { source: 'XPHB', type: 'Light Armor' });
    const variant = item('Magic armor', 'Common', {
      type: 'Generic Variant',
      variant: {
        baseItems: [
          { name: 'Padded', source: 'XPHB' },
          { name: 'Leather', source: 'XPHB' },
        ],
      },
    });
    mocks.items = [variant, padded, leather, item('Potion', 'Common')];
    renderPage();
    fireEvent.click(button('Major Reward'));
    const select = screen.getByRole('combobox', { name: 'Base item for Magic armor' });
    expect(
      Array.from(select.querySelectorAll('option'))
        .slice(1)
        .map((option) => option.textContent),
    ).toEqual([expect.stringMatching(/^Leather/), expect.stringMatching(/^Padded/)]);
    fireEvent.change(select, { target: { value: 'Padded' } });
    const saved = useLootStore.getState().data.history[0]!;
    expect(saved.items.find((row) => row.item.id === variant.id)!.base!.id).toBe(
      'Padded',
    );
    const fighter = {
      ...createCharacter('Fighter'),
      armorProficiencies: 'Light armor',
      weaponProficiencies: 'Simple',
    };
    act(() =>
      useLootStore.setState({
        data: {
          ...useLootStore.getState().data,
          history: [
            {
              ...saved,
              context: { ...saved.context, party: [fighter] },
              items: [
                { item: { ...padded, type: 'Heavy Armor' }, baseIds: [], base: null },
              ],
            },
          ],
        },
      }),
    );
    expect(screen.getByText('Proficiency matches: none')).toBeVisible();
  });
});
