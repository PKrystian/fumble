import { describe, expect, it } from 'vitest';
import type {
  BackgroundEntry,
  ClassEntry,
  ClassSubclass,
  SpeciesEntry,
  SpellEntry,
} from '@/data/compendium/types';
import { createCharacter, type Character } from './model';
import {
  findSubclass,
  findSubclassPair,
  subclassKey,
  syncClassFeatures,
} from './compendiumSync';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return { ...createCharacter('Tester'), ...overrides };
}

function makeClass(overrides: Partial<ClassEntry> = {}): ClassEntry {
  return {
    id: 'fighter',
    name: 'Fighter',
    source: 'XPHB',
    srd: true,
    hitDie: 'd10',
    primaryAbility: 'Strength or Dexterity',
    savingThrows: 'Strength, Constitution',
    proficiencies: '',
    armorProficiencies: 'Light, Medium, Heavy, Shield',
    weaponProficiencies: 'Simple, Martial',
    toolProficiencies: '',
    subclassTitle: 'Subclass',
    table: { headers: [], rows: [] },
    features: [],
    subclasses: [],
    ...overrides,
  };
}

function makeSpecies(overrides: Partial<SpeciesEntry> = {}): SpeciesEntry {
  return {
    id: 'elf',
    name: 'Elf',
    source: 'XPHB',
    srd: true,
    size: 'Medium',
    speed: '30 ft.',
    walkSpeed: 30,
    flySpeed: 0,
    swimSpeed: 0,
    climbSpeed: 0,
    creatureType: 'Humanoid',
    parentRace: '',
    entries: [],
    ...overrides,
  };
}

function makeBackground(overrides: Partial<BackgroundEntry> = {}): BackgroundEntry {
  return {
    id: 'soldier',
    name: 'Soldier',
    source: 'XPHB',
    srd: true,
    abilityScores: '',
    skills: 'Athletics, Intimidation',
    tools: '',
    feat: '',
    entries: [],
    ...overrides,
  };
}

describe('syncClassFeatures', () => {
  it('builds automatic class, subclass, species and background features', () => {
    const cls = makeClass({
      features: [
        {
          level: 1,
          name: 'Training',
          entries: [
            'First paragraph.',
            {
              type: 'entries',
              name: 'Details',
              entries: ['Nested text.'],
            },
            {
              type: 'list',
              items: ['One', { type: 'item', name: 'Two', entry: 'Second item.' }],
            },
          ],
        },
        { level: 10, name: 'Future', entries: ['Not yet.'] },
      ],
    });
    const subclass = {
      name: 'Champion',
      source: 'XPHB',
      features: [
        { level: 3, name: 'Critical Hit', entries: ['Improved critical.'] },
        { level: 10, name: 'Future Critical', entries: ['Not yet.'] },
      ],
    } as ClassSubclass;
    const species = makeSpecies({ entries: ['Darkvision.'] });
    const background = makeBackground({
      feat: 'Alert',
      entries: ['Always ready.'],
    });
    const character = makeCharacter({
      level: 3,
      features: [
        { id: 'manual', name: 'Own Feature', source: '', notes: '' },
        { id: 'old-auto', name: 'Old', source: '', notes: '', auto: true },
      ],
    });

    const patch = syncClassFeatures(character, cls, subclass, species, background);
    expect(patch.hitDice).toBe('3d10');
    expect(patch.features?.map((feature) => feature.name)).toEqual([
      'Own Feature',
      'Training',
      'Critical Hit',
      'Elf',
      'Alert',
    ]);
    expect(
      patch.features?.find((feature) => feature.name === 'Training')?.notes,
    ).toContain('Nested text.');
  });

  it('recognizes one- and two-ability unarmored defense formulas', () => {
    const monk = makeClass({
      features: [
        {
          level: 1,
          name: 'Unarmored Defense',
          entries: [
            'Your Armor Class equals 10 plus your Dexterity and your Wisdom modifiers.',
          ],
        },
      ],
    });
    expect(
      syncClassFeatures(makeCharacter(), monk, undefined, undefined, undefined)
        .unarmoredDefense,
    ).toMatchObject({
      base: 10,
      abilities: ['dex', 'wis'],
      allowShield: false,
    });

    const barbarian = makeClass({
      features: [
        {
          level: 1,
          name: 'Natural Guard',
          entries: [
            'Your Armor Class equals 12 plus your Constitution modifier. You can use a Shield and still gain this benefit.',
          ],
        },
      ],
    });
    expect(
      syncClassFeatures(makeCharacter(), barbarian, undefined, undefined, undefined)
        .unarmoredDefense,
    ).toMatchObject({
      base: 12,
      abilities: ['con'],
      allowShield: true,
    });
  });

  it('overwrites armor and weapon proficiencies from the class', () => {
    const character = makeCharacter({ armorProficiencies: 'stale text' });
    const patch = syncClassFeatures(
      character,
      makeClass(),
      undefined,
      undefined,
      undefined,
    );
    expect(patch.armorProficiencies).toBe('Light, Medium, Heavy, Shield');
    expect(patch.weaponProficiencies).toBe('Simple, Martial');
  });

  it('combines class and background tool proficiencies', () => {
    const character = makeCharacter();
    const cls = makeClass({ toolProficiencies: "Thieves' Tools" });
    const background = makeBackground({ tools: 'Gaming Set' });
    const patch = syncClassFeatures(character, cls, undefined, undefined, background);
    expect(patch.toolProficiencies).toBe("Thieves' Tools, Gaming Set");
  });

  it('syncs walk/fly/swim/climb speed from the species', () => {
    const character = makeCharacter();
    const species = makeSpecies({ walkSpeed: 30, flySpeed: 30 });
    const patch = syncClassFeatures(character, undefined, undefined, species, undefined);
    expect(patch.speed).toEqual({ walk: 30, fly: 30, swim: 0, climb: 0 });
  });

  it('adds background skills without dropping manually-picked class skills', () => {
    const character = makeCharacter({ skillProficiencies: ['stealth'] });
    const background = makeBackground({ skills: 'Athletics, Intimidation' });
    const patch = syncClassFeatures(
      character,
      undefined,
      undefined,
      undefined,
      background,
    );
    expect(patch.skillProficiencies).toEqual(
      expect.arrayContaining(['stealth', 'athletics', 'intimidation']),
    );
    expect(patch.skillProficiencies).toHaveLength(3);
  });

  it('ignores "choose" phrasing rather than mis-adding it as a skill', () => {
    const character = makeCharacter();
    const background = makeBackground({ skills: 'choose 2 from Arcana, History' });
    const patch = syncClassFeatures(
      character,
      undefined,
      undefined,
      undefined,
      background,
    );
    expect(patch.skillProficiencies).toEqual([]);
  });

  it('returns only manual features when no compendium entries are selected', () => {
    const character = makeCharacter({
      features: [
        { id: 'manual', name: 'Manual', source: '', notes: '' },
        { id: 'auto', name: 'Old', source: '', notes: '', auto: true },
      ],
    });
    const patch = syncClassFeatures(
      character,
      undefined,
      undefined,
      undefined,
      undefined,
    );
    expect(patch.features).toEqual([character.features[0]]);
    expect(patch.toolProficiencies).toBeUndefined();
    expect(patch.speed).toBeUndefined();
    expect(patch.unarmoredDefense).toBeNull();
  });

  it('handles named entry nodes, empty tools and unknown skill names', () => {
    const cls = makeClass({
      toolProficiencies: '',
      savingThrows: 'Unknown',
      features: [
        {
          level: 1,
          name: 'Named',
          entries: [
            {
              type: 'entries',
              name: '{@b Heading}',
              entries: [],
            },
          ],
        },
      ],
    });
    const background = makeBackground({
      skills: 'Athletics, Unknown, ,',
      tools: '',
    });
    const patch = syncClassFeatures(
      makeCharacter(),
      cls,
      undefined,
      undefined,
      background,
    );
    expect(patch.features?.[0]?.notes).toBe('Heading');
    expect(patch.toolProficiencies).toBe('');
    expect(patch.savingThrowProficiencies).toBeUndefined();
    expect(patch.skillProficiencies).toEqual(['athletics']);
  });

  it('falls back to valid subclass unarmored defense', () => {
    const cls = makeClass({
      features: [
        {
          level: 2,
          name: 'Future Defense',
          entries: ['Your Armor Class equals 10 plus your Dexterity modifier.'],
        },
        {
          level: 1,
          name: 'Invalid Defense',
          entries: ['Your Armor Class equals 10 plus your Luck modifier.'],
        },
      ],
    });
    const subclass = {
      name: 'Guard',
      source: 'HB',
      features: [
        {
          level: 1,
          name: 'Guarded',
          entries: ['Your Armor Class equals 11 plus your Wisdom modifier.'],
        },
      ],
    } as ClassSubclass;
    const patch = syncClassFeatures(
      makeCharacter(),
      cls,
      subclass,
      undefined,
      undefined,
      { subclass },
    );
    expect(patch.unarmoredDefense).toMatchObject({
      base: 11,
      abilities: ['wis'],
      source: 'Guarded',
    });
  });
});

describe('subclass lookup', () => {
  const oldSubclass = { name: 'Evoker', source: 'PHB', features: [] };
  const newSubclass = { name: 'Evoker', source: 'XPHB', features: [] };
  const localized = makeClass({
    subclasses: [oldSubclass, newSubclass],
  });

  it('finds subclasses by composite key or legacy name', () => {
    expect(subclassKey(newSubclass)).toBe('Evoker|XPHB');
    expect(findSubclass(localized, 'evoker|xphb')).toBe(newSubclass);
    expect(findSubclass(localized, 'Evoker')).toBe(oldSubclass);
    expect(findSubclass(undefined, 'Evoker')).toBeUndefined();
    expect(findSubclass(localized, ' ')).toBeUndefined();
  });

  it('pairs localized and English subclasses by index or source', () => {
    const english = makeClass({
      subclasses: [
        { name: 'Evocation', source: 'PHB', features: [] },
        { name: 'Evocation', source: 'XPHB', features: [] },
      ],
    });
    expect(findSubclassPair({ localized, english }, 'Evoker|XPHB').english?.source).toBe(
      'XPHB',
    );

    const mismatched = makeClass({
      subclasses: [{ name: 'Evocation', source: 'XPHB', features: [] }],
    });
    expect(
      findSubclassPair({ localized, english: mismatched }, 'Evoker|XPHB').english?.source,
    ).toBe('XPHB');
    expect(findSubclassPair({ localized, english }, 'Unknown')).toEqual({
      localized: undefined,
      english: undefined,
    });
    expect(findSubclassPair({ localized, english: undefined }, 'Evoker|XPHB')).toEqual({
      localized: newSubclass,
      english: undefined,
    });
  });
});

function makeSpellIndex(): Map<string, SpellEntry> {
  const spell = (id: string, name: string, level: number) =>
    [id, { id, name, level } as SpellEntry] as const;
  return new Map([
    spell('sanctuary', 'Azyl', 1),
    spell('sleep', 'Sen', 1),
    spell('calm-emotions', 'Uspokojenie Emocji', 2),
    spell('counterspell', 'Kontrzaklęcie', 3),
    spell('divine-smite', 'Boskie Uderzenie', 1),
  ]);
}

const oathSpellTable = {
  type: 'table',
  caption: 'Oath of Redemption Spells',
  colLabels: ['Paladin Level', 'Spells'],
  rows: [
    ['3rd', '{@spell sanctuary}, {@spell sleep}'],
    ['5th', '{@spell calm emotions}'],
    ['9th', '{@spell counterspell}'],
  ],
};

function makeSubclass(): ClassSubclass {
  return {
    name: 'Oath of Redemption',
    source: 'XGE',
    features: [{ level: 3, name: 'Oath Spells', entries: [oathSpellTable] }],
  } as unknown as ClassSubclass;
}

describe('granted spells', () => {
  const spellIndex = makeSpellIndex();

  it('adds subclass spells up to the character level and no further', () => {
    const character = makeCharacter({ level: 5 });
    const patch = syncClassFeatures(
      character,
      makeClass(),
      makeSubclass(),
      undefined,
      undefined,
      { subclass: makeSubclass(), spellIndex },
    );

    const names = (patch.spells ?? []).map((s) => s.name);
    expect(names).toEqual(['Azyl', 'Sen', 'Uspokojenie Emocji']);
    expect(names).not.toContain('Kontrzaklęcie');
    expect(patch.spells?.every((s) => s.prepared && s.auto)).toBe(true);
  });

  it('unlocks higher-level rows as the character levels up', () => {
    const character = makeCharacter({ level: 9 });
    const patch = syncClassFeatures(
      character,
      makeClass(),
      makeSubclass(),
      undefined,
      undefined,
      { subclass: makeSubclass(), spellIndex },
    );
    expect((patch.spells ?? []).map((s) => s.name)).toContain('Kontrzaklęcie');
  });

  it('picks up "always have prepared" spells from class prose', () => {
    const cls = makeClass({
      features: [
        {
          level: 2,
          name: "Paladin's Smite",
          entries: ['You always have the {@spell Divine Smite|XPHB} spell prepared.'],
        },
      ],
    } as Partial<ClassEntry>);
    const patch = syncClassFeatures(
      makeCharacter({ level: 2 }),
      cls,
      undefined,
      undefined,
      undefined,
      { cls, spellIndex },
    );
    expect((patch.spells ?? []).map((s) => s.name)).toEqual(['Boskie Uderzenie']);
  });

  it('keeps manually added spells and does not duplicate a granted one', () => {
    const character = makeCharacter({
      level: 5,
      spells: [
        { id: 'm1', name: 'Own Pick', level: 1, prepared: false },
        { id: 'm2', name: 'Azyl', level: 1, prepared: true },
      ],
    });
    const patch = syncClassFeatures(
      character,
      makeClass(),
      makeSubclass(),
      undefined,
      undefined,
      { subclass: makeSubclass(), spellIndex },
    );

    const names = (patch.spells ?? []).map((s) => s.name);
    expect(names.filter((n) => n === 'Azyl')).toHaveLength(1);
    expect(names).toContain('Own Pick');
    expect(patch.spells?.find((s) => s.name === 'Own Pick')?.auto).toBeUndefined();
  });

  it('parses saving throws from the English entry even when the sheet is localized', () => {
    const localized = makeClass({ savingThrows: 'Mądrość, Charyzma' });
    const english = makeClass({ savingThrows: 'Wisdom, Charisma' });
    const patch = syncClassFeatures(
      makeCharacter(),
      localized,
      undefined,
      undefined,
      undefined,
      { cls: english },
    );
    expect(patch.savingThrowProficiencies).toEqual(['wis', 'cha']);
  });

  it('handles irregular spell tables, nested entries and duplicate grants', () => {
    const cls = makeClass({
      features: [
        {
          level: 1,
          name: 'Granted',
          entries: [
            {
              type: 'table',
              colLabels: ['Level', 'Feature'],
              rows: [['1st', '{@spell sleep}']],
            },
            {
              type: 'entries',
              entries: [
                'You always have {@spell Sleep|XPHB} prepared.',
                'You always have {@spell Sleep|XPHB} prepared.',
                {
                  type: 'table',
                  rows: [],
                },
                {
                  type: 'table',
                  colLabels: ['Spells'],
                  rows: [
                    [],
                    ['', '{@spell sanctuary}'],
                    ['9th', '{@spell counterspell}'],
                    ['1st', '{@spell missing spell}'],
                    ['1st', 'No spell here'],
                  ],
                },
              ],
            },
          ],
        },
        {
          level: 10,
          name: 'Future',
          entries: ['You always have {@spell counterspell} prepared.'],
        },
      ],
    });
    const patch = syncClassFeatures(
      makeCharacter({
        spells: [
          { id: 'old', name: 'Old automatic', level: 1, prepared: true, auto: true },
        ],
      }),
      cls,
      undefined,
      undefined,
      undefined,
      { cls, spellIndex },
    );
    expect(patch.spells?.map((spell) => spell.name)).toEqual(['Sen', 'Azyl']);
  });

  it('does not rebuild spells without a populated index or selected class', () => {
    const character = makeCharacter();
    expect(
      syncClassFeatures(character, makeClass(), undefined, undefined, undefined, {
        spellIndex: new Map(),
      }).spells,
    ).toBeUndefined();
    expect(
      syncClassFeatures(character, undefined, undefined, undefined, undefined, {
        spellIndex,
      }).spells,
    ).toBeUndefined();
  });

  it('deduplicates table grants and reads a mechanics-only subclass', () => {
    const cls = makeClass({
      features: [
        {
          level: 1,
          name: 'Repeated',
          entries: [
            {
              type: 'table',
              colLabels: ['Level', 'Spells'],
              rows: [
                ['1st', '{@spell sleep}'],
                ['1st', '{@spell sleep}'],
              ],
            },
          ],
        },
      ],
    });
    const subclass = makeSubclass();
    const patch = syncClassFeatures(
      makeCharacter({ level: 5 }),
      cls,
      undefined,
      undefined,
      undefined,
      { cls, subclass, spellIndex },
    );

    expect(patch.spells?.filter((spell) => spell.name === 'Sen')).toHaveLength(1);
    expect(patch.spells?.some((spell) => spell.source === subclass.name)).toBe(true);
  });
});
