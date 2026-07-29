import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCustomRollStore } from './customRollStore';
import { useRollStore } from './rollStore';

describe('dice stores', () => {
  beforeEach(() => {
    localStorage.clear();
    useCustomRollStore.setState({ customRolls: [] });
    useRollStore.setState({ log: [], dockOpen: false });
    vi.restoreAllMocks();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000001',
    );
  });

  it('adds and removes trimmed custom rolls', () => {
    useCustomRollStore.getState().addCustomRoll('  Sword  ', ' 1d8 + 3 ');
    expect(useCustomRollStore.getState().customRolls).toEqual([
      {
        id: '00000000-0000-4000-8000-000000000001',
        name: 'Sword',
        expression: '1d8 + 3',
      },
    ]);
    useCustomRollStore
      .getState()
      .removeCustomRoll('00000000-0000-4000-8000-000000000001');
    expect(useCustomRollStore.getState().customRolls).toEqual([]);
  });

  it('rolls expressions and controls the result dock', () => {
    expect(useRollStore.getState().roll('invalid expression')).toBeNull();
    const outcome = useRollStore.getState().roll('1d1 + 2', 'normal', 'Attack');
    expect(outcome?.total).toBe(3);
    expect(useRollStore.getState()).toMatchObject({
      dockOpen: true,
      log: [{ label: 'Attack' }],
    });
    useRollStore.getState().closeDock();
    expect(useRollStore.getState().dockOpen).toBe(false);
    useRollStore.getState().clearLog();
    expect(useRollStore.getState()).toMatchObject({ log: [], dockOpen: false });
  });

  it('pushes outcomes and limits history', () => {
    const outcome = useRollStore.getState().roll('1d1')!;
    useRollStore.getState().clearLog();
    for (let index = 0; index < 55; index++) {
      useRollStore.getState().pushOutcome(outcome);
    }
    expect(useRollStore.getState().log).toHaveLength(50);
    expect(useRollStore.getState().dockOpen).toBe(true);
  });

  it('pushes an outcome without a label', () => {
    const outcome = useRollStore.getState().roll('1d1')!;
    useRollStore.getState().clearLog();
    useRollStore.getState().pushOutcome(outcome);
    expect(useRollStore.getState().log[0]).not.toHaveProperty('label');
  });
});
