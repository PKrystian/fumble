import { describe, expect, it } from 'vitest';
import * as normalize from './normalize';

const base = { name: 'Test Entry', source: 'XPHB', entries: [] };

describe('data normalizers', () => {
  it('normalizes common compendium records', () => {
    const records = [
      normalize.normalizeSpell({
        ...base,
        level: 1,
        school: 'A',
      }),
      normalize.normalizeCondition(base, 'condition'),
      normalize.normalizeSpecies(base),
      normalize.normalizeSubrace({ ...base, raceName: 'Elf' }),
      normalize.normalizeFeat(base),
      normalize.normalizeBackground(base),
      normalize.normalizeRule(base),
      normalize.normalizeItem(base),
      normalize.normalizeMonster(base),
      normalize.normalizeAction(base),
      normalize.normalizeOptionalFeature(base),
      normalize.normalizeDeity(base),
      normalize.normalizeHazard(base, 'Hazard'),
      normalize.normalizeBoon(base),
      normalize.normalizeSkill(base),
      normalize.normalizeSense(base),
      normalize.normalizeLanguage(base),
      normalize.normalizeCultBoon(base, 'Cult'),
      normalize.normalizeFacility(base),
      normalize.normalizeRecipe(base),
      normalize.normalizeObject(base),
      normalize.normalizeMastery(base),
      normalize.normalizeCharOption(base),
      normalize.normalizeTable(base),
      normalize.normalizeDeck(base),
      normalize.normalizeVehicle(base),
    ];

    expect(records).toHaveLength(26);
    expect(records.every((record) => record.id.length > 0)).toBe(true);
    expect(records.every((record) => record.source === 'XPHB')).toBe(true);
  });

  it('normalizes species movement and images', () => {
    const images = new Map([['test entry|XPHB', 'species/test.webp']]);
    expect(
      normalize.normalizeSpecies(
        {
          ...base,
          size: ['M'],
          speed: { walk: 35, fly: true, swim: 20 },
          creatureTypes: ['fey'],
        },
        images,
      ),
    ).toMatchObject({
      image: 'species/test.webp',
      size: 'Medium',
      walkSpeed: 35,
      flySpeed: 35,
      swimSpeed: 20,
      creatureType: 'Fey',
    });
  });

  it('normalizes class collections', () => {
    const data = {
      class: [
        {
          ...base,
          hd: { faces: 8 },
          primaryAbility: [{ int: true }],
          proficiency: ['int', 'wis'],
          classFeatures: [],
        },
      ],
      subclass: [
        {
          ...base,
          name: 'School',
          shortName: 'School',
          className: 'Test Entry',
          classSource: 'XPHB',
          subclassFeatures: [],
        },
      ],
      classFeature: [],
      subclassFeature: [],
    };

    expect(normalize.normalizeClasses(data)).toMatchObject([
      {
        name: 'Test Entry',
        hitDie: 'd8',
        primaryAbility: 'Intelligence',
        savingThrows: 'Intelligence, Wisdom',
      },
    ]);
    expect(normalize.normalizeStandaloneSubclasses(data)).toHaveLength(1);
    expect(normalize.normalizeClasses(data, new Map(), () => false)).toEqual([]);
  });

  it('attaches subclass fluff media to normalized class records', () => {
    const data = {
      class: [
        {
          ...base,
          hd: { faces: 8 },
          primaryAbility: [{ int: true }],
          proficiency: ['int', 'wis'],
          classFeatures: [],
        },
      ],
      subclass: [
        {
          ...base,
          name: 'School',
          shortName: 'School',
          className: 'Test Entry',
          classSource: 'XPHB',
          subclassFeatures: [],
        },
      ],
      classFeature: [],
      subclassFeature: [],
    };
    const fluff = new Map([
      [
        'school|XPHB',
        {
          entries: [],
          images: [{ path: 'classes/XPHB/School.webp' }],
        },
      ],
    ]);

    expect(
      normalize.normalizeClasses(data, new Map(), undefined, 'en', fluff)[0]!
        .subclasses[0],
    ).toMatchObject({
      name: 'School',
      image: 'classes/XPHB/School.webp',
      gallery: [{ path: 'classes/XPHB/School.webp' }],
    });
  });

  it('normalizes populated records', () => {
    expect(
      normalize.normalizeItem({
        ...base,
        type: 'HA',
        rarity: 'rare',
        reqAttune: true,
        weight: 20,
        value: 150,
        dmg1: '1d8',
        dmgType: 'S',
        range: '30/120',
        property: ['F'],
      }),
    ).toMatchObject({
      type: 'Heavy Armor',
      rarity: 'Rare',
      attunement: 'Requires attunement',
      damage: '1d8 slashing',
      range: '30/120 ft.',
    });
    expect(
      normalize.normalizeDeck({
        ...base,
        cards: [{ count: 2 }, {}, { count: 3 }],
      }),
    ).toMatchObject({ cardCount: 6 });
    expect(
      normalize.normalizeVehicle({
        ...base,
        vehicleType: 'SHIP',
        size: 'L',
        capCrew: 4,
        capPassenger: 10,
        capCargo: 2,
        pace: 5,
        speed: 40,
        hull: { ac: 15, hp: 100 },
      }),
    ).toMatchObject({
      vehicleType: 'Ship',
      size: 'Large',
      ac: '15',
      hp: '100',
    });
  });

  it('normalizes a complete monster stat block', () => {
    const groups = new Map([
      [
        'dragon group|XPHB',
        {
          lairActions: ['Lair action.'],
          regionalEffects: ['Regional effect.'],
        },
      ],
    ]);
    const monster = normalize.normalizeMonster(
      {
        ...base,
        size: ['H'],
        type: { type: 'dragon', tags: ['fire'] },
        alignment: ['C', 'E'],
        ac: [{ ac: 19 }],
        initiative: { proficiency: 1 },
        hp: { average: 200, formula: '16d12+96' },
        speed: { walk: 40, fly: 80 },
        str: 23,
        dex: 14,
        con: 21,
        int: 16,
        wis: 15,
        cha: 19,
        save: { dex: '+6' },
        skill: { perception: '+10' },
        vulnerable: ['cold'],
        resist: [{ resist: ['fire'], note: 'from spells' }],
        immune: ['poison'],
        conditionImmune: ['poisoned'],
        senses: ['blindsight 60 ft.'],
        passive: 20,
        languages: ['Common', 'Draconic'],
        cr: { cr: '15', xp: 13000, xpLair: 15000 },
        environment: ['mountain'],
        treasure: ['relics'],
        trait: [{ name: 'Trait', headerEntries: ['Trait text.'] }],
        action: [{ name: 'Bite', entries: ['Attack.'] }],
        bonus: [{ name: 'Wing Beat', entries: ['Move.'] }],
        reaction: [{ name: 'Parry', entries: ['Defend.'] }],
        legendary: [{ name: 'Tail', entries: ['Strike.'] }],
        legendaryActions: 4,
        legendaryActionsLair: 5,
        legendaryGroup: { name: 'Dragon Group', source: 'XPHB' },
        spellcasting: [
          {
            name: 'Innate Spellcasting',
            headerEntries: ['Header.'],
            will: ['detect magic'],
            daily: { '1': ['fireball'] },
            spells: {
              '0': { spells: ['light'] },
              '3': { slots: 2, spells: ['fly'] },
            },
            footerEntries: ['Footer.'],
          },
        ],
        hasToken: true,
      },
      new Map([['test entry|XPHB', 'fluff.webp']]),
      groups,
    );
    expect(monster).toMatchObject({
      image: 'fluff.webp',
      token: 'bestiary/tokens/XPHB/Test Entry.webp',
      creatureType: 'Dragon (Fire)',
      legendaryActions: [{ name: 'Tail' }],
      lairActions: ['Lair action.'],
      regionalEffects: ['Regional effect.'],
    });
    expect(monster.legendaryIntro).toContain('4 (5 in Lair)');
    expect(monster.spellcasting[0]!.entries).toContain('Level 3 (2 slots): fly');
  });

  it('normalizes recipes, objects and vehicle weapons', () => {
    expect(
      normalize.normalizeRecipe({
        ...base,
        type: 'Dessert',
        serves: { min: 2, max: 4, note: 'heroes' },
        diet: ['V'],
        ingredients: [
          'Flour',
          { entry: '{=amount} apples', amount: 3 },
          { entry: '{=missing} salt' },
        ],
        instructions: ['Mix everything.'],
      }),
    ).toMatchObject({
      recipeType: 'Dessert',
      serves: '2-4 heroes',
      diet: 'Vegetarian',
    });
    expect(
      normalize.normalizeObject({
        ...base,
        size: ['L'],
        objectType: 'SW',
        ac: { ac: 17 },
        hp: { average: 50, formula: '5d10' },
        immune: ['poison'],
        senses: ['tremorsense'],
        passive: 12,
        actionEntries: [{ name: 'Fire', entries: ['Shoots.'] }],
        hasToken: true,
      }),
    ).toMatchObject({
      image: 'objects/tokens/XPHB/Test Entry.webp',
      ac: '17',
      hp: '50 (5d10)',
      actions: [{ name: 'Fire' }],
    });
    const vehicle = normalize.normalizeVehicle({
      ...base,
      ac: { ac: 12 },
      hp: { average: 80 },
      hasToken: true,
      weapon: [
        {
          name: 'Ballista',
          count: 2,
          ac: 15,
          hp: 30,
          crew: 3,
          entries: ['Mounted weapon.'],
          action: [{ name: 'Fire', headerEntries: ['Attack.'] }],
        },
      ],
    });
    expect(vehicle).toMatchObject({
      image: 'vehicles/tokens/XPHB/Test Entry.webp',
      ac: '12',
      hp: '80',
    });
    expect(vehicle.weapons[0]!.entries).toContain('AC 15, HP 30, Crew 3');
    expect(vehicle.weapons[0]!.entries).toContain('Mounted weapon.');
  });

  it('resolves class feature references and progression tables', () => {
    const data = {
      class: [
        {
          ...base,
          classFeatures: ['Spellcasting|Wizard|XPHB|1'],
          classTableGroups: [
            {
              colLabels: ['{@b Uses}', 'Slots'],
              rows: [[{ entry: '{@b One}' }, { value: 2 }]],
            },
            { colLabels: ['1st'], rowsSpellProgression: [[2]] },
          ],
        },
      ],
      classFeature: [
        {
          ...base,
          name: 'Spellcasting',
          level: 1,
          entries: [{ type: 'refClassFeature', classFeature: 'Nested|Wizard|XPHB|1' }],
        },
        { ...base, name: 'Nested', level: 1, entries: ['Nested feature.'] },
      ],
      subclass: [
        {
          name: 'Evoker',
          source: 'XPHB',
          className: 'Test Entry',
          shortName: 'Evoker',
          subclassFeatures: ['Sculpt Spells|Test Entry|XPHB|Evoker|2'],
        },
      ],
      subclassFeature: [
        {
          ...base,
          name: 'Sculpt Spells',
          classSource: 'XPHB',
          subclassShortName: 'Evoker',
          level: 2,
          entries: ['Protect allies.'],
        },
      ],
    };
    const cls = normalize.normalizeClasses(data)[0]!;
    expect(cls.features[0]).toMatchObject({ name: 'Spellcasting', level: 1 });
    expect(cls.features[0]!.entries).toMatchObject([
      { name: 'Nested', entries: ['Nested feature.'] },
    ]);
    expect(cls.table.headers).toContain('Uses');
    expect(cls.table.rows[0]).toContain('2');
    expect(cls.subclasses[0]!.features[0]).toMatchObject({
      name: 'Sculpt Spells',
      level: 2,
    });
  });

  it('normalizes optional fields and fallback values', () => {
    const sparse = { name: 'Sparse', source: 'HB', page: 7, srd52: true };
    expect(
      normalize.normalizeSpell({
        ...sparse,
        level: 0,
        school: 'custom',
        entries: undefined,
        entriesHigherLevel: ['More'],
      } as never),
    ).toMatchObject({
      page: 7,
      srd: true,
      school: 'custom',
      entries: [],
      entriesHigherLevel: ['More'],
    });
    expect(normalize.normalizeSpecies({ ...sparse, speed: 25 } as never)).toMatchObject({
      walkSpeed: 25,
      flySpeed: 0,
      creatureType: 'Humanoid',
      entries: [],
    });
    expect(
      normalize.normalizeSpecies({
        ...sparse,
        speed: { walk: false, climb: true },
        creatureTypes: [],
      } as never),
    ).toMatchObject({ walkSpeed: 30, climbSpeed: 30, creatureType: '' });
    expect(
      normalize.normalizeSubrace({
        source: 'HB',
        page: 7,
        srd52: true,
        raceName: 'Elf',
      }),
    ).toMatchObject({ name: 'Elf', parentRace: 'Elf', entries: [] });
    expect(
      normalize.normalizeFeat({ ...sparse, category: 'Unknown' } as never),
    ).toMatchObject({ category: 'Unknown', entries: [] });
    expect(normalize.normalizeRule({ ...sparse, ruleType: 'Unknown' })).toMatchObject({
      ruleType: 'Unknown',
      entries: [],
    });
    expect(normalize.normalizeItem({ ...sparse, ac: 12 })).toMatchObject({
      ac: '12',
      entries: [],
    });
    expect(normalize.normalizeAction({ ...sparse })).toMatchObject({
      time: '',
      entries: [],
    });
    expect(normalize.normalizeFacility({ ...sparse, level: 4 })).toMatchObject({
      level: '4',
      entries: [],
    });
    expect(
      normalize.normalizeCharOption({
        ...sparse,
        optionType: ['RF', 'Custom'],
      }),
    ).toMatchObject({ optionType: 'Race Feature, Custom', entries: [] });
  });

  it('normalizes sparse stat blocks and alternate numeric shapes', () => {
    expect(
      normalize.normalizeMonster({
        name: 'Sparse Monster',
        source: 'HB',
        entries: [],
        cr: '1',
        legendary: [{ headerEntries: ['Action'] }],
        spellcasting: [
          {
            daily: { empty: [], '2e': ['shield'] },
            spells: {
              '1': { spells: ['magic missile'] },
              '2': { spells: [] },
            },
          },
        ],
      } as never),
    ).toMatchObject({
      legendaryActions: [{ name: '', entries: ['Action'] }],
      spellcasting: [
        {
          name: 'Spellcasting',
          entries: ['2/day each: shield', 'Level 1: magic missile'],
        },
      ],
    });
    expect(
      normalize.normalizeObject({
        name: 'Numeric',
        source: 'HB',
        ac: 14,
        hp: 30,
      }),
    ).toMatchObject({ ac: '14', hp: '30' });
    expect(
      normalize.normalizeObject({
        name: 'Empty',
        source: 'HB',
      }),
    ).toMatchObject({ ac: '', hp: '', actions: [] });
    expect(
      normalize.normalizeVehicle({
        name: 'Cart',
        source: 'HB',
        size: 'M',
        ac: { ac: 11 },
        hp: 20,
        weapon: [{ action: [{ headerEntries: ['Strike'] }] }],
      }),
    ).toMatchObject({
      size: 'Medium',
      ac: '11',
      hp: '20',
      entries: [],
      weapons: [{ name: 'Weapon', entries: [{ name: '', entries: ['Strike'] }] }],
    });
  });

  it('handles incomplete and duplicate class data', () => {
    const data = {
      class: [
        {
          name: 'Wizard',
          source: 'HB',
          classFeatures: [
            { classFeature: 'Missing|Wizard|HB|1' },
            { classFeature: 'Known|Wizard|HB|1' },
          ],
          classTableGroups: [
            {
              colLabels: ['Text', 'Number', 'Empty'],
              rows: [['', 2, {}]],
            },
            {
              colLabels: ['Slot'],
              rowsSpellProgression: [[0]],
            },
          ],
        },
      ],
      classFeature: [
        {
          name: 'Known',
          source: 'HB',
          level: 1,
          entries: [
            null,
            { type: 'refClassFeature', classFeature: 'Missing|Wizard|HB|1' },
            {
              type: 'entries',
              entries: [
                {
                  type: 'refSubclassFeature',
                  subclassFeature: 'Sub Known|Wizard|HB|School|1',
                },
                { type: 'item', name: 'Leaf' },
              ],
            },
          ],
        },
      ],
      subclass: [
        {
          name: 'School',
          shortName: 'School',
          source: 'HB',
          className: 'Other',
        },
        {
          name: 'School',
          shortName: 'School',
          source: 'HB',
          className: 'Wizard',
          subclassFeatures: [{ subclassFeature: 'Sub Known|Wizard|HB|School|1' }],
        },
        {
          name: 'School',
          shortName: 'School',
          source: 'HB',
          className: 'Wizard',
        },
      ],
      subclassFeature: [
        {
          name: 'Sub Known',
          source: 'HB',
          level: 1,
          subclassShortName: 'School',
          entries: ['Found'],
        },
      ],
    };
    const result = normalize.normalizeClasses(data as never);
    expect(result[0]?.features).toHaveLength(1);
    expect(result[0]?.subclasses).toHaveLength(1);
    expect(result[0]?.table.rows[0]).toEqual(['1', '+2', 'Known', '-', '2', '-', '-']);
    expect(
      normalize.normalizeStandaloneSubclasses({
        ...data,
        subclass: [{ name: 'No Class', source: 'HB' }],
      } as never),
    ).toEqual([]);
  });

  it('normalizes missing optional collections and values', () => {
    const sparse = { name: 'Sparse', source: 'HB' };
    const records = [
      normalize.normalizeCondition(sparse as never, 'condition'),
      normalize.normalizeBackground(sparse as never),
      normalize.normalizeAction({
        ...sparse,
        time: [{ number: 1, unit: 'action' }],
      } as never),
      normalize.normalizeOptionalFeature(sparse),
      normalize.normalizeDeity(sparse),
      normalize.normalizeHazard(sparse, 'Hazard'),
      normalize.normalizeBoon(sparse),
      normalize.normalizeSkill({ ...sparse, ability: 'dex' }),
      normalize.normalizeSense(sparse),
      normalize.normalizeLanguage(sparse),
      normalize.normalizeCultBoon(sparse, 'Cult'),
      normalize.normalizeMastery(sparse),
      normalize.normalizeDeck(sparse),
    ];

    expect(records.every((record) => 'entries' in record)).toBe(true);
    expect(
      normalize.normalizeMonster({
        ...sparse,
        spellcasting: [{}],
      } as never).spellcasting,
    ).toMatchObject([{ name: 'Spellcasting', entries: [] }]);
  });

  it('sorts classes and subclasses and stops recursive feature expansion', () => {
    const loop = 'Loop|Alpha|HB|1';
    const data = {
      class: [
        {
          name: 'Zulu',
          source: 'HB',
          classFeatures: [],
        },
        {
          name: 'Alpha',
          source: 'HB',
          classFeatures: [loop],
        },
      ],
      classFeature: [
        {
          name: 'Loop',
          source: 'HB',
          level: 1,
          entries: [{ type: 'refClassFeature', classFeature: loop }],
        },
      ],
      subclass: [
        {
          name: 'School',
          shortName: 'School',
          source: 'ZZ',
          className: 'Alpha',
          subclassFeatures: [],
        },
        {
          name: 'School',
          shortName: 'School',
          source: 'AA',
          className: 'Alpha',
          subclassFeatures: [],
        },
        {
          name: 'Academy',
          shortName: 'Academy',
          source: 'HB',
          className: 'Alpha',
          subclassFeatures: [],
        },
      ],
    };

    const classes = normalize.normalizeClasses(data as never);
    expect(classes.map((cls) => cls.name)).toEqual(['Alpha', 'Zulu']);
    expect(classes[0]?.subclasses.map((subclass) => subclass.name)).toEqual([
      'Academy',
      'School',
      'School',
    ]);
  });

  it('handles malformed references and empty class collections', () => {
    expect(normalize.normalizeClasses({})).toEqual([]);
    expect(normalize.normalizeStandaloneSubclasses({})).toEqual([]);

    const data = {
      class: [
        {
          name: 'Broken',
          source: 'HB',
          classFeatures: [{}, 'Loose|Broken|HB|1', 'Empty|Broken|HB|1'],
          classTableGroups: [{}],
        },
      ],
      classFeature: [
        {
          name: 'Loose',
          level: 1,
          entries: [
            {
              type: 'refSubclassFeature',
              subclassFeature: 'Missing',
            },
            {
              type: 'refSubclassFeature',
              subclassFeature: 'Known|Broken|HB|School|1',
            },
          ],
        },
        {
          name: 'Loose',
          level: 1,
        },
        {
          name: 'Empty',
          source: 'HB',
          level: 1,
        },
      ],
      subclass: [
        {
          name: 'School',
          source: 'HB',
          className: 'Broken',
        },
      ],
      subclassFeature: [
        {
          name: 'Known',
          source: 'HB',
          level: 1,
          subclassShortName: 'School',
          entries: ['Known subclass feature.'],
        },
      ],
    };
    expect(normalize.normalizeClasses(data as never)).toHaveLength(1);
    expect(
      normalize.normalizeClasses({
        class: [{ name: 'No Collections', source: 'HB' }],
      }),
    ).toHaveLength(1);

    expect(
      normalize.normalizeMonster({
        name: 'Empty Section',
        source: 'HB',
        trait: [{}],
      } as never).traits,
    ).toEqual([{ name: '', entries: [] }]);
    expect(
      normalize.normalizeRecipe({
        name: 'Recipe',
        source: 'HB',
        ingredients: [{}],
        entries: ['Note'],
      }),
    ).toMatchObject({ entries: expect.arrayContaining(['Note']) });
    expect(
      normalize.normalizeVehicle({
        name: 'Wagon',
        source: 'HB',
        size: ['L'],
        ac: 13,
        weapon: [{ action: [{}] }, {}],
      } as never),
    ).toMatchObject({ size: 'Large', ac: '13' });
  });

  it('normalizes Polish labels and alternate optional shapes', () => {
    expect(
      normalize.normalizeItem(
        {
          ...base,
          property: ['F'],
          mastery: ['Graze'],
          weaponCategory: 'martial',
          range: '30/120',
        },
        new Map(),
        'pl',
      ),
    ).toMatchObject({
      weaponCategory: 'martial',
      mastery: 'Graze',
      range: '30/120 stóp',
    });

    const monster = normalize.normalizeMonster(
      {
        ...base,
        legendary: [{ entries: ['Legendary.'] }],
        legendaryActionsLair: 2,
        spellcasting: [
          {
            will: ['light'],
            daily: { '1e': ['shield'], empty: [] },
            spells: {
              '0': { spells: ['fire bolt'] },
              '2': { slots: 2, spells: ['misty step'] },
            },
            footerEntries: ['Footer.'],
          },
        ],
      },
      new Map(),
      new Map(),
      'pl',
    );
    expect(monster.spellcasting[0]!.name).toBe('Rzucanie zaklęć');
    expect(monster.spellcasting[0]!.entries).toEqual(
      expect.arrayContaining(['Na żądanie: light', 'Sztuczki (na żądanie): fire bolt']),
    );

    const noLairMonster = normalize.normalizeMonster(
      { ...base, legendary: [{ entries: ['Legendary.'] }] },
      new Map(),
      new Map(),
      'pl',
    );
    expect(noLairMonster.legendaryIntro).toContain('Wykorzystania');

    expect(
      normalize.normalizeRecipe(
        { ...base, ingredients: ['Flour'], instructions: ['Mix'] },
        'pl',
      ).entries,
    ).toHaveLength(2);

    const vehicle = normalize.normalizeVehicle(
      { ...base, weapon: [{ ac: 12, hp: 20, crew: 3 }] },
      new Map(),
      'pl',
    );
    expect(vehicle.weapons[0]!.name).toBe('Broń');

    expect(vehicle.weapons[0]!.entries[0]).toContain('KP 12, PW 20');

    const cls = normalize.normalizeClasses(
      {
        class: [{ ...base, hd: { faces: 6 }, classFeatures: [] }],
      },
      new Map(),
      undefined,
      'pl',
    );
    expect(cls[0]!.subclassTitle).toBe('Podklasa');

    expect(
      normalize.normalizeCharOption({ ...base, optionType: [] }, 'pl'),
    ).toMatchObject({
      optionType: 'Opcja postaci',
    });
    expect(
      normalize.normalizeCharOption({ ...base, optionType: ['RF', 'UNKNOWN'] }, 'pl'),
    ).toMatchObject({
      optionType: 'Cecha rasy, UNKNOWN',
    });
  });
});
