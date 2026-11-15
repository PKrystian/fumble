import { describe, expect, it } from 'vitest';
import { createCharacter } from '@/features/character/model';
import { validateBackupEntry } from './backupValidation';

const hero = {
  ...createCharacter('Mira'),
  role: 'dm',
  proficiencyBonusOverride: 3,
  acOverride: 15,
  initiativeOverride: 2,
  spellcastingAbility: 'wis',
  unarmoredDefense: { base: 10, abilities: ['wis'], allowShield: true, source: 'Monk' },
  actions: [{ id: 'a', name: 'Attack', notes: '' }],
  inventory: [
    {
      id: 'i',
      name: 'Armor',
      notes: '',
      quantity: 1,
      itemId: 'armor',
      armorType: 'light',
      baseAc: 11,
      equipped: true,
    },
  ],
  features: [{ id: 'f', name: 'Feature', notes: '', source: 'Monk', auto: true }],
  spells: [
    { id: 's', name: 'Light', level: 0, prepared: true, auto: true, source: 'Monk' },
  ],
  spellSlots: [
    { level: 1, longRestMax: 2, usedLongRest: 0, shortRestMax: 0, usedShortRest: 0 },
  ],
  savingThrowProficiencies: ['dex'],
  skillProficiencies: ['acrobatics'],
  skillExpertise: ['stealth'],
};

const snapshots = {
  'fumble-characters': {
    version: 2,
    state: { characters: { [hero.id]: hero }, order: [hero.id] },
  },
  'fumble-sessions': {
    version: 3,
    state: {
      sessions: [
        {
          id: 's',
          title: 'Session',
          createdAt: 1,
          durationMs: 1,
          notes: '',
          entries: [{ time: 1, text: 'Hello' }],
        },
      ],
      transcriptionLang: 'polish',
    },
  },
  'fumble-homebrew': {
    version: 4,
    state: {
      entries: [
        {
          kind: 'manual',
          id: 'hb',
          category: 'spells',
          name: 'Spell',
          subtitle: '',
          body: '',
          createdAt: 1,
        },
      ],
    },
  },
  'fumble-initiative': {
    version: 1,
    state: {
      combatants: [
        {
          id: 'c',
          name: 'Goblin',
          initiative: 10,
          ac: 12,
          hpCurrent: 2,
          hpMax: 5,
          conditions: '',
          isPlayer: false,
        },
      ],
      round: 1,
      turnId: 'c',
    },
  },
  'fumble-soundboard': {
    version: 5,
    state: {
      tracks: [
        {
          id: 't',
          name: 'Track',
          videoId: 'jNQXAC9IVRw',
          playlistId: 'PL1234567890',
          category: 'custom',
        },
      ],
      categories: [{ id: 'custom', name: 'Custom' }],
    },
  },
  'fumble-custom-rolls': {
    version: 0,
    state: { customRolls: [{ id: 'r', name: 'Attack', expression: '1d20' }] },
  },
  'fumble-sheet-layout': {
    version: 1,
    state: { zones: { left: ['abilities'], center: [], right: [] } },
  },
  'fumble-backup-reminder': {
    version: 1,
    state: { lastBackupAt: 1_700_000_000_000, snoozedUntil: null },
  },
  'fumble-locale': { version: 1, state: { locale: 'pl' } },
  'fumble-sidebar': { version: 1, state: { collapsed: true } },
  'fumble-content-mode': { version: 1, state: { mode: '2024' } },
  'fumble-homebrew-visibility': {
    version: 2,
    state: {
      showInCompendium: true,
      compendiumCampaigns: ['campaign'],
      compendiumCategories: ['spells'],
    },
  },
};

function mutations(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return [
      'invalid',
      ...value.flatMap((item, index) =>
        mutations(item).map((replacement) =>
          value.map((entry, i) => (i === index ? replacement : entry)),
        ),
      ),
    ];
  }
  if (value !== null && typeof value === 'object') {
    return [
      [],
      ...Object.entries(value).flatMap(([key, item]) =>
        mutations(item).map((replacement) => ({ ...value, [key]: replacement })),
      ),
    ];
  }
  return [['invalid']];
}

describe('backup data validation', () => {
  it('rejects invalid journal dates and preserves valid calendar dates', () => {
    const validate = (change: Record<string, unknown>) =>
      validateBackupEntry('fumble-sessions', {
        version: 4,
        state: {
          sessions: [{ ...snapshots['fumble-sessions'].state.sessions[0], ...change }],
          contexts: [],
          selectedSessionId: null,
          transcriptionLang: 'polish',
          transcriptionMode: 'local',
        },
      });
    for (const sessionDate of ['', '2024-02-29', '2026-11-08'])
      expect(() => validate({ sessionDate })).not.toThrow();
    for (const sessionDate of [0, '2026-02-30', '2026-13-01', '08/11/2026'])
      expect(() => validate({ sessionDate })).toThrow('backup-invalid-data');
    for (const createdAt of ['now', NaN, 1e20])
      expect(() => validate({ createdAt })).toThrow('backup-invalid-data');
    expect(() => validate({ entries: [{ time: 1e20, text: 'Invalid' }] })).toThrow(
      'backup-invalid-data',
    );
  });
  for (const [key, snapshot] of Object.entries(snapshots)) {
    it(`accepts current and migratable ${key} snapshots`, () => {
      expect(() => validateBackupEntry(key, snapshot)).not.toThrow();
      const empty = () =>
        validateBackupEntry(key, { version: snapshot.version, state: {} });
      if (key === 'fumble-soundboard') expect(empty).toThrow('backup-invalid-data');
      else expect(empty).not.toThrow();
      const migratable = [
        'fumble-characters',
        'fumble-sessions',
        'fumble-homebrew',
        'fumble-soundboard',
        'fumble-homebrew-visibility',
        'fumble-sheet-layout',
      ];
      if (migratable.includes(key))
        expect(() => validateBackupEntry(key, { version: 0, state: {} })).not.toThrow();
      else if (snapshot.version > 0)
        expect(() => validateBackupEntry(key, { version: 0, state: {} })).toThrow(
          'backup-version',
        );
    });
    it(`rejects malformed fields in ${key} before writing`, () => {
      for (const state of mutations(snapshot.state)) {
        expect(() => validateBackupEntry(key, { ...snapshot, state })).toThrow(
          'backup-invalid-data',
        );
      }
      for (const value of [
        null,
        [],
        {},
        { state: null },
        { state: {}, version: -1 },
        { state: {}, version: 0.5 },
        { state: {}, version: '1' },
        { state: { injected: 'x' }, version: snapshot.version },
      ]) {
        expect(() => validateBackupEntry(key, value)).toThrow('backup-invalid-data');
      }
      expect(() => validateBackupEntry(key, { state: {}, version: 100 })).toThrow(
        'backup-version',
      );
    });
  }

  it('accepts empty, nullable and optional collection fields', () => {
    expect(() =>
      validateBackupEntry('fumble-characters', {
        version: 2,
        state: { characters: { hero: createCharacter() }, order: [] },
      }),
    ).not.toThrow();
    expect(() =>
      validateBackupEntry('fumble-sessions', {
        version: 2,
        state: {
          sessions: [{ id: 's', title: '', createdAt: 0, durationMs: 0, entries: [] }],
        },
      }),
    ).not.toThrow();
    expect(() =>
      validateBackupEntry('fumble-soundboard', {
        version: 2,
        state: {
          tracks: [{ id: 't', name: 'Old track', videoId: 'jNQXAC9IVRw' }],
          categories: [{ id: 'custom', name: null }],
        },
      }),
    ).not.toThrow();
    expect(() =>
      validateBackupEntry('fumble-initiative', {
        version: 1,
        state: {
          turnId: null,
          combatants: [
            { ...snapshots['fumble-initiative'].state.combatants[0], ac: null },
          ],
        },
      }),
    ).not.toThrow();
    expect(() =>
      validateBackupEntry('fumble-homebrew-visibility', {
        version: 2,
        state: { compendiumCampaigns: null, compendiumCategories: null },
      }),
    ).not.toThrow();
    expect(() =>
      validateBackupEntry('fumble-characters', {
        version: 2,
        state: {
          characters: {
            hero: {
              ...hero,
              role: undefined,
              inventory: [{ id: 'i', name: 'Rope', notes: '', quantity: 1 }],
              features: [{ id: 'f', name: 'Feature', notes: '', source: '' }],
              spells: [{ id: 's', name: 'Light', level: 0, prepared: false }],
            },
          },
        },
      }),
    ).not.toThrow();
  });

  it('validates legacy homebrew entries without discarding them', () => {
    const imported = {
      kind: 'imported',
      id: 'hb',
      category: 'spells',
      name: 'Spell',
      data: { id: 's', name: 'Spell' },
      createdAt: 0,
    };
    expect(() =>
      validateBackupEntry('fumble-homebrew', {
        version: 3,
        state: { entries: [imported, { ...imported, baseLocale: 'pl' }] },
      }),
    ).not.toThrow();
    expect(() =>
      validateBackupEntry('fumble-homebrew', { version: 4, state: { entries: [null] } }),
    ).toThrow('backup-invalid-data');
    expect(() =>
      validateBackupEntry('fumble-homebrew', {
        ...snapshots['fumble-homebrew'],
        version: 3,
      }),
    ).not.toThrow();
    expect(() =>
      validateBackupEntry('fumble-homebrew', { version: 3, state: { entries: [null] } }),
    ).toThrow('backup-invalid-data');
    expect(() =>
      validateBackupEntry('fumble-homebrew', {
        version: 4,
        state: { entries: [imported] },
      }),
    ).toThrow('backup-invalid-data');
    expect(() =>
      validateBackupEntry('fumble-locale', { version: 1, state: { locale: 'unknown' } }),
    ).toThrow('backup-invalid-data');
  });

  it('validates map cells and retains unrelated future data groups', () => {
    for (const value of [[], [0, 1, 200]])
      expect(() =>
        validateBackupEntry('fumble-campaign-map-editor:test', value),
      ).not.toThrow();
    for (const value of [{}, ['1'], [1.5], [-1], [Infinity]])
      expect(() => validateBackupEntry('fumble-campaign-map-editor:test', value)).toThrow(
        'backup-invalid-data',
      );
    expect(() =>
      validateBackupEntry('fumble-future-tool', { any: 'data' }),
    ).not.toThrow();
    expect(() =>
      validateBackupEntry('fumble-sidebar', { version: 1, state: { collapsed: null } }),
    ).toThrow('backup-invalid-data');
  });
});
