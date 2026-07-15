export const XP_BY_CR: Record<string, number> = {
  '0': 10,
  '1/8': 25,
  '1/4': 50,
  '1/2': 100,
  '1': 200,
  '2': 450,
  '3': 700,
  '4': 1100,
  '5': 1800,
  '6': 2300,
  '7': 2900,
  '8': 3900,
  '9': 5000,
  '10': 5900,
  '11': 7200,
  '12': 8400,
  '13': 10000,
  '14': 11500,
  '15': 13000,
  '16': 15000,
  '17': 18000,
  '18': 20000,
  '19': 22000,
  '20': 25000,
  '21': 33000,
  '22': 41000,
  '23': 50000,
  '24': 62000,
  '25': 75000,
  '26': 90000,
  '27': 105000,
  '28': 120000,
  '29': 135000,
  '30': 155000,
};

export type Difficulty = 'low' | 'moderate' | 'high';

export const XP_BUDGET: Record<number, Record<Difficulty, number>> = {
  1: { low: 50, moderate: 75, high: 100 },
  2: { low: 100, moderate: 150, high: 200 },
  3: { low: 150, moderate: 225, high: 400 },
  4: { low: 250, moderate: 375, high: 500 },
  5: { low: 500, moderate: 750, high: 1100 },
  6: { low: 600, moderate: 1000, high: 1400 },
  7: { low: 750, moderate: 1300, high: 1700 },
  8: { low: 1000, moderate: 1700, high: 2100 },
  9: { low: 1300, moderate: 2000, high: 2600 },
  10: { low: 1600, moderate: 2300, high: 3100 },
  11: { low: 1900, moderate: 2900, high: 4100 },
  12: { low: 2200, moderate: 3700, high: 4700 },
  13: { low: 2600, moderate: 4200, high: 5400 },
  14: { low: 2900, moderate: 4900, high: 6200 },
  15: { low: 3300, moderate: 5400, high: 7800 },
  16: { low: 3800, moderate: 6100, high: 9800 },
  17: { low: 4500, moderate: 7200, high: 11700 },
  18: { low: 5000, moderate: 8700, high: 14200 },
  19: { low: 5500, moderate: 10700, high: 17200 },
  20: { low: 6400, moderate: 13200, high: 22000 },
};

export function crToXp(cr: string): number {
  return XP_BY_CR[cr.trim()] ?? 0;
}

export interface PartyMember {
  level: number;
  count: number;
}

export interface EncounterBudget {
  low: number;
  moderate: number;
  high: number;
}

export function partyBudget(party: PartyMember[]): EncounterBudget {
  const total: EncounterBudget = { low: 0, moderate: 0, high: 0 };
  for (const member of party) {
    const level = Math.min(20, Math.max(1, member.level));
    const budget = XP_BUDGET[level]!;
    total.low += budget.low * member.count;
    total.moderate += budget.moderate * member.count;
    total.high += budget.high * member.count;
  }
  return total;
}

export type DifficultyRating = 'Trivial' | 'Low' | 'Moderate' | 'High' | 'Deadly';

export function rateEncounter(
  totalXp: number,
  budget: EncounterBudget,
): DifficultyRating {
  if (totalXp === 0) return 'Trivial';
  if (totalXp < budget.low) return 'Trivial';
  if (totalXp <= budget.low) return 'Low';
  if (totalXp <= budget.moderate) return 'Moderate';
  if (totalXp <= budget.high) return 'High';
  return 'Deadly';
}
