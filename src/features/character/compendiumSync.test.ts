import { describe, expect, it } from 'vitest';
import type { BackgroundEntry, ClassEntry, SpeciesEntry } from '@/data/compendium/types';
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
