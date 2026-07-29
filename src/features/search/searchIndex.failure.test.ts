import { describe, expect, it, vi } from 'vitest';

vi.mock('@/data/compendium/overlay', () => ({
  loadLocalizedItems: vi.fn(),
}));

vi.mock('@/features/compendium/categories', () => ({
  categories: [],
  getCategory: vi.fn(),
}));

vi.mock('@/data/generated/wiki.json', () => {
  throw new Error('Wiki unavailable');
});

import { loadSearchIndex } from './searchIndex';

describe('search index failure handling', () => {
  it('keeps compendium search available when wiki data fails', async () => {
    await expect(loadSearchIndex('en')).resolves.toEqual({
      categories: [],
      wiki: [],
    });
  });
});
