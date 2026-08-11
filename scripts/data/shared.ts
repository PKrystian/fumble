import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Entry } from '../../src/data/compendium/entry';
import {
  SPELL_SCHOOLS,
  proficiencyBonus,
  slugify,
  stripMarkup,
} from '../../src/data/transform/util';
import { resolveCopies } from './copy';

export { SPELL_SCHOOLS, proficiencyBonus, slugify, stripMarkup };

export const SOURCE_REPO = 'https://github.com/5etools-mirror-3/5etools-src';

interface BookMeta {
  source: string;
  name: string;
  published?: string;
}

function loadBookAndAdventureMeta(inputDir: string): BookMeta[] {
  const books = readDataFile<{ book?: BookMeta[] }>(inputDir, 'books.json').book ?? [];
  let adventures: BookMeta[] = [];
  try {
    adventures =
      readDataFile<{ adventure?: BookMeta[] }>(inputDir, 'adventures.json').adventure ??
      [];
  } catch {
    // Optional adventure index
  }
  return [...books, ...adventures];
}

const EXTRA_SOURCE_NAMES: Record<string, string> = {
  TftYP: 'Tales from the Yawning Portal',
  ESK: 'Dragon of Icespire Peak',
  MFF: "Mordenkainen's Fiendish Folio Volume 1: Toil and Trouble",
  MCV1SC: 'Monstrous Compendium Volume 1: Spelljammer Creatures',
  MCV2DC: 'Monstrous Compendium Volume 2: Dragonlance Creatures',
  MCV3MC: 'Monstrous Compendium Volume 3: Minecraft Creatures',
  MisMV1: 'Misplaced Monsters: Volume 1',
  EEPC: "Elemental Evil Player's Companion",
  EET: 'Elemental Evil: Trinkets',
  'HAT-LMI': 'Honor Among Thieves: Legendary Magic Items',
  RoTOS: 'The Rise of Tiamat Online Supplement',
  HFDoMM: "Heroes' Feast: The Deck of Many Morsels",
  DrDe: 'Dragon Delves',
  SADS: 'Sapphire Anniversary Dice Set',
  VD: 'The Vecna Dossier',
  UATheMysticClass: 'Unearthed Arcana: The Mystic',
};

export function resolveInputDir(argv: string[]): string {
  const flagIndex = argv.indexOf('--input');
  if (flagIndex !== -1 && argv[flagIndex + 1]) {
    return argv[flagIndex + 1] as string;
  }
  return process.env.FIVE_E_TOOLS_SRC ?? '.cache/5etools-src';
}

export function readDataFile<T>(inputDir: string, relativePath: string): T {
  const fullPath = join(inputDir, 'data', relativePath);
  return JSON.parse(readFileSync(fullPath, 'utf8')) as T;
}

export function readSourceCommit(inputDir: string): string {
  try {
    const head = readFileSync(join(inputDir, '.git', 'HEAD'), 'utf8').trim();
    const ref = head.startsWith('ref: ') ? head.slice(5) : undefined;
    return ref ? readFileSync(join(inputDir, '.git', ref), 'utf8').trim() : head;
  } catch {
    try {
      return execFileSync('git', ['-C', inputDir, 'rev-parse', 'HEAD'], {
        encoding: 'utf8',
      }).trim();
    } catch {
      return 'unknown';
    }
  }
}

export function keepEntry(raw: { source: string; _copy?: unknown }): boolean {
  return !raw._copy;
}

export function loadSourceNames(inputDir: string): Record<string, string> {
  const names: Record<string, string> = { ...EXTRA_SOURCE_NAMES };
  for (const meta of loadBookAndAdventureMeta(inputDir)) names[meta.source] = meta.name;
  return names;
}

let sourceRanks = new Map<string, number>();

export function setSourceRanks(ranks: Map<string, number>): void {
  sourceRanks = ranks;
}

export function sourceRank(source: string): number {
  return sourceRanks.get(source) ?? 0;
}

export function loadSourceRanks(inputDir: string): Map<string, number> {
  const ranks = new Map<string, number>();
  for (const meta of loadBookAndAdventureMeta(inputDir)) {
    ranks.set(meta.source, meta.published ? Date.parse(meta.published) : 0);
  }
  return ranks;
}

interface FluffEntry {
  name: string;
  source: string;
  images?: Array<{ href?: { type?: string; path?: string } }>;
  entries?: Entry[];
}

function readFluffEntries(
  inputDir: string,
  relativePaths: string[],
  key: string,
): FluffEntry[] {
  const entries: FluffEntry[] = [];
  for (const relativePath of relativePaths) {
    try {
      const data = readDataFile<Record<string, FluffEntry[]>>(inputDir, relativePath);
      entries.push(...(data[key] ?? []));
    } catch {
      continue;
    }
  }
  return resolveCopies(entries);
}

export function loadFluffImages(
  inputDir: string,
  relativePath: string,
  key: string,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of readFluffEntries(inputDir, [relativePath], key)) {
    const path = entry.images?.find((i) => i.href?.type === 'internal')?.href?.path;
    if (path) map.set(`${entry.name.toLowerCase()}|${entry.source}`, path);
  }
  return map;
}

export function loadAllFluffImages(
  inputDir: string,
  subDir: string,
  filePrefix: string,
  key: string,
): Map<string, string> {
  const map = new Map<string, string>();
  const dir = join(inputDir, 'data', subDir);
  let files: string[];
  try {
    files = readdirSync(dir).filter(
      (f) => f.startsWith(filePrefix) && f.endsWith('.json'),
    );
  } catch {
    return map;
  }
  const entries = readFluffEntries(
    inputDir,
    files.map((file) => join(subDir, file)),
    key,
  );
  for (const entry of entries) {
    const path = entry.images?.find((i) => i.href?.type === 'internal')?.href?.path;
    if (path) map.set(`${entry.name.toLowerCase()}|${entry.source}`, path);
  }
  return map;
}

import type { GalleryImage } from '../../src/data/compendium/types';

export interface FluffData {
  entries: Entry[];
  images: GalleryImage[];
}

interface RawFluff {
  name: string;
  source: string;
  entries?: Entry[];
  images?: Array<{
    href?: { type?: string; path?: string };
    title?: string;
    credit?: string;
  }>;
}

function fluffImagePaths(images: RawFluff['images']): GalleryImage[] {
  if (!images?.length) return [];
  return images
    .filter((i) => i.href?.type === 'internal' && i.href.path)
    .map((i) => ({
      path: i.href!.path!,
      ...(i.title ? { title: i.title } : {}),
      ...(i.credit ? { credit: i.credit } : {}),
    }));
}

export function fluffFilesIn(
  inputDir: string,
  subDir: string,
  filePrefix: string,
): string[] {
  try {
    return readdirSync(join(inputDir, 'data', subDir))
      .filter((f) => f.startsWith(filePrefix) && f.endsWith('.json'))
      .map((f) => join(subDir, f));
  } catch {
    return [];
  }
}

export function loadFluff(
  inputDir: string,
  relativePaths: string[],
  key: string,
): Map<string, FluffData> {
  const entries = readFluffEntries(inputDir, relativePaths, key) as RawFluff[];
  const out = new Map<string, FluffData>();
  for (const entry of entries) {
    const resolved = {
      entries: entry.entries ?? [],
      images: fluffImagePaths(entry.images),
    };
    if (resolved.entries.length || resolved.images.length) {
      out.set(`${entry.name.toLowerCase()}|${entry.source}`, resolved);
    }
  }
  return out;
}

export interface LegendaryGroup {
  lairActions?: Entry[];
  regionalEffects?: Entry[];
  mythicEncounter?: Entry[];
}

export function loadLegendaryGroups(inputDir: string): Map<string, LegendaryGroup> {
  const map = new Map<string, LegendaryGroup>();
  let data: { legendaryGroup?: Array<LegendaryGroup & { name: string; source: string }> };
  try {
    data = readDataFile(inputDir, join('bestiary', 'legendarygroups.json'));
  } catch {
    return map;
  }
  for (const group of resolveCopies(data.legendaryGroup ?? [])) {
    map.set(`${group.name.toLowerCase()}|${group.source}`, {
      ...(group.lairActions ? { lairActions: group.lairActions } : {}),
      ...(group.regionalEffects ? { regionalEffects: group.regionalEffects } : {}),
      ...(group.mythicEncounter ? { mythicEncounter: group.mythicEncounter } : {}),
    });
  }
  return map;
}
