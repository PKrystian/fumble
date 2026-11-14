import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useInitiativeStore } from '@/features/initiative/store';
import { EncounterTransfer } from './EncounterTransfer';
import { encounterCreature } from './encounterModel';

const unknown = {
  ...encounterCreature({
    id: 'manual',
    name: 'Manual creature',
    source: 'Homebrew',
    srd: false,
  }),
  count: 2,
  inLair: false,
};
const wight = {
  ...encounterCreature({ id: 'wight', name: 'Wight', source: 'XMM', srd: false }),
  hp: 82,
  initiative: 14,
  ac: 14,
  count: 1,
  inLair: false,
};

beforeEach(() => {
  localStorage.removeItem('fumble-initiative');
  useInitiativeStore.getState().reloadStored();
});

function openTransfer(monsters = [unknown, wight]) {
  const onTransfer = vi.fn();
  render(
    <MemoryRouter>
      <EncounterTransfer monsters={monsters} onClose={vi.fn()} onTransfer={onTransfer} />
    </MemoryRouter>,
  );
  return onTransfer;
}

it('transfers only selected groups and identifies fallback stats', () => {
  const onTransfer = openTransfer();
  expect(screen.getByText(/Some stats are missing/)).toBeVisible();
  fireEvent.click(screen.getByRole('checkbox', { name: /^Wight/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Add combatants (2)' }));
  expect(onTransfer).toHaveBeenCalledWith(2, true);
  expect(useInitiativeStore.getState().combatants).toMatchObject([
    {
      name: 'Manual creature 1',
      initiative: null,
      ac: null,
      hpCurrent: null,
      hpMax: null,
    },
    {
      name: 'Manual creature 2',
      initiative: null,
      ac: null,
      hpCurrent: null,
      hpMax: null,
    },
  ]);
});

it('keeps unreadable Initiative data intact and explains the failure', () => {
  localStorage.setItem('fumble-initiative', '{broken');
  const onTransfer = openTransfer([wight]);
  fireEvent.click(screen.getByRole('button', { name: 'Add combatants (1)' }));
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Initiative data could not be loaded',
  );
  expect(onTransfer).not.toHaveBeenCalled();
  expect(localStorage.getItem('fumble-initiative')).toBe('{broken');
  expect(useInitiativeStore.getState().combatants).toEqual([]);
});

it('requires a nonempty selection within the transfer limit', () => {
  openTransfer([{ ...wight, count: 201 }]);
  expect(screen.getByRole('alert')).toHaveTextContent('Select at most 200 combatants');
  expect(screen.getByRole('button', { name: 'Add combatants (201)' })).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox', { name: /^Wight/ }));
  expect(screen.getByRole('button', { name: 'Add combatants (0)' })).toBeDisabled();
});
