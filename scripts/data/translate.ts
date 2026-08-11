import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Entry, EntryNode } from '../../src/data/compendium/entry';
import type { JsonObject, JsonValue } from '../../src/data/compendium/types';
import { SUPPORTED_LOCALES } from '../../src/i18n/locales';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
const BATCH_SIZE = 8;

interface Args {
  category?: string;
  book?: string;
  locale: string;
  limit?: number;
  provider: 'anthropic' | 'google';
  refresh?: boolean;
}

function parseArgs(): Args {
  const args: Partial<Args> = { locale: 'pl', provider: 'anthropic' };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === '--category') args.category = next();
    else if (arg === '--book') args.book = next();
    else if (arg === '--locale') args.locale = next();
    else if (arg === '--limit') args.limit = Number(next());
    else if (arg === '--provider') args.provider = next() as Args['provider'];
    else if (arg === '--refresh') args.refresh = true;
  }
  if (!args.category && !args.book) {
    throw new Error('Pass --category <id> or --book <id>.');
  }
  if (!SUPPORTED_LOCALES.some((l) => l.code === args.locale)) {
    throw new Error(
      `Unknown locale "${args.locale}" - add it to src/i18n/locales.ts first.`,
    );
  }
  if (args.provider !== 'anthropic' && args.provider !== 'google') {
    throw new Error(`Unknown translation provider "${args.provider}".`);
  }
  return args as Args;
}

async function callClaude(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Set ANTHROPIC_API_KEY in your environment.');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
  }
  const body = (await res.json()) as { content: Array<{ type: string; text?: string }> };
  const text = body.content.find((block) => block.type === 'text')?.text;
  if (!text) throw new Error('Anthropic response had no text content.');
  return text;
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1]! : text;
  return JSON.parse(raw);
}

const TRANSLATION_INSTRUCTIONS = (localeLabel: string) => `
You are translating Dungeons & Dragons 5e (2024) rules text into ${localeLabel} for a
fan-made toolkit. You will receive a JSON array of entries, each with an "id" and a
"name"/"entries" tree in 5etools' recursive markup format (strings and typed nodes
like {"type":"entries","name":"...","entries":[...]}).

Rules - follow exactly, this output feeds a running app and must not break it:
1. Translate every "name" field and every plain prose string into ${localeLabel}.
   Preserve the exact same JSON structure (same node types, same nesting, same
   array lengths) - only translate the human-readable text.
2. Inline tags like {@condition Incapacitated|XPHB}, {@variantrule Speed|XPHB},
   {@action Attack|XPHB}, {@skill Athletics|XPHB}, {@item Rope|XPHB}, {@dice 1d6},
   {@spell Fireball|XPHB} etc. are cross-references - the first segment (before
   the first "|") and the source code (second segment) are lookup keys and MUST
   stay in English exactly as given, character for character. To show translated
   text to the reader, ADD a third pipe segment with your ${localeLabel} translation,
   e.g. {@condition Incapacitated|XPHB} becomes {@condition Incapacitated|XPHB|<translated
   display text>}. If a tag already has a third segment, replace only that segment.
3. Tags with no display text at all ({@dice 1d6}, {@hit 5}, {@dc 15}, table dice
   headers, etc.) are numbers/mechanics, not prose - leave them completely untouched.
4. Do not translate the "id" field, "source" field, or any other non-prose keys.
5. Some entries include a "data" object containing the original 5etools record. Translate
   human-readable strings inside it, including nested arrays and objects, but preserve all
   object keys, mechanics, markup references, and array lengths.
6. Output ONLY a single JSON object (no prose, no markdown fences) shaped exactly
   like: { "<id>": { "name": "...", "entries": [...], "data": { ... } }, ... } - one
   key per input entry, using its original "id". Omit "data" when the input has none.

Entries to translate:
`;

interface TranslationEntry {
  id: string;
  name: string;
  entries: Entry[];
  data?: JsonObject;
}

const GOOGLE_CACHE_PATH = join(ROOT, '.cache/google-translate-pl-cache.json');
const GOOGLE_IGNORED_KEYS = new Set([
  'id',
  'source',
  'page',
  'srd52',
  '_copy',
  'min',
  'max',
  'diceExpression',
  'type',
  'crMin',
  'crMax',
  'seeAlsoCreature',
  'seeAlsoItem',
  'designers',
  'style',
  'image',
  'token',
  'path',
  'href',
  'url',
]);

function protectGoogleTags(text: string): { protectedText: string; tags: string[] } {
  const tags: string[] = [];
  const protectedText = text.replace(/\{@[^}]+\}/g, (tag) => {
    const token = `ZXQTAG${String(tags.length).padStart(4, '0')}QXZ`;
    tags.push(tag);
    return token;
  });
  return { protectedText, tags };
}

function restoreGoogleTags(text: string, tags: string[]): string {
  let result = text;
  tags.forEach((tag, index) => {
    const number = String(index).padStart(4, '0');
    const patterns = [
      new RegExp(`ZXQTAG${number}QXZ`, 'gi'),
      new RegExp(`ZXQ TAG ${number} QXZ`, 'gi'),
      new RegExp(`ZXQTAG ${number} QXZ`, 'gi'),
    ];
    for (const pattern of patterns) result = result.replace(pattern, tag);
  });
  if (/ZXQ\s*TAG/i.test(result)) throw new Error('A protected tag token was changed.');
  return result;
}

function restoreDiceExpressions(source: string, translated: string): string {
  let result = translated;
  const expressions = source.match(/\b\d*d\d+\b/gi) ?? [];
  for (const expression of expressions) {
    const kExpression = expression.replace('d', 'k');
    const kPattern = new RegExp(`\\b${kExpression}\\b`, 'i');
    const spacedKPattern = new RegExp(
      `\\b${expression.replace('d', '\\s*k\\s*')}\\b`,
      'i',
    );
    if (spacedKPattern.test(result)) result = result.replace(spacedKPattern, expression);
    else if (kPattern.test(result)) result = result.replace(kPattern, expression);
  }
  return result;
}

function protectHomecraftTerms(text: string): { protectedText: string; terms: string[] } {
  const terms: string[] = [];
  let protectedText = text;
  const patterns = [
    /\b(?:Rnds?|Rds?|Rounds?)\s+\d+(?:\s*[\u2013-]\s*\d+)?/gi,
    /\bRows?\s+\d+(?:\s*[\u2013-]\s*\d+)?/gi,
    /(?<![A-Za-z])\d*(?:sc|hdc|dc|tr|dtr|ch|slst|flo|blo|inc|dec|fptr|bpdc|st|sts|yo|sk)\b/gi,
  ];
  for (const pattern of patterns) {
    protectedText = protectedText.replace(pattern, (term) => {
      const token = `ZXQTERM${String(terms.length).padStart(4, '0')}QXZ`;
      terms.push(term);
      return token;
    });
  }
  return { protectedText, terms };
}

function restoreHomecraftTerms(text: string, terms: string[]): string {
  let result = text;
  terms.forEach((term, index) => {
    const number = String(index).padStart(4, '0');
    const patterns = [
      new RegExp(`ZXQTERM${number}QXZ`, 'gi'),
      new RegExp(`ZXQ TERM ${number} QXZ`, 'gi'),
      new RegExp(`ZXQTERM ${number} QXZ`, 'gi'),
    ];
    for (const pattern of patterns) result = result.replace(pattern, term);
  });
  return result;
}

function normalizeHomecraftTranslation(source: string, translated: string): string {
  let result = translated;
  const roundLabel =
    /^(?:Rd|Rnd|Rds|Rnds|Round|Rounds)\s+(\d+(?:[\u2013-]\d+)?)\s*:?$/i.exec(
      source.trim(),
    );
  if (roundLabel) return `Runda ${roundLabel[1]}:`;
  const rowLabel = /^(?:Row|Rows)\s+(\d+(?:[\u2013-]\d+)?)\s*:?$/i.exec(source.trim());
  if (rowLabel) return `Rząd ${rowLabel[1]}:`;
  if (/\b(?:Rd|Rnd|Rds|Rnds|Round|Rounds)\b/i.test(source)) {
    result = result.replace(
      /\b(?:II miejsce|Część|Runda|Rundy|Rd|Rnd|Rnds?)\s+(\d+(?:[\u2013-]\d+)?)/gi,
      'Runda $1',
    );
  }
  if (/\b(?:Row|Rows)\b/i.test(source)) {
    result = result.replace(
      /\b(?:Wiersz|Wiersze|Rząd|Rzędy|Row|Rows)\s+(\d+(?:[\u2013-]\d+)?)/gi,
      'Rząd $1',
    );
  }
  if (/(?:\b|\d)dec\b/i.test(source)) {
    result = result.replace(
      /(?<![A-Za-z])(\d*)\s*(?:dec|grudzień|grudzien|grudnia|grudniu|dez|gru|spadek|zmniejszenie)(?![A-Za-z])/gi,
      '$1dec',
    );
  }
  if (/(?:\b|\d)inc\b/i.test(source)) {
    result = result.replace(
      /(?<![A-Za-z])(\d*)\s*(?:inc|przyrost|wzrost|zwiększenie|zwiększ|inkrementacja|ink|dor|dodawanie|dodaj|dodany)(?![A-Za-z])/gi,
      '$1inc',
    );
  }
  if (/(?:\b|\d)hdc\b/i.test(source)) {
    result = result.replace(
      /(?<![A-Za-z])(\d*)\s*(?:psł|półsłupek|półsłupki)(?![A-Za-z])/gi,
      '$1hdc',
    );
  }
  if (/(?:\b|\d)sc\b/i.test(source)) {
    result = result.replace(/(?<![A-Za-z])(\d*)\s*(?:ps|oś|sł)(?![A-Za-z])/gi, '$1sc');
  }
  if (/(?:\b|\d)ch\b|\bch\d/i.test(source)) {
    result = result.replace(
      /(?<![A-Za-z])(\d*)\s*(?:kanał|kanału|chod|chi|oł|łańcuch|łańcuszek)\s*(\d*)(?![A-Za-z])/gi,
      '$1ch$2',
    );
  }
  if (/(?:\b|\d)flo\b/i.test(source)) {
    result = result.replace(/(?<![A-Za-z])flota(?![A-Za-z])/gi, 'flo');
  }
  const loopOrder = /(?<![A-Za-z])(\d*(?:sc|hdc|dc|tr|dtr))\s+(flo|blo)\b/i.exec(source);
  if (loopOrder) {
    const token = loopOrder[1];
    const loop = loopOrder[2];
    result = result.replace(
      new RegExp(`\\b${loop}\\s+(\\d*(?:sc|hdc|dc|tr|dtr))\\b`, 'i'),
      `${token} ${loop}`,
    );
  }
  if (/\bslst\b/i.test(source)) {
    result = result.replace(
      /(?<![A-Za-z])(?:ps\.?|pętla ścisła|Najpierw i zakończ|Muszę zamknąć)(?![A-Za-z])/gi,
      'slst',
    );
  }
  if (/(?:\b|\d)(?:hdc|sc|ch|flo|blo)\b/i.test(source)) {
    result = result.replace(
      /(?<![A-Za-z])(\d*)\s*(HDC|SC|CH|FLO|BLO)(?![A-Za-z])/gi,
      (_, count: string, token: string) => `${count}${token.toLowerCase()}`,
    );
  }
  result = result
    .replace(/\{@b\s+\(MAKE\b/gi, '{@b (WYKONAJ')
    .replace(/\{@(?:i|italic)\s+Note:/gi, (match) => match.replace(/Note:/i, 'Uwaga:'))
    .replace(
      /In Rząd (\d+), you will make the corner chain strips\./gi,
      'W rzędzie $1 wykonaj narożne łańcuszki.',
    )
    .replace(/Do not fasten off with/gi, 'Nie zakańczaj z')
    .replace(/Fasten off/gi, 'Zakończ')
    .replace(/Pick up again with/gi, 'Podejmij ponownie z')
    .replace(/,(?=[A-Za-z{@])/g, ', ')
    .replace(/([ąćęłńóśźż])sc\b/gi, '$1 sc')
    .replace(/\.(?=ch\d)/gi, '. ')
    .replace(/\{@(i|italic) ([^{}]*?) \}/g, '{@$1 $2}')
    .replace(/\)(?=[a-ząćęłńóśźż])/g, ') ');
  return result;
}

function polishHomecraftPatternType(value: string): string {
  const labels: Record<string, string> = {
    amigurumi: 'amigurumi',
    'household item': 'przedmiot domowy',
    wearable: 'do noszenia',
  };
  return labels[value] ?? value;
}

async function translateWithGoogle(
  text: string,
  cache: Record<string, string>,
  preserveHomecraftTerms = false,
): Promise<string> {
  if (cache[text]) return cache[text];
  const { protectedText: taggedText, tags } = protectGoogleTags(text);
  const { protectedText, terms } = preserveHomecraftTerms
    ? protectHomecraftTerms(taggedText)
    : { protectedText: taggedText, terms: [] };
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'en');
  url.searchParams.set('tl', 'pl');
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', protectedText);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Google Translate error ${response.status}`);
      const body = (await response.json()) as Array<Array<[string]>>;
      const translated = body[0]?.map((part) => part[0]).join('');
      if (!translated) throw new Error('Google Translate returned no text.');
      const result = restoreDiceExpressions(
        text,
        restoreHomecraftTerms(restoreGoogleTags(translated, tags), terms),
      );
      cache[text] = result;
      return result;
    } catch (error) {
      if (attempt === 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
  throw new Error('Google Translate did not return a result.');
}

async function translateGoogleValue(
  value: JsonObject | JsonValue,
  key: string,
  categoryId: string,
  cache: Record<string, string>,
): Promise<JsonValue> {
  if (GOOGLE_IGNORED_KEYS.has(key)) return value;
  if (categoryId === 'names' && (key === 'name' || key === 'result')) return value;
  if (typeof value === 'string') {
    if (categoryId === 'homecrafts' && key === 'patternType') {
      return polishHomecraftPatternType(value);
    }
    if (categoryId === 'homecrafts' && key === 'name') {
      const polishedName = polishSourceName(value, categoryId);
      if (polishedName !== value) return polishedName;
    }
    if (/^\{@[^}]+\}$/.test(value)) {
      const cached = cache[value] ?? value;
      return categoryId === 'homecrafts'
        ? normalizeHomecraftTranslation(value, cached)
        : value;
    }
    if (!/[A-Za-z]{2}/.test(value)) return value;
    const translated = await translateWithGoogle(
      value,
      cache,
      categoryId === 'homecrafts',
    );
    return categoryId === 'homecrafts'
      ? normalizeHomecraftTranslation(value, translated)
      : restoreDiceExpressions(value, translated);
  }
  if (Array.isArray(value)) {
    return Promise.all(
      value.map((child) => translateGoogleValue(child, key, categoryId, cache)),
    );
  }
  if (value === null || typeof value !== 'object') return value;
  const result: JsonObject = {};
  for (const [childKey, child] of Object.entries(value)) {
    result[childKey] = await translateGoogleValue(child, childKey, categoryId, cache);
  }
  return result;
}

type GoogleSourceItem = JsonObject & { id: string; name: string };

const POLISH_CREATURE_TYPES: Record<string, string> = {
  Aberration: 'Aberracja',
  Beast: 'Bestia',
  Celestial: 'Niebianin',
  Construct: 'Konstrukt',
  Dragon: 'Smok',
  Elemental: 'Żywiołak',
  Fey: 'Fej',
  Fiend: 'Czart',
  Giant: 'Olbrzym',
  Humanoid: 'Humanoid',
  Monstrosity: 'Monstrum',
  Ooze: 'Maź',
  Plant: 'Roślina',
  Undead: 'Nieumarły',
};

const POLISH_CUSTOM_CREATURE_TYPES: Record<string, string> = {
  Apparition: 'Zjawa',
  'Fire Guardian': 'Strażnik Ognia',
  Keeper: 'Opiekun',
  'Totem Elemental': 'Totem',
};

const POLISH_SIZES: Record<string, string> = {
  Gargantuan: 'Gigantyczny',
  Huge: 'Wielki',
  Large: 'Duży',
  Medium: 'Średni',
  Small: 'Mały',
  Tiny: 'Malutki',
  Varies: 'Zmienny',
  V: 'Zmienny',
};

function canonicalCreatureType(source: string, translated: string): string {
  if (POLISH_CUSTOM_CREATURE_TYPES[source]) return POLISH_CUSTOM_CREATURE_TYPES[source];
  const sourceBase = source.split(/[\s(]/, 1)[0];
  const base = POLISH_CREATURE_TYPES[sourceBase];
  if (!base) return translated;
  const suffix = translated.match(/\s*(\(.*\))$/)?.[1] ?? '';
  return `${base}${suffix}`;
}

function canonicalSize(source: string): string {
  return source
    .split(/\s+or\s+/i)
    .map((part) => POLISH_SIZES[part.trim()] ?? part.trim())
    .join(' lub ');
}

function normalizeGoogleTranslation(
  translation: JsonObject,
  source: GoogleSourceItem,
  categoryId: string,
): JsonObject {
  const normalized = { ...translation };
  if (
    (categoryId === 'bestiary' || categoryId === 'species') &&
    typeof source.creatureType === 'string' &&
    typeof normalized.creatureType === 'string'
  ) {
    normalized.creatureType = canonicalCreatureType(
      source.creatureType,
      normalized.creatureType,
    );
  }
  if (
    (categoryId === 'bestiary' || categoryId === 'species') &&
    typeof source.size === 'string' &&
    typeof normalized.size === 'string'
  ) {
    normalized.size = canonicalSize(source.size);
  }
  return normalized;
}

async function translateGoogleItem(
  item: GoogleSourceItem,
  categoryId: string,
  cache: Record<string, string>,
): Promise<JsonObject> {
  const translation: JsonObject = {};
  for (const [key, value] of Object.entries(item)) {
    if (key === 'id') continue;
    const translated = await translateGoogleValue(value, key, categoryId, cache);
    if (JSON.stringify(translated) !== JSON.stringify(value))
      translation[key] = translated;
  }
  return translation;
}

function polishSourceName(name: string, categoryId: string): string {
  if (categoryId === 'loot') {
    const gemstones = /^(\d[\d,]*) gp Gemstones$/.exec(name);
    if (gemstones) return `Klejnoty o wartości ${gemstones[1]} szt. złota`;
    const artObjects = /^(\d[\d,]*) gp Art Objects$/.exec(name);
    if (artObjects) return `Dzieła sztuki o wartości ${artObjects[1]} szt. złota`;
    const challenge = /^Challenge (.+)$/.exec(name);
    if (challenge) return `Stopień wyzwania ${challenge[1]}`;
  }
  if (categoryId === 'encounters' && name === 'Urban') return 'Miejski';
  if (categoryId === 'homecrafts') {
    const names: Record<string, string> = {
      Beholder: 'Obserwator',
      'Displacer Beast': 'Bestia Przemieszczająca',
      'Gloves of Missile Snaring': 'Rękawice Chwytania Pocisków',
      'Mind Flayer': 'Łupieżca Umysłów',
      'Mimic Dice Bag': 'Torba na Kości Mimika',
      'Owlbear Cub': 'Młode Sowoniedźwiedzia',
      'Platinum Dragon Cowl': 'Platynowy Kaptur Smoka',
      'Purple Worm Scarf': 'Szalik Purpurowego Czerwiaka',
      'Schools of Magic Granny Squares': 'Kwadraty babci Szkół Magii',
      'Soul Coin Coaster': 'Podstawka pod Monetę Dusz',
      'Spellbook Pouch Belt Bag': 'Saszetka na Księgę Zaklęć do Pasa',
    };
    return names[name] ?? name;
  }
  return name;
}

async function translateCategoryWithGoogle(
  categoryId: string,
  locale: string,
  limit?: number,
  refresh = false,
): Promise<void> {
  if (locale !== 'pl')
    throw new Error('The Google provider currently supports only Polish.');
  const localeInfo = SUPPORTED_LOCALES.find((l) => l.code === locale)!;
  const sourcePath = join(ROOT, `src/data/generated/${categoryId}.json`);
  const overlayDir = join(ROOT, `src/data/generated/${locale}`);
  const overlayPath = join(overlayDir, `${categoryId}.json`);
  const source = JSON.parse(readFileSync(sourcePath, 'utf8')) as {
    items: GoogleSourceItem[];
  };
  const overlay: Record<string, unknown> = existsSync(overlayPath)
    ? JSON.parse(readFileSync(overlayPath, 'utf8'))
    : {};
  const cache: Record<string, string> = existsSync(GOOGLE_CACHE_PATH)
    ? JSON.parse(readFileSync(GOOGLE_CACHE_PATH, 'utf8'))
    : {};
  const todo = source.items
    .filter((item) => refresh || !(item.id in overlay))
    .slice(0, limit);
  console.log(
    `${categoryId}: ${todo.length} entries to translate with ${localeInfo.label} Google cache/provider.`,
  );
  let cursor = 0;
  let completed = 0;
  const saveInterval = 100;
  let writeQueue = Promise.resolve();
  const saveProgress = () => {
    writeQueue = writeQueue.then(() => {
      mkdirSync(overlayDir, { recursive: true });
      writeFileSync(overlayPath, JSON.stringify(overlay, null, 2));
      mkdirSync(join(ROOT, '.cache'), { recursive: true });
      writeFileSync(GOOGLE_CACHE_PATH, JSON.stringify(cache));
    });
    return writeQueue;
  };
  const worker = async () => {
    while (cursor < todo.length) {
      const index = cursor;
      cursor += 1;
      const item = todo[index]!;
      const translation = normalizeGoogleTranslation(
        await translateGoogleItem(item, categoryId, cache),
        item,
        categoryId,
      );
      if (Object.keys(translation).length > 0) overlay[item.id] = translation;
      completed += 1;
      if (completed % saveInterval === 0 || completed === todo.length)
        await saveProgress();
      if (completed % saveInterval === 0 || completed === todo.length)
        console.log(`  ${completed}/${todo.length}`);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  await writeQueue;
  mkdirSync(overlayDir, { recursive: true });
  writeFileSync(overlayPath, JSON.stringify(overlay, null, 2));
  console.log(`Wrote ${overlayPath}`);
}

async function translateBatch(
  entries: TranslationEntry[],
  localeLabel: string,
): Promise<Record<string, { name: string; entries: Entry[]; data?: JsonObject }>> {
  const prompt =
    TRANSLATION_INSTRUCTIONS(localeLabel) +
    JSON.stringify(
      entries.map((e) => ({
        id: e.id,
        name: e.name,
        entries: e.entries,
        ...(e.data ? { data: e.data } : {}),
      })),
      null,
      2,
    );
  const response = await callClaude(prompt);
  return extractJson(response) as Record<
    string,
    { name: string; entries: Entry[]; data?: JsonObject }
  >;
}

async function translateCategory(categoryId: string, locale: string, limit?: number) {
  const localeInfo = SUPPORTED_LOCALES.find((l) => l.code === locale)!;
  const sourcePath = join(ROOT, `src/data/generated/${categoryId}.json`);
  const overlayDir = join(ROOT, `src/data/generated/${locale}`);
  const overlayPath = join(overlayDir, `${categoryId}.json`);

  const source = JSON.parse(readFileSync(sourcePath, 'utf8')) as {
    items: Array<{
      id: string;
      name: string;
      entries?: Entry[];
      data?: JsonObject;
      hidden?: boolean;
    }>;
  };
  const overlay: Record<string, unknown> = existsSync(overlayPath)
    ? JSON.parse(readFileSync(overlayPath, 'utf8'))
    : {};

  const todo = source.items.filter((item) => !(item.id in overlay)).slice(0, limit);
  console.log(
    `${categoryId}: ${todo.length} entries to translate (${Object.keys(overlay).length} already done).`,
  );

  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const batch = todo.slice(i, i + BATCH_SIZE).map((item) => ({
      id: item.id,
      name: item.name,
      entries: item.entries ?? [],
      ...(item.data ? { data: item.data } : {}),
    }));
    console.log(`  batch ${i / BATCH_SIZE + 1}: ${batch.map((b) => b.id).join(', ')}`);
    const translated = await translateBatch(batch, localeInfo.label);
    Object.assign(overlay, translated);
    mkdirSync(overlayDir, { recursive: true });
    writeFileSync(overlayPath, JSON.stringify(overlay, null, 2));
  }
  console.log(`Wrote ${overlayPath}`);
}

function collectBookNodes(
  chapters: Entry[],
): Array<{ key: string; id: string; name: string; entries: Entry[] }> {
  const out: Array<{ key: string; id: string; name: string; entries: Entry[] }> = [];
  const walk = (node: Entry, chapterIndex: number) => {
    if (typeof node !== 'object') return;
    const n = node as EntryNode;
    if (
      (n.type === 'section' || n.type === 'entries') &&
      typeof n.name === 'string' &&
      typeof n.id === 'string'
    ) {
      out.push({
        key: `${chapterIndex}:${n.id}`,
        id: n.id,
        name: n.name,
        entries: n.entries ?? [],
      });
    }
    (n.entries ?? []).forEach((child) => walk(child, chapterIndex));
  };
  chapters.forEach((chapter, index) => walk(chapter, index));
  return out;
}

async function translateBook(bookId: string, locale: string, limit?: number) {
  const localeInfo = SUPPORTED_LOCALES.find((l) => l.code === locale)!;
  const index = JSON.parse(
    readFileSync(join(ROOT, 'src/data/generated/books.json'), 'utf8'),
  ) as Array<{ id: string; type: 'book' | 'adventure' }>;
  const meta = index.find((b) => b.id === bookId);
  if (!meta) throw new Error(`Unknown book/adventure id "${bookId}".`);

  const sourcePath = join(ROOT, `public/data/${meta.type}/${bookId}.json`);
  const overlayDir = join(ROOT, `public/data/${locale}/${meta.type}`);
  const overlayPath = join(overlayDir, `${bookId}.json`);

  const source = JSON.parse(readFileSync(sourcePath, 'utf8')) as { data: Entry[] };
  const overlay: { data: Record<string, { name?: string; entries?: Entry[] }> } =
    existsSync(overlayPath)
      ? JSON.parse(readFileSync(overlayPath, 'utf8'))
      : { data: {} };

  const nodes = collectBookNodes(source.data);
  const todo = nodes.filter((n) => !(n.key in overlay.data)).slice(0, limit);
  console.log(
    `${bookId}: ${todo.length} sections to translate (${Object.keys(overlay.data).length} already done).`,
  );

  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const batch = todo.slice(i, i + BATCH_SIZE);
    console.log(`  batch ${i / BATCH_SIZE + 1}: ${batch.map((b) => b.name).join(', ')}`);
    const translated = await translateBatch(batch, localeInfo.label);
    for (const node of batch) {
      const result = translated[node.id];
      if (result) overlay.data[node.key] = result;
    }
    mkdirSync(overlayDir, { recursive: true });
    writeFileSync(overlayPath, JSON.stringify(overlay, null, 2));
  }
  console.log(`Wrote ${overlayPath}`);
}

const args = parseArgs();
if (args.category) {
  if (args.provider === 'google') {
    await translateCategoryWithGoogle(
      args.category,
      args.locale,
      args.limit,
      args.refresh,
    );
  } else {
    await translateCategory(args.category, args.locale, args.limit);
  }
} else if (args.book) {
  if (args.provider !== 'anthropic') {
    throw new Error('The Google provider supports categories only.');
  }
  await translateBook(args.book, args.locale, args.limit);
}
