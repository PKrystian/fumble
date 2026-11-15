import { describe, expect, it } from 'vitest';
import { crToXp, partyBudget, pickRandomMonster, rateEncounter } from './xp';

describe('encounter math', () => {
  it('maps standard challenge ratings to XP', () => {
    expect(crToXp('1/4')).toBe(50);
    expect(crToXp('5')).toBe(1800);
    expect(crToXp('30')).toBe(155000);
    expect(crToXp('unknown')).toBe(0);
  });

  it('combines mixed-level party members using the 2024 budgets', () => {
    expect(
      partyBudget([
        { level: 5, count: 4 },
        { level: 1, count: 2 },
      ]),
    ).toEqual({
      low: 2100,
      moderate: 3150,
      high: 4600,
    });
    expect(
      partyBudget([
        { level: -5, count: 1 },
        { level: 99, count: 1 },
      ]),
    ).toEqual({
      low: 6450,
      moderate: 13275,
      high: 22100,
    });
  });

  it('treats the difficulty budgets as ceilings', () => {
    const budget = { low: 200, moderate: 300, high: 400 };
    expect(rateEncounter(50, budget)).toBe('low');
    expect(rateEncounter(200, budget)).toBe('low');
    expect(rateEncounter(250, budget)).toBe('moderate');
    expect(rateEncounter(300, budget)).toBe('moderate');
    expect(rateEncounter(400, budget)).toBe('high');
    expect(rateEncounter(450, budget)).toBe('overBudget');
  });

  it('rolls only from candidates with positive XP that fit the remainder', () => {
    const candidates = [
      { item: 'zero', xp: 0 },
      { item: 'small', xp: 25 },
      { item: 'exact', xp: 100 },
      { item: 'too strong', xp: 101 },
    ];
    expect(pickRandomMonster(candidates, 100, () => 0)).toBe('small');
    expect(pickRandomMonster(candidates, 100, () => 0.99)).toBe('exact');
    expect(pickRandomMonster(candidates, 24)).toBeUndefined();
    expect(pickRandomMonster(candidates, 0)).toBeUndefined();
  });
});
