import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InitiativeTrackerPage } from './InitiativeTrackerPage';

const mocks = vi.hoisted(() => ({
  state: {
    combatants: [] as Array<{
      id: string;
      name: string;
      initiative: number;
      ac: number | null;
      hpCurrent: number;
      hpMax: number;
      conditions: string;
      isPlayer: boolean;
    }>,
    round: 0,
    turnId: null as string | null,
    addCombatant: vi.fn(),
    updateCombatant: vi.fn(),
    removeCombatant: vi.fn(),
    next: vi.fn(),
    previous: vi.fn(),
    clear: vi.fn(),
  },
  characters: [] as Array<{
    id: string;
    name: string;
    ac: number;
    hp: { current: number; max: number };
    dm?: boolean;
  }>,
  roll: { total: 18 } as { total: number } | null,
  confirm: vi.fn(),
}));

vi.mock('./store', async (importOriginal) => {
  const original = await importOriginal<typeof import('./store')>();
  return {
    ...original,
    useInitiativeStore: (selector?: (state: typeof mocks.state) => unknown) =>
      selector ? selector(mocks.state) : mocks.state,
  };
});

vi.mock('@/features/character/store', () => ({
  useCharacterList: () => mocks.characters,
}));

vi.mock('@/features/character/model', () => ({
  isDmCharacter: (character: { dm?: boolean }) => character.dm,
}));

vi.mock('@/features/dice/engine', () => ({
  rollExpression: () => mocks.roll,
}));

vi.mock('@/features/ui/confirmStore', () => ({
  confirmDialog: (...args: unknown[]) => mocks.confirm(...args),
}));

vi.mock('@/i18n/useT', () => ({
  useT: () => ({
    t: (key: string, values?: Record<string, string | number>) =>
      values?.name ? `${key}:${values.name}` : key,
  }),
}));

vi.mock('@/seo/useSeo', () => ({
  useSeo: vi.fn(),
}));

describe('InitiativeTrackerPage', () => {
  beforeEach(() => {
    mocks.state.combatants = [];
    mocks.state.round = 0;
    mocks.state.turnId = null;
    mocks.characters = [];
    mocks.roll = { total: 18 };
    mocks.confirm.mockReset();
    mocks.confirm.mockResolvedValue(true);
    for (const fn of [
      mocks.state.addCombatant,
      mocks.state.updateCombatant,
      mocks.state.removeCombatant,
      mocks.state.next,
      mocks.state.previous,
      mocks.state.clear,
    ]) {
      fn.mockReset();
    }
  });

  it('adds a custom combatant and handles controls and fallbacks', () => {
    render(<InitiativeTrackerPage />);
    expect(screen.getByText('initiative.emptyState')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'initiative.add' }));
    expect(mocks.state.addCombatant).not.toHaveBeenCalled();
    const name = screen.getByPlaceholderText('initiative.namePlaceholder');
    fireEvent.change(name, { target: { value: '  Orc  ' } });
    const numbers = screen.getAllByRole('spinbutton');
    fireEvent.change(numbers[0]!, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'initiative.rollInitiative' }));
    fireEvent.change(numbers[1]!, { target: { value: '12' } });
    fireEvent.change(numbers[2]!, { target: { value: '' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.keyDown(name, { key: 'Enter' });
    expect(mocks.state.addCombatant).toHaveBeenCalledWith({
      name: 'Orc',
      initiative: 18,
      ac: null,
      hpCurrent: 12,
      hpMax: 12,
      conditions: '',
      isPlayer: true,
    });

    mocks.roll = null;
    fireEvent.click(screen.getByRole('button', { name: 'initiative.rollInitiative' }));
    fireEvent.keyDown(name, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'initiative.previousTurn' }));
    fireEvent.click(screen.getByRole('button', { name: 'initiative.nextTurn' }));
    expect(mocks.state.previous).toHaveBeenCalled();
    expect(mocks.state.next).toHaveBeenCalled();
  });

  it('adds roster characters and edits existing combatants', async () => {
    mocks.characters = [
      {
        id: 'hero',
        name: 'Hero',
        ac: 16,
        hp: { current: 8, max: 10 },
      },
      {
        id: 'dm',
        name: '',
        ac: 0,
        hp: { current: 4, max: 4 },
        dm: true,
      },
    ];
    mocks.state.combatants = [
      {
        id: 'a',
        name: 'Alpha',
        initiative: 20,
        ac: 15,
        hpCurrent: 10,
        hpMax: 10,
        conditions: '',
        isPlayer: true,
      },
      {
        id: 'b',
        name: 'Beta',
        initiative: 10,
        ac: null,
        hpCurrent: 0,
        hpMax: 0,
        conditions: 'Prone',
        isPlayer: false,
      },
    ];
    mocks.state.round = 2;
    mocks.state.turnId = 'a';
    render(<InitiativeTrackerPage />);

    const select = screen.getByRole('combobox');
    expect(
      screen.getByRole('option', { name: 'initiative.unnamed (DM)' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'initiative.add' })[0]!);
    expect(mocks.state.addCombatant).not.toHaveBeenCalled();
    fireEvent.change(select, { target: { value: 'hero' } });
    fireEvent.change(
      screen.getAllByText('initiative.init')[0]!.parentElement!.querySelector('input')!,
      {
        target: { value: '17' },
      },
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'initiative.add' })[0]!);
    expect(mocks.state.addCombatant).toHaveBeenCalledWith({
      name: 'Hero',
      initiative: 17,
      ac: 16,
      hpCurrent: 8,
      hpMax: 10,
      conditions: '',
      isPlayer: true,
    });
    fireEvent.change(select, { target: { value: 'dm' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'initiative.add' })[0]!);
    expect(mocks.state.addCombatant).toHaveBeenCalledWith(
      expect.objectContaining({ name: '', ac: null }),
    );

    fireEvent.change(screen.getAllByRole('spinbutton')[4]!, {
      target: { value: '' },
    });
    fireEvent.change(screen.getByDisplayValue('Prone'), {
      target: { value: 'Stunned' },
    });
    expect(mocks.state.updateCombatant).toHaveBeenCalledWith('a', { hpCurrent: 0 });
    expect(mocks.state.updateCombatant).toHaveBeenCalledWith('b', {
      conditions: 'Stunned',
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'initiative.removeCombatant:Beta' }),
    );
    expect(mocks.state.removeCombatant).toHaveBeenCalledWith('b');

    fireEvent.click(screen.getByRole('button', { name: 'initiative.clearAll' }));
    await waitFor(() => expect(mocks.state.clear).toHaveBeenCalled());
    mocks.confirm.mockResolvedValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'initiative.clearAll' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(2));
    expect(mocks.state.clear).toHaveBeenCalledTimes(1);
  });
});
