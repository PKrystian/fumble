import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRollStore } from './rollStore';

describe('roll store', () => {
  beforeEach(() => {
    useRollStore.setState({ log: [], dockOpen: false });
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000000',
    );
  });

  it('rejects invalid expressions and stores valid rolls', () => {
    expect(useRollStore.getState().roll('invalid')).toBeNull();
    const outcome = useRollStore.getState().roll('1d20', 'advantage', 'Attack');
    expect(outcome).not.toBeNull();
    expect(useRollStore.getState().log[0]?.label).toBe('Attack');
    expect(useRollStore.getState().dockOpen).toBe(true);

    useRollStore.getState().roll('1d6');
    expect(useRollStore.getState().log[0]?.label).toBeUndefined();
  });

  it('pushes outcomes, caps history and controls the dock', () => {
    const outcome = useRollStore.getState().roll('1')!;
    useRollStore.setState({ log: [], dockOpen: false });
    for (let index = 0; index < 51; index++) {
      useRollStore.getState().pushOutcome(outcome, index === 0 ? 'First' : undefined);
    }
    expect(useRollStore.getState().log).toHaveLength(50);
    expect(useRollStore.getState().dockOpen).toBe(true);

    useRollStore.getState().closeDock();
    expect(useRollStore.getState().dockOpen).toBe(false);
    useRollStore.getState().clearLog();
    expect(useRollStore.getState()).toMatchObject({ log: [], dockOpen: false });
  });
});
