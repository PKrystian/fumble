import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompendiumCategory } from './categories';
import { useHomebrewStore } from '@/features/homebrew/store';
import { useCategoryItems } from './useCategoryItems';

const loadLocalizedItems = vi.fn();

vi.mock('@/data/compendium/overlay', () => ({
  loadLocalizedItems: (...args: unknown[]) => loadLocalizedItems(...args),
}));

vi.mock('@/i18n/path', () => ({
  useLocale: () => 'en',
}));

const category = {
  id: 'feats',
  load: vi.fn(),
} as unknown as CompendiumCategory;

describe('useCategoryItems', () => {
  beforeEach(() => {
    loadLocalizedItems.mockReset();
    useHomebrewStore.setState({ entries: [] });
  });

  it('loads category items and combines sorted homebrew entries', async () => {
    loadLocalizedItems.mockResolvedValue([
      { id: 'official', name: 'Official', source: 'XPHB', srd: true },
    ]);
    const { result } = renderHook(() => useCategoryItems(category));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => {
      useHomebrewStore.getState().addManual({
        category: 'feats',
        name: 'Alpha',
        subtitle: '',
        body: 'Description',
      });
      useHomebrewStore.getState().addManual({
        category: 'items',
        name: 'Ignored',
        subtitle: '',
        body: '',
      });
      useHomebrewStore.getState().addSubclass({
        className: 'Wizard',
        name: 'Ignored subclass',
        source: 'HB',
        body: '',
      });
    });

    expect(result.current.items.map((item) => item.name)).toEqual(['Alpha', 'Official']);
  });

  it('reports load failures', async () => {
    loadLocalizedItems.mockRejectedValue(new Error('failed'));
    const { result } = renderHook(() => useCategoryItems(category));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.items).toEqual([]);
  });

  it('keeps the initial state when no category is selected', () => {
    const { result } = renderHook(() => useCategoryItems(undefined));
    expect(result.current).toEqual({ status: 'loading', items: [] });
    expect(loadLocalizedItems).not.toHaveBeenCalled();
  });

  it('does not update state after unmounting an active load', async () => {
    let resolve: (items: unknown[]) => void = () => undefined;
    loadLocalizedItems.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { unmount } = renderHook(() => useCategoryItems(category));
    unmount();
    await act(async () => resolve([]));
  });

  it('does not report a failure after unmounting an active load', async () => {
    let reject: (error: Error) => void = () => undefined;
    loadLocalizedItems.mockReturnValue(
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
    );
    const { unmount } = renderHook(() => useCategoryItems(category));
    unmount();
    await act(async () => reject(new Error('late failure')));
  });
});
