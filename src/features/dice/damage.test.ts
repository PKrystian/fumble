import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DAMAGE_TYPES,
  NORMAL_DEFENSE,
  applyDefense,
  rollDamage,
  type DamageComponent,
} from './damage';
import {
  DiceError,
  MAX_DICE,
  MAX_EXPRESSION_LENGTH,
  MAX_SIDES,
  rollExpression,
  rollParsed,
  validateExpression,
} from './engine';
import { useRollStore } from './rollStore';
import { useCustomRollStore } from './customRollStore';
import {
  isCustomRoll,
  isDamageComponent,
  isRollLogEntry,
  isRollOutcome,
} from './validation';
import { createBackup, parseBackup, serializeBackup } from '@/features/data/backup';

const component = (
  type: DamageComponent['type'] = 'slashing',
  expression = '5',
): DamageComponent => ({ id: crypto.randomUUID(), name: 'Sword', expression, type });

describe('typed damage arithmetic', () => {
  for (const type of DAMAGE_TYPES)
    it(`handles all defenses for ${type}`, () => {
      for (const resistance of [false, true])
        for (const vulnerability of [false, true])
          for (const immunity of [false, true]) {
            const defense = { resistance, vulnerability, immunity };
            const total = immunity ? 0 : (resistance ? 2 : 5) * (vulnerability ? 2 : 1);
            const result = rollDamage([component(type)], { [type]: defense }, () => 0);
            expect(result.total).toBe(total);
            expect(result.damage?.totals[0]).toMatchObject({
              type,
              raw: 5,
              total,
              defense,
            });
          }
    });
  it('groups matching types before rounding, without changing other types', () => {
    const result = rollDamage(
      [
        component('slashing', '1'),
        component('slashing', '1'),
        component('radiant', '2d8'),
      ],
      { slashing: { ...NORMAL_DEFENSE, resistance: true } },
      () => 0,
    );
    expect(result.damage?.totals.map((group) => group.total)).toEqual([1, 2]);
    expect(result.total).toBe(3);
    expect(
      applyDefense(5, { ...NORMAL_DEFENSE, resistance: true, vulnerability: true }),
    ).toBe(4);
  });
  it('keeps components and target defenses as a snapshot and clamps negative damage', () => {
    const part = component('fire', '-5');
    const defense = { ...NORMAL_DEFENSE };
    const result = rollDamage([part], { fire: defense });
    part.name = 'Changed';
    defense.immunity = true;
    expect(result.damage?.parts[0]?.component.name).toBe('Sword');
    expect(result.damage?.totals[0]?.defense.immunity).toBe(false);
    expect(result.total).toBe(0);
  });
  it('rejects invalid components and shared limits before using random numbers', () => {
    const rng = vi.fn(() => 0);
    for (const parts of [
      [],
      Array.from({ length: 13 }, () => component()),
      [component('fire', '1d6+'), component()],
      [component('fire', '600d6'), component('cold', '600d6')],
    ])
      expect(() => rollDamage(parts, {}, rng)).toThrow(DiceError);
    expect(rng).not.toHaveBeenCalled();
  });
});

describe('bounded dice expressions', () => {
  it('rejects excessive dice, sides, numbers, nesting and text', () => {
    for (const expression of [
      `${MAX_DICE + 1}d6`,
      `1d${MAX_SIDES + 1}`,
      '9'.repeat(400) + 'd6',
      '1000000001',
      '('.repeat(41) + 'd6' + ')'.repeat(41),
      '-'.repeat(41) + 'd6',
      ' '.repeat(MAX_EXPRESSION_LENGTH + 1),
    ])
      expect(validateExpression(expression).error).toBe('limit');
    for (const expression of ['8/0', '1d6/(2-2)'])
      expect(validateExpression(expression).error).toBe('division');
    expect(validateExpression('1000000000*1000000000').error).toBe('overflow');
    for (const parsed of [
      { terms: [{ count: Infinity, sides: 6 }], modifier: 0 },
      { terms: [{ count: 1001, sides: 6 }], modifier: 0 },
      { terms: [{ count: 1, sides: 0 }], modifier: 0 },
      { terms: [{ count: 1, sides: MAX_SIDES + 1 }], modifier: 0 },
      { terms: [], modifier: NaN },
    ])
      expect(() => rollParsed(parsed)).toThrow('limit');
  });
  it('keeps exact selected dice on ties and explains arithmetic with parentheses', () => {
    const adv = rollExpression('1d20+3', 'advantage', () => 0)!;
    expect(adv.groups[0]?.keptIndices).toEqual([0]);
    expect(adv.groups[0]?.rolls).toEqual([1, 1]);
    expect(rollExpression('(2d6+4)/2', 'normal', () => 0)).toMatchObject({
      total: 3,
      calculation: '(1 + 1 + 4) / 2',
    });
    expect(rollExpression('d6', 'advantage', () => 0)?.mode).toBe('normal');
    expect(() => rollExpression('5/(1d2-1)', 'normal', () => 0)).toThrow('division');
    expect(rollExpression('-(1d6+2)', 'normal', () => 0)?.calculation).toBe('-(1 + 2)');
  });
});

describe('saved recipes, history and backups', () => {
  beforeEach(() => {
    localStorage.clear();
    useRollStore.setState({ log: [], dockOpen: false, error: null });
    useCustomRollStore.setState({ customRolls: [], removed: null });
  });
  it('persists typed recipes, supports edit, undo and legacy migration', async () => {
    const parts = [component('slashing', '1d8+3'), component('radiant', '2d8')];
    useCustomRollStore.getState().addCustomRoll(' Sword + Smite ', '(1d8+3) + (2d8)', {
      components: parts,
      mode: 'normal',
    });
    const saved = useCustomRollStore.getState().customRolls[0]!;
    useCustomRollStore
      .getState()
      .updateCustomRoll(saved.id, { ...saved, name: 'Updated' });
    useCustomRollStore.getState().removeCustomRoll(saved.id);
    useCustomRollStore.getState().undoRemove();
    expect(useCustomRollStore.getState().customRolls[0]?.name).toBe('Updated');
    await useCustomRollStore.persist.rehydrate();
    expect(useCustomRollStore.getState().customRolls[0]?.components).toEqual(parts);
    localStorage.setItem(
      'fumble-custom-rolls',
      JSON.stringify({
        version: 0,
        state: { customRolls: [{ id: 'old', name: 'Legacy', expression: '1d20+5' }] },
      }),
    );
    await useCustomRollStore.persist.rehydrate();
    expect(useCustomRollStore.getState().customRolls[0]?.id).toBe('old');
    useCustomRollStore.getState().removeCustomRoll('missing');
    useCustomRollStore.getState().undoRemove();
    useCustomRollStore.getState().addCustomRoll('Bad', 'oops');
    expect(useCustomRollStore.getState().customRolls).toHaveLength(1);
  });
  it('rerolls damage with its original defenses, persists history and includes it in a backup', async () => {
    const parts = [component('fire', '5')];
    useRollStore
      .getState()
      .damageRoll(parts, { fire: { ...NORMAL_DEFENSE, resistance: true } }, 'Fire');
    const entry = useRollStore.getState().log[0]!;
    useRollStore.getState().reroll(entry);
    expect(useRollStore.getState().log[0]?.outcome.total).toBe(2);
    await useRollStore.persist.rehydrate();
    expect(useRollStore.getState().log).toHaveLength(2);
    const parsed = parseBackup(serializeBackup(createBackup(localStorage)));
    expect(parsed.data['fumble-roll-history']).toContain('Fire');
    const log = JSON.parse(parsed.data['fumble-roll-history']!).state.log;
    expect(log.every(isRollLogEntry)).toBe(true);
  });
  it('reports runtime arithmetic errors without logging a false result', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(useRollStore.getState().roll('5/(1d2-1)')).toBeNull();
    expect(useRollStore.getState().error).toBe('division');
    expect(useRollStore.getState().log).toHaveLength(0);
    useRollStore.getState().clearError();
    expect(useRollStore.getState().error).toBeNull();
    expect(useRollStore.getState().damageRoll([], {})).toBeNull();
    expect(useRollStore.getState().error).toBe('limit');
  });
  it('filters malformed persisted data instead of rendering it', async () => {
    localStorage.setItem(
      'fumble-roll-history',
      JSON.stringify({ version: 1, state: { log: [{ id: 'bad', outcome: null }] } }),
    );
    await useRollStore.persist.rehydrate();
    expect(useRollStore.getState().log).toEqual([]);
    localStorage.setItem(
      'fumble-custom-rolls',
      JSON.stringify({
        version: 1,
        state: { customRolls: [{ id: 'bad', name: 'Bad', expression: 'broken' }] },
      }),
    );
    await useCustomRollStore.persist.rehydrate();
    expect(useCustomRollStore.getState().customRolls).toEqual([]);
    for (const value of [
      null,
      {},
      [],
      { id: 'x', name: 'Bad', expression: '1d6', mode: 'unknown' },
      { id: 'x', name: 'Bad', expression: '1d6', components: [] },
    ])
      expect(isCustomRoll(value)).toBe(false);
    expect(isDamageComponent({ ...component(), type: 'unknown' })).toBe(false);
    expect(isRollOutcome(null)).toBe(false);
    expect(
      isRollOutcome({
        ...rollExpression('1d6')!,
        groups: [{ sides: 6, rolls: [7], kept: [7] }],
      }),
    ).toBe(false);
    expect(isRollOutcome({ ...rollExpression('1d6')!, calculation: 1 })).toBe(false);
    expect(
      isRollOutcome({ ...rollExpression('1d6')!, damage: { parts: [], totals: [] } }),
    ).toBe(false);
  });
});

describe('numeric result integrity', () => {
  it('rejects overflow in damage grouping, vulnerability and the final sum', () => {
    const large = '1000000000*9000000';
    expect(() =>
      rollDamage([component('fire', large)], {
        fire: { ...NORMAL_DEFENSE, vulnerability: true },
      }),
    ).toThrow('overflow');
    expect(() =>
      rollDamage([component('fire', large), component('fire', large)], {}),
    ).toThrow('overflow');
    expect(() =>
      rollDamage([component('fire', large), component('cold', large)], {}),
    ).toThrow('overflow');
    expect(() =>
      rollParsed({ terms: [{ count: 1, sides: 1 }], modifier: Number.MAX_SAFE_INTEGER }),
    ).toThrow('overflow');
    useRollStore.getState().clearLog();
    expect(
      useRollStore.getState().damageRoll([component('fire', large)], {
        fire: { ...NORMAL_DEFENSE, vulnerability: true },
      }),
    ).toBeNull();
    expect(useRollStore.getState().error).toBe('overflow');
    expect(useRollStore.getState().log).toHaveLength(0);
  });
  it('normalizes a prepared recipe when saving its options', () => {
    useCustomRollStore.setState({ customRolls: [], removed: null });
    const recipe = { name: ' Sword ', expression: ' d6 ', mode: 'normal' as const };
    useCustomRollStore.getState().addCustomRoll(recipe.name, recipe.expression, recipe);
    expect(useCustomRollStore.getState().customRolls[0]).toMatchObject({
      name: 'Sword',
      expression: 'd6',
    });
  });
});
