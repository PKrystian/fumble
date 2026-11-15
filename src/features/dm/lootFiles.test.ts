import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompendiumEntryBase } from '@/data/compendium/types';
import { emptyLootData, LOOT_KEY, type LootResult } from './lootData';
import {
  displayLootItem,
  downloadLootBackup,
  downloadLootFile,
  formatLootText,
  lootBackup,
  lootParameters,
  lootTitle,
  parseLootFile,
} from './lootFiles';
import { serializeLoot } from './lootStore';
import { MAX_BACKUP_BYTES } from '@/features/data/backup';

const item = {
  id: 'item',
  name: 'Item',
  source: 'XDMG',
  type: 'Generic Variant',
  rarity: 'Uncommon',
  attunement: 'Requires attunement',
};
const result: LootResult = {
  id: 'reward',
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
  gold: 1,
  gemCount: 2,
  gemValue: 10,
  items: [{ item, baseIds: [], base: null }],
  splitCount: '4',
  splitEnabled: false,
};
beforeEach(() => vi.restoreAllMocks());

describe('loot exports', () => {
  it('keeps meaningful metadata and translates canonical result parameters and known values', () => {
    const catalog = new Map<string, CompendiumEntryBase>([
      [
        'item',
        { id: 'item', name: 'Przedmiot', englishName: 'Item', source: 'XDMG', srd: true },
      ],
    ]);
    expect(displayLootItem(item, catalog, 'pl')).toMatchObject({
      name: 'Przedmiot',
      original: 'Item',
      rarity: 'Niepospolita',
      missing: false,
    });
    expect(displayLootItem(item, new Map(), 'en')).toMatchObject({
      name: 'Item',
      missing: true,
    });
    expect(lootTitle(result, 'en')).toBe('Major Reward');
    expect(lootTitle({ ...result, name: 'Dragon' }, 'en')).toBe('Dragon');
    expect(lootParameters(result, 'pl')).toContain('Próg 1');
    const text = formatLootText(
      { ...result, splitEnabled: true, splitCount: '3' },
      catalog,
      'pl',
    );
    expect(text).toContain('Przedmiot');
    expect(text).toContain('Dostrojenie');
    expect(text).toContain('Łączna wartość monet i kosztowności: 21 sz');
    expect(text).toContain('Na udział: 7 sz');
    expect(text).toContain('Pozostało: 0 sz');
    expect(text).toContain('Wybierz konkretny przedmiot bazowy');
    const base = {
      ...item,
      id: 'base',
      name: 'Club',
      type: 'Melee Weapon',
      attunement: '',
      rarity: '',
    };
    const complete = formatLootText(
      {
        ...result,
        context: { ...result.context, partySize: 0, includeUnknown: true },
        gemCount: 0,
        splitEnabled: true,
        splitCount: '0',
        items: [{ item, baseIds: ['base'], base }],
      },
      new Map(),
      'en',
    );
    expect(complete).toContain('Item (Club)');
    expect(complete).toContain('no verified rarity ceiling');
    expect(complete).not.toContain('Per share');
    expect(complete).not.toContain('Gems & Art:');
    const empty = formatLootText({ ...result, items: [] }, new Map(), 'en');
    expect(empty).toContain('No items this time.');
    const mundane = formatLootText(
      {
        ...result,
        items: [{ item: { ...base, type: '', source: '' }, base: null, baseIds: [] }],
      },
      new Map(),
      'en',
    );
    expect(mundane).not.toContain(' -  - ');
    expect(mundane).not.toContain('Attunement:');
  });

  it('creates and cleans download anchors on success and failure', () => {
    const create = vi.fn((blob: Blob) => {
      expect(blob).toBeInstanceOf(Blob);
      return 'blob:loot';
    });
    const revoke = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke });
    const clicked: HTMLAnchorElement[] = [];
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        clicked.push(this);
      });
    downloadLootFile('contents', 'reward.txt', 'text/plain');
    expect(clicked[0]!.download).toBe('reward.txt');
    expect(create.mock.calls[0]![0]).toBeInstanceOf(Blob);
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revoke).toHaveBeenCalledWith('blob:loot');
    downloadLootBackup(emptyLootData());
    expect(clicked[1]!.download).toBe('fumble-loot-backup.json');
    click.mockImplementation(() => {
      throw new Error('download-denied');
    });
    expect(() => downloadLootFile('contents', 'backup.json')).toThrow('download-denied');
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revoke).toHaveBeenCalledTimes(3);
  });

  it('validates scoped and full backups without accepting corrupt or future data', () => {
    const data = { ...emptyLootData(), history: [result], selectedId: result.id };
    const scoped = lootBackup(data);
    expect(parseLootFile(JSON.stringify(scoped)).data).toEqual(data);
    const full = {
      app: 'fumble',
      version: 1,
      exportedAt: scoped.exportedAt,
      data: { [LOOT_KEY]: serializeLoot(data) },
    };
    expect(parseLootFile(JSON.stringify(full)).data).toEqual(data);
    for (const value of [
      null,
      [],
      { ...scoped, app: 'other' },
      { ...scoped, version: 2 },
      { ...scoped, exportedAt: '' },
      { ...scoped, exportedAt: 1 },
      { ...scoped, exportedAt: '2026-02-30T00:00:00.000Z' },
      { ...scoped, loot: null },
      { ...scoped, loot: { version: 99, state: data } },
      { ...scoped, loot: { version: 1, state: { ...data, selectedId: 'missing' } } },
      { ...full, data: {} },
    ])
      expect(() => parseLootFile(JSON.stringify(value))).toThrow();
    expect(() => parseLootFile('{broken')).toThrow(SyntaxError);
    expect(() => parseLootFile('x'.repeat(MAX_BACKUP_BYTES + 1))).toThrow(
      'loot-backup-too-large',
    );
  });
});
