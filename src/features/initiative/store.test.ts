import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sortCombatants, useInitiativeStore, type Combatant } from './store';

const combatant = (id: string, name: string, initiative: number): Combatant => ({
  id,
  name,
  initiative,
  ac: null,
  hpCurrent: 10,
  hpMax: 10,
  conditions: '',
  isPlayer: false,
});

describe('initiative store', () => {
  beforeEach(() => {
    localStorage.clear();
    useInitiativeStore.setState({ combatants: [], round: 0, turnId: null });
  });

  it('sorts by initiative and then name', () => {
    const sorted = sortCombatants([
      combatant('1', 'Zed', 12),
      combatant('2', 'Aria', 12),
      combatant('3', 'Borin', 18),
    ]);

    expect(sorted.map((entry) => entry.id)).toEqual(['3', '2', '1']);
  });

  it('advances turns and rounds in sorted order', () => {
    useInitiativeStore.setState({
      combatants: [combatant('slow', 'Slow', 5), combatant('fast', 'Fast', 20)],
      round: 0,
      turnId: null,
    });

    useInitiativeStore.getState().next();
    expect(useInitiativeStore.getState()).toMatchObject({ turnId: 'fast', round: 1 });

    useInitiativeStore.getState().next();
    expect(useInitiativeStore.getState()).toMatchObject({ turnId: 'slow', round: 1 });

    useInitiativeStore.getState().next();
    expect(useInitiativeStore.getState()).toMatchObject({ turnId: 'fast', round: 2 });
  });

  it('clears the active turn when its combatant is removed', () => {
    const id = '00000000-0000-4000-8000-000000000000';
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(id);
    useInitiativeStore.getState().addCombatant({
      name: 'New',
      initiative: 10,
      ac: 12,
      hpCurrent: 8,
      hpMax: 8,
      conditions: '',
      isPlayer: true,
    });
    useInitiativeStore.setState({ turnId: id });

    useInitiativeStore.getState().removeCombatant(id);

    expect(useInitiativeStore.getState()).toMatchObject({
      combatants: [],
      turnId: null,
    });
    vi.restoreAllMocks();
  });
});
