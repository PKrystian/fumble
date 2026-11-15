export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export const ABILITY_NAMES: Record<AbilityKey, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

export interface Skill {
  id: string;
  name: string;
  ability: AbilityKey;
}

export const SKILLS: Skill[] = [
  { id: 'acrobatics', name: 'Acrobatics', ability: 'dex' },
  { id: 'animal-handling', name: 'Animal Handling', ability: 'wis' },
  { id: 'arcana', name: 'Arcana', ability: 'int' },
  { id: 'athletics', name: 'Athletics', ability: 'str' },
  { id: 'deception', name: 'Deception', ability: 'cha' },
  { id: 'history', name: 'History', ability: 'int' },
  { id: 'insight', name: 'Insight', ability: 'wis' },
  { id: 'intimidation', name: 'Intimidation', ability: 'cha' },
  { id: 'investigation', name: 'Investigation', ability: 'int' },
  { id: 'medicine', name: 'Medicine', ability: 'wis' },
  { id: 'nature', name: 'Nature', ability: 'int' },
  { id: 'perception', name: 'Perception', ability: 'wis' },
  { id: 'performance', name: 'Performance', ability: 'cha' },
  { id: 'persuasion', name: 'Persuasion', ability: 'cha' },
  { id: 'religion', name: 'Religion', ability: 'int' },
  { id: 'sleight-of-hand', name: 'Sleight of Hand', ability: 'dex' },
  { id: 'stealth', name: 'Stealth', ability: 'dex' },
  { id: 'survival', name: 'Survival', ability: 'wis' },
];

export interface NamedItem {
  id: string;
  name: string;
  notes: string;
}

export type ArmorType = 'light' | 'medium' | 'heavy' | 'shield';

export function parseArmorType(type: string): ArmorType | undefined {
  const value = type.toLowerCase();
  if (value.includes('shield') || value.includes('tarcza')) return 'shield';
  if (value.includes('light armor') || value.includes('lekka zbroja')) return 'light';
  if (
    value.includes('medium armor') ||
    value.includes('średnia zbroja') ||
    value.includes('średni pancerz')
  ) {
    return 'medium';
  }
  if (value.includes('heavy armor') || value.includes('ciężka zbroja')) return 'heavy';
  return undefined;
}

export interface Currency {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

export const CURRENCY_KEYS: Array<keyof Currency> = ['pp', 'gp', 'ep', 'sp', 'cp'];

export interface DeathSaves {
  successes: number;
  failures: number;
}

export const SYNCED_FIELDS = [
  'speed',
  'savingThrows',
  'armorProficiencies',
  'weaponProficiencies',
  'toolProficiencies',
] as const;

export type SyncedField = (typeof SYNCED_FIELDS)[number];

export const LEGACY_SYNC = 'legacy';

export interface InventoryItem extends NamedItem {
  quantity: number;

  itemId?: string;
  armorType?: ArmorType;
  baseAc?: number;
  equipped?: boolean;
}

export interface UnarmoredDefense {
  base: number;
  abilities: AbilityKey[];
  allowShield: boolean;
  source: string;
}

export interface FeatureItem extends NamedItem {
  source: string;

  auto?: boolean;
  featId?: string;
}

export interface SpellSlotLevel {
  level: number;

  longRestMax: number;
  usedLongRest: number;

  shortRestMax: number;
  usedShortRest: number;
}

export interface KnownSpell {
  id: string;
  name: string;
  level: number;
  prepared: boolean;
  auto?: boolean;
  source?: string;
  spellId?: string;
  concentration?: boolean;
}

export interface Speeds {
  walk: number;
  swim: number;
  climb: number;
  fly: number;
}

export interface HitPoints {
  current: number;
  max: number;
  temp: number;
}

export type CharacterRole = 'party' | 'dm';

export interface Character {
  id: string;
  name: string;
  className: string;
  subclass: string;
  level: number;
  species: string;
  background: string;

  portrait: string;

  role?: CharacterRole;

  abilities: Record<AbilityKey, number>;
  savingThrowProficiencies: AbilityKey[];
  skillProficiencies: string[];
  skillExpertise: string[];
  proficiencyBonusOverride: number | null;

  ac: number;
  acOverride: number | null;
  unarmoredDefense: UnarmoredDefense | null;
  initiativeOverride: number | null;
  speed: Speeds;
  hp: HitPoints;
  hitDice: string;
  hitDiceUsed: number;
  deathSaves: DeathSaves;
  inspiration: boolean;

  spellcastingAbility: AbilityKey | null;
  spellSlots: SpellSlotLevel[];
  spells: KnownSpell[];

  autoSyncFeatures: boolean;
  syncSignature: string;
  manualFields: SyncedField[];

  currency: Currency;
  actions: NamedItem[];
  inventory: InventoryItem[];
  features: FeatureItem[];

  weaponProficiencies: string;
  armorProficiencies: string;
  toolProficiencies: string;
  languages: string;
  defenses: string;
  conditions: string;
  concentration: string;
  notes: string;

  createdAt: number;
  updatedAt: number;
}

export function uid(): string {
  return crypto.randomUUID();
}

export function createCharacter(name = 'New Character'): Character {
  const now = Date.now();
  return {
    id: uid(),
    name,
    className: '',
    subclass: '',
    level: 1,
    species: '',
    background: '',
    portrait: '',
    role: 'party',
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    savingThrowProficiencies: [],
    skillProficiencies: [],
    skillExpertise: [],
    proficiencyBonusOverride: null,
    ac: 10,
    acOverride: null,
    unarmoredDefense: null,
    initiativeOverride: null,
    speed: { walk: 30, swim: 0, climb: 0, fly: 0 },
    hp: { current: 0, max: 0, temp: 0 },
    hitDice: '',
    hitDiceUsed: 0,
    deathSaves: { successes: 0, failures: 0 },
    inspiration: false,
    spellcastingAbility: null,
    spellSlots: [],
    spells: [],
    autoSyncFeatures: true,
    syncSignature: '',
    manualFields: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    actions: [],
    inventory: [],
    features: [],
    weaponProficiencies: '',
    armorProficiencies: '',
    toolProficiencies: '',
    languages: '',
    defenses: '',
    conditions: '',
    concentration: '',
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function isDmCharacter(character: Character): boolean {
  return character.role === 'dm';
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function proficiencyBonus(character: Character): number {
  return character.proficiencyBonusOverride ?? Math.ceil(character.level / 4) + 1;
}

export function savingThrowBonus(character: Character, ability: AbilityKey): number {
  const base = abilityModifier(character.abilities[ability]);
  const proficient = character.savingThrowProficiencies.includes(ability);
  return base + (proficient ? proficiencyBonus(character) : 0);
}

export function skillBonus(character: Character, skill: Skill): number {
  const base = abilityModifier(character.abilities[skill.ability]);
  const pb = proficiencyBonus(character);
  if (character.skillExpertise.includes(skill.id)) return base + pb * 2;
  if (character.skillProficiencies.includes(skill.id)) return base + pb;
  return base;
}

export function passiveScore(character: Character, skillId: string): number {
  const skill = SKILLS.find((s) => s.id === skillId);
  if (!skill) return 10;
  return 10 + skillBonus(character, skill);
}

const DEX_CAP: Record<ArmorType, number | null> = {
  light: null,
  medium: 2,
  heavy: 0,
  shield: null,
};

export interface ArmorClassBreakdown {
  total: number;
  parts: string[];
  manual: boolean;
}

export interface ArmorClassLabels {
  base: string;
  abilityAbbr: (key: AbilityKey) => string;
}

const DEFAULT_AC_LABELS: ArmorClassLabels = {
  base: 'Base',
  abilityAbbr: (key) => ABILITY_NAMES[key].slice(0, 3),
};

export function armorClassBreakdown(
  character: Character,
  labels: ArmorClassLabels = DEFAULT_AC_LABELS,
): ArmorClassBreakdown {
  if (character.acOverride !== null) {
    return { total: character.acOverride, parts: ['manual'], manual: true };
  }

  const dex = abilityModifier(character.abilities.dex);
  const equipped = character.inventory.filter((i) => i.equipped && i.armorType);
  const armor = equipped.find((i) => i.armorType && i.armorType !== 'shield');
  const shield = equipped.find((i) => i.armorType === 'shield');

  const parts: string[] = [];
  let total: number;

  if (armor?.armorType && armor.armorType !== 'shield') {
    const base = armor.baseAc ?? 10;
    const cap = DEX_CAP[armor.armorType];
    const dexBonus = cap === null ? dex : Math.min(dex, cap);
    total = base + dexBonus;
    parts.push(`${armor.name} ${base}`);
    if (dexBonus !== 0)
      parts.push(`${labels.abilityAbbr('dex')} ${formatModifier(dexBonus)}`);
  } else if (character.unarmoredDefense) {
    const { base, abilities } = character.unarmoredDefense;
    total = base;
    parts.push(`${character.unarmoredDefense.source} ${base}`);
    for (const key of abilities) {
      const mod = abilityModifier(character.abilities[key]);
      total += mod;
      parts.push(`${labels.abilityAbbr(key)} ${formatModifier(mod)}`);
    }
  } else {
    total = 10 + dex;
    parts.push(`${labels.base} 10`);
    if (dex !== 0) parts.push(`${labels.abilityAbbr('dex')} ${formatModifier(dex)}`);
  }

  const shieldAllowed =
    armor || !character.unarmoredDefense || character.unarmoredDefense.allowShield;
  if (shield && shieldAllowed) {
    const bonus = shield.baseAc ?? 2;
    total += bonus;
    parts.push(`${shield.name} ${formatModifier(bonus)}`);
  }

  return { total, parts, manual: false };
}

export function armorClass(character: Character): number {
  return armorClassBreakdown(character).total;
}

export function initiativeBonus(character: Character): number {
  return character.initiativeOverride ?? abilityModifier(character.abilities.dex);
}

export function spellSaveDc(character: Character): number | null {
  if (!character.spellcastingAbility) return null;
  return (
    8 +
    proficiencyBonus(character) +
    abilityModifier(character.abilities[character.spellcastingAbility])
  );
}

export function spellAttackBonus(character: Character): number | null {
  if (!character.spellcastingAbility) return null;
  return (
    proficiencyBonus(character) +
    abilityModifier(character.abilities[character.spellcastingAbility])
  );
}

export const MAX_SPELL_LEVEL = 9;

export function getSpellSlot(character: Character, level: number): SpellSlotLevel {
  return (
    character.spellSlots.find((s) => s.level === level) ?? {
      level,
      longRestMax: 0,
      usedLongRest: 0,
      shortRestMax: 0,
      usedShortRest: 0,
    }
  );
}

export function setSpellSlot(
  slots: SpellSlotLevel[],
  level: number,
  patch: Partial<SpellSlotLevel>,
): SpellSlotLevel[] {
  const existing = slots.find((s) => s.level === level);
  const base: SpellSlotLevel = existing ?? {
    level,
    longRestMax: 0,
    usedLongRest: 0,
    shortRestMax: 0,
    usedShortRest: 0,
  };
  const next = { ...base, ...patch };
  return existing
    ? slots.map((s) => (s.level === level ? next : s))
    : [...slots, next].sort((a, b) => a.level - b.level);
}

export const LIMITS = {
  level: { min: 1, max: 20 },
  ability: { min: 1, max: 30 },
  hp: { min: 0, max: 9999 },
  speed: { min: 0, max: 999 },
  ac: { min: 0, max: 99 },
  quantity: { min: 0, max: 99999 },
  currency: { min: 0, max: 9999999 },
  spellLevel: { min: 0, max: 9 },
  slots: { min: 0, max: 20 },
} as const;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const NO_DEATH_SAVES: DeathSaves = { successes: 0, failures: 0 };

export function applyDamage(hp: HitPoints, amount: number): HitPoints {
  const value = Math.max(0, Math.floor(amount));
  const fromTemp = Math.min(hp.temp, value);
  const remaining = value - fromTemp;
  return {
    ...hp,
    temp: hp.temp - fromTemp,
    current: Math.max(0, hp.current - remaining),
  };
}

export function applyHealing(hp: HitPoints, amount: number): HitPoints {
  const value = Math.max(0, Math.floor(amount));
  return { ...hp, current: Math.max(hp.current, Math.min(hp.max, hp.current + value)) };
}

export function damageCharacter(
  character: Character,
  amount: number,
): Partial<Character> {
  const hp = applyDamage(character.hp, amount);
  return { hp };
}

export function healCharacter(character: Character, amount: number): Partial<Character> {
  const hp = applyHealing(character.hp, amount);
  return hp.current > 0 ? { hp, deathSaves: NO_DEATH_SAVES } : { hp };
}

export type DeathSaveResult = 'success' | 'failure' | 'critical' | 'fumble';

export function deathSaveResult(roll: number): DeathSaveResult {
  if (roll >= 20) return 'critical';
  if (roll <= 1) return 'fumble';
  return roll >= 10 ? 'success' : 'failure';
}

export function applyDeathSave(
  character: Character,
  result: DeathSaveResult,
): Partial<Character> {
  if (result === 'critical') {
    return { hp: { ...character.hp, current: 1 }, deathSaves: NO_DEATH_SAVES };
  }
  const { successes, failures } = character.deathSaves;
  if (result === 'success') {
    return { deathSaves: { failures, successes: Math.min(3, successes + 1) } };
  }
  return {
    deathSaves: {
      successes,
      failures: Math.min(3, failures + (result === 'fumble' ? 2 : 1)),
    },
  };
}

export function hitDieSize(character: Character): number | null {
  const match = /d(\d+)/i.exec(character.hitDice);
  const size = match ? Number(match[1]) : NaN;
  return Number.isInteger(size) && size > 0 ? size : null;
}

export function hitDiceRemaining(character: Character): number {
  return Math.max(0, character.level - character.hitDiceUsed);
}

export function spendHitDie(character: Character, rolled: number): Partial<Character> {
  return {
    ...healCharacter(character, Math.max(0, rolled)),
    hitDiceUsed: Math.min(character.level, character.hitDiceUsed + 1),
  };
}

export function shortRest(character: Character): Partial<Character> {
  return {
    spellSlots: character.spellSlots.map((slot) => ({ ...slot, usedShortRest: 0 })),
  };
}

export function longRestHitDice(character: Character): number {
  return Math.min(character.hitDiceUsed, Math.max(1, Math.floor(character.level / 2)));
}

export function longRest(character: Character): Partial<Character> {
  return {
    hp: { ...character.hp, current: character.hp.max, temp: 0 },
    deathSaves: NO_DEATH_SAVES,
    hitDiceUsed: character.hitDiceUsed - longRestHitDice(character),
    spellSlots: character.spellSlots.map((slot) => ({
      ...slot,
      usedShortRest: 0,
      usedLongRest: 0,
    })),
  };
}
