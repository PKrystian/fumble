import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  localizeCompendiumValue,
  repairLocalizedMeasurements,
} from '../../src/data/compendium/localizeValue';

type JsonRecord = Record<string, unknown>;

const ROOT = process.cwd();
const GENERATED = join(ROOT, 'src/data/generated');
const METADATA_FIELDS = new Set([
  'ac',
  'attackBonus',
  'capacity',
  'castingTime',
  'components',
  'cost',
  'cr',
  'crDisplay',
  'damage',
  'duration',
  'height',
  'hp',
  'initiative',
  'languages',
  'long',
  'normal',
  'pace',
  'range',
  'saves',
  'senses',
  'skills',
  'speed',
  'tools',
  'value',
  'weight',
  'width',
]);

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function repairLocalizedMeasurementsInValue(
  source: unknown,
  localized: unknown,
): unknown {
  if (typeof source === 'string' && typeof localized === 'string')
    return repairLocalizedMeasurements(source, localized);
  if (Array.isArray(source) && Array.isArray(localized))
    return localized.map((value, index) =>
      index < source.length
        ? repairLocalizedMeasurementsInValue(source[index], value)
        : value,
    );
  if (isRecord(source) && isRecord(localized)) {
    const result = { ...localized };
    for (const [key, value] of Object.entries(source))
      if (Object.prototype.hasOwnProperty.call(result, key))
        result[key] = repairLocalizedMeasurementsInValue(value, result[key]);
    return result;
  }
  return localized;
}

function numericSignature(value: string): string {
  return [...value.matchAll(/\d[\d.,]*/gu)]
    .map(([token]) => token.replace(/[.,]/gu, ''))
    .join('|');
}

function hasIncorrectSpeedLabels(source: string, localized: string): boolean {
  if (!/\b(?:Climb|Fly|Swim|Burrow|hover)\b/iu.test(source)) return false;
  return (
    /\b(?:lataj|latać|przepłyń|przepłyn|przelecieć|wspinaj|wznieś|wznieść)\b/iu.test(
      localized,
    ) ||
    (/\bhover\b/iu.test(source) && !/\bzawis/iu.test(localized))
  );
}

function needsRepair(field: string, source: string, localized: string): boolean {
  if (source === '' && localized !== '') return true;
  if (numericSignature(source) !== numericSignature(localized)) return true;
  return field === 'speed' && hasIncorrectSpeedLabels(source, localized);
}

function repairCategory(category: string): number {
  const sourcePath = join(GENERATED, `${category}.json`);
  const overlayPath = join(GENERATED, 'pl', `${category}.json`);
  if (!existsSync(overlayPath)) return 0;
  const source = JSON.parse(readFileSync(sourcePath, 'utf8')) as { items?: JsonRecord[] };
  if (!Array.isArray(source.items)) return 0;
  const overlay = JSON.parse(readFileSync(overlayPath, 'utf8')) as JsonRecord;
  const sourceById = new Map(source.items.map((item) => [String(item.id), item]));
  let changes = 0;

  for (const [id, rawTranslation] of Object.entries(overlay)) {
    if (!isRecord(rawTranslation)) continue;
    const sourceItem = sourceById.get(id);
    if (!sourceItem) continue;
    for (const field of METADATA_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(rawTranslation, field)) continue;
      const localized = rawTranslation[field];
      if (typeof localized !== 'string') continue;
      const original = sourceItem[field];
      if (typeof original !== 'string') {
        if (original === undefined) {
          delete rawTranslation[field];
          changes++;
        }
        continue;
      }
      if (!needsRepair(field, original, localized)) continue;
      rawTranslation[field] = localizeCompendiumValue(original, 'pl', field) ?? original;
      changes++;
    }
    for (const field of ['skills', 'tools']) {
      const localized = rawTranslation[field];
      const original = sourceItem[field];
      if (
        typeof localized === 'string' &&
        typeof original === 'string' &&
        /\bsource\s*=\s*phb\b/iu.test(localized)
      ) {
        rawTranslation[field] = original;
        changes++;
      }
    }
    const repaired = repairLocalizedMeasurementsInValue(sourceItem, rawTranslation);
    if (JSON.stringify(repaired) !== JSON.stringify(rawTranslation)) {
      overlay[id] = repaired;
      changes++;
    }
  }

  if (changes > 0) writeFileSync(overlayPath, `${JSON.stringify(overlay, null, 2)}\n`);
  return changes;
}

let changes = 0;
for (const file of readdirSync(GENERATED).filter((name) => name.endsWith('.json'))) {
  changes += repairCategory(file.slice(0, -5));
}
console.log('Repaired ' + changes + ' Polish metadata values.');
