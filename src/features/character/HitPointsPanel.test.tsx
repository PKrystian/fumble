import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRollStore } from '@/features/dice/rollStore';
import { useDialogStore } from '@/features/ui/confirmStore';
import { HitPointsPanel } from './HitPointsPanel';
import { createCharacter, type Character } from './model';
import { SheetHarness } from './sheetTestHarness';
import { currentCharacter } from './sheetTestState';

function hero(changes: Partial<Character> = {}): Character {
  return {
    ...createCharacter('Hero'),
    level: 4,
    hitDice: '4d10',
    hp: { current: 20, max: 30, temp: 0 },
    ...changes,
  };
}

function mount(character = hero()) {
  render(<SheetHarness initial={character} component={HitPointsPanel} />);
}

async function answer(value: boolean) {
  await act(async () => useDialogStore.getState().respond(value));
}

const originalRoll = useRollStore.getState().roll;

describe('HitPointsPanel', () => {
  beforeEach(() => {
    useRollStore.setState({ log: [], dockOpen: false, error: null, roll: originalRoll });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applies damage, healing and temporary hit points with validation', () => {
    mount();
    expect(screen.getByRole('meter', { name: 'Hit Points' })).toHaveAttribute(
      'aria-valuetext',
      '20 of 30 hit points, 0 temporary',
    );
    const amount = screen.getByRole('textbox', { name: 'Amount' });
    const damage = screen.getByRole('button', { name: 'Damage' });
    expect(damage).toBeDisabled();
    fireEvent.change(amount, { target: { value: '-5' } });
    expect(amount).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Enter a whole number from 1 to 9999.')).toBeInTheDocument();
    expect(damage).toBeDisabled();

    fireEvent.change(amount, { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Temporary' }));
    expect(currentCharacter().hp.temp).toBe(6);
    expect(
      screen.getByText('Temporary hit points set to at least 6.'),
    ).toBeInTheDocument();
    expect(amount).toHaveValue('');

    fireEvent.change(amount, { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Damage' }));
    expect(currentCharacter().hp).toEqual({ current: 16, max: 30, temp: 0 });
    expect(screen.getByText('Took 10 damage.')).toBeInTheDocument();

    fireEvent.change(amount, { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Heal' }));
    expect(currentCharacter().hp.current).toBe(30);
    expect(screen.getByText('Healed 50 hit points.')).toBeInTheDocument();
  });

  it('edits current, maximum and temporary values', () => {
    mount(hero({ deathSaves: { successes: 1, failures: 1 } }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Max' }), {
      target: { value: '15' },
    });
    expect(currentCharacter().hp).toMatchObject({ current: 15, max: 15 });
    fireEvent.change(screen.getByRole('textbox', { name: 'Current' }), {
      target: { value: '0' },
    });
    expect(currentCharacter().hp.current).toBe(0);
    expect(currentCharacter().deathSaves).toEqual({ successes: 1, failures: 1 });
    fireEvent.change(screen.getByRole('textbox', { name: 'Current' }), {
      target: { value: '5' },
    });
    expect(currentCharacter().deathSaves).toEqual({ successes: 0, failures: 0 });
    fireEvent.change(screen.getByRole('textbox', { name: 'Temp' }), {
      target: { value: '4' },
    });
    expect(currentCharacter().hp.temp).toBe(4);
  });

  it('tracks death saves at zero hit points', () => {
    mount(hero({ hp: { current: 0, max: 30, temp: 0 } }));
    expect(
      screen.getByText('Dying. Roll a death save at the start of each turn.'),
    ).toBeInTheDocument();
    const random = vi.spyOn(Math, 'random');
    random.mockReturnValue(0.45);
    fireEvent.click(screen.getByRole('button', { name: 'Roll death save' }));
    expect(screen.getByText('Rolled 10: success.')).toBeInTheDocument();
    expect(useRollStore.getState().log[0]!.label).toBe('Hero: Death saves');
    random.mockReturnValue(0.2);
    fireEvent.click(screen.getByRole('button', { name: 'Roll death save' }));
    expect(screen.getByText('Rolled 5: failure.')).toBeInTheDocument();
    random.mockReturnValue(0);
    fireEvent.click(screen.getByRole('button', { name: 'Roll death save' }));
    expect(currentCharacter().deathSaves).toEqual({ successes: 1, failures: 3 });
    expect(
      screen.getByText('Three failures. The character has died.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Roll death save' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Reset death saves' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Success 3' }));
    expect(currentCharacter().deathSaves.successes).toBe(3);
    expect(screen.getByText('Stable at 0 hit points.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Success 3' }));
    expect(currentCharacter().deathSaves.successes).toBe(2);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Failure 1' }));
    expect(currentCharacter().deathSaves.failures).toBe(1);

    random.mockReturnValue(0.99);
    fireEvent.click(screen.getByRole('button', { name: 'Roll death save' }));
    expect(currentCharacter().hp.current).toBe(1);
    expect(screen.queryByRole('group', { name: 'Death saves' })).toBeNull();
  });

  it('ignores a death save roll that the dice store rejects', () => {
    mount(hero({ hp: { current: 0, max: 30, temp: 0 } }));
    act(() => useRollStore.setState({ roll: () => null }));
    fireEvent.click(screen.getByRole('button', { name: 'Roll death save' }));
    expect(currentCharacter().deathSaves).toEqual({ successes: 0, failures: 0 });
  });

  it('spends hit dice with the Constitution modifier', () => {
    const character = hero();
    character.abilities.con = 14;
    mount(character);
    expect(screen.getByText('Hit dice: 4 of 4 d10 remaining')).toBeInTheDocument();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    fireEvent.click(screen.getByRole('button', { name: 'Spend hit die' }));
    expect(useRollStore.getState().log[0]!.outcome.expression).toBe('1d10 + 2');
    expect(currentCharacter()).toMatchObject({ hp: { current: 28 }, hitDiceUsed: 1 });
    expect(
      screen.getByText('Recovered 8 hit points from a hit die.'),
    ).toBeInTheDocument();
  });

  it('disables hit dice without a class, when none remain or at full health', () => {
    mount(hero({ hitDice: '' }));
    expect(screen.getByText('Choose a class to use hit dice.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Spend hit die' })).toBeDisabled();
  });

  it('does not heal when the hit die roll fails', () => {
    mount(hero({ abilities: { ...createCharacter().abilities, con: 10 } }));
    act(() => useRollStore.setState({ roll: () => null }));
    fireEvent.click(screen.getByRole('button', { name: 'Spend hit die' }));
    expect(currentCharacter().hitDiceUsed).toBe(0);
  });

  it('summarizes rests before applying them', async () => {
    const character = hero({
      hitDiceUsed: 3,
      hp: { current: 5, max: 30, temp: 4 },
      spellSlots: [
        { level: 1, longRestMax: 2, usedLongRest: 2, shortRestMax: 1, usedShortRest: 1 },
      ],
    });
    mount(character);
    fireEvent.click(screen.getByRole('button', { name: 'Short rest' }));
    expect(useDialogStore.getState().request?.title).toBe('Take a short rest?');
    await answer(false);
    expect(currentCharacter().spellSlots[0]!.usedShortRest).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Short rest' }));
    await answer(true);
    expect(currentCharacter().spellSlots[0]!.usedShortRest).toBe(0);
    expect(screen.getByText('Short rest complete.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Long rest' }));
    expect(useDialogStore.getState().request?.message).toContain('restored to 30');
    expect(useDialogStore.getState().request?.message).toContain('2 hit dice');
    await answer(true);
    expect(currentCharacter()).toMatchObject({
      hp: { current: 30, temp: 0 },
      hitDiceUsed: 1,
    });
    expect(screen.getByText('Long rest complete.')).toBeInTheDocument();
  });
});
