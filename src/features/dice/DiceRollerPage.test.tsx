import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DiceRollerPage } from './DiceRollerPage';
import { useRollStore } from './rollStore';
import { useCustomRollStore } from './customRollStore';

const confirm = vi.hoisted(() => vi.fn());
vi.mock('@/features/ui/confirmStore', () => ({ confirmDialog: confirm }));
vi.mock('@/i18n/useT', () => ({
  useT: () => ({ locale: 'en', t: (key: string) => key }),
}));
vi.mock('@/seo/useSeo', () => ({ useSeo: vi.fn() }));
function page() {
  return render(
    <MemoryRouter>
      <DiceRollerPage />
    </MemoryRouter>,
  );
}
const button = (name: string) => screen.getByRole('button', { name });
const input = (label: string) => screen.getByLabelText(label);
const selectMode = (mode: string) => fireEvent.click(button(`dice.composers.${mode}`));

describe('dice roller interactions', () => {
  beforeEach(() => {
    localStorage.clear();
    useRollStore.setState({ log: [], dockOpen: false, error: null });
    useCustomRollStore.setState({ customRolls: [], removed: null });
    confirm.mockReset();
    confirm.mockResolvedValue(true);
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });
  it('builds a pool with explicit quantity controls, preview and an empty disabled roll', () => {
    page();
    expect(button('dice.roll')).toBeDisabled();
    fireEvent.click(button('d6'));
    fireEvent.click(button('dice.addDie'));
    expect(screen.getByText('2d6', { selector: 'span' })).toBeVisible();
    fireEvent.click(button('dice.removeDie'));
    fireEvent.change(input('dice.modifier'), { target: { value: '3' } });
    fireEvent.click(button('dice.modeAdvantage'));
    fireEvent.click(button('dice.roll'));
    expect(useRollStore.getState().log[0]?.outcome).toMatchObject({
      total: 4,
      mode: 'normal',
    });
    fireEvent.click(button('dice.clearPool'));
    expect(button('dice.roll')).toBeDisabled();
    fireEvent.change(input('dice.modifier'), { target: { value: '' } });
    expect(button('dice.roll')).toBeDisabled();
    fireEvent.change(input('dice.modifier'), { target: { value: '1.5' } });
    expect(button('dice.roll')).toBeDisabled();
  });
  it('explains invalid and limited expressions, then rolls from Enter with advantage', () => {
    page();
    selectMode('expression');
    const field = input('dice.orTypeExpression');
    for (const [value, error] of [
      ['2k6+', 'invalid'],
      ['8/0', 'division'],
      ['999999d6', 'limit'],
    ]) {
      fireEvent.change(field, { target: { value } });
      expect(screen.getByText(`dice.errors.${error}`)).toBeVisible();
      expect(button('dice.roll')).toBeDisabled();
    }
    fireEvent.change(field, { target: { value: '1k20+5' } });
    fireEvent.keyDown(field, { key: 'Escape' });
    fireEvent.click(button('dice.modeAdvantage'));
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(useRollStore.getState().log[0]?.outcome).toMatchObject({
      mode: 'advantage',
      total: 6,
    });
    expect(
      within(screen.getByRole('region', { name: 'dice.latestRoll' })).getByLabelText(
        'dice.discardedDie',
      ),
    ).toHaveClass('line-through');
    const latest = screen.getByRole('region', { name: 'dice.latestRoll' });
    fireEvent.click(within(latest).getByRole('button', { name: 'dice.reroll' }));
    expect(useRollStore.getState().log[0]?.outcome.mode).toBe('advantage');
  });
  it('saves the current roll, edits it without a duplicate and undoes deletion', () => {
    page();
    fireEvent.click(button('d8'));
    fireEvent.change(input('dice.savedRollName'), { target: { value: 'Sword' } });
    fireEvent.click(button('dice.saveRoll'));
    expect(useCustomRollStore.getState().customRolls).toHaveLength(1);
    fireEvent.click(button('dice.editSavedRoll'));
    expect(input('dice.orTypeExpression')).toHaveValue('1d8');
    fireEvent.change(input('dice.orTypeExpression'), { target: { value: '2d8+4' } });
    fireEvent.click(button('dice.saveChanges'));
    expect(useCustomRollStore.getState().customRolls).toHaveLength(1);
    expect(useCustomRollStore.getState().customRolls[0]?.expression).toBe('2d8+4');
    fireEvent.click(button('dice.removeSavedRoll'));
    expect(useCustomRollStore.getState().customRolls).toHaveLength(0);
    fireEvent.click(button('dice.undo'));
    expect(useCustomRollStore.getState().customRolls).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /^Sword/ }));
    expect(useRollStore.getState().log[0]?.label).toBe('Sword');
  });
  it('builds mixed damage, saves the recipe without target defenses and reuses it', () => {
    page();
    selectMode('damage');
    const first = screen.getByRole('group', { name: 'dice.componentNumber' });
    fireEvent.change(within(first).getByLabelText('dice.componentExpression'), {
      target: { value: '1d8+3' },
    });
    fireEvent.change(within(first).getByLabelText('dice.componentName'), {
      target: { value: 'Sword' },
    });
    fireEvent.click(button('dice.addComponent'));
    const groups = screen.getAllByRole('group', { name: 'dice.componentNumber' });
    fireEvent.change(within(groups[1]!).getByLabelText('dice.componentExpression'), {
      target: { value: '2d8' },
    });
    const reactions = screen.getByRole('group', { name: 'dice.damageTypes.slashing' });
    fireEvent.click(within(reactions).getByRole('checkbox', { name: 'dice.resistance' }));
    fireEvent.change(input('dice.savedRollName'), { target: { value: 'Sword + Smite' } });
    fireEvent.click(button('dice.saveRoll'));
    expect(useCustomRollStore.getState().customRolls[0]?.components).toHaveLength(2);
    expect(JSON.stringify(useCustomRollStore.getState().customRolls)).not.toContain(
      'resistance',
    );
    fireEvent.click(button('dice.rollDamage'));
    expect(useRollStore.getState().log[0]?.outcome.total).toBe(4);
    fireEvent.click(button('dice.resetTarget'));
    fireEvent.click(screen.getByRole('button', { name: /^Sword \+ Smite/ }));
    expect(useRollStore.getState().log[0]?.outcome.total).toBe(6);
    fireEvent.click(button('dice.editSavedRoll'));
    expect(screen.getAllByLabelText('dice.componentExpression')).toHaveLength(2);
  });
  it('offers every damage type, validates components and resets target settings', () => {
    page();
    selectMode('damage');
    const select = input('dice.damageType');
    expect(within(select).getAllByRole('option')).toHaveLength(13);
    fireEvent.change(select, { target: { value: 'fire' } });
    fireEvent.change(input('dice.componentExpression'), { target: { value: '2d6+' } });
    expect(button('dice.rollDamage')).toBeDisabled();
    fireEvent.change(input('dice.componentExpression'), { target: { value: '2d6' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'dice.immunity' }));
    fireEvent.click(button('dice.rollDamage'));
    expect(useRollStore.getState().log[0]?.outcome.total).toBe(0);
    fireEvent.click(button('dice.addComponent'));
    fireEvent.click(screen.getAllByRole('button', { name: 'dice.removeComponent' })[1]!);
    expect(screen.getAllByLabelText('dice.componentExpression')).toHaveLength(1);
  });
  it('loads expression and mixed damage examples without rolling', () => {
    page();
    fireEvent.click(screen.getByText('dice.examples'));
    fireEvent.click(button('2d6+3'));
    expect(input('dice.orTypeExpression')).toHaveValue('2d6+3');
    fireEvent.click(button('dice.smitePreset'));
    expect(screen.getAllByLabelText('dice.componentExpression')).toHaveLength(2);
    expect(useRollStore.getState().log).toHaveLength(0);
  });
  it('keeps history after rehydration, expands details and confirms clearing', async () => {
    useRollStore.getState().roll('1d20', 'disadvantage', 'Attack');
    page();
    expect(screen.getByRole('status')).toHaveTextContent('dice.announcedResult');
    const history = screen.getByRole('region', { name: 'dice.history' });
    fireEvent.click(within(history).getByText(/Attack: 1d20/));
    expect(
      await within(history).findByText('dice.modeDisadvantage', { selector: 'p' }),
    ).toBeVisible();
    const saved = localStorage.getItem('fumble-roll-history');
    expect(saved).toContain('Attack');
    await useRollStore.persist.rehydrate();
    expect(useRollStore.getState().log).toHaveLength(1);
    confirm.mockResolvedValueOnce(false);
    fireEvent.click(button('dice.clearHistory'));
    await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
    expect(useRollStore.getState().log).toHaveLength(1);
    fireEvent.click(button('dice.clearHistory'));
    await waitFor(() => expect(useRollStore.getState().log).toHaveLength(0));
  });
  it('copies a result and explains clipboard failures', async () => {
    useRollStore.getState().roll('2d6+3');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    page();
    fireEvent.click(
      within(screen.getByRole('region', { name: 'dice.latestRoll' })).getByRole(
        'button',
        { name: 'dice.copyResult' },
      ),
    );
    expect(await screen.findByText('dice.copied')).toBeVisible();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('dice.total: 5'));
    writeText.mockRejectedValueOnce(new Error('denied'));
    fireEvent.click(
      within(screen.getByRole('region', { name: 'dice.latestRoll' })).getByRole(
        'button',
        { name: 'dice.copyResult' },
      ),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('dice.copyFailed');
  });
});
