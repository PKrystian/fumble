import { useEffect, useState } from 'react';
import type {
  BackgroundEntry,
  ClassEntry,
  ClassSubclass,
  SpeciesEntry,
} from '@/data/compendium/types';
import type { Entry, EntryNode } from '@/data/compendium/entry';
import { getCategory } from '@/features/compendium/categories';
import { stripMarkup } from '@/data/transform/util';
import { SKILLS, type AbilityKey, type Character, type FeatureItem } from './model';
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

function findByName<T extends { name: string; hidden?: boolean }>(
  items: T[],
  name: string,
): T | undefined {
  const term = name.trim().toLowerCase();
  if (!term) return undefined;
  const matches = items.filter((i) => i.name.toLowerCase() === term);
  return matches.find((i) => !i.hidden) ?? matches[0];
}

function useCompendiumEntryByName<T extends { name: string; hidden?: boolean }>(
  categoryId: 'classes' | 'species' | 'backgrounds',
  name: string,
): T | undefined {
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    const category = getCategory(categoryId);
    if (!category) return;
    let cancelled = false;
    category.load().then((loaded) => {
      if (!cancelled) setItems(loaded as unknown as T[]);
    });
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  return findByName(items, name);
}

export function useClassEntry(className: string): ClassEntry | undefined {
  return useCompendiumEntryByName<ClassEntry>('classes', className);
}

export function useSpeciesEntry(species: string): SpeciesEntry | undefined {
  return useCompendiumEntryByName<SpeciesEntry>('species', species);
}

export function useBackgroundEntry(background: string): BackgroundEntry | undefined {
  return useCompendiumEntryByName<BackgroundEntry>('backgrounds', background);
}

export function findSubclass(
  cls: ClassEntry | undefined,
  subclass: string,
): ClassSubclass | undefined {
  if (!cls || !subclass.trim()) return undefined;
  const term = subclass.trim().toLowerCase();
  return cls.subclasses.find((s) => s.name.toLowerCase() === term);
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
): Partial<Character> {
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
    const saves = cls.savingThrows
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

  if (background?.skills) {
    const backgroundSkillIds = parseFixedSkillIds(background.skills);
    const merged = new Set([...character.skillProficiencies, ...backgroundSkillIds]);
    patch.skillProficiencies = [...merged];
  }

  return patch;
}
