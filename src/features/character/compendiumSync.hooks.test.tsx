import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClassEntry, SpellEntry } from '@/data/compendium/types';
import {
  useBackgroundEntryPair,
  useClassEntry,
  useClassEntryPair,
  useSpeciesEntryPair,
  useSpellIndex,
} from './compendiumSync';

const mocks = vi.hoisted(() => ({
  locale: 'pl',
  load: vi.fn(),
  loadLocalizedItems: vi.fn(),
  getCategory: vi.fn(),
}));

vi.mock('@/i18n/pathUtils', () => ({
  useLocale: () => mocks.locale,
}));

vi.mock('@/data/compendium/overlay', () => ({
  loadLocalizedItems: (...args: unknown[]) => mocks.loadLocalizedItems(...args),
}));

vi.mock('@/features/compendium/categories', () => ({
  getCategory: (...args: unknown[]) => mocks.getCategory(...args),
}));

const englishClass = {
  id: 'wizard',
  name: 'Wizard',
  subclasses: [],
} as unknown as ClassEntry;

const localizedClass = {
  id: 'wizard',
  name: 'Czarodziej',
  subclasses: [],
} as unknown as ClassEntry;

describe('compendium entry hooks', () => {
  beforeEach(() => {
    mocks.locale = 'pl';
    mocks.load.mockReset();
    mocks.loadLocalizedItems.mockReset();
    mocks.getCategory.mockReset();
    mocks.getCategory.mockReturnValue({ load: mocks.load });
    mocks.load.mockResolvedValue([englishClass]);
    mocks.loadLocalizedItems.mockImplementation(
      async (categoryId: string, _load: unknown, locale: string) => {
        if (categoryId === 'spells') return [];
        return locale === 'pl' ? [localizedClass] : [englishClass];
      },
    );
  });

  it('resolves localized entries by id and pairs them with English entries', async () => {
    const { result } = renderHook(() => useClassEntryPair('wizard'));

    await waitFor(() => expect(result.current.localized).toBe(localizedClass));
    expect(result.current.english).toBe(englishClass);
    expect(mocks.loadLocalizedItems).toHaveBeenCalledWith('classes', mocks.load, 'pl');
    expect(mocks.loadLocalizedItems).toHaveBeenCalledWith('classes', mocks.load, 'en');
  });

  it('supports localized and legacy English names', async () => {
    const localized = renderHook(() => useClassEntry(' Czarodziej '));
    await waitFor(() => expect(localized.result.current).toBe(localizedClass));
    localized.unmount();

    const legacy = renderHook(() => useClassEntryPair('Wizard'));
    await waitFor(() => expect(legacy.result.current.localized).toBe(localizedClass));
    legacy.unmount();

    const blank = renderHook(() => useClassEntryPair(' '));
    await waitFor(() =>
      expect(mocks.loadLocalizedItems).toHaveBeenCalledWith('classes', mocks.load, 'pl'),
    );
    expect(blank.result.current).toEqual({
      localized: undefined,
      english: undefined,
    });
  });

  it('prefers a visible duplicate and falls back to an English-only entry', async () => {
    const hidden = { id: 'hidden', name: 'Mage', hidden: true };
    const visible = { id: 'visible', name: 'Mage' };
    const englishOnly = { id: 'legacy', name: 'Legacy' };
    mocks.loadLocalizedItems.mockImplementation(
      async (_categoryId: string, _load: unknown, locale: string) =>
        locale === 'pl' ? [hidden, visible] : [englishOnly],
    );

    const visibleResult = renderHook(() => useClassEntryPair('Mage'));
    await waitFor(() => expect(visibleResult.result.current.localized).toBe(visible));
    visibleResult.unmount();

    const fallback = renderHook(() => useClassEntryPair('Legacy'));
    await waitFor(() => expect(fallback.result.current.localized).toEqual(englishOnly));
    expect(fallback.result.current.english).toEqual(englishOnly);
  });

  it('uses the category loader directly for English and covers all entry wrappers', async () => {
    mocks.locale = 'en';
    mocks.loadLocalizedItems.mockResolvedValue([englishClass]);

    const classResult = renderHook(() => useClassEntryPair('wizard'));
    const speciesResult = renderHook(() => useSpeciesEntryPair('wizard'));
    const backgroundResult = renderHook(() => useBackgroundEntryPair('wizard'));

    await waitFor(() => expect(classResult.result.current.localized).toBe(englishClass));
    await waitFor(() =>
      expect(speciesResult.result.current.localized).toBe(englishClass),
    );
    await waitFor(() =>
      expect(backgroundResult.result.current.localized).toBe(englishClass),
    );
    expect(mocks.load).toHaveBeenCalledTimes(3);
  });

  it('keeps an empty result when the category does not exist', () => {
    mocks.getCategory.mockReturnValue(undefined);
    const { result } = renderHook(() => useClassEntryPair('wizard'));
    expect(result.current).toEqual({
      localized: undefined,
      english: undefined,
    });
    expect(mocks.loadLocalizedItems).not.toHaveBeenCalled();
  });

  it('does not update an entry after unmounting', async () => {
    let resolve: (items: unknown[]) => void = () => undefined;
    mocks.loadLocalizedItems.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { unmount } = renderHook(() => useClassEntryPair('wizard'));
    unmount();
    await act(async () => resolve([localizedClass]));
  });
});

describe('useSpellIndex', () => {
  beforeEach(() => {
    mocks.locale = 'pl';
    mocks.loadLocalizedItems.mockReset();
    mocks.getCategory.mockReset();
    mocks.getCategory.mockReturnValue({ load: mocks.load });
  });

  it('indexes localized spells by id', async () => {
    const spell = { id: 'magic-missile', name: 'Magiczny Pocisk' } as SpellEntry;
    mocks.loadLocalizedItems.mockResolvedValue([spell]);
    const { result } = renderHook(() => useSpellIndex());

    await waitFor(() => expect(result.current.get('magic-missile')).toBe(spell));
  });

  it('keeps an empty index without a spell category', () => {
    mocks.getCategory.mockReturnValue(undefined);
    const { result } = renderHook(() => useSpellIndex());
    expect(result.current.size).toBe(0);
  });

  it('does not update the index after unmounting', async () => {
    let resolve: (items: SpellEntry[]) => void = () => undefined;
    mocks.loadLocalizedItems.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { unmount } = renderHook(() => useSpellIndex());
    unmount();
    await act(async () => resolve([]));
  });
});
