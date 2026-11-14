import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LootHistory } from './LootHistory';
import { useLootStore } from './lootStore';
import type { LootResult } from './lootData';

const confirm = vi.hoisted(() => vi.fn());
vi.mock('@/features/ui/confirmStore', () => ({ confirmDialog: confirm }));
const result: LootResult = {
  id: 'one',
  name: 'Dragon',
  createdAt: 1,
  context: {
    mode: 'tier',
    reward: 'hoard',
    tierId: 1,
    partySize: 0,
    partyLevel: 1,
    party: [],
    edition: 'all',
    includeUnknown: false,
  },
  gold: 10,
  gemCount: 0,
  gemValue: 0,
  items: [],
  splitCount: '1',
  splitEnabled: false,
};
beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  useLootStore.getState().reload();
  confirm.mockReset();
});

describe('loot reward history', () => {
  it('selects a previous result without changing the form and confirms named deletion', async () => {
    const store = useLootStore.getState();
    store.updateSettings({ mode: 'wildcard', wildcardTierId: 3 });
    store.addResult(result);
    store.addResult({ ...result, id: 'two', name: '' });
    render(
      <MemoryRouter>
        <LootHistory />
      </MemoryRouter>,
    );
    const settings = structuredClone(store.data.settings);
    fireEvent.click(screen.getByRole('button', { name: 'Open reward: Dragon' }));
    expect(screen.getByRole('button', { name: 'Open reward: Dragon' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(useLootStore.getState().data.settings).toMatchObject({
      ...settings,
      mode: 'wildcard',
      wildcardTierId: 3,
    });
    confirm.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: 'Delete reward: Dragon' }));
    await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
    expect(useLootStore.getState().data.history).toHaveLength(2);
    expect(confirm).toHaveBeenCalledWith(
      'Delete “Dragon” from reward history?',
      expect.objectContaining({ initialFocus: 'cancel', tone: 'danger' }),
    );
    confirm.mockResolvedValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Delete reward: Dragon' }));
    await waitFor(() => expect(useLootStore.getState().data.history).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: 'Delete reward: Hoard' }));
    await screen.findByText('No saved rewards yet.');
  });
});
