import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompendiumCategory } from './categories';
import { useHomebrewStore } from '@/features/homebrew/store';
import { useFumbleHomebrewStore } from '@/features/homebrew/fumbleHomebrewStore';
import { useCategoryItems } from './useCategoryItems';

const loadLocalizedItems = vi.fn();
const localeMock = vi.hoisted(() => ({ value: 'en' }));

vi.mock('@/data/compendium/overlay', () => ({
  loadLocalizedItems: (...args: unknown[]) => loadLocalizedItems(...args),
}));

vi.mock('@/i18n/pathUtils', () => ({
  useLocale: () => localeMock.value,
}));

const category = {
  id: 'feats',
  load: vi.fn(),
} as unknown as CompendiumCategory;

const classesCategory = {
  id: 'classes',
  load: vi.fn(),
} as unknown as CompendiumCategory;

const spellsCategory = {
  id: 'spells',
  load: vi.fn(),
} as unknown as CompendiumCategory;

const rulesCategory = {
  id: 'rules',
  load: vi.fn(),
} as unknown as CompendiumCategory;

describe('useCategoryItems', () => {
  beforeEach(() => {
    loadLocalizedItems.mockReset();
    localeMock.value = 'en';
    useHomebrewStore.setState({ entries: [] });
    useFumbleHomebrewStore.setState({
      showInCompendium: false,
      compendiumCampaigns: null,
      compendiumCategories: null,
    });
  });

  it('loads category items and combines sorted homebrew entries', async () => {
    loadLocalizedItems.mockResolvedValue([
      { id: 'official', name: 'Official', source: 'XPHB', srd: true },
    ]);
    const { result } = renderHook(() => useCategoryItems(category));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => {
      useHomebrewStore.getState().addManual({
        category: 'feats',
        name: 'Alpha',
        subtitle: '',
        body: 'Description',
      });
      useHomebrewStore.getState().addManual({
        category: 'items',
        name: 'Ignored',
        subtitle: '',
        body: '',
      });
      useHomebrewStore.getState().addSubclass({
        className: 'Wizard',
        name: 'Ignored subclass',
        source: 'HB',
        body: '',
      });
    });

    expect(result.current.items.map((item) => item.name)).toEqual(['Alpha', 'Official']);
  });

  it('adds the static Fumble entries when requested', async () => {
    loadLocalizedItems.mockResolvedValue([
      { id: 'official', name: 'Official', source: 'XPHB', srd: true },
    ]);
    const { result } = renderHook(() => useCategoryItems(category, true));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(result.current.items.some((item) => item.id === 'potent-spirit-form')).toBe(
      true,
    );
  });

  it('filters Fumble entries by configured campaign and content type', async () => {
    loadLocalizedItems.mockResolvedValue([]);
    act(() =>
      useFumbleHomebrewStore.setState({
        showInCompendium: true,
        compendiumCampaigns: ['grobowiec-zaglady'],
        compendiumCategories: ['feats'],
      }),
    );

    const { result } = renderHook(() => useCategoryItems(category, true));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(result.current.items.some((item) => item.id === 'potent-spirit-form')).toBe(
      false,
    );
  });

  it('keeps a directly selected Fumble entry visible outside the configured filters', async () => {
    loadLocalizedItems.mockResolvedValue([]);
    act(() =>
      useFumbleHomebrewStore.setState({
        showInCompendium: true,
        compendiumCampaigns: ['grobowiec-zaglady'],
        compendiumCategories: ['rules'],
      }),
    );

    const { result } = renderHook(() =>
      useCategoryItems(category, true, 'potent-spirit-form'),
    );
    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(result.current.items.some((item) => item.id === 'potent-spirit-form')).toBe(
      true,
    );
  });

  it('keeps Fumble entries from duplicating official IDs', async () => {
    loadLocalizedItems.mockResolvedValue([
      { id: 'flanking', name: 'Official Flanking', source: 'DMG' },
      { id: 'official', name: 'Official', source: 'XPHB' },
    ]);

    const { result } = renderHook(() => useCategoryItems(rulesCategory, true));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(result.current.items.filter((item) => item.id === 'flanking')).toHaveLength(1);
    expect(result.current.items.find((item) => item.id === 'flanking')).toMatchObject({
      name: 'Flanking',
      source: 'Fumble',
    });
  });

  it('adds Witch to the official spells from its class list', async () => {
    loadLocalizedItems.mockResolvedValue([
      {
        id: 'acid-splash',
        name: 'Acid Splash',
        source: 'XPHB',
        srd: true,
        level: 0,
        school: 'Evocation',
        classes: ['Wizard'],
        entries: [],
      },
      {
        id: 'cackle',
        name: 'Cackle',
        source: 'Fumble',
        srd: false,
        level: 0,
        school: 'Enchantment',
        classes: ['Witch'],
        entries: [],
      },
      {
        id: 'fireball',
        name: 'Fireball',
        source: 'XPHB',
        srd: true,
        level: 3,
        school: 'Evocation',
        classes: ['Sorcerer', 'Wizard'],
        entries: [],
      },
    ]);

    const { result } = renderHook(() => useCategoryItems(spellsCategory));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(result.current.items.find((item) => item.id === 'acid-splash')).toMatchObject({
      classes: ['Wizard', 'Witch', 'Apothecary'],
    });
    expect(result.current.items.find((item) => item.id === 'cackle')).toMatchObject({
      classes: ['Witch'],
    });
    expect(result.current.items.find((item) => item.id === 'fireball')).toMatchObject({
      classes: ['Sorcerer', 'Wizard', 'Apothecary'],
    });
  });

  it('localizes the Witch class filter value for Polish spells', async () => {
    localeMock.value = 'pl';
    loadLocalizedItems.mockResolvedValue([
      {
        id: 'acid-splash',
        name: 'Kwaśny Pryskacz',
        source: 'XPHB',
        srd: true,
        level: 0,
        school: 'Wywoływanie',
        classes: ['Czarodziej'],
        entries: [],
      },
    ]);

    const { result } = renderHook(() => useCategoryItems(spellsCategory, true));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(result.current.items.find((item) => item.id === 'acid-splash')).toMatchObject({
      classes: ['Czarodziej', 'Wiedźma', 'Aptekarz'],
    });
    expect(result.current.items.find((item) => item.id === 'cackle')).toMatchObject({
      classes: ['Wiedźma'],
    });
  });

  it('merges Fumble subclasses into their parent class only when enabled', async () => {
    loadLocalizedItems.mockResolvedValue([
      {
        id: 'monk',
        name: 'Monk',
        source: 'XPHB',
        srd: true,
        hitDie: 'd8',
        primaryAbility: 'Wisdom',
        savingThrows: 'Strength and Dexterity',
        proficiencies: '',
        armorProficiencies: '',
        weaponProficiencies: '',
        toolProficiencies: '',
        subclassTitle: 'Monk Subclass',
        table: { headers: [], rows: [] },
        features: [],
        subclasses: [],
      },
    ]);

    const hook = renderHook(() => useCategoryItems(classesCategory, true));
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const hidden = hook.result.current.items.find(
      (item) => item.id === 'monk',
    ) as unknown as {
      subclasses: Array<{ name: string }>;
    };
    expect(hidden.subclasses).toEqual([]);

    act(() => useFumbleHomebrewStore.getState().setShowInCompendium(true));

    await waitFor(() => {
      const monk = hook.result.current.items.find(
        (item) => item.id === 'monk',
      ) as unknown as {
        subclasses: Array<{ name: string; source: string }>;
      };
      expect(monk.subclasses).toEqual([
        expect.objectContaining({ name: 'Zerth Warrior', source: 'Fumble' }),
      ]);
    });
  });

  it('merges always-visible public UA subclasses without opt-in', async () => {
    loadLocalizedItems.mockResolvedValue([
      {
        id: 'paladin',
        name: 'Paladin',
        source: 'XPHB',
        srd: true,
        hitDie: 'd10',
        primaryAbility: 'Strength and Charisma',
        savingThrows: 'Wisdom and Charisma',
        proficiencies: '',
        armorProficiencies: '',
        weaponProficiencies: '',
        toolProficiencies: '',
        subclassTitle: 'Paladin Subclass',
        table: { headers: [], rows: [] },
        features: [],
        subclasses: [],
      },
    ]);

    const { result } = renderHook(() => useCategoryItems(classesCategory, true));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    const paladin = result.current.items.find(
      (item) => item.id === 'paladin',
    ) as unknown as {
      subclasses: Array<{ id?: string; name: string; source: string }>;
    };
    expect(paladin.subclasses).toEqual([
      expect.objectContaining({
        id: 'paladin-oathbreaker-ua',
        name: 'Oathbreaker',
        source: 'UA10',
      }),
    ]);
  });

  it('merges and selects a direct Fumble subclass link while visibility is off', async () => {
    loadLocalizedItems.mockResolvedValue([
      {
        id: 'monk',
        name: 'Monk',
        source: 'XPHB',
        srd: true,
        hitDie: 'd8',
        primaryAbility: 'Wisdom',
        savingThrows: 'Strength and Dexterity',
        proficiencies: '',
        armorProficiencies: '',
        weaponProficiencies: '',
        toolProficiencies: '',
        subclassTitle: 'Monk Subclass',
        table: { headers: [], rows: [] },
        features: [],
        subclasses: [],
      },
    ]);

    const { result } = renderHook(() =>
      useCategoryItems(classesCategory, true, 'monk', 'zerth-warrior'),
    );
    await waitFor(() => expect(result.current.status).toBe('ready'));

    const monk = result.current.items.find((item) => item.id === 'monk') as unknown as {
      subclasses: Array<{ id?: string; name: string }>;
      _fumbleSelectedSubclassId?: string;
    };
    expect(monk.subclasses[0]).toMatchObject({
      id: 'zerth-warrior',
      name: 'Zerth Warrior',
    });
    expect(monk._fumbleSelectedSubclassId).toBe('zerth-warrior');
  });

  it('reports load failures', async () => {
    loadLocalizedItems.mockRejectedValue(new Error('failed'));
    const { result } = renderHook(() => useCategoryItems(category));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.items).toEqual([]);
  });

  it('keeps the initial state when no category is selected', () => {
    const { result } = renderHook(() => useCategoryItems(undefined));
    expect(result.current).toEqual({ status: 'loading', items: [] });
    expect(loadLocalizedItems).not.toHaveBeenCalled();
  });

  it('does not update state after unmounting an active load', async () => {
    let resolve: (items: unknown[]) => void = () => undefined;
    loadLocalizedItems.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { unmount } = renderHook(() => useCategoryItems(category));
    unmount();
    await act(async () => resolve([]));
  });

  it('does not report a failure after unmounting an active load', async () => {
    let reject: (error: Error) => void = () => undefined;
    loadLocalizedItems.mockReturnValue(
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
    );
    const { unmount } = renderHook(() => useCategoryItems(category));
    unmount();
    await act(async () => reject(new Error('late failure')));
  });
});
