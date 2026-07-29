import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCategoryOverlay, loadLocalizedItems } from './overlay';

describe('compendium overlays', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('loads and caches an available locale overlay', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ test: { name: 'Test' } })));
    const first = loadCategoryOverlay('actions', 'pl');
    const second = loadCategoryOverlay('actions', 'pl');
    await expect(first).resolves.toEqual({ test: { name: 'Test' } });
    await expect(second).resolves.toEqual({ test: { name: 'Test' } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects an unsuccessful overlay response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));
    await expect(loadCategoryOverlay('backgrounds', 'pl')).rejects.toThrow(
      'Failed to load overlay: pl/backgrounds',
    );
  });

  it('returns undefined for an unavailable overlay', async () => {
    await expect(loadCategoryOverlay('missing', 'xx')).resolves.toBeUndefined();
  });

  it('loads items and applies a matching translation', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ original: { name: 'Translated' } })),
    );
    const result = await loadLocalizedItems(
      'conditions',
      async () => [{ id: 'original', name: 'Original', source: 'XPHB', srd: true }],
      'pl',
    );
    expect(result[0]!.name).toBe('Translated');
  });
});
