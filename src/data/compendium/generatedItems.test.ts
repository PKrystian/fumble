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
    expect(propertyWeapons).toHaveLength(306);
    expect(greatsword).toMatchObject({
      mastery: 'Graze',
      masteryRefs: ['Graze|XPHB'],
      propertyRefs: ['H|XPHB', '2H|XPHB'],
    });
    expect(itemPropertiesData.items).toHaveLength(26);
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
