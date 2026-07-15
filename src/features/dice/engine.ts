export type RollMode = 'normal' | 'advantage' | 'disadvantage';

export interface DiceTerm {
  count: number;
  sides: number;
}

export interface ParsedExpression {
  terms: DiceTerm[];
  modifier: number;
}

export interface RolledGroup {
  sides: number;

  rolls: number[];

  kept: number[];
}

export interface RollOutcome {
  expression: string;
  mode: RollMode;
  groups: RolledGroup[];
  modifier: number;
  total: number;
}

export type Rng = () => number;

export function rollDie(sides: number, rng: Rng = Math.random): number {
  return Math.floor(rng() * sides) + 1;
}

const TERM_PATTERN = /^(\d*)d(\d+)$/i;

export function parseExpression(input: string): ParsedExpression | null {
  const cleaned = input.replace(/\s+/g, '');
  if (!cleaned) return null;

  const tokens = cleaned.match(/[+-]?[^+-]+/g);
  if (!tokens) return null;

  const terms: DiceTerm[] = [];
  let modifier = 0;

  for (const token of tokens) {
    const sign = token.startsWith('-') ? -1 : 1;
    const body = token.replace(/^[+-]/, '');
    const dice = TERM_PATTERN.exec(body);
    if (dice) {
      const count = dice[1] ? Number(dice[1]) : 1;
      const sides = Number(dice[2]);
      if (count <= 0 || sides <= 0) return null;

      terms.push({ count: sign * count, sides });
    } else if (/^\d+$/.test(body)) {
      modifier += sign * Number(body);
    } else {
      return null;
    }
  }

  if (terms.length === 0 && modifier === 0) return null;
  return { terms, modifier };
}

function rollGroup(term: DiceTerm, mode: RollMode, rng: Rng): RolledGroup {
  const rolls: number[] = [];
  const kept: number[] = [];
  const negative = term.count < 0;
  const count = Math.abs(term.count);
  const useAdv = mode !== 'normal' && term.sides === 20;

  for (let i = 0; i < count; i += 1) {
    if (useAdv) {
      const a = rollDie(term.sides, rng);
      const b = rollDie(term.sides, rng);
      rolls.push(a, b);
      const chosen = mode === 'advantage' ? Math.max(a, b) : Math.min(a, b);
      kept.push(negative ? -chosen : chosen);
    } else {
      const value = rollDie(term.sides, rng);
      rolls.push(value);
      kept.push(negative ? -value : value);
    }
  }
  return { sides: term.sides, rolls, kept };
}

export function rollParsed(
  parsed: ParsedExpression,
  mode: RollMode = 'normal',
  rng: Rng = Math.random,
): RollOutcome {
  const groups = parsed.terms.map((term) => rollGroup(term, mode, rng));
  const diceTotal = groups.reduce(
    (sum, group) => sum + group.kept.reduce((acc, value) => acc + value, 0),
    0,
  );
  return {
    expression: formatExpression(parsed),
    mode,
    groups,
    modifier: parsed.modifier,
    total: diceTotal + parsed.modifier,
  };
}

export function rollExpression(
  input: string,
  mode: RollMode = 'normal',
  rng: Rng = Math.random,
): RollOutcome | null {
  const parsed = parseExpression(input);
  return parsed ? rollParsed(parsed, mode, rng) : null;
}

export function describeRolls(outcome: RollOutcome): string {
  const parts = outcome.groups.map(
    (group) => `d${group.sides}: [${group.rolls.join(', ')}]`,
  );
  if (outcome.modifier) {
    parts.push(`mod ${outcome.modifier > 0 ? '+' : ''}${outcome.modifier}`);
  }
  return parts.join('  ·  ');
}

export function formatExpression(parsed: ParsedExpression): string {
  const parts = parsed.terms.map((term) => {
    const sign = term.count < 0 ? '-' : '';
    return `${sign}${Math.abs(term.count)}d${term.sides}`;
  });
  let expr = parts.join(' + ').replace(/\+ -/g, '- ');
  if (parsed.modifier > 0) expr += ` + ${parsed.modifier}`;
  else if (parsed.modifier < 0) expr += ` - ${Math.abs(parsed.modifier)}`;
  return expr || '0';
}
