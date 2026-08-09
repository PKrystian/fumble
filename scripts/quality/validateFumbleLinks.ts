import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const GENERATED = join(ROOT, 'src/data/generated');
const FUMBLE = join(ROOT, 'src/data/fumble-homebrew');

const LINKABLE: Record<string, string> = {
  spell: 'spells',
  condition: 'conditions',
  status: 'conditions',
  disease: 'conditions',
  feat: 'feats',
  background: 'backgrounds',
  race: 'species',
  item: 'items',
  firearm: 'firearms',
  class: 'classes',
  creature: 'bestiary',
  action: 'actions',
  optfeature: 'optionalfeatures',
  psionic: 'psionics',
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

interface JsonRecord {
  [key: string]: unknown;
}

interface MissingReference {
  file: string;
  tag: string;
  target: string;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function addTargets(targets: Set<string>, category: string, items: unknown): void {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    if (!isRecord(item) || typeof item.id !== 'string') continue;
    targets.add(`${category}/${item.id}`);
    if (typeof item.category === 'string') targets.add(`${item.category}/${item.id}`);
  }
}

function collectGeneratedTargets(targets: Set<string>): void {
  for (const file of readdirSync(GENERATED)) {
    if (!file.endsWith('.json')) continue;
    const data = readJson(join(GENERATED, file));
    addTargets(
      targets,
      file.slice(0, -'.json'.length),
      isRecord(data) ? data.items : undefined,
    );
  }
}

function collectFumbleTargets(targets: Set<string>): void {
  for (const file of readdirSync(FUMBLE)) {
    if (!file.endsWith('.json')) continue;
    const data = readJson(join(FUMBLE, file));
    addTargets(
      targets,
      file.slice(0, -'.json'.length),
      isRecord(data) ? data.items : undefined,
    );
  }
}

function collectMissing(
  value: unknown,
  file: string,
  targets: Set<string>,
  missing: MissingReference[],
): void {
  if (typeof value === 'string') {
    const tags = /\{@([A-Za-z]+)\s+([^{}]*)\}/g;
    let match: RegExpExecArray | null;
    while ((match = tags.exec(value))) {
      const category = LINKABLE[match[1]!];
      const target = match[2]!.split('|')[0]!.trim();
      if (!category || !target) continue;
      const key = `${category}/${slugify(target)}`;
      if (!targets.has(key)) missing.push({ file, tag: match[1]!, target: key });
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectMissing(entry, file, targets, missing);
    return;
  }
  if (!isRecord(value)) return;
  for (const entry of Object.values(value)) collectMissing(entry, file, targets, missing);
}

function collectFumbleReferences(targets: Set<string>): MissingReference[] {
  const missing: MissingReference[] = [];
  for (const file of readdirSync(FUMBLE)) {
    if (!file.endsWith('.json')) continue;
    collectMissing(
      readJson(join(FUMBLE, file)),
      `fumble-homebrew/${file}`,
      targets,
      missing,
    );
  }
  const polishDir = join(FUMBLE, 'pl');
  for (const file of readdirSync(polishDir)) {
    if (!file.endsWith('.json')) continue;
    collectMissing(
      readJson(join(polishDir, file)),
      `fumble-homebrew/pl/${file}`,
      targets,
      missing,
    );
  }
  return missing;
}

const targets = new Set<string>();
collectGeneratedTargets(targets);
collectFumbleTargets(targets);
const missing = collectFumbleReferences(targets);

if (missing.length > 0) {
  const details = missing
    .map(({ file, tag, target }) => `${file}: ${tag} -> ${target}`)
    .join('\n');
  throw new Error(
    `Found ${missing.length} broken Fumble compendium references:\n${details}`,
  );
}

console.log(`Checked Fumble references against ${targets.size} compendium targets.`);
