import { useEffect, useState } from 'react';
import type {
  BackgroundEntry,
  ClassEntry,
  ClassFeature,
  ClassSubclass,
  SpeciesEntry,
  SpellEntry,
} from '@/data/compendium/types';
import type { Entry, EntryNode } from '@/data/compendium/entry';
import { getCategory } from '@/features/compendium/categories';
import { loadLocalizedItems } from '@/data/compendium/overlay';
import { useLocale } from '@/i18n/pathUtils';
import { stripMarkup } from '@/data/transform/util';
import {
  SKILLS,
  type AbilityKey,
  type Character,
  type FeatureItem,
  type KnownSpell,
  type UnarmoredDefense,
} from './model';
import { uid } from './model';

const ABILITY_NAME_TO_KEY: Record<string, AbilityKey> = {
  strength: 'str',
  dexterity: 'dex',
  constitution: 'con',
  intelligence: 'int',
  wisdom: 'wis',
  charisma: 'cha',
};

function entriesToPlainText(entries: Entry[]): string {
  const lines: string[] = [];
  const visit = (entry: Entry): void => {
    if (typeof entry === 'string') {
      lines.push(stripMarkup(entry));
      return;
    }
    const node = entry as EntryNode;
    if (typeof node.name === 'string') lines.push(stripMarkup(node.name));
    if (Array.isArray(node.entries)) node.entries.forEach(visit);
  };
  entries.forEach(visit);
  return lines.filter(Boolean).join('\n\n');
}

interface Identifiable {
  id: string;
  name: string;
  hidden?: boolean;
}

function findByName<T extends { name: string; hidden?: boolean }>(
  items: T[],
  name: string,
): T | undefined {
  const term = name.trim().toLowerCase();
  const matches = items.filter((i) => i.name.toLowerCase() === term);
  return matches.find((i) => !i.hidden) ?? matches[0];
}

function resolveEntry<T extends Identifiable>(
  value: string,
  localized: T[],
  english: T[],
): T | undefined {
  const term = value.trim();
  if (!term) return undefined;

  const byId = localized.find((i) => i.id === term);
  if (byId) return byId;

  const legacy = findByName(localized, term) ?? findByName(english, term);
  return legacy ? (localized.find((i) => i.id === legacy.id) ?? legacy) : undefined;
}

export interface EntryPair<T> {
  localized: T | undefined;
  english: T | undefined;
}

function useCompendiumEntry<T extends Identifiable>(
  categoryId: 'classes' | 'species' | 'backgrounds',
  value: string,
): EntryPair<T> {
  const locale = useLocale();
  const [localized, setLocalized] = useState<T[]>([]);
  const [english, setEnglish] = useState<T[]>([]);

  useEffect(() => {
    const category = getCategory(categoryId);
    if (!category) return;
    let cancelled = false;
    const load = category.load;
    void Promise.all([
      loadLocalizedItems(categoryId, load, locale),
      locale === 'en' ? load() : loadLocalizedItems(categoryId, load, 'en'),
    ]).then(([localizedItems, englishItems]) => {
      if (cancelled) return;
      setLocalized(localizedItems as unknown as T[]);
      setEnglish(englishItems as unknown as T[]);
    });
    return () => {
      cancelled = true;
    };
  }, [categoryId, locale]);

  const resolved = resolveEntry(value, localized, english);
  return {
    localized: resolved,
    english: resolved ? english.find((i) => i.id === resolved.id) : undefined,
  };
}

export function useClassEntryPair(className: string): EntryPair<ClassEntry> {
  return useCompendiumEntry<ClassEntry>('classes', className);
}

export function useSpeciesEntryPair(species: string): EntryPair<SpeciesEntry> {
  return useCompendiumEntry<SpeciesEntry>('species', species);
}

export function useBackgroundEntryPair(background: string): EntryPair<BackgroundEntry> {
  return useCompendiumEntry<BackgroundEntry>('backgrounds', background);
}

export function useClassEntry(className: string): ClassEntry | undefined {
  return useClassEntryPair(className).localized;
}

export type SpellIndex = Map<string, SpellEntry>;

export function useSpellIndex(): SpellIndex {
  const locale = useLocale();
  const [index, setIndex] = useState<SpellIndex>(new Map());

  useEffect(() => {
    const category = getCategory('spells');
    if (!category) return;
    let cancelled = false;
    void loadLocalizedItems('spells', category.load, locale).then((items) => {
      if (cancelled) return;
      setIndex(new Map((items as SpellEntry[]).map((s) => [s.id, s])));
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  return index;
}

export function findSubclassPair(
  pair: EntryPair<ClassEntry>,
  subclass: string,
): EntryPair<ClassSubclass> {
  const localized = findSubclass(pair.localized, subclass);
  if (!localized) return { localized: undefined, english: undefined };

  const localizedList = pair.localized!.subclasses;
  const englishList = pair.english?.subclasses ?? [];
  const index = localizedList.indexOf(localized);
  const english =
    englishList.length === localizedList.length && index >= 0
      ? englishList[index]
      : englishList.find((s) => s.source === localized.source);

  return { localized, english };
}

export function subclassKey(subclass: { name: string; source: string }): string {
  return `${subclass.name}|${subclass.source}`;
}

export function findSubclass(
  cls: ClassEntry | undefined,
  subclass: string,
): ClassSubclass | undefined {
  if (!cls || !subclass.trim()) return undefined;
  const term = subclass.trim().toLowerCase();
  return (
    cls.subclasses.find((s) => subclassKey(s).toLowerCase() === term) ??
    cls.subclasses.find((s) => s.name.toLowerCase() === term)
  );
}

function slugifySpell(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function spellSlugsIn(text: string): string[] {
  return [...text.matchAll(/\{@spell\s+([^}|]+)/gi)].map((m) => slugifySpell(m[1]!));
}

function parseTableLevel(cell: string): number | null {
  const match = /^\s*(\d+)/.exec(cell);
  return match ? Number(match[1]) : null;
}

function isSpellTable(node: EntryNode): boolean {
  if (node.type !== 'table' || !Array.isArray(node.rows)) return false;
  const labels = (node.colLabels ?? []) as string[];
  return labels.some((label) => /spell/i.test(label));
}

function collectGrantedSpellSlugs(
  features: ClassFeature[] | undefined,
  characterLevel: number,
): string[] {
  const slugs: string[] = [];
  if (!features) return slugs;

  const visit = (entry: Entry): void => {
    if (typeof entry === 'string') {
      for (const m of entry.matchAll(/always have (?:the )?\{@spell\s+([^}|]+)/gi)) {
        slugs.push(slugifySpell(m[1]!));
      }
      return;
    }
    const node = entry as EntryNode;
    if (isSpellTable(node)) {
      for (const row of node.rows as string[][]) {
        const rowLevel = parseTableLevel(row[0] ?? '');
        if (rowLevel !== null && rowLevel > characterLevel) continue;
        const cells = rowLevel === null ? row : row.slice(1);
        for (const cell of cells) slugs.push(...spellSlugsIn(String(cell)));
      }
      return;
    }
    if (Array.isArray(node.entries)) node.entries.forEach(visit);
  };

  for (const feature of features) {
    if (feature.level > characterLevel) continue;
    feature.entries.forEach(visit);
  }
  return [...new Set(slugs.filter(Boolean))];
}

function parseUnarmoredDefense(
  features: ClassFeature[] | undefined,
  characterLevel: number,
): UnarmoredDefense | null {
  if (!features) return null;

  for (const feature of features) {
    if (feature.level > characterLevel) continue;
    const text = entriesToPlainText(feature.entries);
    const match =
      /Armor Class equals (\d+) plus your ([A-Za-z]+)(?: and your| and) ([A-Za-z]+) modifiers/i.exec(
        text,
      ) ?? /Armor Class equals (\d+) plus your ([A-Za-z]+) modifier/i.exec(text);
    if (!match) continue;

    const abilities = [match[2], match[3]]
      .filter((n): n is string => Boolean(n))
      .map((n) => ABILITY_NAME_TO_KEY[n.toLowerCase()])
      .filter((k): k is AbilityKey => Boolean(k));
    if (abilities.length === 0) continue;

    return {
      base: Number(match[1]),
      abilities,
      allowShield: /Shield and still gain this benefit/i.test(text),
      source: feature.name,
    };
  }
  return null;
}

function parseFixedSkillIds(skillList: string): string[] {
  if (skillList.toLowerCase().includes('choose')) return [];
  return skillList
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((name) => SKILLS.find((skill) => skill.name.toLowerCase() === name)?.id)
    .filter((id): id is string => Boolean(id));
}

export function syncClassFeatures(
  character: Character,
  cls: ClassEntry | undefined,
  subclass: ClassSubclass | undefined,
  species: SpeciesEntry | undefined,
  background: BackgroundEntry | undefined,
  mechanics: {
    cls?: ClassEntry | undefined;
    background?: BackgroundEntry | undefined;
    subclass?: ClassSubclass | undefined;
    spellIndex?: SpellIndex;
  } = {},
): Partial<Character> {
  const clsMechanics = mechanics.cls ?? cls;
  const backgroundMechanics = mechanics.background ?? background;
  const manualFeatures = character.features.filter((f) => !f.auto);
  const autoFeatures: FeatureItem[] = [];

  if (cls) {
    for (const feature of cls.features) {
      if (feature.level > character.level) continue;
      autoFeatures.push({
        id: uid(),
        name: feature.name,
        source: `${cls.name} ${feature.level}`,
        notes: entriesToPlainText(feature.entries),
        auto: true,
      });
    }
    if (subclass) {
      for (const feature of subclass.features) {
        if (feature.level > character.level) continue;
        autoFeatures.push({
          id: uid(),
          name: feature.name,
          source: `${subclass.name} ${feature.level}`,
          notes: entriesToPlainText(feature.entries),
          auto: true,
        });
      }
    }
  }

  if (species) {
    autoFeatures.push({
      id: uid(),
      name: species.name,
      source: 'Species',
      notes: entriesToPlainText(species.entries),
      auto: true,
    });
  }

  if (background?.feat) {
    autoFeatures.push({
      id: uid(),
      name: background.feat,
      source: 'Background',
      notes: entriesToPlainText(background.entries),
      auto: true,
    });
  }

  const patch: Partial<Character> = {
    features: [...manualFeatures, ...autoFeatures],
  };

  if (cls) {
    patch.hitDice = `${character.level}${cls.hitDie}`;
    const saves = clsMechanics!.savingThrows
      .split(',')
      .map((s) => ABILITY_NAME_TO_KEY[s.trim().toLowerCase()])
      .filter((k): k is AbilityKey => Boolean(k));
    if (saves.length > 0) patch.savingThrowProficiencies = saves;

    patch.armorProficiencies = cls.armorProficiencies;
    patch.weaponProficiencies = cls.weaponProficiencies;
  }

  const toolProficiencies = [cls?.toolProficiencies, background?.tools]
    .filter(Boolean)
    .join(', ');
  if (cls || background) patch.toolProficiencies = toolProficiencies;

  if (species) {
    patch.speed = {
      walk: species.walkSpeed,
      fly: species.flySpeed,
      swim: species.swimSpeed,
      climb: species.climbSpeed,
    };
  }

  if (backgroundMechanics?.skills) {
    const backgroundSkillIds = parseFixedSkillIds(backgroundMechanics.skills);
    const merged = new Set([...character.skillProficiencies, ...backgroundSkillIds]);
    patch.skillProficiencies = [...merged];
  }

  patch.unarmoredDefense =
    parseUnarmoredDefense(clsMechanics?.features, character.level) ??
    parseUnarmoredDefense((mechanics.subclass ?? subclass)?.features, character.level);

  const spellIndex = mechanics.spellIndex;
  if (spellIndex && spellIndex.size > 0 && (cls || subclass)) {
    const granted = [
      ...collectGrantedSpellSlugs(clsMechanics?.features, character.level).map(
        (slug) => [slug, clsMechanics!.name] as const,
      ),
      ...collectGrantedSpellSlugs(
        (mechanics.subclass ?? subclass)?.features,
        character.level,
      ).map((slug) => [slug, (subclass ?? mechanics.subclass)!.name] as const),
    ];

    const manualSpells = character.spells.filter((s) => !s.auto);
    const manualIds = new Set(manualSpells.map((s) => s.name.toLowerCase()));
    const seen = new Set<string>();
    const autoSpells: KnownSpell[] = [];

    for (const [slug, source] of granted) {
      if (seen.has(slug)) continue;
      seen.add(slug);
      const spell = spellIndex.get(slug);
      if (!spell || manualIds.has(spell.name.toLowerCase())) continue;
      autoSpells.push({
        id: uid(),
        name: spell.name,
        level: spell.level,
        prepared: true,
        auto: true,
        source,
      });
    }
    patch.spells = [...manualSpells, ...autoSpells];
  }

  return patch;
}
