import {
  DiceError,
  MAX_DICE,
  rollParsed,
  validateExpression,
  type Rng,
  type RollOutcome,
} from './engine';

export const DAMAGE_TYPES = [
  'acid',
  'bludgeoning',
  'cold',
  'fire',
  'force',
  'lightning',
  'necrotic',
  'piercing',
  'poison',
  'psychic',
  'radiant',
  'slashing',
  'thunder',
] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];
export interface DamageComponent {
  id: string;
  name: string;
  expression: string;
  type: DamageType;
}
export interface DamageDefense {
  resistance: boolean;
  vulnerability: boolean;
  immunity: boolean;
}
export type TargetDefenses = Partial<Record<DamageType, DamageDefense>>;
export interface DamageOutcome {
  parts: Array<{ component: DamageComponent; outcome: RollOutcome }>;
  totals: Array<{ type: DamageType; raw: number; total: number; defense: DamageDefense }>;
}
export const NORMAL_DEFENSE: DamageDefense = {
  resistance: false,
  vulnerability: false,
  immunity: false,
};
export const MAX_DAMAGE_COMPONENTS = 12;

export function applyDefense(raw: number, defense: DamageDefense): number {
  if (!Number.isSafeInteger(raw)) throw new DiceError('overflow');
  if (defense.immunity) return 0;
  const resisted = defense.resistance ? Math.floor(raw / 2) : raw;
  const total = defense.vulnerability ? resisted * 2 : resisted;
  if (!Number.isSafeInteger(total)) throw new DiceError('overflow');
  return total;
}

export function rollDamage(
  components: DamageComponent[],
  defenses: TargetDefenses,
  rng: Rng = Math.random,
): RollOutcome {
  if (!components.length || components.length > MAX_DAMAGE_COMPONENTS)
    throw new DiceError('limit');
  const parsed = components.map((component) => {
    const result = validateExpression(component.expression);
    if (!result.parsed) throw new DiceError(result.error!);
    return result.parsed;
  });
  if (
    parsed
      .flatMap((entry) => entry.terms)
      .reduce((sum, term) => sum + Math.abs(term.count), 0) > MAX_DICE
  )
    throw new DiceError('limit');
  const parts = components.map((component, index) => ({
    component: { ...component },
    outcome: rollParsed(parsed[index]!, 'normal', rng),
  }));
  const totals = [...new Set(components.map((component) => component.type))].map(
    (type) => {
      const raw = parts
        .filter((part) => part.component.type === type)
        .reduce((sum, part) => sum + Math.max(0, part.outcome.total), 0);
      const defense = { ...(defenses[type] ?? NORMAL_DEFENSE) };
      return { type, raw, total: applyDefense(raw, defense), defense };
    },
  );
  const total = totals.reduce((sum, group) => sum + group.total, 0);
  if (!Number.isSafeInteger(total)) throw new DiceError('overflow');
  return {
    expression: parts.map((part) => `(${part.outcome.expression})`).join(' + '),
    mode: 'normal',
    groups: [],
    modifier: 0,
    total,
    damage: { parts, totals },
  };
}
