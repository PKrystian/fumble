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
      return count > 0 && sides > 0 ? { type: 'dice', count, sides } : null;
    }
    if (!countText) {
      this.position = start;
      return null;
    }
    return { type: 'number', value: Number(countText) };
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
  const cleaned = input.replace(/\s+/g, '').replace(/k/gi, 'd');
  if (!cleaned) return null;
  const node = new Parser(cleaned).parse();
  if (!node) return null;
  const parsed = summarize(node);
  parsedMetadata.set(parsed, { node, expression: formatNode(node) });
  return parsed;
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
  if (node.operator === '+') return left + right;
  if (node.operator === '-') return left - right;
  if (node.operator === '*') return left * right;
  return right === 0 ? 0 : Math.floor(left / right);
}

export function rollParsed(
  parsed: ParsedExpression,
  mode: RollMode = 'normal',
  rng: Rng = Math.random,
): RollOutcome {
  const metadata = parsedMetadata.get(parsed);
  if (metadata) {
    const groups: RolledGroup[] = [];
    return {
      expression: metadata.expression,
      mode,
      groups,
      modifier: parsed.modifier,
      total: evaluate(metadata.node, mode, rng, groups),
    };
  }

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
  if (parsed.modifier > 0) expr += ` + ${parsed.modifier}`;
  else if (parsed.modifier < 0) expr += ` - ${Math.abs(parsed.modifier)}`;
  return expr || '0';
}
