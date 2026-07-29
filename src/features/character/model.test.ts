import { describe, expect, it } from 'vitest';
import {
  SKILLS,
  abilityModifier,
  applyDamage,
  applyHealing,
  armorClass,
  armorClassBreakdown,
  createCharacter,
  formatModifier,
  initiativeBonus,
  isDmCharacter,
  passiveScore,
  proficiencyBonus,
  savingThrowBonus,
  skillBonus,
  spellSaveDc,
  setSpellSlot,
  type Character,
} from './model';

function make(overrides: Partial<Character> = {}): Character {
  return { ...createCharacter('Tester'), ...overrides };
}

const stealth = SKILLS.find((s) => s.id === 'stealth')!;

describe('character math', () => {
  it('computes ability modifiers', () => {
    expect(abilityModifier(10)).toBe(0);
    expect(abilityModifier(20)).toBe(5);
    expect(abilityModifier(7)).toBe(-2);
  });

  it('formats positive and negative modifiers', () => {
    expect(formatModifier(2)).toBe('+2');
    expect(formatModifier(-2)).toBe('-2');
  });

  it('scales proficiency bonus by level and respects overrides', () => {
    expect(proficiencyBonus(make({ level: 1 }))).toBe(2);
    expect(proficiencyBonus(make({ level: 5 }))).toBe(3);
    expect(proficiencyBonus(make({ level: 17 }))).toBe(6);
    expect(proficiencyBonus(make({ level: 1, proficiencyBonusOverride: 4 }))).toBe(4);
  });

  it('adds proficiency to proficient saving throws only', () => {
    const character = make({
      level: 5,
      abilities: { ...createCharacter().abilities, con: 14 },
      savingThrowProficiencies: ['con'],
    });
    expect(savingThrowBonus(character, 'con')).toBe(2 + 3);
    expect(savingThrowBonus(character, 'str')).toBe(0);
  });

  it('doubles proficiency for expertise skills', () => {
    const abilities = { ...createCharacter().abilities, dex: 16 };
    const proficient = make({ level: 5, abilities, skillProficiencies: [stealth.id] });
    const expert = make({ level: 5, abilities, skillExpertise: [stealth.id] });
    expect(skillBonus(proficient, stealth)).toBe(3 + 3);
    expect(skillBonus(expert, stealth)).toBe(3 + 6);
  });

  it('derives passive scores from 10 + skill bonus', () => {
    const character = make({
      abilities: { ...createCharacter().abilities, wis: 14 },
      skillProficiencies: ['perception'],
      level: 1,
    });
    expect(passiveScore(character, 'perception')).toBe(10 + 2 + 2);
    expect(passiveScore(character, 'missing')).toBe(10);
  });

  it('uses initiative overrides and ability modifiers', () => {
    expect(initiativeBonus(make({ initiativeOverride: 7 }))).toBe(7);
    expect(
      initiativeBonus(make({ abilities: { ...createCharacter().abilities, dex: 14 } })),
    ).toBe(2);
  });

  it('uses default armor and shield values through the total helper', () => {
    expect(armorClassBreakdown(make()).parts).toContain('Base 10');
    const character = make({
      inventory: [
        {
          id: 'armor',
          name: 'Armor',
          notes: '',
          quantity: 1,
          equipped: true,
          armorType: 'light',
        },
        {
          id: 'shield',
          name: 'Shield',
          notes: '',
          quantity: 1,
          equipped: true,
          armorType: 'shield',
        },
      ],
    });
    expect(armorClass(character)).toBe(12);
    expect(armorClassBreakdown(character).parts).toContain('Shield +2');
  });

  it('adds and updates sorted spell slots', () => {
    const added = setSpellSlot([], 2, { longRestMax: 3 });
    expect(added[0]).toMatchObject({ level: 2, longRestMax: 3, usedLongRest: 0 });
    const sorted = setSpellSlot(added, 1, { shortRestMax: 1 });
    expect(sorted.map((slot) => slot.level)).toEqual([1, 2]);
    const updated = setSpellSlot(sorted, 2, { usedLongRest: 1 });
    expect(updated.find((slot) => slot.level === 2)?.usedLongRest).toBe(1);
  });

  it('computes spell save DC only with a casting ability', () => {
    expect(spellSaveDc(make())).toBeNull();
    const caster = make({
      level: 1,
      spellcastingAbility: 'int',
      abilities: { ...createCharacter().abilities, int: 16 },
    });
    expect(spellSaveDc(caster)).toBe(8 + 2 + 3);
  });

  it('drains temporary HP before current HP on damage', () => {
    expect(applyDamage({ current: 20, max: 20, temp: 5 }, 8)).toEqual({
      current: 17,
      max: 20,
      temp: 0,
    });
  });

  it('never heals above maximum', () => {
    expect(applyHealing({ current: 18, max: 20, temp: 0 }, 10)).toEqual({
      current: 20,
      max: 20,
      temp: 0,
    });
  });

  it('flags DM characters and defaults missing role to party', () => {
    expect(isDmCharacter(make({ role: 'dm' }))).toBe(true);
    expect(isDmCharacter(make({ role: 'party' }))).toBe(false);
    const legacy = make();
    delete legacy.role;
    expect(isDmCharacter(legacy)).toBe(false);
  });
});
