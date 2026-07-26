import { beforeEach, describe, expect, it } from 'vitest';
import type { CompendiumEntryBase } from '@/data/compendium/types';
import { homebrewToItem, useHomebrewStore } from './store';

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
});
