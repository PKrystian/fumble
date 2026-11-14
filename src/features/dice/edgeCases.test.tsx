import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DiceRollerPage } from './DiceRollerPage';
import { RollResult } from './RollResult';
import { useRollStore } from './rollStore';
import { MAX_CUSTOM_ROLLS, useCustomRollStore } from './customRollStore';
import { NORMAL_DEFENSE } from './damage';
import { focusRollResult } from './resultFocus';
vi.mock('@/i18n/useT', () => ({
  useT: () => ({ locale: 'pl', t: (key: string) => key }),
}));
vi.mock('@/seo/useSeo', () => ({ useSeo: vi.fn() }));
vi.mock('@/features/ui/confirmStore', () => ({ confirmDialog: vi.fn(async () => true) }));
function page() {
  return render(
    <MemoryRouter>
      <DiceRollerPage />
    </MemoryRouter>,
  );
}
const button = (name: string) => screen.getByRole('button', { name });
beforeEach(() => {
  localStorage.clear();
  useRollStore.setState({ log: [], dockOpen: false, error: null });
  useCustomRollStore.setState({ customRolls: [], removed: null });
});

describe('dice editing and presentation edge cases', () => {
  it('keeps legacy modes, supports cancellation and shows save limits', () => {
    useCustomRollStore.setState({
      customRolls: Array.from({ length: MAX_CUSTOM_ROLLS }, (_, index) => ({
        id: `roll-${index}`,
        name: `Roll ${index}`,
        expression: '1d20',
        ...(index === 0
          ? { mode: 'advantage' as const }
          : index === 1
            ? { mode: 'disadvantage' as const }
            : {}),
      })),
    });
    page();
    expect(screen.getByText('dice.savedLimit')).toBeVisible();
    fireEvent.click(screen.getAllByRole('button', { name: 'dice.editSavedRoll' })[2]!);
    expect(screen.getByLabelText('dice.orTypeExpression')).toHaveValue('1d20');
    fireEvent.click(button('common.cancel'));
    expect(screen.getByLabelText('dice.savedRollName')).toHaveValue('');
    fireEvent.submit(screen.getByLabelText('dice.savedRollName').closest('form')!);
    expect(useCustomRollStore.getState().customRolls).toHaveLength(100);
    fireEvent.click(button('dice.composers.expression'));
    fireEvent.change(screen.getByLabelText('dice.orTypeExpression'), {
      target: { value: '1d6' },
    });
    fireEvent.change(screen.getByLabelText('dice.savedRollName'), {
      target: { value: 'New' },
    });
    fireEvent.submit(screen.getByLabelText('dice.savedRollName').closest('form')!);
    expect(useCustomRollStore.getState().customRolls).toHaveLength(100);
    useCustomRollStore.getState().addCustomRoll('Extra', 'd6');
    expect(useCustomRollStore.getState().customRolls).toHaveLength(100);
    act(() => {
      useCustomRollStore.getState().removeCustomRoll('roll-2');
      useCustomRollStore.getState().addCustomRoll('Replacement', 'd6');
      useCustomRollStore.getState().undoRemove();
    });
    expect(useCustomRollStore.getState().customRolls).toHaveLength(100);
  });
  it('updates only the selected recipe and ignores invalid updates', () => {
    useCustomRollStore.getState().addCustomRoll('One', 'd6');
    useCustomRollStore.getState().addCustomRoll('Two', 'd8');
    const [first, second] = useCustomRollStore.getState().customRolls;
    useCustomRollStore
      .getState()
      .updateCustomRoll(first!.id, { name: 'Updated', expression: 'd4' });
    expect(useCustomRollStore.getState().customRolls[1]).toEqual(second);
    useCustomRollStore
      .getState()
      .updateCustomRoll(first!.id, { name: 'Broken', expression: 'invalid' });
    expect(useCustomRollStore.getState().customRolls[0]?.name).toBe('Updated');
  });
  it('copies typed damage and names the applied defenses', async () => {
    useRollStore.getState().damageRoll(
      [
        { id: 'f', name: 'Fire', expression: '5', type: 'fire' },
        { id: 'r', name: '', expression: '2', type: 'radiant' },
      ],
      { fire: { ...NORMAL_DEFENSE, resistance: true, vulnerability: true } },
      'Mixed',
    );
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(<RollResult entry={useRollStore.getState().log[0]!} />);
    fireEvent.click(button('dice.copyResult'));
    await screen.findByText('dice.copied');
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('dice.damageTypes.fire: 5 -> 4'),
    );
    expect(screen.getByText('dice.resistance + dice.vulnerability')).toBeVisible();
  });
  it('renders old results without timestamps, calculations or kept indices', async () => {
    const entry = {
      id: 'legacy',
      outcome: {
        expression: '1d6',
        mode: 'normal' as const,
        groups: [{ sides: 6, rolls: [1, 2], kept: [2] }],
        modifier: 0,
        total: 2,
      },
    };
    render(<RollResult entry={entry} />);
    expect(screen.getByLabelText('dice.discardedDie')).toHaveClass('line-through');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    fireEvent.click(button('dice.copyResult'));
    await screen.findByText('dice.copied');
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('d6: [1, 2] = 2'));
  });
  it('shows runtime errors and rejects compound damage over the shared limit', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    page();
    fireEvent.click(button('dice.composers.expression'));
    fireEvent.change(screen.getByLabelText('dice.orTypeExpression'), {
      target: { value: '5/(1d2-1)' },
    });
    fireEvent.click(button('dice.roll'));
    expect(screen.getByRole('alert')).toHaveTextContent('dice.errors.division');
    fireEvent.click(button('dice.composers.damage'));
    fireEvent.change(screen.getByLabelText('dice.componentExpression'), {
      target: { value: '600d6' },
    });
    fireEvent.click(button('dice.addComponent'));
    fireEvent.change(screen.getAllByLabelText('dice.componentExpression')[1]!, {
      target: { value: '600d6' },
    });
    expect(button('dice.rollDamage')).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('dice.errors.limit');
    fireEvent.submit(screen.getByLabelText('dice.savedRollName').closest('form')!);
    expect(useCustomRollStore.getState().customRolls).toHaveLength(0);
  });
  it('loads Polish examples and preserves focus at the composer', () => {
    page();
    fireEvent.click(screen.getByText('dice.examples'));
    fireEvent.click(button('1k20+5'));
    expect(screen.getByLabelText('dice.orTypeExpression')).toHaveValue('1k20+5');
    expect(screen.getByRole('heading', { name: 'dice.prepareRoll' })).toHaveFocus();
  });
  it('focuses the current result without requiring a floating panel', () => {
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    const heading = document.createElement('h2');
    heading.id = 'latest-roll-title';
    heading.tabIndex = -1;
    document.body.append(heading);
    focusRollResult();
    expect(heading).toHaveFocus();
    heading.remove();
    const dock = document.createElement('h2');
    dock.id = 'dock-roll-title';
    dock.tabIndex = -1;
    document.body.append(dock);
    focusRollResult();
    expect(dock).toHaveFocus();
    dock.remove();
    focusRollResult();
  });
  it('does not disguise unexpected failures as invalid dice', () => {
    vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('random-source-unavailable');
    });
    expect(() => useRollStore.getState().roll('d6')).toThrow('random-source-unavailable');
    expect(useRollStore.getState().log).toHaveLength(0);
  });
});
