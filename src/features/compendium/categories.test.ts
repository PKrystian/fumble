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

  it('localizes category subtitles for Polish values', () => {
    expect(
      getCategory('conditions')!.subtitle(
        { kind: 'status' } as never,
        (key) => key,
        'pl',
      ),
    ).toBe('status');
    expect(
      getCategory('languages')!.subtitle(
        { languageType: 'Standard' } as never,
        (key) => key,
        'pl',
      ),
    ).toBe('standardowy');
    expect(
      categories
        .find((category) => category.id === 'languages')!
        .filters?.[0]?.labelFor?.('Standard', 'pl'),
    ).toBe('standardowy');
    expect(
      getCategory('objects')!.subtitle(
        { size: 'Mały lub Mały', objectType: 'Obiekt' } as never,
        (key) => key,
        'pl',
      ),
    ).toBe('Malutki lub Mały Obiekt');
    expect(
      getCategory('vehicles')!.subtitle(
        { size: '', vehicleType: 'Zaklęcie zaklęć' } as never,
        (key) => key,
        'pl',
      ),
    ).toBe('Spelljammer');
  });

  it('extracts empty and populated filter values', () => {
    const size = categories
      .find((category) => category.id === 'species')!
      .filters!.find((filter) => filter.id === 'size')!;
    expect(size.valuesFor({ size: '' } as never)).toEqual([]);
    expect(size.valuesFor({ size: undefined } as never)).toEqual([]);
    expect(size.valuesFor({ size: 'Medium' } as never)).toEqual(['Medium']);
    expect(size.labelFor?.('Medium', 'pl')).toBe('Średni');

    const creatureType = categories
      .find((category) => category.id === 'species')!
      .filters!.find((filter) => filter.id === 'creatureType')!;
    expect(creatureType.labelFor?.('Construct', 'pl')).toBe('Konstrukt');

    const properties = getCategory('items')!.filters!.find(
      (filter) => filter.id === 'properties',
    )!;
    expect(properties.valuesFor({ properties: '' } as never)).toEqual([]);
    expect(properties.valuesFor({ properties: undefined } as never)).toEqual([]);

    const subclasses = getCategory('spells')!.filters!.find(
      (filter) => filter.id === 'subclass',
    )!;
    expect(subclasses.valuesFor({ subclasses: [new String('Evoker')] } as never)).toEqual(
      ['Evoker'],
    );

    const classes = getCategory('spells')!.filters!.find(
      (filter) => filter.id === 'class',
    )!;
    expect(
      classes.valuesFor({ classes: ['Duchowny', 'druid', 'Druid', 'Cleric'] } as never),
    ).toEqual(['Cleric', 'Druid']);
    expect(classes.labelFor?.('Cleric', 'pl')).toBe('Kleryk');
    expect(classes.labelFor?.('Ranger', 'pl')).toBe('Leśniczy');

    const school = getCategory('spells')!.filters!.find(
      (filter) => filter.id === 'school',
    )!;
    expect(school.valuesFor({ school: 'Transmutacja' } as never)).toEqual([
      'Transmutation',
    ]);
    expect(school.labelFor?.('Transmutation', 'pl')).toBe('Przemiana');

    const itemType = getCategory('items')!.filters!.find(
      (filter) => filter.id === 'type',
    )!;
    expect(itemType.valuesFor({ type: 'Broń biała' } as never)).toEqual(['Melee Weapon']);
    expect(itemType.labelFor?.('Melee Weapon', 'pl')).toBe('Broń do Walki Wręcz');

    const rarity = getCategory('items')!.filters!.find(
      (filter) => filter.id === 'rarity',
    )!;
    expect(rarity.valuesFor({ rarity: 'Niezwykły' } as never)).toEqual(['Uncommon']);
    expect(rarity.labelFor?.('Uncommon', 'pl')).toBe('Niepospolita');

    const itemProperties = getCategory('items')!.filters!.find(
      (filter) => filter.id === 'properties',
    )!;
    expect(
      itemProperties.valuesFor({ properties: 'finezyjne, dwuręczny' } as never),
    ).toEqual(['Finesse', 'Two-Handed']);
  });

  it('keeps sidekicks and fighting styles behind their filters', () => {
    const classType = getCategory('classes')!.filters!.find(
      (filter) => filter.id === 'type',
    )!;
    expect(classType.valuesFor({ id: 'expert-sidekick' } as never)).toEqual(['sidekick']);
    expect(classType.valuesFor({ id: 'wizard' } as never)).toEqual(['class']);
    expect(classType.defaultVisible?.({ id: 'expert-sidekick' } as never)).toBe(false);
    expect(classType.defaultVisible?.({ id: 'wizard' } as never)).toBe(true);
    expect(classType.valueLabelKey?.('sidekick')).toBe(
      'compendium.filters.values.sidekick',
    );

    const featureType = getCategory('optionalfeatures')!.filters!.find(
      (filter) => filter.id === 'featureType',
    )!;
    expect(
      featureType.defaultVisible?.({ featureType: 'Fighting Style, FS:P' } as never),
    ).toBe(false);
    expect(
      featureType.defaultVisible?.({ featureType: 'Styl walki, FS:P' } as never),
    ).toBe(false);
    expect(featureType.defaultVisible?.({ featureType: 'Metamagic' } as never)).toBe(
      true,
    );
    expect(featureType.defaultVisible?.({} as never)).toBe(true);
    expect(featureType.valueLabelKey?.('Styl walki')).toBe(
      'compendium.filters.values.fightingStyle',
    );
    expect(featureType.labelFor?.('Fighting Style', 'pl')).toBe('Styl walki');
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
      collection: 'test',
      data: { name: 'Entry', source: 'PHB' },
      entries: [],
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
      await expect(category.load()).resolves.toEqual(
        category.id === 'firearms' ? [] : [entry],
      );
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
    expect(getCategory('firearms')!.filters).toEqual(getCategory('items')!.filters);

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
