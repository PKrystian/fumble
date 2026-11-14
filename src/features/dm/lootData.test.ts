import { describe, expect, it } from 'vitest';
import { createCharacter } from '@/features/character/model';
import {
  emptyLootData,
  isLootBackup,
  isLootContext,
  isLootData,
  isLootItem,
  isLootResult,
  isLootSettings,
  validPartyNumber,
  type LootResult,
} from './lootData';

const item = {
  id: 'item',
  name: 'Item',
  source: 'XDMG',
  type: 'Wondrous Item',
  rarity: 'Common',
  attunement: '',
};
const result: LootResult = {
  id: 'result',
  name: '',
  createdAt: 1,
  context: {
    mode: 'party',
    reward: 'major',
    tierId: 1,
    partySize: 4,
    partyLevel: 1,
    party: [],
    edition: 'all',
    includeUnknown: false,
  },
  gold: 20,
  gemCount: 2,
  gemValue: 10,
  items: [{ item, baseIds: [], base: null }],
  splitCount: '4',
  splitEnabled: false,
};

describe('loot backup validation', () => {
  it('accepts defaults, complete results, chosen bases and unfinished numeric drafts', () => {
    const data = emptyLootData();
    expect(isLootData(data)).toBe(true);
    data.settings.groups[0]!.count = '';
    data.settings.groups[0]!.level = '21';
    data.history = [result];
    data.selectedId = result.id;
    expect(isLootData(data)).toBe(true);
    expect(isLootBackup({ version: 1, state: data })).toBe(true);
    expect(
      isLootResult({
        ...result,
        items: [
          { item: { ...item, weaponCategory: 'simple' }, baseIds: ['item'], base: item },
        ],
      }),
    ).toBe(true);
    expect(isLootContext({ ...result.context, mode: 'tier', reward: 'hoard' })).toBe(
      true,
    );
    expect(
      isLootContext({ ...result.context, mode: 'wildcard', reward: 'wildcard' }),
    ).toBe(true);
    expect(
      isLootContext({
        ...result.context,
        reward: 'minor',
        party: [createCharacter('Hero')],
      }),
    ).toBe(true);
  });

  it('rejects malformed settings, duplicate groups and selection identifiers without coercion', () => {
    expect(isLootSettings(null)).toBe(false);
    const base = emptyLootData().settings;
    const invalid = [
      { mode: 'bad' },
      { mode: ['party'] },
      { source: null },
      { tierId: 0 },
      { tierId: 5 },
      { tierId: -1 },
      { tierId: 1.5 },
      { tierId: '1' },
      { wildcardTierId: 99 },
      { groups: null },
      { groups: [] },
      { groups: [{ id: '', count: '1', level: '1' }] },
      { groups: [null] },
      { groups: [{ id: 'one', count: 1, level: '1' }] },
      { groups: [{ id: 'one', count: '1', level: null }] },
      { groups: [base.groups[0], base.groups[0]] },
      { selectedIds: [1] },
      { selectedIds: ['one', 'one'] },
      { search: 1 },
      { role: 'bad' },
      { sort: 'bad' },
      { includeUnknown: 'true' },
    ];
    for (const patch of invalid)
      expect(isLootSettings({ ...base, ...patch }), JSON.stringify(patch)).toBe(false);
    expect(isLootSettings({ ...base, selectedIds: [] })).toBe(true);
  });

  it('rejects invalid snapshots, mismatched reward modes and invalid character metadata', () => {
    for (const value of [
      null,
      [],
      { ...item, id: '' },
      { ...item, name: 1 },
      { ...item, source: null },
      { ...item, type: false },
      { ...item, rarity: [] },
      { ...item, attunement: 2 },
      { ...item, weaponCategory: 1 },
    ])
      expect(isLootItem(value)).toBe(false);
    const context = result.context;
    const member = createCharacter('Hero');
    for (const value of [null, { ...context, party: null }])
      expect(isLootContext(value)).toBe(false);
    for (const patch of [
      { mode: null },
      { reward: 'bad' },
      { reward: 'hoard' },
      { mode: 'tier', reward: 'minor' },
      { mode: 'wildcard', reward: 'major' },
      { tierId: 0 },
      { partySize: -1 },
      { partyLevel: 0 },
      { partyLevel: 21 },
      { party: [null] },
      { party: [{ ...member, name: null }] },
      { party: [{ ...member, level: 0 }] },
      { party: [{ ...member, className: [] }] },
      { party: [member, member] },
      { edition: '2030' },
      { includeUnknown: null },
    ])
      expect(isLootContext({ ...context, ...patch }), JSON.stringify(patch)).toBe(false);
  });

  it('rejects corrupt histories, unsafe totals and orphaned selected results and bases', () => {
    for (const patch of [
      { id: null },
      { name: null },
      { createdAt: '1' },
      { createdAt: 9e15 },
      { context: null },
      { gold: NaN },
      { gold: -1 },
      { gold: Number.MAX_SAFE_INTEGER },
      { gemCount: 1.5 },
      { gemValue: null },
      { items: null },
      { items: Array(5).fill(result.items[0]) },
      { items: [null] },
      { items: [{ item: null, baseIds: [], base: null }] },
      { items: [{ item, baseIds: null, base: null }] },
      { items: [{ item, baseIds: ['x', 'x'], base: null }] },
      { items: [{ item, baseIds: [], base: 1 }] },
      { items: [{ item, baseIds: [], base: item }] },
      { splitCount: 1 },
      { splitEnabled: 'true' },
    ])
      expect(isLootResult({ ...result, ...patch }), JSON.stringify(patch)).toBe(false);
    const data = emptyLootData();
    for (const value of [
      null,
      { ...data, settings: null },
      { ...data, history: null },
      { ...data, history: Array(51).fill(result) },
      { ...data, history: [null] },
      { ...data, history: [result, result] },
      { ...data, selectedId: 1 },
      { ...data, selectedId: 'missing' },
    ])
      expect(isLootData(value)).toBe(false);
    for (const value of [null, { version: 2, state: data }, { version: 1, state: null }])
      expect(isLootBackup(value)).toBe(false);
  });

  it('validates positive integer form values separately from stored drafts', () => {
    for (const value of [
      '',
      ' ',
      '-1',
      '0',
      '1.2',
      '1001',
      'NaN',
      'Infinity',
      '9007199254740992',
    ])
      expect(validPartyNumber(value, 1000), value).toBe(false);
    for (const value of ['1', '1000', ' 2 '])
      expect(validPartyNumber(value, 1000)).toBe(true);
  });
});
