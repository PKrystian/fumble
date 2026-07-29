import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  type RawAction,
  type RawBackground,
  type RawCondition,
  type RawCultBoon,
  type RawDeity,
  type RawFacility,
  type RawFeat,
  type RawHazard,
  type RawItem,
  type RawLanguage,
  type RawMonster,
  type RawObject,
  type RawOptionalFeature,
  type RawRecipe,
  type RawReward,
  type RawRule,
  type RawSense,
  type RawSkill,
  type RawSpecies,
  type RawSpell,
  type RawVehicle,
  normalizeAction,
  normalizeBackground,
  normalizeBoon,
  normalizeCondition,
  normalizeCultBoon,
  normalizeDeity,
  normalizeFacility,
  normalizeFeat,
  normalizeHazard,
  normalizeItem,
  normalizeLanguage,
  normalizeMonster,
  normalizeObject,
  normalizeOptionalFeature,
  normalizeRecipe,
  normalizeRule,
  normalizeSense,
  normalizeSkill,
  normalizeSpecies,
  normalizeSpell,
  normalizeVehicle,
} from '../../src/data/transform/normalize';
import { resolveInputDir } from './shared';

const IGNORED = new Set([
  'id',
  'image',
  'hidden',
  'otherVersions',
  'srd',
  'lore',
  'gallery',
  'lairActions',
  'regionalEffects',
]);

function strip(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (!IGNORED.has(k)) out[k] = v;
  return out;
}

function readGenerated(category: string): Array<Record<string, unknown>> {
  const path = join('src/data/generated', `${category}.json`);
  return (JSON.parse(readFileSync(path, 'utf8')) as { items: Record<string, unknown>[] })
    .items;
}

let failures = 0;
let checked = 0;

function verify<T extends { name: string; source: string }>(
  label: string,
  category: string,
  raws: T[],
  normalize: (raw: T) => object,
): void {
  const rawByKey = new Map<string, T>();
  for (const raw of raws) rawByKey.set(`${raw.name}|${raw.source}`, raw);

  let localFail = 0;
  for (const item of readGenerated(category)) {
    const raw = rawByKey.get(`${item.name as string}|${item.source as string}`);
    if (!raw) continue;
    checked += 1;
    const expected = JSON.stringify(strip(item));
    const actual = JSON.stringify(strip(normalize(raw) as Record<string, unknown>));
    if (expected !== actual) {
      localFail += 1;
      if (localFail <= 2) {
        console.log(`  MISMATCH ${label}: ${item.name as string}`);
        console.log(`    generated: ${expected.slice(0, 200)}`);
        console.log(`    normalize: ${actual.slice(0, 200)}`);
      }
    }
  }
  failures += localFail;
  console.log(`${localFail === 0 ? 'OK  ' : 'FAIL'} ${label}: ${localFail} mismatches`);
}

function main(): void {
  const dir = resolveInputDir(process.argv.slice(2));
  const read = <U>(rel: string): U =>
    JSON.parse(readFileSync(join(dir, 'data', rel), 'utf8')) as U;

  const spellPhb = read<{ spell?: RawSpell[] }>('spells/spells-xphb.json').spell ?? [];
  verify('spells', 'spells', spellPhb, normalizeSpell);

  const cond = read<Record<string, RawCondition[]>>('conditionsdiseases.json');
  verify('conditions', 'conditions', cond.condition ?? [], (r) =>
    normalizeCondition(r, 'condition'),
  );

  verify(
    'species',
    'species',
    read<{ race?: RawSpecies[] }>('races.json').race ?? [],
    (r) => normalizeSpecies(r),
  );
  verify('feats', 'feats', read<{ feat?: RawFeat[] }>('feats.json').feat ?? [], (r) =>
    normalizeFeat(r),
  );
  verify(
    'backgrounds',
    'backgrounds',
    read<{ background?: RawBackground[] }>('backgrounds.json').background ?? [],
    (r) => normalizeBackground(r),
  );
  verify(
    'rules',
    'rules',
    read<{ variantrule?: RawRule[] }>('variantrules.json').variantrule ?? [],
    normalizeRule,
  );
  verify('items', 'items', read<{ item?: RawItem[] }>('items.json').item ?? [], (r) =>
    normalizeItem(r),
  );
  const bestiaryXphb =
    read<{ monster?: RawMonster[] }>('bestiary/bestiary-xphb.json').monster ?? [];
  verify('bestiary', 'bestiary', bestiaryXphb, (r) => normalizeMonster(r));
  verify(
    'actions',
    'actions',
    read<{ action?: RawAction[] }>('actions.json').action ?? [],
    normalizeAction,
  );
  verify(
    'optionalfeatures',
    'optionalfeatures',
    read<{ optionalfeature?: RawOptionalFeature[] }>('optionalfeatures.json')
      .optionalfeature ?? [],
    normalizeOptionalFeature,
  );
  verify(
    'deities',
    'deities',
    read<{ deity?: RawDeity[] }>('deities.json').deity ?? [],
    normalizeDeity,
  );
  verify(
    'hazards',
    'hazards',
    read<{ trap?: RawHazard[] }>('trapshazards.json').trap ?? [],
    (r) => normalizeHazard(r, 'Trap'),
  );
  verify(
    'boons',
    'boons',
    read<{ reward?: RawReward[] }>('rewards.json').reward ?? [],
    normalizeBoon,
  );
  verify(
    'skills',
    'skills',
    read<{ skill?: RawSkill[] }>('skills.json').skill ?? [],
    normalizeSkill,
  );
  verify(
    'senses',
    'senses',
    read<{ sense?: RawSense[] }>('senses.json').sense ?? [],
    normalizeSense,
  );
  verify(
    'languages',
    'languages',
    read<{ language?: RawLanguage[] }>('languages.json').language ?? [],
    normalizeLanguage,
  );
  verify(
    'cultsboons',
    'cultsboons',
    read<{ cult?: RawCultBoon[] }>('cultsboons.json').cult ?? [],
    (r) => normalizeCultBoon(r, 'Cult'),
  );
  verify(
    'facilities',
    'facilities',
    read<{ facility?: RawFacility[] }>('bastions.json').facility ?? [],
    normalizeFacility,
  );
  verify(
    'recipes',
    'recipes',
    read<{ recipe?: RawRecipe[] }>('recipes.json').recipe ?? [],
    normalizeRecipe,
  );
  verify(
    'objects',
    'objects',
    read<{ object?: RawObject[] }>('objects.json').object ?? [],
    normalizeObject,
  );
  verify(
    'vehicles',
    'vehicles',
    read<{ vehicle?: RawVehicle[] }>('vehicles.json').vehicle ?? [],
    (r) => normalizeVehicle(r),
  );

  console.log(`\nChecked ${checked} entries - ${failures} mismatches.`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
