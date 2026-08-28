import { describe, expect, it } from 'vitest';
import itemPropertiesData from '@/data/generated/item-properties.json';
import itemPropertyOverlay from '@/data/generated/pl/item-properties.json';
import itemsData from '@/data/generated/items.json';
import itemOverlay from '@/data/generated/pl/items.json';
import { localizeEntry } from './localize';

describe('generated item additions', () => {
  it('includes every magic variant from the source snapshot', () => {
    const variants = itemsData.items.filter((entry) => entry.variant);
    expect(variants).toHaveLength(214);
    expect(new Set(variants.map((entry) => entry.id)).size).toBe(variants.length);
    expect(variants.every((entry) => entry.variant?.inherits)).toBe(true);
    expect(variants.every((entry) => entry.variant?.baseItems?.length)).toBe(true);
  });

  it('resolves the base items and bonus text for the 2024 armor variant', () => {
    const armor = itemsData.items.find((entry) => entry.id === '1-armor');
    expect(armor).toMatchObject({
      entries: ['You have a +1 bonus to AC while wearing this armor.'],
      variant: {
        baseItems: [
          { name: 'Breastplate', source: 'XPHB' },
          { name: 'Chain Mail', source: 'XPHB' },
          { name: 'Chain Shirt', source: 'XPHB' },
          { name: 'Half Plate Armor', source: 'XPHB' },
          { name: 'Hide Armor', source: 'XPHB' },
          { name: 'Leather Armor', source: 'XPHB' },
          { name: 'Padded Armor', source: 'XPHB' },
          { name: 'Plate Armor', source: 'XPHB' },
          { name: 'Ring Mail', source: 'XPHB' },
          { name: 'Scale Mail', source: 'XPHB' },
          { name: 'Splint Armor', source: 'XPHB' },
          { name: 'Studded Leather Armor', source: 'XPHB' },
        ],
      },
    });
  });

  it('includes Weapon of Warning from the 5etools magic variant data', () => {
    const item = itemsData.items.find((entry) => entry.id === 'weapon-of-warning');
    expect(item).toMatchObject({
      name: 'Weapon of Warning',
      source: 'XDMG',
      page: 324,
      type: 'Generic Variant',
      rarity: 'Uncommon',
      attunement: 'Requires attunement',
    });
  });

  it('preserves weapon mastery and property references from 5etools', () => {
    const masteryWeapons = itemsData.items.filter((entry) => entry.masteryRefs?.length);
    const propertyWeapons = itemsData.items.filter((entry) => entry.propertyRefs?.length);
    const greatsword = itemsData.items.find((entry) => entry.id === 'greatsword');

    expect(masteryWeapons).toHaveLength(95);
    expect(
      masteryWeapons.every((entry) => entry.mastery && entry.masteryRefs?.length),
    ).toBe(true);
    expect(propertyWeapons).toHaveLength(341);
    expect(greatsword).toMatchObject({
      mastery: 'Graze',
      masteryRefs: ['Graze|XPHB'],
      propertyRefs: ['H|XPHB', '2H|XPHB'],
    });
    expect(itemPropertiesData.items).toHaveLength(26);
  });

  it('preserves ranged and thrown weapon distances from 5etools', () => {
    const javelin = itemsData.items.find((entry) => entry.id === 'javelin');
    const rangedItems = itemsData.items.filter((entry) => entry.range);

    expect(javelin).toMatchObject({
      properties: 'Thrown',
      range: '30/120 ft.',
    });
    expect(rangedItems).toHaveLength(114);
    expect(rangedItems.some((entry) => entry.id === 'longbow')).toBe(true);
  });

  it('provides Polish rules for the weapon properties used by the item data', () => {
    const heavy = itemPropertiesData.items.find((entry) => entry.id === 'heavy-h-xphb');
    const translated = localizeEntry(heavy!, itemPropertyOverlay);

    expect(translated).toMatchObject({
      name: 'Ciężka',
      entries: [
        expect.objectContaining({
          name: 'Ciężka',
          entries: [expect.stringContaining('Utrudnienie')],
        }),
      ],
    });
  });

  it('provides the Polish overlay with preserved reference markup', () => {
    const item = itemsData.items.find((entry) => entry.id === 'weapon-of-warning');
    const localized = localizeEntry(item!, itemOverlay);
    expect(localized).toMatchObject({
      name: 'Broń Ostrzegawcza',
      englishName: 'Weapon of Warning',
    });
    expect(localized.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Nadprzyrodzona Gotowość',
          entries: [
            'Każdy z nich ma {@variantrule Advantage|XPHB|Przewagę} do rzutów na {@variantrule Initiative|XPHB|Inicjatywę}.',
          ],
        }),
      ]),
    );
  });
});
