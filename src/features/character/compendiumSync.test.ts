import { describe, expect, it } from 'vitest';
import type {
  BackgroundEntry,
  ClassEntry,
  ClassSubclass,
  SpeciesEntry,
  SpellEntry,
} from '@/data/compendium/types';
import { createCharacter, type Character } from './model';
import { syncClassFeatures } from './compendiumSync';

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
});
