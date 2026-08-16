import { describe, expect, it } from 'vitest';
import { crToXp, partyBudget, pickRandomMonster, rateEncounter } from './xp';

describe('encounter math', () => {
  it('maps challenge ratings to XP, including fractional CRs', () => {
    expect(crToXp('1/4')).toBe(50);
    expect(crToXp('5')).toBe(1800);
    expect(crToXp('30')).toBe(155000);
    expect(crToXp('unknown')).toBe(0);
  });

  it('sums per-character XP budgets across the party', () => {
    expect(partyBudget([{ level: 5, count: 4 }])).toEqual({
      low: 2000,
      moderate: 3000,
      high: 4400,
    });
  });

  it('combines mixed-level party members', () => {
    const budget = partyBudget([
      { level: 1, count: 2 },
      { level: 3, count: 1 },
    ]);
    expect(budget.moderate).toBe(75 * 2 + 225);
  });

  it('clamps party levels to the supported range', () => {
    expect(
      partyBudget([
        { level: -5, count: 1 },
        { level: 99, count: 1 },
      ]),
    ).toEqual({
      low: 50 + 6400,
      moderate: 75 + 13200,
      high: 100 + 22000,
    });
  });

  it('rates encounters against the budget thresholds', () => {
    const budget = { low: 2000, moderate: 3000, high: 4400 };
    expect(rateEncounter(0, budget)).toBe('Trivial');
    expect(rateEncounter(1000, budget)).toBe('Trivial');
    expect(rateEncounter(2000, budget)).toBe('Low');
    expect(rateEncounter(2500, budget)).toBe('Moderate');
    expect(rateEncounter(3000, budget)).toBe('Moderate');
    expect(rateEncounter(4000, budget)).toBe('High');
    expect(rateEncounter(9000, budget)).toBe('Deadly');
  });

  it('prefers a random monster within the high budget tolerance', () => {
    const candidates = [
      { item: 'weaker', xp: 999 },
      { item: 'allowed', xp: 1100 },
      { item: 'tooStrong', xp: 1110 },
    ];

    expect(pickRandomMonster(candidates, 1000, () => 0)).toBe('allowed');
  });

  it('uses the closest stronger monster when the tolerance range is empty', () => {
    const candidates = [
      { item: 'weaker', xp: 900 },
      { item: 'closest', xp: 1200 },
      { item: 'farther', xp: 2000 },
    ];

    expect(pickRandomMonster(candidates, 1000, () => 0)).toBe('closest');
  });

  it('returns no monster when the party has no positive budget or only weaker choices', () => {
    expect(pickRandomMonster([], 1000)).toBeUndefined();
    expect(pickRandomMonster([{ item: 'weaker', xp: 900 }], 1000)).toBeUndefined();
    expect(pickRandomMonster([{ item: 'monster', xp: 1000 }], 0)).toBeUndefined();
  });
});
