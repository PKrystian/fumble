import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const GENERATED = join(ROOT, 'src/data/generated');
const FUMBLE = join(ROOT, 'src/data/fumble-homebrew');
const BOOK_DATA = join(ROOT, 'public/data');

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
  source?: string;
}

interface StatblockReference {
  file: string;
  tag: string;
  target: string;
}

interface WikiReference {
  file: string;
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

function addTargets(
  targets: Set<string>,
  category: string,
  items: unknown,
  names: Map<string, Set<string>>,
): void {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    if (!isRecord(item) || typeof item.id !== 'string') continue;
    targets.add(`${category}/${item.id}`);
    if (typeof item.category === 'string') targets.add(`${item.category}/${item.id}`);
    if (typeof item.name === 'string') {
      const key = `${category}/${slugify(item.name)}`;
      const ids = names.get(key) ?? new Set<string>();
      ids.add(item.id);
      names.set(key, ids);
    }
  }
}

function collectDataTargets(
  directory: string,
  targets: Set<string>,
  names: Map<string, Set<string>>,
): void {
  for (const file of readdirSync(directory)) {
    if (!file.endsWith('.json')) continue;
    const data = readJson(join(directory, file));
    addTargets(
      targets,
      file.slice(0, -'.json'.length),
      isRecord(data) ? data.items : undefined,
      names,
    );
  }
}

function collectOverlayNames(directory: string, names: Map<string, Set<string>>): void {
  for (const file of readdirSync(directory)) {
    if (!file.endsWith('.json')) continue;
    const data = readJson(join(directory, file));
    if (!isRecord(data)) continue;
    const category = file.slice(0, -'.json'.length);
    for (const [id, item] of Object.entries(data)) {
      if (!isRecord(item) || typeof item.name !== 'string') continue;
      const key = `${category}/${slugify(item.name)}`;
      const ids = names.get(key) ?? new Set<string>();
      ids.add(id);
      names.set(key, ids);
    }
  }
}

function collectTargetIndex(targets: Set<string>, names: Map<string, Set<string>>): void {
  collectDataTargets(GENERATED, targets, names);
  collectDataTargets(FUMBLE, targets, names);
  collectOverlayNames(join(GENERATED, 'pl'), names);
  collectOverlayNames(join(FUMBLE, 'pl'), names);
}

function jsonFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) files.push(...jsonFiles(path));
    else if (entry.endsWith('.json')) files.push(path);
  }
  return files;
}

function targetKey(tag: string, target: string): string | undefined {
  const category = LINKABLE[tag === 'card' ? 'deck' : tag];
  return category && target ? `${category}/${slugify(target)}` : undefined;
}

function collectMissing(
  value: unknown,
  file: string,
  targets: Set<string>,
  names: Map<string, Set<string>>,
  missing: MissingReference[],
): void {
  if (typeof value === 'string') {
    const tags = /\{@([A-Za-z]+)\s+([^{}]*)\}/g;
    let match: RegExpExecArray | null;
    while ((match = tags.exec(value))) {
      const tag = match[1]!;
      const parts = match[2]!.split('|');
      const target = (tag === 'card' ? parts[1] : parts[0])?.trim() ?? '';
      const key = targetKey(tag, target);
      if (!key || targets.has(key)) continue;
      const category = LINKABLE[tag === 'card' ? 'deck' : tag]!;
      const byName = names.get(`${category}/${slugify(target)}`);
      if (byName?.size) continue;
      missing.push({
        file,
        tag,
        target,
        ...((tag === 'card' ? parts[2] : parts[1])?.trim()
          ? { source: (tag === 'card' ? parts[2] : parts[1])!.trim() }
          : {}),
      });
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectMissing(entry, file, targets, names, missing);
    return;
  }
  if (!isRecord(value)) return;
  for (const entry of Object.values(value)) {
    collectMissing(entry, file, targets, names, missing);
  }
}

function collectStatblockMissing(
  value: unknown,
  file: string,
  targets: Set<string>,
  names: Map<string, Set<string>>,
  missing: StatblockReference[],
): void {
  if (Array.isArray(value)) {
    for (const entry of value)
      collectStatblockMissing(entry, file, targets, names, missing);
    return;
  }
  if (!isRecord(value)) return;
  if (
    value.type === 'statblock' &&
    typeof value.tag === 'string' &&
    typeof value.name === 'string'
  ) {
    const category: Record<string, string> = {
      creature: 'bestiary',
      item: 'items',
      spell: 'spells',
      object: 'objects',
      vehicle: 'vehicles',
      deity: 'deities',
      race: 'species',
      trap: 'hazards',
      hazard: 'hazards',
      variantrule: 'rules',
      condition: 'conditions',
      status: 'conditions',
      disease: 'conditions',
      sense: 'senses',
      skill: 'skills',
      action: 'actions',
      optfeature: 'optionalfeatures',
      feat: 'feats',
      background: 'backgrounds',
      class: 'classes',
      language: 'languages',
      reward: 'boons',
    };
    const target = `${category[value.tag] ?? ''}/${slugify(value.name)}`;
    if (
      category[value.tag] &&
      !targets.has(target) &&
      !names.has(`${category[value.tag]}/${slugify(value.name)}`)
    ) {
      missing.push({ file, tag: value.tag, target: value.name });
    }
  }
  for (const entry of Object.values(value)) {
    collectStatblockMissing(entry, file, targets, names, missing);
  }
}

function collectWikiPages(value: unknown): Set<string> {
  const pages = new Set<string>();
  if (!isRecord(value) || !Array.isArray(value.campaigns)) return pages;
  for (const campaign of value.campaigns) {
    if (!isRecord(campaign) || typeof campaign.id !== 'string') continue;
    if (!Array.isArray(campaign.pages)) continue;
    for (const page of campaign.pages) {
      if (!isRecord(page) || typeof page.slug !== 'string') continue;
      pages.add(`${campaign.id}/${page.slug}`);
    }
  }
  return pages;
}

function collectWikiMissing(
  value: unknown,
  file: string,
  pages: Set<string>,
  missing: WikiReference[],
): void {
  if (!isRecord(value) || !Array.isArray(value.campaigns)) return;
  for (const campaign of value.campaigns) {
    if (!isRecord(campaign) || !Array.isArray(campaign.pages)) continue;
    for (const page of campaign.pages) {
      if (!isRecord(page) || typeof page.html !== 'string') continue;
      const links = /data-wiki-link="([^"]+)"/g;
      let match: RegExpExecArray | null;
      while ((match = links.exec(page.html))) {
        const target = match[1]!.trim();
        if (target && !pages.has(target)) missing.push({ file, target });
      }
    }
  }
}

const targets = new Set<string>();
const names = new Map<string, Set<string>>();
collectTargetIndex(targets, names);

const sourceFiles = [
  ...jsonFiles(GENERATED),
  ...jsonFiles(FUMBLE),
  ...jsonFiles(BOOK_DATA),
];
const textSourceFiles = [
  join(ROOT, 'src/i18n/dictionaries/en.ts'),
  join(ROOT, 'src/i18n/dictionaries/pl.ts'),
];
const missing: MissingReference[] = [];
const statblockMissing: StatblockReference[] = [];
const wikiMissing: WikiReference[] = [];
const wikiPages = collectWikiPages(readJson(join(GENERATED, 'wiki.json')));
for (const path of sourceFiles) {
  const value = readJson(path);
  const file = relative(ROOT, path).replaceAll('\\', '/');
  collectMissing(value, file, targets, names, missing);
  collectStatblockMissing(value, file, targets, names, statblockMissing);
  if (file === 'src/data/generated/wiki.json') {
    collectWikiMissing(value, file, wikiPages, wikiMissing);
  }
}
for (const path of textSourceFiles) {
  const file = relative(ROOT, path).replaceAll('\\', '/');
  collectMissing(readFileSync(path, 'utf8'), file, targets, names, missing);
}

const uniqueMissing = [
  ...new Map(
    missing.map((entry) => [
      `${entry.file}|${entry.tag}|${entry.target}|${entry.source ?? ''}`,
      entry,
    ]),
  ).values(),
];
const uniqueStatblockMissing = [
  ...new Map(
    statblockMissing.map((entry) => [
      `${entry.file}|${entry.tag}|${entry.target}`,
      entry,
    ]),
  ).values(),
];
const uniqueWikiMissing = [
  ...new Map(
    wikiMissing.map((entry) => [`${entry.file}|${entry.target}`, entry]),
  ).values(),
];

const strictMissing = uniqueMissing.filter(({ file }) =>
  file.startsWith('src/data/fumble-homebrew/'),
);
const strictStatblockMissing = uniqueStatblockMissing.filter(({ file }) =>
  file.startsWith('src/data/fumble-homebrew/'),
);

if (
  strictMissing.length > 0 ||
  strictStatblockMissing.length > 0 ||
  uniqueWikiMissing.length > 0
) {
  const details = strictMissing.map(
    ({ file, tag, target, source }) =>
      `${file}: ${tag} -> ${target}${source ? ` (${source})` : ''}`,
  );
  details.push(
    ...strictStatblockMissing.map(
      ({ file, tag, target }) => `${file}: statblock ${tag} -> ${target}`,
    ),
  );
  details.push(
    ...uniqueWikiMissing.map(({ file, target }) => `${file}: wiki -> ${target}`),
  );
  throw new Error(
    `Found ${details.length} broken compendium references:\n${details.join('\n')}`,
  );
}

console.log(
  `Checked ${sourceFiles.length} JSON files and ${textSourceFiles.length} source files against ${targets.size} compendium targets and ${wikiPages.size} wiki pages; ${uniqueMissing.length + uniqueStatblockMissing.length} unresolved compendium references are rendered as text.`,
);
