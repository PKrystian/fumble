import { describe, expect, it, vi } from 'vitest';
import type { MonsterEntry } from '@/data/compendium/types';
import { categories, getCategory } from './categories';

describe('compendium categories', () => {
  it('looks up known categories and rejects absent ids', () => {
    expect(getCategory('spells')?.id).toBe('spells');
    expect(getCategory('missing')).toBeUndefined();
    expect(getCategory(undefined)).toBeUndefined();
  });

  it('formats monsters without size metadata', () => {
    const category = getCategory('bestiary')!;
    const monster = {
      id: 'unknown',
      name: 'Unknown',
      source: 'HB',
      srd: false,
      cr: '1',
      size: '',
      creatureType: 'construct',
    } as unknown as MonsterEntry;
    expect(category.subtitle(monster, (key) => key)).toContain('construct');
  });

  it('extracts empty and populated filter values', () => {
    const size = categories
      .find((category) => category.id === 'species')!
      .filters!.find((filter) => filter.id === 'size')!;
    expect(size.valuesFor({ size: '' } as never)).toEqual([]);
    expect(size.valuesFor({ size: undefined } as never)).toEqual([]);
    expect(size.valuesFor({ size: 'Medium' } as never)).toEqual(['Medium']);

    const properties = getCategory('items')!.filters!.find(
      (filter) => filter.id === 'properties',
    )!;
    expect(properties.valuesFor({ properties: '' } as never)).toEqual([]);
    expect(properties.valuesFor({ properties: undefined } as never)).toEqual([]);
  });

  it('executes every category contract', async () => {
    const entry = {
      ability: 'Dexterity',
      alignment: 'neutral',
      attunement: true,
      boonType: 'Epic',
      cardCount: 2,
      category: 'General',
      classes: ['Wizard'],
      concentration: false,
      cr: '1',
      creatureType: 'construct',
      facilityType: 'Basic',
      feat: 'Alert',
      featureType: 'Invocation, Maneuver',
      hazardType: 'Trap',
      hitDie: 8,
      id: 'entry',
      kind: 'Cult',
      languageType: 'Standard',
      languages: 'Common; Elvish',
      level: 0,
      name: 'Entry',
      objectType: 'Siege',
      optionType: 'Gift',
      pantheon: 'Forgotten Realms',
      properties: 'Finesse, light',
      rarity: 'Rare',
      recipeType: 'Meal',
      resistances: 'fire; cold',
      immunities: 'poison',
      conditionImmunities: 'charmed',
      ritual: true,
      ruleType: 'Core',
      school: 'Evocation',
      size: 'Medium',
      source: 'PHB',
      srd: false,
      subclasses: ['Evoker'],
      time: 'Action',
      type: 'Weapon',
      vehicleType: 'Ship',
    };
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => new Response(JSON.stringify({ items: [entry] })));
    const t = (key: string) => key;

    for (const category of categories) {
      await expect(category.load()).resolves.toEqual([entry]);
      expect(category.subtitle(entry as never, t)).toEqual(expect.any(String));
      expect(category.renderDetail(entry as never)).toBeTruthy();
      for (const filter of category.filters ?? []) {
        expect(filter.valuesFor(entry as never)).toEqual(expect.any(Array));
        filter.sortKey?.(filter.id === 'level' ? 'Cantrip' : '1');
        filter.labelFor?.('PHB', 'en');
      }
    }

    fetchMock.mockRestore();
  });

  it('covers fallback labels, filters and failed loading', async () => {
    const t = (key: string) => key;
    const empty = {
      source: 'UNKNOWN',
      level: 1,
      cr: 'unknown',
      concentration: true,
      ritual: false,
      attunement: 'required',
    };

    for (const id of ['backgrounds', 'actions', 'deities', 'skills'] as const) {
      expect(getCategory(id)!.subtitle(empty as never, t)).toEqual(expect.any(String));
    }
    expect(getCategory('spells')!.subtitle(empty as never, t)).toEqual(
      expect.any(String),
    );
    expect(getCategory('facilities')!.subtitle({} as never, t)).toBe('');
    expect(getCategory('facilities')!.subtitle(empty as never, t)).toEqual(
      expect.any(String),
    );
    const attunement = getCategory('items')!.filters!.find(
      (filter) => filter.id === 'attunement',
    )!;
    expect(attunement.valuesFor({ attunement: '' } as never)).toEqual(['No']);

    for (const filter of categories.flatMap((category) => category.filters ?? [])) {
      filter.valuesFor(empty as never);
      filter.sortKey?.('Level 1');
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(null, { status: 500 }),
    );
    await expect(getCategory('species')!.load()).rejects.toThrow(
      'Failed to load compendium data: species',
    );
    vi.restoreAllMocks();
  });
});
