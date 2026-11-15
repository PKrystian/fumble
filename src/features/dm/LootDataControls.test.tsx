import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LootDataControls } from './LootDataControls';
import { LOOT_KEY, type LootResult } from './lootData';
import { useLootStore } from './lootStore';

const confirm = vi.hoisted(() => vi.fn());
vi.mock('@/features/ui/confirmStore', () => ({ confirmDialog: confirm }));
const feedback = vi.fn();
const result: LootResult = {
  id: 'reward',
  name: 'Reward',
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
function renderControls() {
  return render(
    <MemoryRouter>
      <LootDataControls feedback={feedback} />
    </MemoryRouter>,
  );
}
const button = (name: string) => screen.getByRole('button', { name });
beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  useLootStore.getState().reload();
  feedback.mockReset();
  confirm.mockReset();
  confirm.mockResolvedValue(true);
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:loot'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});

describe('loot storage recovery', () => {
  it('shows only the saved status while nothing needs attention', () => {
    renderControls();
    expect(screen.getByRole('status')).toHaveTextContent('saved locally');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Data Backup' })).not.toBeInTheDocument();
  });

  it('downloads current memory, retries failed writes and reports download errors', () => {
    useLootStore.getState().addResult(result);
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    useLootStore.getState().updateResult(result.id, { name: 'Unsaved reward' });
    renderControls();
    expect(screen.getByRole('alert')).toHaveTextContent('Changes are in memory');
    expect(screen.getByRole('link', { name: 'Data Backup' })).toHaveAttribute(
      'href',
      '/data/',
    );
    fireEvent.click(button('Download loot backup'));
    expect(feedback).toHaveBeenLastCalledWith('Loot backup download started.');
    vi.mocked(URL.createObjectURL).mockImplementation(() => {
      throw new Error('denied');
    });
    fireEvent.click(button('Download loot backup'));
    expect(feedback).toHaveBeenLastCalledWith(
      expect.stringContaining('download failed'),
      true,
    );
    write.mockRestore();
    fireEvent.click(button('Retry saving'));
    expect(screen.getByRole('status')).toHaveTextContent('saved locally');
  });

  it('protects unreadable contents, downloads originals and requires explicit replacement', async () => {
    localStorage.setItem(LOOT_KEY, '{broken');
    useLootStore.getState().reload();
    renderControls();
    expect(screen.getByRole('alert')).toHaveTextContent('Automatic writes are blocked');
    fireEvent.click(button('Download original stored contents'));
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    confirm.mockResolvedValueOnce(false);
    fireEvent.click(button('Replace unreadable loot data'));
    await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
    expect(localStorage.getItem(LOOT_KEY)).toBe('{broken');
    expect(confirm).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ initialFocus: 'cancel', tone: 'danger' }),
    );
    fireEvent.click(button('Retry reading stored data'));
    expect(useLootStore.getState().blocked).toBe(true);
    act(() => useLootStore.setState({ raw: null }));
    expect(button('Download original stored contents')).toBeDisabled();
    fireEvent.click(button('Replace unreadable loot data'));
    await waitFor(() => expect(useLootStore.getState().blocked).toBe(false));
  });
});
