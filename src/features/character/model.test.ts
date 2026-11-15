import { describe, expect, it } from 'vitest';
import {
  SKILLS,
  abilityModifier,
  applyDamage,
  applyDeathSave,
  clamp,
  damageCharacter,
  deathSaveResult,
  healCharacter,
  hitDiceRemaining,
  hitDieSize,
  longRest,
  longRestHitDice,
  shortRest,
  spendHitDie,
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

describe('hit points, rests and death saves', () => {
  const hero = () => {
    const character = createCharacter('Hero');
    character.level = 5;
    character.hp = { current: 10, max: 40, temp: 0 };
    character.hitDice = '5d10';
    return character;
  };

  it('ignores negative and fractional amounts', () => {
    expect(applyDamage({ current: 10, max: 10, temp: 0 }, -5)).toEqual({
      current: 10,
      max: 10,
      temp: 0,
    });
    expect(applyHealing({ current: 50, max: 10, temp: 0 }, 3.7)).toEqual({
      current: 50,
      max: 10,
      temp: 0,
    });
    expect(clamp(5, 1, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
  });

  it('clears death saves after healing above zero', () => {
    const character = hero();
    character.hp.current = 0;
    character.deathSaves = { successes: 1, failures: 2 };
    expect(healCharacter(character, 0)).toEqual({ hp: character.hp });
    expect(healCharacter(character, 4)).toEqual({
      hp: { current: 4, max: 40, temp: 0 },
      deathSaves: { successes: 0, failures: 0 },
    });
    expect(damageCharacter(character, 3)).toEqual({ hp: character.hp });
  });

  it('applies every death save result', () => {
    expect(deathSaveResult(20)).toBe('critical');
    expect(deathSaveResult(1)).toBe('fumble');
    expect(deathSaveResult(10)).toBe('success');
    expect(deathSaveResult(9)).toBe('failure');
    const character = hero();
    character.hp.current = 0;
    character.deathSaves = { successes: 2, failures: 2 };
    expect(applyDeathSave(character, 'critical')).toEqual({
      hp: { ...character.hp, current: 1 },
      deathSaves: { successes: 0, failures: 0 },
    });
    expect(applyDeathSave(character, 'success').deathSaves).toEqual({
      successes: 3,
      failures: 2,
    });
    expect(applyDeathSave(character, 'failure').deathSaves).toEqual({
      successes: 2,
      failures: 3,
    });
    expect(applyDeathSave(character, 'fumble').deathSaves).toEqual({
      successes: 2,
      failures: 3,
    });
  });

  it('spends hit dice and recovers them on a long rest', () => {
    const character = hero();
    expect(hitDieSize(character)).toBe(10);
    expect(hitDieSize({ ...character, hitDice: '' })).toBeNull();
    expect(hitDieSize({ ...character, hitDice: '1d0' })).toBeNull();
    expect(hitDiceRemaining(character)).toBe(5);
    expect(spendHitDie(character, 7)).toMatchObject({
      hp: { current: 17 },
      hitDiceUsed: 1,
    });
    expect(spendHitDie({ ...character, hitDiceUsed: 5 }, -2)).toMatchObject({
      hp: { current: 10 },
      hitDiceUsed: 5,
    });
    expect(hitDiceRemaining({ ...character, hitDiceUsed: 9 })).toBe(0);

    character.hitDiceUsed = 4;
    character.hp.temp = 3;
    character.deathSaves = { successes: 1, failures: 1 };
    character.spellSlots = [
      { level: 1, longRestMax: 2, usedLongRest: 2, shortRestMax: 1, usedShortRest: 1 },
    ];
    expect(longRestHitDice(character)).toBe(2);
    expect(longRest(character)).toEqual({
      hp: { current: 40, max: 40, temp: 0 },
      deathSaves: { successes: 0, failures: 0 },
      hitDiceUsed: 2,
      spellSlots: [
        { level: 1, longRestMax: 2, usedLongRest: 0, shortRestMax: 1, usedShortRest: 0 },
      ],
    });
    expect(shortRest(character)).toEqual({
      spellSlots: [
        { level: 1, longRestMax: 2, usedLongRest: 2, shortRestMax: 1, usedShortRest: 0 },
      ],
    });
    expect(longRestHitDice({ ...character, level: 1, hitDiceUsed: 1 })).toBe(1);
    expect(longRestHitDice({ ...character, hitDiceUsed: 0 })).toBe(0);
  });
});
