import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ENCOUNTER_KEY } from './encounterModel';

const confirm = vi.hoisted(() => vi.fn());
vi.mock('@/features/ui/confirmStore', () => ({ confirmDialog: confirm }));

async function renderControls(prepare?: (store: EncounterStore) => void) {
  const { useEncounterStore } = await import('./encounterStore');
  const { EncounterDataControls } = await import('./EncounterDataControls');
  prepare?.(useEncounterStore);
  render(
    <MemoryRouter>
      <EncounterDataControls />
    </MemoryRouter>,
  );
  return useEncounterStore;
}
type EncounterStore = typeof import('./encounterStore').useEncounterStore;
const button = (name: string) => screen.getByRole('button', { name });

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  vi.resetModules();
  confirm.mockReset();
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:encounter'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});

describe('encounter storage recovery', () => {
  it('shows only the saved status while nothing needs attention', async () => {
    await renderControls();
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('keeps a failed save in memory with a download and a retry', async () => {
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    await renderControls((store) => store.getState().edit({ name: 'Ambush' }));
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('could not save');
    fireEvent.click(button('Download encounter backup'));
    expect(screen.getByRole('status')).toHaveTextContent('Backup download started');
    vi.mocked(URL.createObjectURL).mockImplementation(() => {
      throw new Error('denied');
    });
    fireEvent.click(button('Download encounter backup'));
    expect(screen.getAllByRole('alert')).toHaveLength(2);
    write.mockRestore();
    fireEvent.click(button('Retry save'));
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    expect(localStorage.getItem(ENCOUNTER_KEY)).toContain('Ambush');
  });

  it('protects unreadable contents until they are explicitly replaced', async () => {
    localStorage.setItem(ENCOUNTER_KEY, '{broken');
    const useEncounterStore = await renderControls();
    fireEvent.click(button('Download original data'));
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    fireEvent.click(button('Retry reading saved data'));
    expect(useEncounterStore.getState().blocked).toBe(true);
    confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    fireEvent.click(button('Replace stored encounter data'));
    await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
    expect(localStorage.getItem(ENCOUNTER_KEY)).toBe('{broken');
    fireEvent.click(button('Replace stored encounter data'));
    await waitFor(() => expect(useEncounterStore.getState().blocked).toBe(false));
  });
});
