import type { DamageOutcome } from './damage';

export const MAX_EXPRESSION_LENGTH = 500;
export const MAX_DICE = 1000;
export const MAX_SIDES = 1_000_000;
export type RollError = 'invalid' | 'limit' | 'division' | 'overflow';
export class DiceError extends Error {
  readonly code: RollError;
  constructor(code: RollError) {
    super(code);
    this.code = code;
  }
}

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
  keptIndices?: number[];
}

export interface RollOutcome {
  expression: string;
  mode: RollMode;
  groups: RolledGroup[];
  modifier: number;
  total: number;
  calculation?: string;
  damage?: DamageOutcome;
}

export type Rng = () => number;

type Operator = '+' | '-' | '*' | '/';

type ExpressionNode =
  | { type: 'number'; value: number }
  | { type: 'dice'; count: number; sides: number }
  | { type: 'unary'; operator: '+' | '-'; value: ExpressionNode }
  | { type: 'binary'; operator: Operator; left: ExpressionNode; right: ExpressionNode };

interface ParsedMetadata {
  node: ExpressionNode;
  expression: string;
}

const parsedMetadata = new WeakMap<ParsedExpression, ParsedMetadata>();

export function rollDie(sides: number, rng: Rng = Math.random): number {
  return Math.floor(rng() * sides) + 1;
}

class Parser {
  private position = 0;
  private diceCount = 0;
  private depth = 0;
  private readonly input: string;

  constructor(input: string) {
    this.input = input;
  }

  parse(): ExpressionNode | null {
    const node = this.parseSum();
    return node && this.position === this.input.length ? node : null;
  }

  private parseSum(): ExpressionNode | null {
    let left = this.parseProduct();
    if (!left) return null;

    while (this.peek() === '+' || this.peek() === '-') {
      const operator = this.take() as '+' | '-';
      const right = this.parseProduct();
      if (!right) return null;
      left = { type: 'binary', operator, left, right };
    }
    return left;
  }

  private parseProduct(): ExpressionNode | null {
    let left = this.parseUnary();
    if (!left) return null;

    while (this.peek() === '*' || this.peek() === '/') {
      const operator = this.take() as '*' | '/';
      const right = this.parseUnary();
      if (!right) return null;
      left = { type: 'binary', operator, left, right };
    }
    return left;
  }

  private parseUnary(): ExpressionNode | null {
    if (++this.depth > 40) throw new DiceError('limit');
    const result = this.parseSigned();
    this.depth -= 1;
    return result;
  }

  private parseSigned(): ExpressionNode | null {
    if (this.peek() === '+' || this.peek() === '-') {
      const operator = this.take() as '+' | '-';
      const value = this.parseUnary();
      return value ? { type: 'unary', operator, value } : null;
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ExpressionNode | null {
    if (this.peek() === '(') {
      this.take();
      const node = this.parseSum();
      if (!node || this.take() !== ')') return null;
      return node;
    }

    const start = this.position;
    const countText = this.takeDigits();
    if (this.peek()?.toLowerCase() === 'd') {
      this.take();
      const sidesText = this.takeDigits();
      if (!sidesText) return null;
      const count = countText ? Number(countText) : 1;
      const sides = Number(sidesText);
      this.diceCount += count;
      if (
        !Number.isSafeInteger(count) ||
        !Number.isSafeInteger(sides) ||
        this.diceCount > MAX_DICE ||
        sides > MAX_SIDES
      )
        throw new DiceError('limit');
      return count > 0 && sides > 0 ? { type: 'dice', count, sides } : null;
    }
    if (!countText) {
      this.position = start;
      return null;
    }
    const value = Number(countText);
    if (!Number.isSafeInteger(value) || value > 1_000_000_000)
      throw new DiceError('limit');
    return { type: 'number', value };
  }

  private takeDigits(): string {
    const start = this.position;
    while (/\d/.test(this.peek() ?? '')) this.position += 1;
    return this.input.slice(start, this.position);
  }

  private peek(): string | undefined {
    return this.input[this.position];
  }

  private take(): string | undefined {
    const value = this.peek();
    this.position += 1;
    return value;
  }
}

function summarize(node: ExpressionNode, sign = 1): ParsedExpression {
  if (node.type === 'dice') {
    return { terms: [{ count: sign * node.count, sides: node.sides }], modifier: 0 };
  }
  if (node.type === 'number') return { terms: [], modifier: sign * node.value };
  if (node.type === 'unary') {
    return summarize(node.value, node.operator === '-' ? -sign : sign);
  }
  if (node.operator === '+' || node.operator === '-') {
    const left = summarize(node.left, sign);
    const right = summarize(node.right, node.operator === '-' ? -sign : sign);
    return {
      terms: [...left.terms, ...right.terms],
      modifier: left.modifier + right.modifier,
    };
  }
  return { terms: collectDice(node), modifier: 0 };
}

function collectDice(node: ExpressionNode): DiceTerm[] {
  if (node.type === 'dice') return [{ count: node.count, sides: node.sides }];
  if (node.type === 'number') return [];
  if (node.type === 'unary') return collectDice(node.value);
  return [...collectDice(node.left), ...collectDice(node.right)];
}

export function parseExpression(input: string): ParsedExpression | null {
  return validateExpression(input).parsed;
}

export function validateExpression(input: string): {
  parsed: ParsedExpression | null;
  error: RollError | null;
} {
  if (input.length > MAX_EXPRESSION_LENGTH) return { parsed: null, error: 'limit' };
  const cleaned = input.replace(/\s+/g, '').replace(/k/gi, 'd');
  try {
    const node = new Parser(cleaned).parse();
    if (!node) return { parsed: null, error: 'invalid' };
    constantValue(node);
    const parsed = summarize(node);
    parsedMetadata.set(parsed, { node, expression: formatNode(node) });
    return { parsed, error: null };
  } catch (error) {
    if (error instanceof DiceError) return { parsed: null, error: error.code };
    throw error;
  }
}

function calculate(operator: Operator, left: number, right: number): number {
  if (operator === '/' && right === 0) throw new DiceError('division');
  const result =
    operator === '+'
      ? left + right
      : operator === '-'
        ? left - right
        : operator === '*'
          ? left * right
          : Math.floor(left / right);
  if (!Number.isSafeInteger(result)) throw new DiceError('overflow');
  return result;
}

function constantValue(node: ExpressionNode): number | undefined {
  if (node.type === 'dice') return undefined;
  if (node.type === 'number') return node.value;
  if (node.type === 'unary') {
    const value = constantValue(node.value);
    return value === undefined ? undefined : node.operator === '-' ? -value : value;
  }
  const left = constantValue(node.left);
  const right = constantValue(node.right);
  if (node.operator === '/' && right === 0) throw new DiceError('division');
  return left === undefined || right === undefined
    ? undefined
    : calculate(node.operator, left, right);
}

function rollGroup(term: DiceTerm, mode: RollMode, rng: Rng): RolledGroup {
  const rolls: number[] = [];
  const kept: number[] = [];
  const keptIndices: number[] = [];
  const negative = term.count < 0;
  const count = Math.abs(term.count);
  const useAdv = mode !== 'normal' && term.sides === 20;

  for (let i = 0; i < count; i += 1) {
    if (useAdv) {
      const a = rollDie(term.sides, rng);
      const b = rollDie(term.sides, rng);
      rolls.push(a, b);
      const chosen = mode === 'advantage' ? Math.max(a, b) : Math.min(a, b);
      keptIndices.push(rolls.length - 2 + (chosen === a ? 0 : 1));
      kept.push(negative ? -chosen : chosen);
    } else {
      const value = rollDie(term.sides, rng);
      rolls.push(value);
      keptIndices.push(rolls.length - 1);
      kept.push(negative ? -value : value);
    }
  }
  return { sides: term.sides, rolls, kept, keptIndices };
}

function evaluate(
  node: ExpressionNode,
  mode: RollMode,
  rng: Rng,
  groups: RolledGroup[],
): number {
  if (node.type === 'number') return node.value;
  if (node.type === 'dice') {
    const group = rollGroup({ count: node.count, sides: node.sides }, mode, rng);
    groups.push(group);
    return group.kept.reduce((sum, value) => sum + value, 0);
  }
  if (node.type === 'unary') {
    const value = evaluate(node.value, mode, rng, groups);
    return node.operator === '-' ? -value : value;
  }

  const left = evaluate(node.left, mode, rng, groups);
  const right = evaluate(node.right, mode, rng, groups);
  return calculate(node.operator, left, right);
}

function calculationNode(
  node: ExpressionNode,
  groups: RolledGroup[],
  cursor: { index: number },
): ExpressionNode {
  if (node.type === 'number') return node;
  if (node.type === 'dice') {
    const kept = groups[cursor.index++]!.kept;
    return kept.slice(1).reduce<ExpressionNode>(
      (left, value) => ({
        type: 'binary',
        operator: '+',
        left,
        right: { type: 'number', value },
      }),
      { type: 'number', value: kept[0]! },
    );
  }
  if (node.type === 'unary')
    return { ...node, value: calculationNode(node.value, groups, cursor) };
  return {
    ...node,
    left: calculationNode(node.left, groups, cursor),
    right: calculationNode(node.right, groups, cursor),
  };
}

export function rollParsed(
  parsed: ParsedExpression,
  mode: RollMode = 'normal',
  rng: Rng = Math.random,
): RollOutcome {
  if (
    !Number.isSafeInteger(parsed.modifier) ||
    parsed.terms.reduce((sum, term) => sum + Math.abs(term.count), 0) > MAX_DICE ||
    parsed.terms.some(
      (term) =>
        !Number.isSafeInteger(term.count) ||
        !Number.isSafeInteger(term.sides) ||
        term.sides < 1 ||
        term.sides > MAX_SIDES,
    )
  )
    throw new DiceError('limit');
  const effectiveMode = parsed.terms.some((term) => term.sides === 20) ? mode : 'normal';
  const metadata = parsedMetadata.get(parsed);
  if (metadata) {
    const groups: RolledGroup[] = [];
    const total = evaluate(metadata.node, effectiveMode, rng, groups);
    return {
      expression: metadata.expression,
      mode: effectiveMode,
      groups,
      modifier: parsed.modifier,
      total,
      calculation: formatNode(calculationNode(metadata.node, groups, { index: 0 })),
    };
  }

  const groups = parsed.terms.map((term) => rollGroup(term, effectiveMode, rng));
  const diceTotal = groups.reduce(
    (sum, group) => sum + group.kept.reduce((acc, value) => acc + value, 0),
    0,
  );
  return {
    expression: formatExpression(parsed),
    mode: effectiveMode,
    groups,
    modifier: parsed.modifier,
    total: calculate('+', diceTotal, parsed.modifier),
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
  return parts.join('  -  ');
}

function precedence(node: Extract<ExpressionNode, { type: 'binary' }>): number {
  return node.operator === '+' || node.operator === '-' ? 1 : 2;
}

function formatNode(node: ExpressionNode, parentPrecedence = 0): string {
  if (node.type === 'number') return String(node.value);
  if (node.type === 'dice') return `${node.count}d${node.sides}`;
  if (node.type === 'unary') return `${node.operator}${formatNode(node.value, 3)}`;
  const currentPrecedence = precedence(node);
  const left = formatNode(node.left, currentPrecedence);
  const groupRight =
    node.operator === '-' ||
    node.operator === '/' ||
    (node.operator === '*' &&
      node.right.type === 'binary' &&
      node.right.operator === '/');
  const right = formatNode(node.right, currentPrecedence + (groupRight ? 1 : 0));
  const result = `${left} ${node.operator} ${right}`;
  return currentPrecedence < parentPrecedence ? `(${result})` : result;
}

export function formatExpression(parsed: ParsedExpression): string {
  const metadata = parsedMetadata.get(parsed);
  if (metadata) return metadata.expression;
  const parts = parsed.terms.map((term) => {
    const sign = term.count < 0 ? '-' : '';
    return `${sign}${Math.abs(term.count)}d${term.sides}`;
  });
  let expr = parts.join(' + ').replace(/\+ -/g, '- ');
  if (parsed.modifier > 0) expr += `${expr ? ' + ' : ''}${parsed.modifier}`;
  else if (parsed.modifier < 0) expr += ` - ${Math.abs(parsed.modifier)}`;
  return expr || '0';
}
