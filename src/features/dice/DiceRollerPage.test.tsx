import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DiceRollerPage } from './DiceRollerPage';

const mocks = vi.hoisted(() => ({
  rolls: {
    log: [] as Array<{
      id: string;
      label?: string;
      outcome: { expression: string; mode: string; total: number };
    }>,
    roll: vi.fn(),
    pushOutcome: vi.fn(),
    clearLog: vi.fn(),
  },
  custom: {
    customRolls: [{ id: 'saved', name: 'Fire', expression: '2d6+1' }],
    addCustomRoll: vi.fn(),
    removeCustomRoll: vi.fn(),
  },
}));

vi.mock('./rollStore', () => ({
  useRollStore: (selector: (state: typeof mocks.rolls) => unknown) =>
    selector(mocks.rolls),
}));

vi.mock('./customRollStore', () => ({
  useCustomRollStore: (selector: (state: typeof mocks.custom) => unknown) =>
    selector(mocks.custom),
}));

vi.mock('./engine', () => ({
  parseExpression: (value: string) => (/^\d+d\d+/.test(value) ? { terms: [] } : null),
  rollParsed: (
    parsed: { terms: Array<{ count: number; sides: number }>; modifier: number },
    mode: string,
  ) => ({
    expression: 'pool',
    mode,
    total: parsed.terms.length + parsed.modifier,
    terms: [],
    modifier: parsed.modifier,
  }),
}));

vi.mock('@/i18n/useT', () => ({
  useT: () => ({ t: (key: string) => key }),
}));

vi.mock('@/seo/useSeo', () => ({
  useSeo: vi.fn(),
}));

describe('DiceRollerPage', () => {
  beforeEach(() => {
    mocks.rolls.log = [];
    mocks.rolls.roll.mockReset();
    mocks.rolls.pushOutcome.mockReset();
    mocks.rolls.clearLog.mockReset();
    mocks.custom.addCustomRoll.mockReset();
    mocks.custom.removeCustomRoll.mockReset();
  });

  it('builds, rolls and clears a dice pool in every mode', () => {
    render(<DiceRollerPage />);
    fireEvent.click(screen.getAllByRole('button', { name: 'dice.roll' })[0]!);
    expect(mocks.rolls.pushOutcome).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'd6' }));
    fireEvent.click(screen.getByRole('button', { name: 'd6' }));
    expect(screen.getByRole('button', { name: /^2d6$/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'dice.modeAdvantage' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'dice.roll' })[0]!);
    expect(mocks.rolls.pushOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'advantage' }),
    );

    fireEvent.click(screen.getByRole('button', { name: /^2d6$/ }));
    expect(screen.getByRole('button', { name: /^1d6$/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^1d6$/ }));
    expect(screen.queryByRole('button', { name: /^1d6$/ })).not.toBeInTheDocument();

    const modifier = screen.getByRole('spinbutton');
    fireEvent.change(modifier, { target: { value: '-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'dice.modeDisadvantage' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'dice.roll' })[0]!);
    fireEvent.change(modifier, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'dice.clearPool' }));
    expect(modifier).toHaveValue(0);
  });

  it('rolls typed and saved expressions and removes saved rolls', () => {
    render(<DiceRollerPage />);
    const expression = screen.getByPlaceholderText('dice.expressionPlaceholder');
    fireEvent.change(expression, { target: { value: '1d20+4' } });
    fireEvent.keyDown(expression, { key: 'Enter' });
    fireEvent.keyDown(expression, { key: 'Escape' });
    fireEvent.click(screen.getAllByRole('button', { name: 'dice.roll' })[1]!);
    expect(mocks.rolls.roll).toHaveBeenCalledWith('1d20+4', 'normal');

    fireEvent.click(screen.getByRole('button', { name: /Fire/ }));
    expect(mocks.rolls.roll).toHaveBeenCalledWith('2d6+1', 'normal', 'Fire');
    fireEvent.click(screen.getByRole('button', { name: 'dice.removeSavedRoll' }));
    expect(mocks.custom.removeCustomRoll).toHaveBeenCalledWith('saved');
  });

  it('validates and saves custom rolls', () => {
    render(<DiceRollerPage />);
    const name = screen.getByPlaceholderText('dice.savedRollNamePlaceholder');
    const expression = screen.getByPlaceholderText('dice.savedRollExpressionPlaceholder');
    const save = screen.getByRole('button', { name: 'dice.saveRoll' });
    expect(save).toBeDisabled();
    fireEvent.keyDown(expression, { key: 'Enter' });
    expect(mocks.custom.addCustomRoll).not.toHaveBeenCalled();

    fireEvent.change(name, { target: { value: '  Attack  ' } });
    fireEvent.change(expression, { target: { value: '1d20+5' } });
    fireEvent.keyDown(expression, { key: 'Escape' });
    fireEvent.click(save);
    expect(mocks.custom.addCustomRoll).toHaveBeenCalledWith('  Attack  ', '1d20+5');
    expect(name).toHaveValue('');
    expect(expression).toHaveValue('');
  });

  it('renders and clears labeled and mode-aware history', () => {
    mocks.rolls.log = [
      {
        id: 'normal',
        outcome: { expression: '1d6', mode: 'normal', total: 4 },
      },
      {
        id: 'advantage',
        label: 'Attack',
        outcome: { expression: '1d20+5', mode: 'advantage', total: 22 },
      },
    ];
    render(<DiceRollerPage />);
    expect(screen.getByText('1d6')).toBeInTheDocument();
    expect(screen.getByText(/Attack: 1d20\+5/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'dice.clear' }));
    expect(mocks.rolls.clearLog).toHaveBeenCalled();
  });
});
