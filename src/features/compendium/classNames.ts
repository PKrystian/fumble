import type { Locale } from '@/i18n/locales';

export type ClassId =
  | 'artificer'
  | 'barbarian'
  | 'bard'
  | 'cleric'
  | 'druid'
  | 'fighter'
  | 'monk'
  | 'paladin'
  | 'ranger'
  | 'rogue'
  | 'sorcerer'
  | 'warlock'
  | 'wizard'
  | 'witch';

export const CLASS_ALIASES: Record<ClassId, readonly string[]> = {
  artificer: [
    'Artificer',
    'artificera',
    'artificerem',
    'artyficer',
    'artyficera',
    'artyficerem',
    'Rzemieślnik',
    'rzemieślnika',
    'rzemieślnikiem',
    'Twórca',
    'twórcy',
    'twórcę',
    'twórcą',
  ],
  barbarian: [
    'Barbarian',
    'barbarian',
    'Barbarzyńca',
    'barbarzyńca',
    'barbarzyńcę',
    'barbarzyńcą',
    'barbarzyńcy',
  ],
  bard: ['Bard', 'barda', 'bardem', 'bardowie'],
  cleric: [
    'Cleric',
    'clerica',
    'Kapłan',
    'kapłana',
    'kapłanem',
    'kapłani',
    'Duchowny',
    'duchownego',
    'duchownym',
    'Kleryk',
    'kleryka',
    'klerykiem',
  ],
  druid: ['Druid', 'druida', 'druidem'],
  fighter: ['Fighter', 'fightera', 'Wojownik', 'wojownika', 'wojownikiem', 'wojownicy'],
  monk: ['Monk', 'monka', 'Mnich', 'mnicha', 'mnichem'],
  paladin: ['Paladin', 'paladyna', 'paladynem', 'Paladyn'],
  ranger: [
    'Ranger',
    'rangera',
    'Łowca',
    'łowcę',
    'łowcą',
    'łowcy',
    'Leśniczy',
    'leśniczego',
    'leśniczym',
    'Strażnik',
    'strażnika',
    'strażnikiem',
  ],
  rogue: [
    'Rogue',
    'roguea',
    'Łotr',
    'łotra',
    'łotrem',
    'Łotrzyk',
    'łotrzyka',
    'łotrzykiem',
  ],
  sorcerer: ['Sorcerer', 'sorcerera', 'Zaklinacz', 'zaklinacza', 'zaklinaczem'],
  warlock: [
    'Warlock',
    'warlocka',
    'Czarownik',
    'czarownika',
    'czarownikiem',
    'Czarnoksiężnik',
    'czarnoksiężnika',
    'czarnoksiężnikiem',
  ],
  wizard: ['Wizard', 'wizarda', 'wizaarda', 'Czarodziej', 'czarodzieja', 'czarodziejem'],
  witch: ['Witch', 'Wiedźma', 'wiedźmę', 'wiedźmy', 'wiedźmą'],
};

const CLASS_FILTER_NAMES: Record<ClassId, string> = {
  artificer: 'Artificer',
  barbarian: 'Barbarian',
  bard: 'Bard',
  cleric: 'Cleric',
  druid: 'Druid',
  fighter: 'Fighter',
  monk: 'Monk',
  paladin: 'Paladin',
  ranger: 'Ranger',
  rogue: 'Rogue',
  sorcerer: 'Sorcerer',
  warlock: 'Warlock',
  wizard: 'Wizard',
  witch: 'Witch',
};

const CLASS_FILTER_LABELS: Record<ClassId, Record<Locale, string>> = {
  artificer: { en: 'Artificer', pl: 'Rzemieślnik' },
  barbarian: { en: 'Barbarian', pl: 'Barbarzyńca' },
  bard: { en: 'Bard', pl: 'Bard' },
  cleric: { en: 'Cleric', pl: 'Kleryk' },
  druid: { en: 'Druid', pl: 'Druid' },
  fighter: { en: 'Fighter', pl: 'Wojownik' },
  monk: { en: 'Monk', pl: 'Mnich' },
  paladin: { en: 'Paladin', pl: 'Paladyn' },
  ranger: { en: 'Ranger', pl: 'Leśniczy' },
  rogue: { en: 'Rogue', pl: 'Łotr' },
  sorcerer: { en: 'Sorcerer', pl: 'Zaklinacz' },
  warlock: { en: 'Warlock', pl: 'Czarnoksiężnik' },
  wizard: { en: 'Wizard', pl: 'Czarodziej' },
  witch: { en: 'Witch', pl: 'Wiedźma' },
};

const CLASS_ALIAS_TO_ID = new Map<string, ClassId>();
for (const [id, aliases] of Object.entries(CLASS_ALIASES) as Array<
  [ClassId, readonly string[]]
>) {
  for (const alias of aliases) CLASS_ALIAS_TO_ID.set(normalizeClassName(alias), id);
}

export const CLASS_REFERENCE_NAMES = Object.values(CLASS_ALIASES)
  .flat()
  .sort((a, b) => b.length - a.length);

export function normalizeClassName(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replaceAll('ł', 'l')
    .replaceAll('’', "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[']/g, '');
}

export function classIdForName(name: string): ClassId | undefined {
  return CLASS_ALIAS_TO_ID.get(normalizeClassName(name));
}

export function canonicalClassFilterValue(value: string): string {
  const id = classIdForName(value);
  return id ? CLASS_FILTER_NAMES[id] : value.trim();
}

export function classFilterLabel(value: string, locale: Locale): string {
  const id =
    classIdForName(value) ??
    (Object.entries(CLASS_FILTER_NAMES).find(([, name]) => name === value)?.[0] as
      ClassId | undefined);
  return id ? CLASS_FILTER_LABELS[id][locale] : value;
}
