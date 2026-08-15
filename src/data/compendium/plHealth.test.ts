import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import en from '@/i18n/dictionaries/en';
import pl from '@/i18n/dictionaries/pl';

const GEN = join(process.cwd(), 'src/data/generated');
const DAMAGE_TYPES = [
  'Kwas',
  'Obuchowe',
  'Zimno',
  'Ogień',
  'Moc',
  'Piorun',
  'Nekrotyczne',
  'Kłute',
  'Trucizna',
  'Psychiczne',
  'Promieniste',
  'Sieczne',
  'Gromu',
];
const DAMAGE_FIELDS = new Set([
  'damage',
  'immune',
  'immunities',
  'resist',
  'resistances',
  'vulnerable',
  'vulnerabilities',
]);
const STRUCTURAL_TYPES = new Set([
  'adventure',
  'appendix',
  'attack',
  'cell',
  'chapter',
  'entries',
  'episode',
  'gallery',
  'hr',
  'image',
  'inline',
  'inset',
  'insetReadaloud',
  'internal',
  'item',
  'itemSpell',
  'itemSub',
  'level',
  'link',
  'list',
  'options',
  'part',
  'quote',
  'randomByLevel',
  'refFeat',
  'refOptionalfeature',
  'refSubclassFeature',
  'section',
  'statblock',
  'statblockInline',
  'table',
  'tableGroup',
]);
const LEGACY_DAMAGE_WORD =
  /\b(?:tłuczen\p{L}*|tłucz\p{L}*|kłuci\p{L}*|przekłuw\p{L}*|przeszywaj\p{L}*|przebijaj\p{L}*|cię[tci]\p{L}*|tnąc\p{L}*|sił\p{L}*|martwic\p{L}*|promienn(?!iste)\p{L}*|blask\p{L}*|promieniowani\p{L}*|grzmot\p{L}*|dźwięk\p{L}*|błyskawic\p{L}*|zatruć)\b/iu;

function flatten(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    flatten(v, prefix ? `${prefix}.${k}` : k),
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function collectStructuralTypeMismatches(
  source: unknown,
  overlay: unknown,
  path: string,
  mismatches: string[],
): void {
  if (Array.isArray(source)) {
    if (!Array.isArray(overlay)) return;
    source.forEach((value, index) =>
      collectStructuralTypeMismatches(
        value,
        overlay[index],
        `${path}[${index}]`,
        mismatches,
      ),
    );
    return;
  }
  const sourceRecord = asRecord(source);
  const overlayRecord = asRecord(overlay);
  if (!sourceRecord || !overlayRecord) return;
  if (
    typeof sourceRecord.type === 'string' &&
    STRUCTURAL_TYPES.has(sourceRecord.type) &&
    overlayRecord.type !== undefined &&
    overlayRecord.type !== sourceRecord.type
  )
    mismatches.push(`${path}: ${sourceRecord.type} -> ${String(overlayRecord.type)}`);
  for (const [key, value] of Object.entries(sourceRecord))
    if (Array.isArray(value) || asRecord(value))
      collectStructuralTypeMismatches(
        value,
        overlayRecord[key],
        `${path}.${key}`,
        mismatches,
      );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function collectLegacyDamageFields(value: unknown, key = '', path = ''): string[] {
  if (Array.isArray(value))
    return value.flatMap((item, index) =>
      collectLegacyDamageFields(item, key, `${path}[${index}]`),
    );
  if (value && typeof value === 'object')
    return Object.entries(value).flatMap(([childKey, childValue]) =>
      collectLegacyDamageFields(
        childValue,
        childKey,
        path ? `${path}.${childKey}` : childKey,
      ),
    );
  if (
    typeof value === 'string' &&
    DAMAGE_FIELDS.has(key) &&
    LEGACY_DAMAGE_WORD.test(value)
  )
    return [`${path}: ${value}`];
  return [];
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

function collectControlCharacters(value: unknown, path: string, result: string[]): void {
  if (typeof value === 'string') {
    if (
      [...value].some((character) => {
        const code = character.charCodeAt(0);
        return code < 32 && code !== 9 && code !== 10 && code !== 13;
      })
    )
      result.push(path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      collectControlCharacters(entry, `${path}[${index}]`, result),
    );
    return;
  }
  if (value && typeof value === 'object')
    Object.entries(value).forEach(([key, entry]) =>
      collectControlCharacters(entry, `${path}.${key}`, result),
    );
}

function collectTableTargets(value: unknown, path: string, result: string[]): void {
  if (typeof value === 'string') {
    for (const match of value.matchAll(/\{@table ([^|}]+)/g))
      if (/[ąćęłńóśźż]/i.test(match[1]!)) result.push(`${path}: ${match[1]}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      collectTableTargets(entry, `${path}[${index}]`, result),
    );
    return;
  }
  if (value && typeof value === 'object')
    Object.entries(value).forEach(([key, entry]) =>
      collectTableTargets(entry, `${path}.${key}`, result),
    );
}

describe('pl translation health', () => {
  it('en and pl dictionaries have identical keys', () => {
    const enKeys = new Set(flatten(en));
    const plKeys = new Set(flatten(pl));
    const missing = [...enKeys].filter((k) => !plKeys.has(k));
    const extra = [...plKeys].filter((k) => !enKeys.has(k));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });

  it('provides a Polish overlay for every generated compendium entry', () => {
    const missing: string[] = [];
    for (const file of readdirSync(GEN).filter((name) => name.endsWith('.json'))) {
      const source = JSON.parse(readFileSync(join(GEN, file), 'utf8')) as {
        items?: Array<{ id: string }>;
      };
      if (!source.items) continue;
      const overlay = JSON.parse(readFileSync(join(GEN, 'pl', file), 'utf8')) as Record<
        string,
        unknown
      >;
      for (const item of source.items)
        if (!Object.prototype.hasOwnProperty.call(overlay, item.id))
          missing.push(`${file}:${item.id}`);
    }
    expect(missing).toEqual([]);
  });

  it('keeps structural markup types in English for the renderer', () => {
    const mismatches: string[] = [];
    for (const file of readdirSync(GEN).filter((name) => name.endsWith('.json'))) {
      const source = JSON.parse(readFileSync(join(GEN, file), 'utf8')) as {
        items?: Array<{ id: string }>;
      };
      if (!source.items) continue;
      const overlay = JSON.parse(readFileSync(join(GEN, 'pl', file), 'utf8')) as Record<
        string,
        unknown
      >;
      for (const item of source.items)
        collectStructuralTypeMismatches(
          item,
          overlay[item.id],
          `${file}:${item.id}`,
          mismatches,
        );
    }
    expect(mismatches).toEqual([]);
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
      'Humanoidalny',
      'Hurda',
      'Konstrukt',
      'Maź',
      'Monstrum',
      'Niebianin',
      'Nieumarły',
      'Olbrzym',
      'Opiekun',
      'Roślina',
      'Smok',
      'Strażnik ognia',
      'Zjawa',
      'Żywiołak',
      'Żywiołak totemu',
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

  it('uses canonical damage-type names in tables and structured data', () => {
    const tables = JSON.parse(readFileSync(join(GEN, 'pl', 'tables.json'), 'utf8')) as {
      'damage-types': { rows: string[][] };
    };
    const rules = JSON.parse(readFileSync(join(GEN, 'pl', 'rules.json'), 'utf8')) as {
      'damage-types': {
        entries: Array<string | { type?: string; rows?: string[][] }>;
      };
    };
    const ruleTable = rules['damage-types'].entries.find(
      (entry): entry is { type: string; rows: string[][] } =>
        typeof entry === 'object' && entry.type === 'table' && Array.isArray(entry.rows),
    );
    expect(tables['damage-types'].rows.map(([name]) => name)).toEqual(DAMAGE_TYPES);
    expect(ruleTable?.rows.map(([name]) => name)).toEqual(DAMAGE_TYPES);
    expect(tables['damage-types'].rows[4]?.[1]).toContain('obrażenia od mocy');

    const bad: string[] = [];
    for (const file of readdirSync(join(GEN, 'pl')).filter((name) =>
      name.endsWith('.json'),
    )) {
      bad.push(
        ...collectLegacyDamageFields(
          JSON.parse(readFileSync(join(GEN, 'pl', file), 'utf8')),
          '',
          file,
        ),
      );
    }
    expect(bad).toEqual([]);
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

  it('keeps sorcerer subclass overlays aligned with base identities and structure', () => {
    type Feature = { entries?: unknown[] };
    const base = JSON.parse(readFileSync(join(GEN, 'classes.json'), 'utf8')) as {
      items: Array<{
        name: string;
        source: string;
        subclasses: Array<{ name: string; source: string; features?: Feature[] }>;
      }>;
    };
    const overlay = JSON.parse(
      readFileSync(join(GEN, 'pl', 'classes.json'), 'utf8'),
    ) as Record<
      string,
      { subclasses: Array<{ englishName?: string; features?: Feature[] }> }
    >;
    const mismatches: string[] = [];
    for (const [root, source] of [
      ['sorcerer', 'XPHB'],
      ['sorcerer-phb', 'PHB'],
    ] as const) {
      const baseClass = base.items.find(
        (item) => item.name === 'Sorcerer' && item.source === source,
      );
      const localizedClass = overlay[root];
      if (!baseClass || !localizedClass) {
        mismatches.push(root);
        continue;
      }
      baseClass.subclasses.forEach((subclass, index) => {
        const localized = localizedClass.subclasses[index];
        if (!localized) {
          mismatches.push(`${root}[${index}] missing`);
          return;
        }
        if (
          localized.englishName !== undefined &&
          localized.englishName !== subclass.name
        )
          mismatches.push(`${root}[${index}] identity`);
        const expected = (subclass.features ?? []).map(
          (feature) => feature.entries?.length ?? null,
        );
        const actual = (localized.features ?? []).map(
          (feature) => feature.entries?.length ?? null,
        );
        if (
          expected.length !== actual.length ||
          expected.some((length, featureIndex) => length !== actual[featureIndex])
        )
          mismatches.push(`${root}[${index}] features`);
      });
    }
    const controls: string[] = [];
    const tableTargets: string[] = [];
    collectControlCharacters(overlay, 'classes', controls);
    collectTableTargets(overlay.sorcerer, 'sorcerer', tableTargets);
    collectTableTargets(overlay['sorcerer-phb'], 'sorcerer-phb', tableTargets);
    expect({ mismatches, controls, tableTargets }).toEqual({
      mismatches: [],
      controls: [],
      tableTargets: [],
    });
  });
});
