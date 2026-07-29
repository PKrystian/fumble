import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RollResultDock } from './RollResultDock';

const mocks = vi.hoisted(() => ({
  state: {
    log: [] as Array<{
      id: string;
      label?: string;
      outcome: {
        expression: string;
        mode: 'normal' | 'advantage' | 'disadvantage';
        total: number;
        groups: Array<{ sides: number }>;
      };
    }>,
    dockOpen: false,
    closeDock: vi.fn(),
    clearLog: vi.fn(),
    roll: vi.fn(),
  },
}));

vi.mock('./rollStore', () => ({
  useRollStore: (selector: (state: typeof mocks.state) => unknown) =>
    selector(mocks.state),
}));

vi.mock('./engine', () => ({
  describeRolls: () => 'roll details',
}));

vi.mock('@/i18n/useT', () => ({
  useT: () => ({ t: (key: string) => key }),
}));

const entry = (
  id: string,
  mode: 'normal' | 'advantage' | 'disadvantage' = 'normal',
  sides = 6,
  label?: string,
) => ({
  id,
  ...(label ? { label } : {}),
  outcome: {
    expression: `1d${sides}`,
    mode,
    total: sides,
    groups: [{ sides }],
  },
});

describe('RollResultDock', () => {
  beforeEach(() => {
    mocks.state.log = [];
    mocks.state.dockOpen = false;
    mocks.state.closeDock.mockReset();
    mocks.state.clearLog.mockReset();
    mocks.state.roll.mockReset();
  });

  it('stays hidden without an open result', () => {
    const view = render(<RollResultDock />);
    expect(view.container).toBeEmptyDOMElement();
    mocks.state.dockOpen = true;
    view.rerender(<RollResultDock />);
    expect(view.container).toBeEmptyDOMElement();
  });

  it('renders a normal non-d20 result and rerolls or closes it', () => {
    mocks.state.dockOpen = true;
    mocks.state.log = [entry('one')];
    render(<RollResultDock />);
    expect(screen.getByText('roll details')).toBeInTheDocument();
    expect(screen.queryByText('dice.adv')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'dice.reroll' }));
    expect(mocks.state.roll).toHaveBeenCalledWith('1d6', 'normal', undefined);
    fireEvent.click(screen.getByRole('button', { name: 'dice.closeDiceResult' }));
    expect(mocks.state.closeDock).toHaveBeenCalled();
  });

  it('offers d20 modes and renders bounded recent history', () => {
    mocks.state.dockOpen = true;
    mocks.state.log = [
      entry('latest', 'advantage', 20, 'Attack'),
      entry('dis', 'disadvantage', 20, 'Save'),
      entry('normal'),
      ...Array.from({ length: 12 }, (_, index) => entry(`extra-${index}`)),
    ];
    render(<RollResultDock />);
    expect(screen.getByText('Attack')).toBeInTheDocument();
    expect(screen.getByText(/dice.modeAdvantage/)).toBeInTheDocument();
    expect(screen.getByText(/Save: 1d20/)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(11);

    fireEvent.click(screen.getByRole('button', { name: 'dice.adv' }));
    fireEvent.click(screen.getByRole('button', { name: 'dice.dis' }));
    expect(mocks.state.roll).toHaveBeenCalledWith('1d20', 'advantage', 'Attack');
    expect(mocks.state.roll).toHaveBeenCalledWith('1d20', 'disadvantage', 'Attack');
    fireEvent.click(screen.getByRole('button', { name: 'dice.clear' }));
    expect(mocks.state.clearLog).toHaveBeenCalled();
  });
});
