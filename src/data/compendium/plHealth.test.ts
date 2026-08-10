import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import en from '@/i18n/dictionaries/en';
import pl from '@/i18n/dictionaries/pl';

const GEN = join(process.cwd(), 'src/data/generated');

function flatten(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    flatten(v, prefix ? `${prefix}.${k}` : k),
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const LINKABLE: Record<string, string> = {
  spell: 'spells',
  condition: 'conditions',
  status: 'conditions',
  disease: 'conditions',
  feat: 'feats',
  background: 'backgrounds',
  race: 'species',
  item: 'items',
  class: 'classes',
  creature: 'bestiary',
  action: 'actions',
  optfeature: 'optionalfeatures',
  deity: 'deities',
  hazard: 'hazards',
  reward: 'boons',
  variantrule: 'rules',
  skill: 'skills',
  sense: 'senses',
  language: 'languages',
  object: 'objects',
  vehicle: 'vehicles',
  recipe: 'recipes',
  facility: 'facilities',
  cult: 'cultsboons',
  boon: 'cultsboons',
  itemMastery: 'masteries',
  charoption: 'charoptions',
  table: 'tables',
  deck: 'decks',
  card: 'decks',
};

function loadArray(cat: string): { id: string }[] {
  try {
    const raw: unknown = JSON.parse(readFileSync(join(GEN, `${cat}.json`), 'utf8'));
    if (Array.isArray(raw)) return raw as { id: string }[];
    return (Object.values(raw as object).find(Array.isArray) as { id: string }[]) ?? [];
  } catch {
    return [];
  }
}

const idsByCat: Record<string, Set<string>> = {};
for (const cat of new Set(Object.values(LINKABLE))) {
  idsByCat[cat] = new Set(loadArray(cat).map((x) => x.id));
}

const refRe = /\{@(\w+) ([^}|]*)(\|[^}]*)?\}/g;
function countBroken(text: string): number {
  let broken = 0;
  let m: RegExpExecArray | null;
  while ((m = refRe.exec(text))) {
    const cat = LINKABLE[m[1]!];
    if (!cat) continue;
    if (!idsByCat[cat]!.has(slugify(m[2]!))) broken++;
  }
  return broken;
}

describe('pl translation health', () => {
  it('en and pl dictionaries have identical keys', () => {
    const enKeys = new Set(flatten(en));
    const plKeys = new Set(flatten(pl));
    const missing = [...enKeys].filter((k) => !plKeys.has(k));
    const extra = [...plKeys].filter((k) => !enKeys.has(k));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });

  it('pl overlays introduce no mass of broken reference links', () => {
    let enBroken = 0;
    for (const f of readdirSync(GEN).filter((f) => f.endsWith('.json'))) {
      enBroken += countBroken(readFileSync(join(GEN, f), 'utf8'));
    }
    let plBroken = 0;
    for (const f of readdirSync(join(GEN, 'pl')).filter((f) => f.endsWith('.json'))) {
      plBroken += countBroken(readFileSync(join(GEN, 'pl', f), 'utf8'));
    }
    expect(plBroken).toBeLessThanOrEqual(enBroken + 25);
  });

  it('bestiary and species use canonical creature-type and size vocabulary', () => {
    const TYPES = new Set([
      'Aberracja',
      'Bestia',
      'Czart',
      'Fej',
      'Humanoid',
      'Konstrukt',
      'Maź',
      'Monstrum',
      'Niebianin',
      'Nieumarły',
      'Olbrzym',
      'Roślina',
      'Smok',
      'Żywiołak',
    ]);
    const SIZES = new Set([
      'Malutki',
      'Mały',
      'Średni',
      'Duży',
      'Wielki',
      'Gigantyczny',
      'Zmienny',
      'lub',
    ]);
    const badTypes: string[] = [];
    const badSizes: string[] = [];
    for (const cat of ['bestiary', 'species']) {
      const overlay = JSON.parse(
        readFileSync(join(GEN, 'pl', `${cat}.json`), 'utf8'),
      ) as Record<string, { creatureType?: string; size?: string }>;
      for (const entry of Object.values(overlay)) {
        if (entry.creatureType) {
          const base = entry.creatureType.replace(/\s*\(.*\)$/, '').trim();
          if (!TYPES.has(base)) badTypes.push(entry.creatureType);
        }
        if (entry.size) {
          for (const word of entry.size.split(' '))
            if (!SIZES.has(word)) badSizes.push(entry.size);
        }
      }
    }
    expect({
      badTypes: [...new Set(badTypes)],
      badSizes: [...new Set(badSizes)],
    }).toEqual({
      badTypes: [],
      badSizes: [],
    });
  });

  it('does not ship known mistranslated vehicle and object values', () => {
    const vehicles = JSON.parse(
      readFileSync(join(GEN, 'pl', 'vehicles.json'), 'utf8'),
    ) as Record<string, { vehicleType?: string }>;
    const objects = JSON.parse(
      readFileSync(join(GEN, 'pl', 'objects.json'), 'utf8'),
    ) as Record<string, { size?: string }>;
    expect(
      Object.values(vehicles).some((entry) => entry.vehicleType === 'Zaklęcie zaklęć'),
    ).toBe(false);
    expect(Object.values(objects).some((entry) => entry.size === 'Mały lub Mały')).toBe(
      false,
    );
  });
});
