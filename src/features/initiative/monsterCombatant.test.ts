import { describe, expect, it } from 'vitest';
import { monsterCombatant } from './monsterCombatant';

describe('initiative from a stat block', () => {
  it('uses the published initiative score and average hit points', () => {
    expect(
      monsterCombatant({
        name: 'Wight',
        initiative: '+4 (14)',
        dex: 14,
        hp: '82 (11d8 + 33)',
        ac: '14',
      }),
    ).toEqual({
      name: 'Wight',
      initiative: 14,
      ac: 14,
      hpCurrent: 82,
      hpMax: 82,
      conditions: '',
      isPlayer: false,
    });
  });

  it('uses the initiative modifier, falling back to Dexterity, and handles special armor or hit points', () => {
    const entry = { name: 'Creature', initiative: '', dex: 7, hp: 'Special', ac: '-' };
    expect(monsterCombatant(entry)).toMatchObject({ initiative: 8, hpMax: 0, ac: null });
    expect(monsterCombatant({ ...entry, initiative: '+5' }).initiative).toBe(15);
    expect(
      monsterCombatant({ ...entry, hp: '20 (Air) or 30 (Land)', ac: '11 + spell level' }),
    ).toMatchObject({ hpMax: 0, ac: null });
  });
});
