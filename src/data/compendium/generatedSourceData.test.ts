import { describe, expect, it } from 'vitest';
import encounters from '@/data/generated/encounters.json';
import backgrounds from '@/data/generated/backgrounds.json';
import bestiary from '@/data/generated/bestiary.json';
import homecrafts from '@/data/generated/homecrafts.json';
import life from '@/data/generated/life.json';
import loot from '@/data/generated/loot.json';
import monsterfeatures from '@/data/generated/monsterfeatures.json';
import names from '@/data/generated/names.json';
import plMonsterfeatures from '@/data/generated/pl/monsterfeatures.json';
import plNames from '@/data/generated/pl/names.json';
import psionics from '@/data/generated/psionics.json';
import plBestiary from '@/data/generated/pl/bestiary.json';
import plSpecies from '@/data/generated/pl/species.json';
import { localizeEntry } from './localize';

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

  it('includes resolved source copies in the compendium', () => {
    const azaka = bestiary.items.find(
      (item) => item.name === 'Azaka Stormfang' && item.source === 'ToA',
    );
    expect(azaka).toMatchObject({
      speed: '30 ft. (40 ft. in tiger form)',
      hp: '120 (16d8 + 48)',
    });
    expect(backgrounds.items.some((item) => item.name === "Baldur's Gate Acolyte")).toBe(
      true,
    );
  });

  it('localizes the resolved adventure NPCs', () => {
    const azaka = bestiary.items.find(
      (item) => item.name === 'Azaka Stormfang' && item.source === 'ToA',
    );
    const localized = localizeEntry(azaka!, plBestiary);
    expect(localized).toMatchObject({
      name: 'Azaka Burzowy Kieł',
      speed: '30 stóp (40 stóp w formie tygrysa)',
    });
    expect(localized.traits?.[0]?.name).toBe('Zmieniacz kształtu');
  });

  it('keeps creature identities distinct in Polish overlays', () => {
    expect(plBestiary['goblin']?.name).toBe('Goblin');
    expect(plBestiary['hobgoblin']?.name).toBe('Hobgoblin');
    expect(plBestiary['imp']?.name).toBe('Diablik');
    expect(plBestiary['zombie']?.name).toBe('Zombie');
    expect(plBestiary['fiend-cultist']?.name).toBe('Czarci Kultysta');
    expect(plBestiary['pit-fiend']?.name).toBe('Czart Otchłani');
    expect(plBestiary['displacer-fiend']?.name).toBe('Wysiedlający Czart');
    expect(plSpecies['goblin']?.name).toBe('Goblin');
    expect(plSpecies['goblin-ixalan']?.parentRace).toBe('Goblin');
    expect(plSpecies['zombie']?.name).toBe('Zombie');
    expect(
      plMonsterfeatures['monsterfeatures-martial-advantage-dmg']?.data?.example,
    ).toBe('Hobgoblin');
    expect(plMonsterfeatures['monsterfeatures-nimble-escape-dmg']?.data?.example).toBe(
      'Goblin',
    );
    expect(plMonsterfeatures['monsterfeatures-undead-fortitude-dmg']?.data?.example).toBe(
      'Zombie',
    );
  });
});
