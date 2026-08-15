import { beforeEach, describe, expect, it } from 'vitest';
import type { CompendiumEntryBase } from '@/data/compendium/types';
import { bodyToEntries, homebrewToItem, isHomebrew, useHomebrewStore } from './store';
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

  it('handles imported non-spells and missing optional data', () => {
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
      _manual: false,
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

    const migrate = useHomebrewStore.persist.getOptions().migrate!;
    expect((migrate(undefined, 2) as { entries: unknown[] }).entries).toEqual([]);
    const migrated = migrate(
      {
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
      2,
    ) as { entries: HomebrewEntry[] };
    expect(migrated.entries[0]).toMatchObject({ baseLocale: 'en' });
    expect(migrated.entries[1]).toBe(manual);
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
