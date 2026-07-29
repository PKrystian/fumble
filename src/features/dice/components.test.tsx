import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RollOutcome } from './engine';
import { RechargeRoll } from './RechargeRoll';
import { RollableDice } from './RollableDice';
import { useRollStore } from './rollStore';

const originalRoll = useRollStore.getState().roll;
const renderControl = (node: React.ReactNode) =>
  render(<MemoryRouter>{node}</MemoryRouter>);

const outcome = (total: number): RollOutcome => ({
  expression: '1d6',
  mode: 'normal',
  groups: [],
  modifier: 0,
  total,
});

describe('dice controls', () => {
  afterEach(() => useRollStore.setState({ roll: originalRoll }));

  it('rolls damage and attack expressions', () => {
    const roll = vi.fn();
    useRollStore.setState({ roll });
    const { rerender } = renderControl(<RollableDice expression="1d6" display="1d6" />);
    fireEvent.click(screen.getByRole('button', { name: '1d6' }));
    expect(roll).toHaveBeenCalledWith('1d6', 'normal', undefined);
    expect(screen.getByRole('button')).toHaveClass('text-ember-400');

    rerender(
      <MemoryRouter>
        <RollableDice expression="1d20 + 5" display="+5" label="Sword" variant="attack" />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: '+5' }));
    expect(roll).toHaveBeenLastCalledWith('1d20 + 5', 'normal', 'Sword');
    expect(screen.getByRole('button')).toHaveClass('text-arcane-300');
  });

  it('handles failed, successful and unsuccessful recharge rolls', () => {
    const roll = vi
      .fn()
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(outcome(4))
      .mockReturnValueOnce(outcome(6));
    useRollStore.setState({ roll });
    const { rerender } = renderControl(<RechargeRoll min={5} />);
    const button = screen.getByRole('button');

    fireEvent.click(button);
    expect(screen.queryByText(/Rolled/)).toBeNull();
    fireEvent.click(button);
    expect(screen.getByText(/not yet/i)).toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.getByText(/recharged/i)).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <RechargeRoll min={6} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button')).toHaveTextContent('Recharge 6');
  });
});
