import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompendiumEntryBase } from '@/data/compendium/types';
import {
  bodyToEntries,
  createHomebrewStore,
  HOMEBREW_KEY,
  homebrewSubclassesFor,
  homebrewToItem,
  isHomebrew,
  parseStoredHomebrew,
  serializeHomebrew,
  useHomebrewStore,
  withHomebrewWrite,
} from './store';
import type { HomebrewEntry } from './store';

describe('homebrew store', () => {
  beforeEach(() => useHomebrewStore.setState({ entries: [] }));

  it('uses a translated imported entry for the selected locale', () => {
    useHomebrewStore.getState().addImported(
      [
        {
          category: 'spells',
          data: {
            id: 'rift-blade',
            name: 'Rift Blade',
            source: 'HB',
            srd: false,
            entries: ['An English description.'],
          } as CompendiumEntryBase & Record<string, unknown>,
        },
      ],
      'en',
    );
    const entry = useHomebrewStore.getState().entries[0]!;
    if (entry.kind !== 'imported') throw new Error('Expected an imported entry');

    useHomebrewStore.getState().updateImported(entry.id, {
      translations: {
        pl: {
          ...entry.data,
          name: 'Ostrze Rozłamu',
          entries: ['Polski opis.'],
        },
      },
    });

    const updated = useHomebrewStore.getState().entries[0]!;
    if (updated.kind !== 'imported') throw new Error('Expected an imported entry');

    expect(homebrewToItem(updated, 'pl')).toMatchObject({
      name: 'Ostrze Rozłamu',
      entries: ['Polski opis.'],
    });
    expect(homebrewToItem(updated, 'en')).toMatchObject({
      name: 'Rift Blade',
      entries: ['An English description.'],
    });
  });

  it('adds the source language to imported entries', () => {
    useHomebrewStore.getState().addImported(
      [
        {
          category: 'items',
          data: {
            id: 'amulet',
            name: 'Amulet',
            source: 'HB',
            srd: false,
          },
        },
      ],
      'pl',
    );

    expect(useHomebrewStore.getState().entries[0]).toMatchObject({
      kind: 'imported',
      baseLocale: 'pl',
    });
  });

  it('links imported spells to homebrew classes from the same source', () => {
    useHomebrewStore.getState().addImported(
      [
        {
          category: 'classes',
          data: {
            id: 'witch',
            name: 'Witch',
            source: 'WITCH',
            srd: false,
          },
        },
        {
          category: 'classes',
          data: {
            id: 'warden',
            name: 'Warden',
            source: 'WARDEN',
            srd: false,
          },
        },
        {
          category: 'spells',
          data: {
            id: 'animate-hut',
            name: 'Animate Hut',
            source: 'WITCH',
            srd: false,
            classes: ['Wizard'],
          } as CompendiumEntryBase & Record<string, unknown>,
        },
      ],
      'en',
    );

    const entries = useHomebrewStore.getState().entries;
    const spell = entries.find(
      (entry) => entry.kind === 'imported' && entry.category === 'spells',
    );
    if (!spell || spell.kind !== 'imported') {
      throw new Error('Expected an imported spell');
    }

    expect(homebrewToItem(spell, 'en', entries).classes).toEqual(['Wizard', 'Witch']);
  });

  it('creates, updates and deletes manual entries', () => {
    const id = useHomebrewStore.getState().addManual({
      category: 'items',
      name: 'Moon Blade',
      subtitle: 'Rare weapon',
      body: 'First paragraph.\n\nSecond paragraph.',
      image: 'data:image/webp;base64,test',
      translations: {
        pl: {
          name: 'Księżycowe Ostrze',
          subtitle: 'Rzadka broń',
          body: 'Opis.',
        },
      },
    });
    useHomebrewStore.getState().updateManual(id, {
      name: 'Moon Blade Revised',
      body: 'Updated.',
    });
    const entry = useHomebrewStore.getState().entries[0]!;
    expect(entry).toMatchObject({
      kind: 'manual',
      name: 'Moon Blade Revised',
      body: 'Updated.',
    });
    if (entry.kind !== 'manual') throw new Error('Expected a manual entry');
    expect(homebrewToItem(entry, 'pl')).toMatchObject({
      name: 'Księżycowe Ostrze',
      subtitle: 'Rzadka broń',
      entries: ['Opis.'],
    });
    useHomebrewStore.getState().deleteEntry(id);
    expect(useHomebrewStore.getState().entries).toEqual([]);
  });

  it('adds manual and imported subclasses', () => {
    const id = useHomebrewStore.getState().addSubclass({
      className: 'Paladin',
      name: 'Oath of Stars',
      source: '',
      body: 'First feature.\n\nSecond feature.',
    });
    expect(useHomebrewStore.getState().entries[0]).toMatchObject({
      id,
      kind: 'subclass',
      className: 'Paladin',
      subclass: {
        name: 'Oath of Stars',
        source: 'Homebrew',
        features: [{ level: 3, entries: ['First feature.', 'Second feature.'] }],
      },
    });
    expect(
      useHomebrewStore.getState().addImportedSubclasses([
        {
          className: 'Wizard',
          subclass: {
            name: 'Chronomancer',
            source: 'TIME',
            features: [],
          },
        },
        {
          className: '',
          subclass: { name: '', source: 'HB', features: [] },
        },
      ]),
    ).toBe(1);
    expect(useHomebrewStore.getState().entries).toHaveLength(2);
  });

  it('imports valid exports, assigns fresh ids and clears all entries', () => {
    const count = useHomebrewStore.getState().importOwn([
      {
        kind: 'manual',
        id: 'old-id',
        category: 'feats',
        name: 'Imported Feat',
        subtitle: '',
        body: '',
        createdAt: 1,
      },
      {
        kind: 'imported',
        id: 'old-import',
        category: 'items',
        name: 'Imported Item',
        data: {
          id: 'imported-item',
          name: 'Imported Item',
          source: 'HB',
          srd: false,
        },
        createdAt: 1,
      },
      {
        kind: 'subclass',
        id: 'old-subclass',
        className: 'Fighter',
        subclass: { name: 'Guardian', source: 'HB', features: [] },
        createdAt: 1,
      },
    ] as unknown as HomebrewEntry[]);
    expect(count).toBe(3);
    expect(useHomebrewStore.getState().entries).toHaveLength(3);
    expect(useHomebrewStore.getState().entries[1]).toMatchObject({
      kind: 'imported',
      baseLocale: 'en',
    });
    useHomebrewStore.getState().clearAll();
    expect(useHomebrewStore.getState().entries).toEqual([]);
  });

  it('rejects malformed imported entries and marks UA sources', () => {
    expect(
      useHomebrewStore.getState().addImported(
        [
          {
            category: 'items',
            data: {
              id: 'ua-item',
              name: 'UA Item',
              source: 'UA2025',
              srd: false,
            },
          },
          {
            category: 'items',
            data: { id: 'invalid', source: 'HB', srd: false } as CompendiumEntryBase,
          },
        ],
        'en',
      ),
    ).toBe(1);
    expect(useHomebrewStore.getState().entries[0]).toMatchObject({ ua: true });
    const ua = useHomebrewStore.getState().entries[0]!;
    if (ua.kind !== 'imported') throw new Error('Expected an imported entry');
    expect(homebrewToItem(ua, 'en')).toMatchObject({ ua: true });
  });

  it('handles manual fallbacks, blank paragraphs and homebrew guards', () => {
    const id = useHomebrewStore.getState().addManual({
      category: 'feats',
      name: '',
      subtitle: 'Base subtitle',
      body: 'First\n\n \n\nSecond',
      translations: {
        pl: { name: '', subtitle: '', body: '' },
      },
    });
    const entry = useHomebrewStore.getState().entries[0]!;
    if (entry.kind !== 'manual') throw new Error('Expected a manual entry');
    const item = homebrewToItem(entry, 'pl');
    expect(id).toContain('hb-entry-');
    expect(item).toMatchObject({
      name: '',
      subtitle: 'Base subtitle',
      entries: ['First', 'Second'],
    });
    expect(item).not.toHaveProperty('englishName');
    expect(item).not.toHaveProperty('image');
    expect(homebrewToItem(entry)).toMatchObject({ name: '', subtitle: 'Base subtitle' });
    expect(bodyToEntries('')).toEqual([]);
    expect(isHomebrew(item)).toBe(true);
    expect(
      isHomebrew({ id: 'official', name: 'Official', source: 'XPHB', srd: true }),
    ).toBe(false);
  });

  it('uses the safe detail fallback for malformed legacy imported data', () => {
    useHomebrewStore.getState().addImported(
      [
        {
          category: 'items',
          data: {
            id: 'plain',
            name: 'Plain Item',
            source: 'HB',
            srd: false,
            entries: 'not an array',
          } as unknown as CompendiumEntryBase & Record<string, unknown>,
        },
      ],
      'en',
    );
    const entry = useHomebrewStore.getState().entries[0]!;
    if (entry.kind !== 'imported') throw new Error('Expected an imported entry');
    expect(homebrewToItem(entry, 'en')).toMatchObject({
      name: 'Plain Item',
      entries: [],
      _manual: true,
    });
  });

  it('preserves spell availability without a source and infers subclasses', () => {
    useHomebrewStore.getState().addImported(
      [
        {
          category: 'classes',
          data: {
            id: 'moon-witch',
            name: 'Moon Witch',
            source: 'MOON',
            srd: false,
          },
        },
        {
          category: 'spells',
          data: {
            id: 'source-less',
            name: 'Source-less',
            source: '',
            srd: false,
            classes: ['Wizard', 'Wizard', ''],
            subclasses: ['Wizard: Evoker'],
          } as CompendiumEntryBase & Record<string, unknown>,
        },
        {
          category: 'spells',
          data: {
            id: 'source-less-arrays',
            name: 'Source-less Arrays',
            source: null,
            srd: false,
          } as unknown as CompendiumEntryBase & Record<string, unknown>,
        },
      ],
      'en',
    );
    const [withoutArrays, withArrays] = useHomebrewStore
      .getState()
      .entries.filter(
        (entry): entry is Extract<HomebrewEntry, { kind: 'imported' }> =>
          entry.kind === 'imported' && entry.category === 'spells',
      );
    expect(homebrewToItem(withArrays!, 'en')).toMatchObject({
      classes: [],
      subclasses: [],
    });
    expect(homebrewToItem(withoutArrays!, 'en')).toMatchObject({
      classes: ['Wizard'],
      subclasses: ['Wizard: Evoker'],
    });

    const subclassId = useHomebrewStore.getState().addSubclass({
      className: 'Wizard',
      name: 'Moon Mage',
      source: 'MOON',
      body: '',
    });
    useHomebrewStore.getState().addImported(
      [
        {
          category: 'spells',
          data: {
            id: 'moon-ray',
            name: 'Moon Ray',
            source: 'MOON',
            srd: false,
            subclasses: ['Wizard: Illusionist'],
          } as CompendiumEntryBase & Record<string, unknown>,
        },
      ],
      'en',
    );
    const spell = useHomebrewStore
      .getState()
      .entries.find((entry) => entry.kind === 'imported' && entry.name === 'Moon Ray')!;
    if (spell.kind !== 'imported') throw new Error('Expected an imported spell');
    const classEntry = useHomebrewStore
      .getState()
      .entries.find((entry) => entry.kind === 'imported' && entry.name === 'Moon Witch')!;
    if (classEntry.kind !== 'imported') throw new Error('Expected an imported class');
    useHomebrewStore.getState().updateImported(classEntry.id, {
      translations: {
        pl: { ...classEntry.data, name: 'Wiedźma Księżyca' },
      },
    });
    expect(
      homebrewToItem(spell, 'pl', useHomebrewStore.getState().entries),
    ).toMatchObject({
      classes: ['Wiedźma Księżyca'],
      subclasses: ['Wizard: Illusionist', 'Wizard: Moon Mage'],
    });
    useHomebrewStore.getState().updateImported(classEntry.id, {
      translations: {
        pl: { ...classEntry.data, name: '' },
      },
    });
    expect(
      homebrewToItem(spell, 'pl', useHomebrewStore.getState().entries).classes,
    ).toEqual(['Moon Witch']);
    expect(subclassId).toBeTruthy();
  });

  it('leaves mismatched updates unchanged and migrates legacy state', () => {
    const manualId = useHomebrewStore.getState().addManual({
      category: 'items',
      name: 'Manual',
      subtitle: '',
      body: '',
    });
    const manual = useHomebrewStore.getState().entries[0]!;
    useHomebrewStore.getState().updateImported(manualId, { name: 'Ignored' });
    useHomebrewStore.getState().updateManual('missing', { name: 'Ignored' });
    expect(useHomebrewStore.getState().entries[0]).toBe(manual);

    expect(parseStoredHomebrew(null)).toEqual([]);
    const migrated = parseStoredHomebrew(
      JSON.stringify({
        version: 2,
        state: {
          entries: [
            {
              kind: 'imported',
              id: 'legacy',
              category: 'items',
              name: 'Legacy',
              data: { id: 'legacy', name: 'Legacy', source: 'HB', srd: false },
              createdAt: 1,
            },
            manual,
          ],
        },
      }),
    );
    expect(migrated?.[0]).toMatchObject({ baseLocale: 'en' });
    expect(migrated?.[1]).toEqual(manual);
  });

  it('rejects malformed manual, imported and subclass exports', () => {
    const manual = {
      kind: 'manual',
      id: 'manual',
      category: 'items',
      name: 'Manual',
      subtitle: '',
      body: '',
      createdAt: 0,
    };
    const imported = {
      kind: 'imported',
      id: 'imported',
      category: 'items',
      name: 'Imported',
      baseLocale: 'en',
      data: { id: 'data', name: 'Data', source: 'HB' },
      createdAt: 0,
    };
    const subclass = {
      kind: 'subclass',
      id: 'subclass',
      className: 'Wizard',
      subclass: { name: 'Subclass', source: 'HB', features: [] },
      createdAt: 0,
    };
    const circular: Record<string, unknown> = { ...manual };
    circular.extra = circular;
    const invalid = [
      null,
      {},
      { ...manual, id: '' },
      { ...manual, category: 'unknown' },
      { ...manual, name: ' ' },
      { ...manual, subtitle: 1 },
      { ...manual, body: 1 },
      { ...manual, createdAt: 'now' },
      { ...manual, image: 1 },
      { ...manual, translations: [] },
      { ...manual, translations: { xx: {} } },
      { ...manual, translations: { pl: { name: 1, subtitle: '', body: '' } } },
      circular,
      {
        ...manual,
        body: 'a'.repeat(250_000),
        translations: {
          en: { name: 'a', subtitle: '', body: 'a'.repeat(250_000) },
          pl: { name: 'a', subtitle: '', body: 'a'.repeat(250_000) },
        },
      },
      { ...imported, id: '' },
      { ...imported, category: 'unknown' },
      { ...imported, name: '' },
      { ...imported, baseLocale: 'xx' },
      { ...imported, createdAt: 'now' },
      { ...imported, data: { id: '', name: 'Data' } },
      { ...imported, ua: 'yes' },
      { ...imported, translations: { xx: imported.data } },
      { ...subclass, id: '' },
      { ...subclass, className: '' },
      { ...subclass, subclass: { ...subclass.subclass, name: '' } },
      { ...subclass, subclass: { ...subclass.subclass, source: '' } },
      { ...subclass, subclass: { ...subclass.subclass, features: {} } },
      { ...subclass, createdAt: 'now' },
    ];

    expect(
      useHomebrewStore.getState().importOwn(invalid as unknown as HomebrewEntry[]),
    ).toBe(0);
    expect(useHomebrewStore.getState().entries).toEqual([]);
  });
});

describe('Homebrew persistence', () => {
  const draft = { name: 'Ember', category: 'items' as const, body: '', subtitle: '' };

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('keeps unsaved writes in memory and retries without creating another entry', () => {
    const store = createHomebrewStore();
    const quota = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota');
    });
    const id = store.getState().addManual(draft);
    expect(id).toBeTruthy();
    expect(store.getState()).toMatchObject({
      status: 'unsaved',
      dirty: true,
      entries: [{ id }],
    });
    expect(localStorage.getItem(HOMEBREW_KEY)).toBeNull();
    expect(store.getState().retry()).toBe(false);
    quota.mockRestore();
    expect(store.getState().retry()).toBe(true);
    expect(createHomebrewStore().getState()).toMatchObject({
      status: 'saved',
      entries: [{ id }],
    });
  });

  it('blocks stale writes and rejects replacement if storage changed during confirmation', () => {
    const first = createHomebrewStore();
    const second = createHomebrewStore();
    first.getState().addManual(draft);
    expect(second.getState().addManual({ ...draft, name: 'Second' })).toBe('');
    expect(second.getState().status).toBe('conflict');
    const expected = second.getState().raw;
    first.getState().addManual({ ...draft, name: 'Third' });
    expect(second.getState().restore([], expected)).toBe(false);
    expect(second.getState().loadStored()).toBe(true);
    expect(second.getState().entries).toHaveLength(2);
    second.getState().addManual({ ...draft, name: 'Fourth' });
    expect(first.getState().checkStorage()).toBe(false);
  });

  it('preserves corrupted bytes and the previous library after failed restoration', () => {
    localStorage.setItem(HOMEBREW_KEY, '{damaged');
    const store = createHomebrewStore();
    expect(store.getState()).toMatchObject({ status: 'unreadable', raw: '{damaged' });
    expect(store.getState().loadStored()).toBe(false);
    const quota = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota');
    });
    expect(store.getState().restore([], '{damaged')).toBe(false);
    expect(localStorage.getItem(HOMEBREW_KEY)).toBe('{damaged');
    quota.mockRestore();
    expect(store.getState().restore([], '{damaged')).toBe(true);
    expect(localStorage.getItem(HOMEBREW_KEY)).toBe(serializeHomebrew([]));
  });

  it('uses Web Locks when available and handles restored storage after a conflict', async () => {
    const store = createHomebrewStore();
    const request = vi.fn(async (_name: string, write: () => string) => write());
    Object.defineProperty(navigator, 'locks', { configurable: true, value: { request } });
    try {
      await expect(
        withHomebrewWrite(() => store.getState().addManual(draft)),
      ).resolves.toMatch(/^hb-/);
      expect(request).toHaveBeenCalledWith(HOMEBREW_KEY, expect.any(Function));
    } finally {
      Reflect.deleteProperty(navigator, 'locks');
    }
    const saved = localStorage.getItem(HOMEBREW_KEY)!;
    localStorage.removeItem(HOMEBREW_KEY);
    expect(store.getState().checkStorage()).toBe(false);
    localStorage.setItem(HOMEBREW_KEY, saved);
    expect(store.getState().checkStorage()).toBe(true);
    expect(store.getState().status).toBe('saved');
  });

  it('resolves older Polish subclasses and retains updated data after reload', () => {
    const store = createHomebrewStore();
    const entry = {
      kind: 'subclass' as const,
      id: 'legacy-sub',
      className: 'Czarodziej',
      createdAt: 1,
      subclass: { name: 'School', source: 'HB', features: [] },
    };
    store.getState().append([entry]);
    expect(
      homebrewSubclassesFor(store.getState().entries, { id: 'wizard', name: 'Wizard' }),
    ).toMatchObject([{ id: 'legacy-sub', name: 'School' }]);
    expect(
      homebrewSubclassesFor(store.getState().entries, { id: 'druid', name: 'Druid' }),
    ).toEqual([]);
    expect(
      store.getState().updateSubclass(entry.id, {
        className: 'Druid',
        parentClassId: 'druid',
        name: 'Circle',
        source: '',
        features: [],
      }),
    ).toBe(true);
    expect(createHomebrewStore().getState().entries).toMatchObject([
      { parentClassId: 'druid', subclass: { name: 'Circle' } },
    ]);
  });

  it('protects a pending deletion from another tab and restores it when the baseline returns', () => {
    const store = createHomebrewStore();
    expect(store.getState().deleteEntry('missing')).toBe(false);
    expect(store.getState().undoDelete()).toBe(false);
    const id = store.getState().addManual(draft);
    const entry = store.getState().entries[0]!;
    const saved = localStorage.getItem(HOMEBREW_KEY)!;
    localStorage.setItem(HOMEBREW_KEY, serializeHomebrew([]));
    expect(store.getState().deleteEntry(id)).toBe(false);
    expect(
      store.getState().addSubclass({ className: 'Wizard', name: 'School', source: '' }),
    ).toBe('');
    localStorage.setItem(HOMEBREW_KEY, saved);
    expect(store.getState().deleteEntry(id)).toBe(true);
    const deleted = localStorage.getItem(HOMEBREW_KEY)!;
    localStorage.setItem(HOMEBREW_KEY, saved);
    expect(store.getState().undoDelete()).toBe(false);
    localStorage.setItem(HOMEBREW_KEY, deleted);
    expect(store.getState().append([entry])).toBe(true);
    expect(store.getState().deleted).toBeNull();
    expect(store.getState().entries).toEqual([entry]);
  });

  it('does not treat denied storage reads as an empty writable library', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied');
    });
    const store = createHomebrewStore();
    expect(store.getState()).toMatchObject({ status: 'unreadable', raw: null });
    expect(store.getState().loadStored()).toBe(false);
    expect(store.getState().restore([], null)).toBe(false);
    getItem.mockRestore();
    expect(store.getState().loadStored()).toBe(true);
  });

  it('recovers the unsaved status when the original bytes return', () => {
    const store = createHomebrewStore();
    const quota = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota');
    });
    store.getState().addManual(draft);
    quota.mockRestore();
    localStorage.setItem(HOMEBREW_KEY, serializeHomebrew([]));
    expect(store.getState().checkStorage()).toBe(false);
    expect(store.getState().status).toBe('conflict');
    localStorage.removeItem(HOMEBREW_KEY);
    expect(store.getState().checkStorage()).toBe(true);
    expect(store.getState().status).toBe('unsaved');
  });

  it('finds an older custom class by original name and keeps subclass media and lore', () => {
    const store = createHomebrewStore();
    store.getState().addManual(draft);
    const id = store
      .getState()
      .addSubclass({ className: 'Sage', name: 'School', source: '' });
    const entry = store.getState().entries[0]!;
    if (entry.kind !== 'subclass') throw new Error('Expected a subclass');
    const legacy = {
      ...entry,
      subclass: {
        ...entry.subclass,
        englishName: 'School',
        image: 'art.png',
        lore: ['Old lore'],
      },
    };
    const all = [legacy, ...store.getState().entries.slice(1)];
    expect(
      homebrewSubclassesFor(all, { id: 'sage', name: 'Mędrzec', englishName: 'Sage' }),
    ).toMatchObject([
      { id, image: 'art.png', englishName: 'School', lore: ['Old lore'] },
    ]);
    expect(
      store.getState().updateSubclass(id, {
        className: 'Sage',
        name: 'New school',
        source: '',
        features: [],
      }),
    ).toBe(true);
    expect(store.getState().entries[0]).not.toHaveProperty('parentClassId');
  });

  it('uses a compatible fallback ID and exposes safe artwork for an older malformed import', () => {
    vi.stubGlobal('crypto', {});
    const store = createHomebrewStore();
    try {
      expect(store.getState().addManual(draft)).toMatch(/^hb-ember-/);
    } finally {
      vi.unstubAllGlobals();
    }
    const entry = {
      kind: 'imported' as const,
      id: 'old',
      category: 'spells' as const,
      name: 'Older spell',
      baseLocale: 'en' as const,
      createdAt: 1,
      data: {
        id: 'old',
        name: 'Older spell',
        srd: false,
        source: 'HB',
        image: 'art.png',
        entries: [null],
      },
    };
    expect(parseStoredHomebrew(serializeHomebrew([entry]))).toEqual([entry]);
    expect(homebrewToItem(entry)).toMatchObject({
      _manual: true,
      image: 'art.png',
      entries: [],
    });
    expect(parseStoredHomebrew(serializeHomebrew([entry, entry]))).toBeNull();
  });
  it('recovers duplicate identifiers in legacy snapshots without discarding entries', () => {
    const entry = { kind: 'manual', id: 'one', ...draft, createdAt: 1 };
    const legacy = {
      version: 3,
      state: {
        entries: [entry, { ...entry, name: 'Two' }, { ...entry, id: 'one-legacy-1' }],
      },
    };
    expect(parseStoredHomebrew(JSON.stringify(legacy))).toMatchObject([
      { id: 'one' },
      { id: 'one-legacy-1-copy', name: 'Two' },
      { id: 'one-legacy-1' },
    ]);
  });
});
