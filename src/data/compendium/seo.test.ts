import { describe, expect, it } from 'vitest';
import type { ClassEntry, CompendiumEntryBase } from './types';
import { getCompendiumCategorySeo, getCompendiumEntrySeo } from './seo';

const entry: CompendiumEntryBase = {
  id: 'test-entry',
  name: 'Test Entry',
  source: 'XPHB',
  srd: false,
};

const artificer: ClassEntry = {
  ...entry,
  id: 'artificer',
  name: 'Artificer',
  source: 'EFA',
  hitDie: 'd8',
  primaryAbility: 'Intelligence',
  savingThrows: 'Constitution, Intelligence',
  proficiencies: 'Tools',
  armorProficiencies: 'Light',
  weaponProficiencies: 'Simple',
  toolProficiencies: "Tinker's tools",
  subclassTitle: 'Artificer Subclass',
  table: { headers: [], rows: [] },
  features: [],
  subclasses: [],
};

describe('compendium SEO helpers', () => {
  it('describes every category through localized templates', () => {
    expect(getCompendiumCategorySeo('classes', 'Classes', 'en')).toEqual({
      title: 'Classes - D&D 2024 Compendium',
      description:
        'Browse D&D 2024 classes, level progression, features, and subclasses.',
    });
    expect(getCompendiumCategorySeo('spells', 'Zaklęcia', 'pl')).toEqual({
      title: 'Zaklęcia - Kompendium D&D 2024',
      description:
        'Przeglądaj zaklęcia D&D 2024 według poziomu, szkoły, czasu rzucania, zasięgu i czasu trwania.',
    });
  });

  it('uses a localized fallback for an unknown category', () => {
    expect(getCompendiumCategorySeo('custom', 'Custom Entries', 'en')).toEqual({
      title: 'Custom Entries - D&D 2024 Compendium',
      description: "Browse custom entries in Fumble's D&D 2024 compendium.",
    });
  });

  it('describes class entries with their rules focus', () => {
    const english = getCompendiumEntrySeo({
      categoryId: 'classes',
      categoryLabel: 'Classes',
      item: artificer,
      locale: 'en',
      sourceLabel: 'Eberron: Forge of the Artificer',
    });
    expect(english.title).toBe('Artificer D&D 2024 class (EFA)');
    expect(english.description).toContain('hit die d8');
    expect(english.description).toContain('Eberron: Forge of the Artificer');

    const polish = getCompendiumEntrySeo({
      categoryId: 'classes',
      categoryLabel: 'Klasy',
      item: artificer,
      locale: 'pl',
      sourceLabel: 'Eberron: Kuźnia Artificera',
      displayName: 'Artificer (Artificer)',
    });
    expect(polish.title).toBe('Artificer (Artificer) - klasa D&D 2024 (EFA)');
    expect(polish.description).toContain('kość wytrzymałości d8');
    expect(polish.description).toContain('Źródło: Eberron:');
  });

  it('includes structured fields for spells and items', () => {
    const spell = {
      ...entry,
      level: 3,
      school: 'Evocation',
      castingTime: '1 action',
      range: '60 feet',
      duration: 'Instantaneous',
      concentration: true,
      ritual: false,
    } as CompendiumEntryBase;
    const spellSeo = getCompendiumEntrySeo({
      categoryId: 'spells',
      categoryLabel: 'Spells',
      item: spell,
      locale: 'en',
      sourceLabel: 'Player Handbook',
    });
    expect(spellSeo.description).toContain('level 3');
    expect(spellSeo.description).toContain('school Evocation');
    expect(spellSeo.description).toContain('concentration');
    expect(spellSeo.description).not.toContain('ritual');

    const item = {
      ...entry,
      type: 'Weapon',
      rarity: 'Rare',
      attunement: 'Requires attunement by a fighter',
      properties: ['Light', 'Finesse'],
      damage: '1d8 slashing',
      ac: '15',
    } as CompendiumEntryBase;
    const itemSeo = getCompendiumEntrySeo({
      categoryId: 'items',
      categoryLabel: 'Items',
      item,
      locale: 'en',
      sourceLabel: 'Player Handbook',
    });
    expect(itemSeo.description).toContain('Rare rarity');
    expect(itemSeo.description).toContain('properties Light, Finesse');
    expect(itemSeo.description).toContain('Requires attunement by a fighter');
  });

  it('falls back for entries without a category-specific type and clips long descriptions', () => {
    const english = getCompendiumEntrySeo({
      categoryId: 'items',
      categoryLabel: 'Items',
      item: entry,
      locale: 'en',
      sourceLabel: '',
    });
    expect(english.title).toBe('Test Entry D&D 2024 item (XPHB)');
    expect(english.description).toContain('Source: XPHB');

    const custom = getCompendiumEntrySeo({
      categoryId: 'custom',
      categoryLabel: 'Custom Entries',
      item: entry,
      locale: 'en',
      sourceLabel: 'Source',
    });
    expect(custom.title).toBe('Test Entry D&D 2024 custom entries (XPHB)');
    expect(custom.description).toContain(
      'Explore rules, features, and source references',
    );

    const longEntry = {
      ...entry,
      name: 'A'.repeat(130),
    };
    const clipped = getCompendiumEntrySeo({
      categoryId: 'items',
      categoryLabel: 'Items',
      item: longEntry,
      locale: 'en',
      sourceLabel: 'Source',
    });
    expect(clipped.description).toHaveLength(160);
    expect(clipped.description.endsWith('...')).toBe(true);
  });

  it('ignores unsupported object values while keeping supported details', () => {
    const seo = getCompendiumEntrySeo({
      categoryId: 'cultsboons',
      categoryLabel: 'Cults & Boons',
      item: {
        ...entry,
        category: { name: 'ignored' },
        kind: 'Boon',
      } as CompendiumEntryBase,
      locale: 'en',
      sourceLabel: 'Source',
    });
    expect(seo.description).toContain('kind Boon');
    expect(seo.description).not.toContain('[object Object]');
  });
});
