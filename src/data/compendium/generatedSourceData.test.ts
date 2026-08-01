import { describe, expect, it } from 'vitest';
import encounters from '@/data/generated/encounters.json';
import homecrafts from '@/data/generated/homecrafts.json';
import life from '@/data/generated/life.json';
import loot from '@/data/generated/loot.json';
import monsterfeatures from '@/data/generated/monsterfeatures.json';
import names from '@/data/generated/names.json';
import plMonsterfeatures from '@/data/generated/pl/monsterfeatures.json';
import plNames from '@/data/generated/pl/names.json';
import psionics from '@/data/generated/psionics.json';

describe('generated 5etools source collections', () => {
  it('keeps every imported source collection available to the compendium', () => {
    expect(encounters.items).toHaveLength(42);
    expect(homecrafts.items).toHaveLength(20);
    expect(life.items).toHaveLength(26);
    expect(loot.items).toHaveLength(76);
    expect(monsterfeatures.items).toHaveLength(25);
    expect(names.items).toHaveLength(10);
    expect(psionics.items).toHaveLength(52);
  });

  it('preserves the original source record for every collection entry', () => {
    const files = [encounters, homecrafts, life, loot, monsterfeatures, names, psionics];
    for (const file of files) {
      const items = file.items as unknown as Array<{
        name: string;
        data: { name?: string };
      }>;
      expect(
        items.every(
          (item) => item.data.name === undefined || item.data.name === item.name,
        ),
      ).toBe(true);
    }
  });

  it('groups anonymous source arrays into usable tables', () => {
    const trinkets = life.items.filter((item) => item.collection === 'lifeTrinket');
    const dragonItems = loot.items.filter(
      (item) => item.collection === 'dragonMundaneItems',
    );
    expect(trinkets).toHaveLength(1);
    expect(trinkets[0]?.data.table).toHaveLength(100);
    expect(dragonItems).toHaveLength(1);
    expect(dragonItems[0]?.data.table).toHaveLength(25);
  });

  it('localizes name categories and maps monster features to the DMG', () => {
    expect(plNames['name-human-xge']?.name).toBe('Człowiek');
    expect(plNames['name-dragonborn-xge']?.name).toBe('Smokoludź');
    expect(monsterfeatures.items.every((item) => item.source === 'DMG')).toBe(true);
    const localizedMonsterfeatures = plMonsterfeatures as Record<string, unknown>;
    expect(monsterfeatures.items.every((item) => localizedMonsterfeatures[item.id])).toBe(
      true,
    );
  });
});
