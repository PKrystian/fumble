import { beforeEach, describe, expect, it } from 'vitest';
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
  beforeEach(() =>
    useInitiativeStore.setState({ combatants: [], round: 0, turnId: null }),
  );

  it('sorts by initiative and then name without mutating the input', () => {
    const input = [
      combatant('b', 'Beta', 12),
      combatant('a', 'Alpha', 12),
      combatant('c', 'Gamma', 18),
    ];
    expect(sortCombatants(input).map((entry) => entry.id)).toEqual(['c', 'a', 'b']);
    expect(input.map((entry) => entry.id)).toEqual(['b', 'a', 'c']);
  });

  it('adds, updates, removes and clears combatants', () => {
    useInitiativeStore.getState().addCombatant({
      name: 'Goblin',
      initiative: 14,
      ac: 15,
      hpCurrent: 7,
      hpMax: 7,
      conditions: '',
      isPlayer: false,
    });
    const id = useInitiativeStore.getState().combatants[0]!.id;
    useInitiativeStore.getState().updateCombatant(id, {
      hpCurrent: 3,
      conditions: 'Poisoned',
    });
    expect(useInitiativeStore.getState().combatants[0]).toMatchObject({
      hpCurrent: 3,
      conditions: 'Poisoned',
    });

    useInitiativeStore.setState({ turnId: id });
    useInitiativeStore.getState().removeCombatant(id);
    expect(useInitiativeStore.getState()).toMatchObject({
      combatants: [],
      turnId: null,
    });
    useInitiativeStore.getState().clear();
    expect(useInitiativeStore.getState()).toMatchObject({
      combatants: [],
      round: 0,
      turnId: null,
    });
  });

  it('advances through sorted turns and increments rounds', () => {
    useInitiativeStore.setState({
      combatants: [combatant('slow', 'Slow', 5), combatant('fast', 'Fast', 20)],
      round: 0,
      turnId: null,
    });
    useInitiativeStore.getState().next();
    expect(useInitiativeStore.getState()).toMatchObject({ turnId: 'fast', round: 1 });
    useInitiativeStore.getState().next();
    expect(useInitiativeStore.getState().turnId).toBe('slow');
    useInitiativeStore.getState().next();
    expect(useInitiativeStore.getState()).toMatchObject({ turnId: 'fast', round: 2 });
  });

  it('moves backwards across round boundaries and ignores an empty list', () => {
    useInitiativeStore.getState().next();
    useInitiativeStore.getState().previous();
    expect(useInitiativeStore.getState()).toMatchObject({ round: 0, turnId: null });

    useInitiativeStore.setState({
      combatants: [combatant('slow', 'Slow', 5), combatant('fast', 'Fast', 20)],
      round: 2,
      turnId: 'slow',
    });
    useInitiativeStore.getState().previous();
    expect(useInitiativeStore.getState().turnId).toBe('fast');
    useInitiativeStore.getState().previous();
    expect(useInitiativeStore.getState()).toMatchObject({ turnId: 'slow', round: 1 });
  });

  it('keeps the active turn when another combatant is removed', () => {
    useInitiativeStore.setState({
      combatants: [combatant('active', 'Active', 10), combatant('other', 'Other', 5)],
      round: 1,
      turnId: 'active',
    });
    useInitiativeStore.getState().removeCombatant('other');
    expect(useInitiativeStore.getState().turnId).toBe('active');
  });

  it('leaves non-matching combatants unchanged during an update', () => {
    const entry = combatant('existing', 'Existing', 10);
    useInitiativeStore.setState({ combatants: [entry], round: 1, turnId: null });
    useInitiativeStore.getState().updateCombatant('missing', { name: 'Changed' });
    expect(useInitiativeStore.getState().combatants).toEqual([entry]);
  });
});
