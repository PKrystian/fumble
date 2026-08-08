import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadLocalizedItems = vi.fn();

vi.mock('@/data/compendium/overlay', () => ({
  loadLocalizedItems: (...args: unknown[]) => loadLocalizedItems(...args),
}));

vi.mock('./categories', () => ({
  getCategory: (id: string) =>
    id === 'missing'
      ? undefined
      : {
          id,
          load: vi.fn(),
          subtitle: (item: { source: string }, t: (key: string) => string) =>
            `${item.source} ${t('subtitle')}`,
        },
}));

vi.mock('@/i18n/useT', () => ({
  translate: (locale: string, key: string) => `${locale}:${key}`,
}));

describe('reference hints', () => {
  beforeEach(() => {
    loadLocalizedItems.mockReset();
    loadLocalizedItems.mockImplementation(
      async (categoryId: string, _load: unknown, locale: string) => {
        if (categoryId === 'empty') return [];
        if (locale === 'pl') {
          return [
            {
              id: 'fireball',
              name: 'Kula Ognia',
              englishName: 'Fireball',
              source: 'XPHB',
              srd: true,
              entries: [
                '',
                {
                  type: 'entries',
                  entries: [
                    '  {@spell Fireball|XPHB} zadaje dużo obrażeń w szerokim obszarze.  ',
                  ],
                },
              ],
            },
          ];
        }
        return [
          {
            id: 'fireball',
            name: 'Fireball',
            source: 'XPHB',
            srd: true,
            entries: ['English text.'],
          },
        ];
      },
    );
  });

  it('loads a localized name only for an original English label', async () => {
    const { loadReferenceName } = await import('./referenceHint');
    await expect(
      loadReferenceName('spells-a', 'fireball', 'en', 'Fireball'),
    ).resolves.toBe(null);
    await expect(
      loadReferenceName('spells-b', 'fireball', 'pl', 'Fireball'),
    ).resolves.toBe('Kula Ognia');
    await expect(
      loadReferenceName('spells-c', 'fireball', 'pl', 'Other'),
    ).resolves.toBeNull();
    await expect(
      loadReferenceName('empty', 'fireball', 'pl', 'Fireball'),
    ).resolves.toBeNull();
    loadLocalizedItems.mockResolvedValue([
      {
        id: 'same',
        name: 'Same',
        source: 'HB',
        srd: false,
      },
    ]);
    await expect(loadReferenceName('same', 'same', 'pl', 'Same')).resolves.toBeNull();
  });

  it('builds a translated hint and caches category loads', async () => {
    const { loadReferenceHint } = await import('./referenceHint');
    const hint = await loadReferenceHint('spells-hint', 'fireball', 'pl');
    expect(hint).toEqual({
      name: 'Kula Ognia',
      englishName: 'Fireball',
      subtitle: 'XPHB pl:subtitle',
      description: 'Fireball zadaje dużo obrażeń w szerokim obszarze.',
    });

    await loadReferenceHint('spells-hint', 'fireball', 'pl');
    expect(loadLocalizedItems).toHaveBeenCalledTimes(1);
    await expect(loadReferenceHint('spells-hint', 'unknown', 'pl')).resolves.toBeNull();
  });

  it('loads static and personal homebrew references', async () => {
    const { loadReferenceHint, loadReferenceName } = await import('./referenceHint');
    await expect(
      loadReferenceName('spells', 'cackle', 'pl', 'Cackle', 'Fumble'),
    ).resolves.toBe('Chichot');
    await expect(
      loadReferenceHint('spells', 'cackle', 'pl', 'Fumble'),
    ).resolves.toMatchObject({
      name: 'Chichot',
      englishName: 'Cackle',
      subtitle: 'Sztuczka, uroki',
    });
  });

  it('uses traits and actions and truncates long descriptions', async () => {
    const { loadReferenceHint } = await import('./referenceHint');
    loadLocalizedItems.mockResolvedValueOnce([
      {
        id: 'dragon',
        name: 'Dragon',
        source: 'HB',
        srd: false,
        traits: [{ entries: ['A '.repeat(120)] }],
        actions: [{ entries: ['Unused action.'] }],
      },
    ]);
    const hint = await loadReferenceHint('monsters-hint', 'dragon', 'en');
    expect(hint?.description.length).toBeLessThanOrEqual(181);
    expect(hint?.description).not.toBe('A '.repeat(120).trim());
  });

  it('handles missing categories and entries without descriptions', async () => {
    const { loadReferenceHint, loadReferenceName } = await import('./referenceHint');
    await expect(loadReferenceHint('missing', 'none', 'pl')).resolves.toBeNull();
    await expect(loadReferenceName('missing', 'none', 'pl', 'None')).resolves.toBeNull();
  });

  it('handles nested entry fields and empty optional sections', async () => {
    const { loadReferenceHint } = await import('./referenceHint');
    loadLocalizedItems.mockResolvedValueOnce([
      {
        id: 'nested',
        name: 'Nested',
        source: 'HB',
        srd: false,
        entries: [{}, null, { entry: 'Nested text.' }],
      },
      {
        id: 'empty-sections',
        name: 'Empty Sections',
        source: 'HB',
        srd: false,
        traits: [{}],
      },
    ]);
    await expect(loadReferenceHint('nested-hint', 'nested', 'en')).resolves.toMatchObject(
      {
        description: 'Nested text.',
      },
    );

    loadLocalizedItems.mockResolvedValueOnce([
      {
        id: 'empty-sections',
        name: 'Empty Sections',
        source: 'HB',
        srd: false,
        traits: [{}],
      },
    ]);
    await expect(
      loadReferenceHint('empty-sections-hint', 'empty-sections', 'en'),
    ).resolves.toMatchObject({ description: '' });

    loadLocalizedItems.mockResolvedValueOnce([
      {
        id: 'bare',
        name: 'Bare',
        source: 'HB',
        srd: false,
      },
    ]);
    await expect(loadReferenceHint('bare-hint', 'bare', 'en')).resolves.toMatchObject({
      description: '',
    });
  });
});
