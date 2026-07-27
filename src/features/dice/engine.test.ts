import { describe, expect, it } from 'vitest';
import { parseExpression, rollExpression, rollParsed, type Rng } from './engine';

function seqRng(values: number[]): Rng {
  let i = 0;
  return () => values[i++ % values.length]!;
}

describe('parseExpression', () => {
  it('parses a single die with a modifier', () => {
    expect(parseExpression('1d20+5')).toEqual({
      terms: [{ count: 1, sides: 20 }],
      modifier: 5,
    });
  });

  it('defaults the count to one and sums multiple terms', () => {
    expect(parseExpression('d8 + 2d6 - 1')).toEqual({
      terms: [
        { count: 1, sides: 8 },
        { count: 2, sides: 6 },
      ],
      modifier: -1,
    });
  });

  it('rejects malformed input', () => {
    expect(parseExpression('hello')).toBeNull();
    expect(parseExpression('')).toBeNull();
    expect(parseExpression('2d')).toBeNull();
  });

  it('accepts the Polish k dice notation', () => {
    expect(parseExpression('8k10')).toEqual({
      terms: [{ count: 8, sides: 10 }],
      modifier: 0,
    });
    expect(parseExpression('k100')).toEqual({
      terms: [{ count: 1, sides: 100 }],
      modifier: 0,
    });
    expect(parseExpression('2k6 + 1k4 - 2')).toEqual({
      terms: [
        { count: 2, sides: 6 },
        { count: 1, sides: 4 },
      ],
      modifier: -2,
    });
  });

  it('parses multiplication, division, and parentheses', () => {
    expect(parseExpression('(2k6 + 4) / 2')).not.toBeNull();
    expect(parseExpression('2d6 * (1d4 + 1)')).not.toBeNull();
  });

  it('rejects incomplete mathematical expressions', () => {
    expect(parseExpression('2d6 /')).toBeNull();
    expect(parseExpression('(2d6 + 4')).toBeNull();
    expect(parseExpression('2d6 ** 2')).toBeNull();
  });
});

describe('rollParsed', () => {
  it('rolls each die and adds the modifier', () => {
    const outcome = rollParsed(
      { terms: [{ count: 2, sides: 6 }], modifier: 3 },
      'normal',
      seqRng([0, 0.99]),
    );
    expect(outcome.groups[0]!.kept).toEqual([1, 6]);
    expect(outcome.total).toBe(1 + 6 + 3);
  });

  it('keeps the higher d20 on advantage', () => {
    const outcome = rollParsed(
      { terms: [{ count: 1, sides: 20 }], modifier: 0 },
      'advantage',
      seqRng([0.1, 0.95]),
    );
    expect(outcome.groups[0]!.rolls).toHaveLength(2);
    expect(outcome.total).toBe(20);
  });

  it('keeps the lower d20 on disadvantage', () => {
    const outcome = rollParsed(
      { terms: [{ count: 1, sides: 20 }], modifier: 0 },
      'disadvantage',
      seqRng([0.1, 0.95]),
    );
    expect(outcome.total).toBe(3);
  });

  it('ignores advantage for non-d20 dice', () => {
    const outcome = rollParsed(
      { terms: [{ count: 1, sides: 6 }], modifier: 0 },
      'advantage',
      seqRng([0.5]),
    );
    expect(outcome.groups[0]!.rolls).toHaveLength(1);
  });
});

describe('rollExpression', () => {
  it('returns null for invalid expressions', () => {
    expect(rollExpression('nope')).toBeNull();
  });

  it('produces a total within the possible range', () => {
    const outcome = rollExpression('4d6', 'normal', seqRng([0.99]));
    expect(outcome?.total).toBe(24);
  });

  it('evaluates operators in mathematical order', () => {
    const outcome = rollExpression('1d6 + 2 * 3', 'normal', seqRng([0]));
    expect(outcome?.total).toBe(7);
  });

  it('supports parentheses and rounds division down', () => {
    const outcome = rollExpression('(2k6 + 3) / 2', 'normal', seqRng([0, 0.99]));
    expect(outcome?.expression).toBe('(2d6 + 3) / 2');
    expect(outcome?.total).toBe(5);
  });

  it('preserves significant parentheses when rerolling', () => {
    const first = rollExpression('2d6 / (1d4 * 2)', 'normal', seqRng([0.99]));
    expect(first?.expression).toBe('2d6 / (1d4 * 2)');
    const rerolled = rollExpression(first!.expression, 'normal', seqRng([0.99]));
    expect(rerolled?.total).toBe(first?.total);
  });
});
