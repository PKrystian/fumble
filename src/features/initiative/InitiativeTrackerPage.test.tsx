import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { createCharacter } from '@/features/character/model';
import { useCharacterStore } from '@/features/character/store';
import { ConfirmDialog } from '@/features/ui/ConfirmDialog';
import { INITIATIVE_KEY, emptyInitiative, serializeInitiative } from './model';
import { InitiativeTrackerPage } from './InitiativeTrackerPage';
import { useInitiativeStore } from './store';

beforeEach(() => {
  localStorage.removeItem(INITIATIVE_KEY);
  useInitiativeStore.getState().reloadStored();
  useCharacterStore.setState({ characters: {}, order: [] });
});

const button = (name: string) => screen.getByRole('button', { name });

function openPage() {
  render(
    <MemoryRouter>
      <InitiativeTrackerPage />
      <ConfirmDialog />
    </MemoryRouter>,
  );
}

it('validates the manual form and saves a negative score with an unknown current HP and a real zero maximum', async () => {
  openPage();
  const user = userEvent.setup();
  expect(button('Start combat')).toBeDisabled();
  expect(button('Previous turn')).toBeDisabled();
  await user.click(button('Add'));
  const name = screen.getByRole('textbox', { name: 'Name' });
  expect(name).toHaveFocus();
  expect(name).toHaveAccessibleDescription('Enter a participant name.');
  await user.type(name, '  Goblin  ');
  const hp = screen.getByRole('textbox', { name: 'Current HP' });
  await user.type(hp, '-3.5{Enter}');
  expect(hp).toHaveFocus();
  expect(hp).toHaveAttribute('aria-invalid', 'true');
  await user.clear(hp);
  await user.type(screen.getByRole('textbox', { name: 'Initiative' }), '-2');
  await user.type(screen.getByRole('textbox', { name: 'Maximum HP' }), '0{Enter}');
  expect(name).toHaveFocus();
  expect(screen.getByRole('heading', { name: 'Goblin' })).toBeVisible();
  expect(useInitiativeStore.getState().combatants).toMatchObject([
    { name: 'Goblin', initiative: -2, hpCurrent: null, hpMax: 0, ac: null },
  ]);
});

it('supports edit cancellation and saves detailed edits and validated quick HP', async () => {
  useInitiativeStore.getState().addCombatant({
    name: 'Goblin',
    initiative: 12,
    hpCurrent: 7,
    hpMax: 9,
    ac: 13,
    conditions: 'Prone',
    isPlayer: false,
  });
  openPage();
  const user = userEvent.setup();
  await user.click(button('Edit Goblin'));
  let dialog = screen.getByRole('dialog', { name: 'Edit Goblin' });
  await user.clear(within(dialog).getByLabelText('Name'));
  await user.keyboard('{Escape}');
  expect(button('Edit Goblin')).toHaveFocus();
  await user.click(button('Edit Goblin'));
  dialog = screen.getByRole('dialog', { name: 'Edit Goblin' });
  fireEvent.change(within(dialog).getByLabelText('Name'), {
    target: { value: 'Goblin chief' },
  });
  fireEvent.change(within(dialog).getByLabelText('AC'), { target: { value: '19' } });
  fireEvent.change(within(dialog).getByLabelText('Conditions'), {
    target: { value: 'Restrained' },
  });
  await user.click(within(dialog).getByRole('button', { name: 'Save' }));
  const hp = screen.getByRole('textbox', { name: 'HP for Goblin chief' });
  await user.clear(hp);
  await user.type(hp, '1.5{Enter}');
  expect(hp).toHaveAttribute('aria-invalid', 'true');
  await user.keyboard('{Escape}');
  expect(hp).toHaveValue('7');
  await user.clear(hp);
  await user.type(hp, '0{Enter}');
  expect(useInitiativeStore.getState().combatants).toMatchObject([
    { name: 'Goblin chief', ac: 19, conditions: 'Restrained', hpCurrent: 0 },
  ]);
});

it('finds a named row without altering turns and undoes a confirmed removal', async () => {
  const rows = [
    {
      id: 'a',
      name: 'Mira',
      initiative: 18,
      hpCurrent: 7,
      hpMax: 9,
      ac: 13,
      conditions: '',
      isPlayer: true,
    },
    {
      id: 'b',
      name: 'Żółw',
      initiative: 10,
      hpCurrent: null,
      hpMax: null,
      ac: null,
      conditions: '',
      isPlayer: false,
    },
  ];
  useInitiativeStore.getState().restore({ combatants: rows, round: 3, turnId: 'a' });
  openPage();
  const user = userEvent.setup();
  await user.click(button('Find participant'));
  const search = screen.getByRole('searchbox', { name: 'Search participants' });
  expect(search).toHaveFocus();
  await user.type(search, 'missing');
  expect(screen.getByText('No matching results.')).toBeVisible();
  await user.click(button('Clear search'));
  await user.type(search, ' zolw ');
  await user.click(button('2. Żółw'));
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: 'Żółw' })).toHaveFocus(),
  );
  expect(useInitiativeStore.getState().turnId).toBe('a');
  await user.click(button('Remove Mira'));
  const confirm = screen.getByRole('alertdialog');
  expect(within(confirm).getByRole('button', { name: 'Cancel' })).toHaveFocus();
  await user.keyboard('{Escape}');
  expect(button('Remove Mira')).toHaveFocus();
  await user.click(button('Remove Mira'));
  await user.click(
    within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
  );
  expect(useInitiativeStore.getState()).toMatchObject({ round: 3, turnId: 'b' });
  await user.click(button('Undo removal'));
  expect(useInitiativeStore.getState()).toMatchObject({
    round: 3,
    turnId: 'a',
    combatants: rows,
  });
});

it('searches and filters characters, previews effective AC and role, and rolls with the character bonus', async () => {
  const user = userEvent.setup();
  const dm = {
    ...createCharacter('Żmija'),
    role: 'dm' as const,
    acOverride: 19,
    initiativeOverride: 6,
    conditions: 'Prone',
  };
  const party = createCharacter('Żółw');
  const unnamed = createCharacter('');
  useCharacterStore.setState({
    characters: { [dm.id]: dm, [party.id]: party, [unnamed.id]: unnamed },
    order: [dm.id, party.id, unnamed.id],
  });
  openPage();
  await user.click(button('Add from roster'));
  const dialog = screen.getByRole('dialog');
  const search = within(dialog).getByRole('searchbox');
  expect(search).toHaveFocus();
  await user.type(search, 'zmija');
  await user.selectOptions(within(dialog).getByLabelText('Role'), 'party');
  expect(screen.getByText('No matching results.')).toBeVisible();
  await user.selectOptions(within(dialog).getByLabelText('Role'), 'dm');
  await user.click(within(dialog).getByRole('button', { name: /Żmija/ }));
  expect(within(dialog).getByLabelText('AC')).toHaveValue('19');
  expect(within(dialog).getByText('Roll modifier: +6')).toBeVisible();
  await user.click(within(dialog).getByRole('button', { name: 'Roll initiative' }));
  const score = Number(
    (within(dialog).getByLabelText('Initiative') as HTMLInputElement).value,
  );
  expect(score).toBeGreaterThanOrEqual(7);
  expect(score).toBeLessThanOrEqual(26);
  await user.click(within(dialog).getByRole('button', { name: 'Add' }));
  expect(button('Add from roster')).toHaveFocus();
  expect(useInitiativeStore.getState().combatants).toMatchObject([
    { name: 'Żmija', ac: 19, isPlayer: false, conditions: 'Prone', initiative: score },
  ]);
});

it('blocks writes after a storage change and offers a recovery route for an empty roster', async () => {
  openPage();
  await userEvent.click(button('Add from roster'));
  expect(screen.getByRole('link', { name: 'Characters' })).toHaveAttribute(
    'href',
    '/character/',
  );
  await userEvent.keyboard('{Escape}');
  localStorage.setItem(
    INITIATIVE_KEY,
    serializeInitiative({ combatants: [], round: 0, turnId: null }),
  );
  fireEvent(window, new StorageEvent('storage', { key: INITIATIVE_KEY }));
  expect(screen.getByRole('alert')).toHaveTextContent('Another tab changed');
  expect(button('Add from roster')).toBeDisabled();
  await userEvent.click(button('Load saved initiative'));
  expect(button('Add from roster')).toBeEnabled();
});

it('keeps a pending failed write visible and retries with the current data', async () => {
  openPage();
  const user = userEvent.setup();
  await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Orc');
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
    throw new Error();
  });
  try {
    await user.click(button('Add'));
    expect(screen.getByRole('alert')).toHaveTextContent('could not be saved');
    expect(screen.getByRole('heading', { name: 'Orc' })).toBeVisible();
    expect(localStorage.getItem(INITIATIVE_KEY)).toBeNull();
    await user.click(button('Retry save'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(localStorage.getItem(INITIATIVE_KEY)).toContain('Orc');
  } finally {
    write.mockRestore();
  }
});

it('keeps backups on the Data backup page and shows recovery only when needed', async () => {
  const user = userEvent.setup();
  openPage();
  expect(screen.queryByText('Initiative data recovery')).not.toBeInTheDocument();
  await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Orc');
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
    throw new Error();
  });
  const createObjectURL = vi.fn(() => 'blob:initiative');
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => undefined);
  try {
    await user.click(button('Add'));
    expect(screen.getByText('Initiative data recovery')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Data Backup' })).toHaveAttribute(
      'href',
      '/data/',
    );
    await user.click(button('Download initiative backup'));
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(screen.getByText(/Backup download started/)).toBeVisible();
    createObjectURL.mockImplementationOnce(() => {
      throw new Error('denied');
    });
    await user.click(button('Download initiative backup'));
    expect(screen.getAllByRole('alert').at(-1)).toHaveTextContent('could not');
  } finally {
    write.mockRestore();
    click.mockRestore();
  }
});

it('opens recovery from the sticky alert and replaces an unreadable original only after confirmation', async () => {
  const user = userEvent.setup();
  localStorage.setItem(INITIATIVE_KEY, '{broken');
  openPage();
  expect(screen.getByRole('alert')).toHaveTextContent('cannot be read');
  await user.click(button('Recovery options'));
  expect(screen.getByText('Initiative data recovery')).toHaveFocus();
  const createObjectURL = vi.fn(() => 'blob:initiative');
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => undefined);
  await user.click(button('Download original initiative data'));
  expect(createObjectURL).toHaveBeenCalledOnce();
  click.mockRestore();
  await user.click(button('Replace saved initiative'));
  const first = screen.getByRole('alertdialog');
  expect(within(first).getByRole('button', { name: 'Cancel' })).toHaveFocus();
  await user.keyboard('{Escape}');
  expect(localStorage.getItem(INITIATIVE_KEY)).toBe('{broken');
  await user.click(button('Replace saved initiative'));
  await user.click(
    within(screen.getByRole('alertdialog')).getByRole('button', {
      name: 'Replace saved initiative',
    }),
  );
  expect(localStorage.getItem(INITIATIVE_KEY)).toBe(
    serializeInitiative(emptyInitiative()),
  );
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
