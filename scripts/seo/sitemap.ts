import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from '../../src/i18n/locales';
import {
  getCompendiumCategorySeo,
  getCompendiumEntrySeo,
} from '../../src/data/compendium/seo';
import type { ClassSubclass, CompendiumEntryBase } from '../../src/data/compendium/types';
import { localizeSubclasses } from '../../src/data/compendium/localize';
import {
  IMAGE_HOST,
  imageUrl,
  optimizedImageUrl,
  PRIMARY_IMAGE_HEIGHT,
  PRIMARY_IMAGE_WIDTH,
} from '../../src/data/compendium/images';
import { withEnglishName } from '../../src/data/compendium/searchText';
import { translate } from '../../src/i18n/translate';
import { CAMPAIGN_MAPS } from '../../src/features/campaign-map/maps';
import {
  fumbleHomebrewItems,
  fumbleParentClassId,
} from '../../src/features/homebrew/fumbleHomebrew';
import { slugify } from '../../src/data/transform/util';
import {
  isBookChapterIndexable,
  isBookChapterNameIndexable,
} from '../../src/features/books/chapterSeo';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SITE_URL = 'https://fumble.krystianpinczak.com';
const GENERATED_DIR = join(ROOT, 'src/data/generated');
const OUT_DIR = join(ROOT, 'dist');
const ASSETS_DIR = join(OUT_DIR, 'assets');
const ASSET_FILES = existsSync(ASSETS_DIR) ? readdirSync(ASSETS_DIR) : [];
const GOOGLE_VERIFICATION = process.env.GOOGLE_SITE_VERIFICATION;
const BING_VERIFICATION = process.env.BING_SITE_VERIFICATION;

interface PageInfo {
  path: string;
  title: string;
  description: string;
  content?: string;
  heading?: string;
  breadcrumbTitle?: string;
  modified?: string;
  image?: string;
  kind: 'website' | 'article' | 'book';
  indexable?: boolean;
  redirectTo?: string;
  parent?: { path: string; title: string };
}

interface CompendiumItem {
  id: string;
  name: string;
  hidden?: boolean;
  entries?: unknown;
  body?: unknown;
  subtitle?: unknown;
  source?: unknown;
  [key: string]: unknown;
}

interface CompendiumFile {
  meta?: { generatedAt?: string };
  items?: CompendiumItem[];
}

interface Book {
  id: string;
  type: 'book' | 'adventure';
  name: string;
  author?: string;
  storyline?: string;
  cover?: string;
  contents: BookChapter[];
}

interface BookChapter {
  id?: string;
  name?: string;
  headers?: Array<string | { header?: string }>;
  entries?: unknown;
  [key: string]: unknown;
}

interface WikiPage {
  campaignId?: string;
  slug: string;
  title: string;
  category?: string;
  html?: string;
}

interface WikiCampaign {
  id: string;
  title: string;
  pages?: WikiPage[];
}

const STATIC_PAGES: PageInfo[] = [
  {
    path: '/',
    title: 'Fumble',
    description:
      'Free, no-login Dungeons & Dragons 2024 toolkit with character sheets, compendium, dice, DM tools, books, and an Obsidian-powered campaign wiki.',
    kind: 'website',
  },
  {
    path: '/character',
    title: 'Character Sheets - Fumble',
    description: 'Create and manage private D&D 2024 character sheets in your browser.',
    kind: 'website',
  },
  {
    path: '/compendium',
    title: 'D&D 2024 Compendium - Fumble',
    description: 'Browse spells, items, creatures, classes, rules, and more.',
    kind: 'website',
  },
  {
    path: '/homebrew',
    title: 'Homebrew - Fumble',
    description: 'Create, import, translate, and manage local D&D homebrew content.',
    kind: 'website',
  },
  {
    path: '/fumble-homebrew',
    title: 'Fumble Homebrew Library - Fumble',
    description: 'Browse campaign homebrew maintained by the Fumble creators.',
    kind: 'website',
  },
  {
    path: '/books',
    title: 'D&D Books - Fumble',
    description: 'Browse and read indexed Dungeons & Dragons books and adventures.',
    kind: 'website',
  },
  {
    path: '/dice',
    title: 'Dice Roller - Fumble',
    description: 'Roll D&D dice, expressions, and reusable dice pools in your browser.',
    kind: 'website',
  },
  {
    path: '/data',
    title: 'Data Backup - Fumble',
    description: 'Export or restore all local Fumble data in one backup file.',
    kind: 'website',
  },
  {
    path: '/session-log',
    title: 'Session Log - Fumble',
    description: 'Keep local D&D session transcripts, notes, and summaries.',
    kind: 'website',
  },
  {
    path: '/dm/initiative',
    title: 'Initiative Tracker - Fumble',
    description:
      'Track initiative, rounds, hit points, and combatants for D&D encounters.',
    kind: 'website',
  },
  {
    path: '/dm/loot',
    title: 'Loot Generator - Fumble',
    description: 'Generate D&D treasure and party rewards by tier and rarity.',
    kind: 'website',
  },
  {
    path: '/dm/encounter',
    title: 'Encounter Calculator - Fumble',
    description: 'Build D&D encounters and compare monster XP with the party budget.',
    kind: 'website',
  },
  {
    path: '/dm/soundboard',
    title: 'Soundboard - Fumble',
    description: 'Organize and play local campaign ambience and combat tracks.',
    kind: 'website',
  },
  {
    path: '/wiki',
    title: 'Campaign Wiki - Fumble',
    description: 'Browse the Fumble campaign wiki generated from an Obsidian vault.',
    kind: 'website',
  },
  {
    path: '/legal',
    title: 'Legal Information - Fumble',
    description:
      'Privacy, terms, licenses, and external connection information for Fumble.',
    kind: 'website',
  },
  {
    path: '/legal/privacy',
    title: 'Privacy - Fumble',
    description: 'How Fumble stores local data and protects user privacy.',
    kind: 'article',
  },
  {
    path: '/legal/connections',
    title: 'External Connections - Fumble',
    description:
      'The external services Fumble can contact and when those requests occur.',
    kind: 'article',
  },
  {
    path: '/legal/terms',
    title: 'Terms - Fumble',
    description: 'Terms governing use of the free and unofficial Fumble toolkit.',
    kind: 'article',
  },
  {
    path: '/legal/licenses',
    title: 'Licenses - Fumble',
    description: 'Open source and third-party license information for Fumble.',
    kind: 'article',
  },
  {
    path: '/legal/accessibility',
    title: 'Accessibility - Fumble',
    description:
      'Accessibility goals, known limitations, and barrier reporting for Fumble.',
    kind: 'article',
  },
  {
    path: '/legal/contact',
    title: 'Owner and Contact - Fumble',
    description:
      'Owner, contact, security reporting, and content removal channels for Fumble.',
    kind: 'article',
  },
];

const LEGACY_REDIRECTS: Record<string, string> = {
  '/compendium/items/danoth-s-visor': '/compendium/items/danoth-s-visor-dormant',
  '/compendium/bestiary/mwaxanar': '/compendium/bestiary/mwaxanare',
};

const LEGACY_NON_INDEXABLE_PATHS = [
  '/compendium/bestiary/mind-flayer-nothic',
  '/compendium/tables/random-magic-items-armaments',
  '/compendium/languages/telepatia-30-metr-w',
  '/compendium/languages/piekielny-i-pierwotny',
];

const COMPENDIUM_CATEGORIES = new Set([
  'actions',
  'backgrounds',
  'bestiary',
  'boons',
  'charoptions',
  'classes',
  'conditions',
  'cultsboons',
  'decks',
  'deities',
  'facilities',
  'feats',
  'firearms',
  'hazards',
  'items',
  'languages',
  'masteries',
  'objects',
  'optionalfeatures',
  'recipes',
  'rules',
  'senses',
  'skills',
  'species',
  'spells',
  'tables',
  'vehicles',
  'psionics',
  'encounters',
  'loot',
  'life',
  'names',
  'monsterfeatures',
  'homecrafts',
]);

const POLISH_CATEGORY_TITLES: Record<string, string> = {
  actions: 'akcje',
  backgrounds: 'pochodzenia',
  bestiary: 'bestiariusz',
  boons: 'dary',
  charoptions: 'opcje postaci',
  classes: 'klasy',
  conditions: 'stany',
  cultsboons: 'kulty i dary',
  decks: 'talie',
  deities: 'bóstwa',
  facilities: 'bastiony',
  feats: 'atuty',
  firearms: 'broń palna',
  hazards: 'zagrożenia',
  items: 'przedmioty',
  languages: 'języki',
  masteries: 'biegłości broni',
  objects: 'obiekty',
  optionalfeatures: 'cechy opcjonalne',
  recipes: 'receptury',
  rules: 'zasady',
  senses: 'zmysły',
  skills: 'umiejętności',
  species: 'gatunki',
  spells: 'czary',
  tables: 'tabele',
  vehicles: 'pojazdy',
  psionics: 'psionika',
  encounters: 'spotkania',
  loot: 'tabele łupów',
  life: 'tabele życia',
  names: 'imiona',
  monsterfeatures: 'cechy potworów',
  homecrafts: 'rzemiosło',
};

const SOURCE_NAMES = JSON.parse(
  readFileSync(join(GENERATED_DIR, 'sources.json'), 'utf8'),
) as Record<string, string>;
const POLISH_SOURCE_NAMES = existsSync(join(GENERATED_DIR, 'pl', 'sources.json'))
  ? (JSON.parse(
      readFileSync(join(GENERATED_DIR, 'pl', 'sources.json'), 'utf8'),
    ) as Record<string, string>)
  : {};
const BOOKS = JSON.parse(
  readFileSync(join(GENERATED_DIR, 'books.json'), 'utf8'),
) as Array<{ id: string; source: string }>;
const POLISH_BOOKS = existsSync(join(GENERATED_DIR, 'pl', 'books.json'))
  ? (JSON.parse(readFileSync(join(GENERATED_DIR, 'pl', 'books.json'), 'utf8')) as Record<
      string,
      { name?: string }
    >)
  : {};
for (const book of BOOKS) {
  const translatedName = POLISH_BOOKS[book.id]?.name;
  if (translatedName) POLISH_SOURCE_NAMES[book.source] = translatedName;
}

function sourceLabel(code: string, locale: Locale): string {
  const names = locale === 'pl' ? POLISH_SOURCE_NAMES : SOURCE_NAMES;
  return names[code] ?? code;
}

function campaignName(id: string, fallback: string, locale: Locale): string {
  const key =
    id === 'grobowiec-zaglady' ? 'wiki.campaigns.tombOfAnnihilation' : undefined;
  if (!key) return fallback;
  const value = translate(locale, key);
  return value === key ? fallback : value;
}

const POLISH_STATIC_PAGES: Record<string, Pick<PageInfo, 'title' | 'description'>> = {
  '/': {
    title: 'Fumble',
    description:
      'Darmowe narzędzia do Dungeons & Dragons 2024 bez logowania: karty postaci, kompendium, kości, narzędzia MG, księgi i wiki kampanii z Obsidiana.',
  },
  '/character': {
    title: 'Karty postaci - Fumble',
    description:
      'Twórz i przechowuj prywatne karty postaci D&D 2024 w swojej przeglądarce.',
  },
  '/compendium': {
    title: 'Kompendium D&D 2024 - Fumble',
    description: 'Przeglądaj czary, przedmioty, stworzenia, klasy, zasady i inne treści.',
  },
  '/homebrew': {
    title: 'Zawartość własna - Fumble',
    description: 'Twórz, importuj, tłumacz i przechowuj lokalną zawartość do D&D.',
  },
  '/fumble-homebrew': {
    title: 'Biblioteka homebrew Fumble - Fumble',
    description: 'Przeglądaj homebrew kampanii utrzymywane przez twórców Fumble.',
  },
  '/books': {
    title: 'Księgi D&D - Fumble',
    description: 'Przeglądaj zindeksowane podręczniki i przygody Dungeons & Dragons.',
  },
  '/dice': {
    title: 'Rzuty kośćmi - Fumble',
    description: 'Wykonuj rzuty kośćmi, wyrażenia i zapisane pule w przeglądarce.',
  },
  '/data': {
    title: 'Kopia danych - Fumble',
    description: 'Eksportuj lub przywracaj wszystkie lokalne dane Fumble w jednym pliku.',
  },
  '/session-log': {
    title: 'Dziennik sesji - Fumble',
    description: 'Przechowuj lokalne transkrypcje, notatki i podsumowania sesji D&D.',
  },
  '/dm/initiative': {
    title: 'Inicjatywa - Fumble',
    description: 'Śledź inicjatywę, rundy, punkty wytrzymałości i uczestników starcia.',
  },
  '/dm/loot': {
    title: 'Generator łupów - Fumble',
    description: 'Generuj skarby i nagrody dla drużyny według poziomu i rzadkości.',
  },
  '/dm/encounter': {
    title: 'Kalkulator starć - Fumble',
    description: 'Buduj starcia D&D i porównuj PD potworów z budżetem drużyny.',
  },
  '/dm/soundboard': {
    title: 'Panel dźwięków - Fumble',
    description: 'Organizuj muzykę kampanii i walki w jednym panelu.',
  },
  '/wiki': {
    title: 'Wiki kampanii - Fumble',
    description: 'Przeglądaj wiki kampanii Fumble wygenerowaną z repozytorium Obsidian.',
  },
  '/legal': {
    title: 'Informacje prawne - Fumble',
    description: 'Prywatność, warunki, licencje i informacje o połączeniach Fumble.',
  },
  '/legal/privacy': {
    title: 'Prywatność - Fumble',
    description: 'Jak Fumble przechowuje dane lokalne i chroni prywatność użytkownika.',
  },
  '/legal/connections': {
    title: 'Połączenia zewnętrzne - Fumble',
    description: 'Usługi zewnętrzne, z którymi Fumble może się łączyć.',
  },
  '/legal/terms': {
    title: 'Warunki - Fumble',
    description: 'Warunki korzystania z darmowego, nieoficjalnego narzędzia Fumble.',
  },
  '/legal/licenses': {
    title: 'Licencje - Fumble',
    description: 'Informacje o licencjach open source i materiałach zewnętrznych.',
  },
  '/legal/accessibility': {
    title: 'Dostępność - Fumble',
    description: 'Cele dostępności, znane ograniczenia i zgłaszanie barier.',
  },
  '/legal/contact': {
    title: 'Właściciel i kontakt - Fumble',
    description: 'Właściciel, kontakt i kanały zgłaszania problemów w Fumble.',
  },
};

const STATIC_SEO_KEYS: Record<
  string,
  { title: string; description: string; indexable?: boolean }
> = {
  '/': { title: 'seo.homeTitle', description: 'seo.homeDescription' },
  '/character': {
    title: 'seo.pageTitles.character',
    description: 'seo.pageDescriptions.character',
    indexable: false,
  },
  '/compendium': {
    title: 'seo.pageTitles.compendium',
    description: 'seo.pageDescriptions.compendium',
  },
  '/homebrew': {
    title: 'seo.pageTitles.homebrew',
    description: 'seo.pageDescriptions.homebrew',
    indexable: false,
  },
  '/fumble-homebrew': {
    title: 'seo.pageTitles.fumbleHomebrew',
    description: 'seo.pageDescriptions.fumbleHomebrew',
  },
  '/books': {
    title: 'seo.pageTitles.books',
    description: 'seo.pageDescriptions.books',
  },
  '/dice': {
    title: 'seo.pageTitles.dice',
    description: 'seo.pageDescriptions.dice',
  },
  '/data': {
    title: 'seo.pageTitles.data',
    description: 'seo.pageDescriptions.data',
    indexable: false,
  },
  '/session-log': {
    title: 'seo.pageTitles.sessionLog',
    description: 'seo.pageDescriptions.sessionLog',
    indexable: false,
  },
  '/dm/initiative': {
    title: 'seo.pageTitles.initiative',
    description: 'seo.pageDescriptions.initiative',
    indexable: false,
  },
  '/dm/loot': {
    title: 'seo.pageTitles.loot',
    description: 'seo.pageDescriptions.loot',
  },
  '/dm/encounter': {
    title: 'seo.pageTitles.encounter',
    description: 'seo.pageDescriptions.encounter',
  },
  '/dm/soundboard': {
    title: 'seo.pageTitles.soundboard',
    description: 'seo.pageDescriptions.soundboard',
    indexable: false,
  },
  '/wiki': {
    title: 'seo.pageTitles.wiki',
    description: 'seo.pageDescriptions.wiki',
  },
  '/legal': {
    title: 'legal.overview.title',
    description: 'legal.overview.description',
  },
  '/legal/privacy': {
    title: 'legal.privacy.title',
    description: 'legal.privacy.description',
  },
  '/legal/connections': {
    title: 'legal.connections.title',
    description: 'legal.connections.description',
  },
  '/legal/terms': {
    title: 'legal.terms.title',
    description: 'legal.terms.description',
  },
  '/legal/licenses': {
    title: 'legal.licenses.title',
    description: 'legal.licenses.description',
  },
  '/legal/accessibility': {
    title: 'legal.accessibility.title',
    description: 'legal.accessibility.description',
  },
  '/legal/contact': {
    title: 'legal.contact.title',
    description: 'legal.contact.description',
  },
};

function localizePath(path: string, locale: string): string {
  const normalized = path === '/' ? path : `${path.replace(/\/+$/, '')}/`;
  if (locale === DEFAULT_LOCALE) return normalized;
  return normalized === '/' ? `/${locale}/` : `/${locale}${normalized}`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeHtml(value: string): string {
  return escapeXml(cleanText(value));
}

function cleanText(value: string): string {
  return value.replaceAll('\u2014', '-').replaceAll('\u2013', '-');
}

function plainText(value: unknown): string {
  if (typeof value === 'string') {
    return cleanText(value)
      .replace(/\{@\w+\s+([^}|]+)(?:\|[^}]*)?}/g, '$1')
      .replace(/\{#\w+\s+([^}|]+)(?:\|[^}]*)?}/g, '$1')
      .replace(/\{(?:@|#)[^}]+}/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  if (Array.isArray(value)) return value.map(plainText).filter(Boolean).join(' ');
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return [
      record.name,
      record.entry,
      record.entries,
      record.items,
      record.rows,
      record.caption,
      record.title,
    ]
      .map(plainText)
      .filter(Boolean)
      .join(' ');
  }
  return '';
}

function concise(value: string, fallback: string): string {
  const text = value.trim() || fallback;
  return text.length <= 160 ? text : `${text.slice(0, 157).trimEnd()}...`;
}

function excerpt(value: string, fallback: string): string {
  const text = value.trim() || fallback;
  return text.length <= 2000 ? text : `${text.slice(0, 1997).trimEnd()}...`;
}

function bookChapterContext(chapter: BookChapter, includeEntries = false): string {
  return [
    chapter.name,
    ...(chapter.headers ?? []).map((header) =>
      typeof header === 'string' ? header : header.header,
    ),
    ...(includeEntries ? [plainText(chapter.entries)] : []),
  ]
    .filter((value): value is string => Boolean(value))
    .join('. ');
}

function isBookChapterIndexableForLocale(
  baseChapter: BookChapter,
  chapter: BookChapter,
): boolean {
  if (!isBookChapterNameIndexable(baseChapter.name)) return false;
  return isBookChapterIndexable(chapter);
}

function bookDataPath(book: Book, locale: Locale): string {
  return locale === DEFAULT_LOCALE
    ? join(ROOT, 'public/data', book.type, `${book.id}.json`)
    : join(ROOT, 'public/data', locale, book.type, `${book.id}.json`);
}

function localizeBookEntry(
  entry: unknown,
  chapterIndex: number,
  overlay: Record<string, BookChapter>,
): unknown {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return entry;
  const record = entry as BookChapter;
  const key = typeof record.id === 'string' ? `${chapterIndex}:${record.id}` : undefined;
  const translation = key ? overlay[key] : undefined;
  const merged = translation ? { ...record, ...translation } : record;
  return Array.isArray(merged.entries)
    ? {
        ...merged,
        entries: merged.entries.map((child) =>
          localizeBookEntry(child, chapterIndex, overlay),
        ),
      }
    : merged;
}

const bookChapterCache = new Map<string, BookChapter[]>();

function loadBookChapters(book: Book, locale: Locale): BookChapter[] {
  const key = `${locale}/${book.type}/${book.id}`;
  const cached = bookChapterCache.get(key);
  if (cached) return cached;
  const dataPath = bookDataPath(book, locale);
  if (!existsSync(dataPath)) return [];
  const raw = JSON.parse(readFileSync(dataPath, 'utf8')) as { data?: unknown };
  const chapters = Array.isArray(raw.data)
    ? raw.data.filter(
        (chapter): chapter is BookChapter =>
          Boolean(chapter) && typeof chapter === 'object' && !Array.isArray(chapter),
      )
    : [];
  if (locale === DEFAULT_LOCALE) {
    bookChapterCache.set(key, chapters);
    return chapters;
  }
  const localized = JSON.parse(readFileSync(dataPath, 'utf8')) as {
    data?: Record<string, BookChapter>;
  };
  const basePath = bookDataPath(book, DEFAULT_LOCALE);
  if (!existsSync(basePath)) return [];
  const base = JSON.parse(readFileSync(basePath, 'utf8')) as { data?: unknown };
  const baseChapters = Array.isArray(base.data)
    ? base.data.filter(
        (chapter): chapter is BookChapter =>
          Boolean(chapter) && typeof chapter === 'object' && !Array.isArray(chapter),
      )
    : [];
  const overlay = localized.data ?? {};
  const result = baseChapters.map((chapter, index) => {
    const localizedChapter = localizeBookEntry(chapter, index, overlay);
    return localizedChapter && typeof localizedChapter === 'object'
      ? (localizedChapter as BookChapter)
      : chapter;
  });
  bookChapterCache.set(key, result);
  return result;
}

function firstImageSource(html: string): string | undefined {
  return /<img\b[^>]*\bsrc=(['"])(.*?)\1/i.exec(html)?.[2];
}

function compendiumContext(item: CompendiumItem): string {
  return [
    item.subtitle,
    item.entries,
    item.body,
    item.lore,
    item.features,
    item.subclasses,
    item.primaryAbility,
    item.savingThrows,
    item.proficiencies,
    item.classes,
    item.subclasses,
    item.attunement,
    item.prerequisite,
    item.featureType,
  ]
    .map(plainText)
    .filter(Boolean)
    .join(' ');
}

function subclassRouteKey(subclass: {
  id?: unknown;
  englishName?: unknown;
  name: string;
  source: string;
}): string {
  if (typeof subclass.id === 'string' && subclass.id) return subclass.id;
  const name =
    typeof subclass.englishName === 'string' ? subclass.englishName : subclass.name;
  return `${slugify(name)}-${slugify(subclass.source)}`;
}

function subclassRecords(value: unknown): unknown[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry) => Boolean(entry) && typeof entry === 'object');
}

function isClassSubclass(value: unknown): value is ClassSubclass {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<ClassSubclass>;
  return typeof record.name === 'string' && typeof record.source === 'string';
}

function collectPages(locale: Locale): PageInfo[] {
  const pages = [
    ...STATIC_PAGES.map((page) => {
      const keys = STATIC_SEO_KEYS[page.path];
      const fallback = locale === 'pl' ? POLISH_STATIC_PAGES[page.path] : undefined;
      if (!keys) return { ...page, ...(fallback ?? {}) };
      const title = translate(locale, keys.title);
      const description = translate(locale, keys.description);
      return {
        ...page,
        title:
          title === keys.title
            ? (fallback?.title ?? page.title)
            : title === 'Fumble'
              ? title
              : `${title} - Fumble`,
        description:
          description === keys.description
            ? (fallback?.description ?? page.description)
            : description,
        ...(keys.indexable === false ? { indexable: false } : {}),
      };
    }),
    ...Object.entries(LEGACY_REDIRECTS).map(([path, redirectTo]) => ({
      path,
      title: translate(locale, 'notFound.title'),
      description: translate(locale, 'notFound.message'),
      kind: 'website' as const,
      indexable: false,
      redirectTo,
    })),
    ...LEGACY_NON_INDEXABLE_PATHS.map((path) => ({
      path,
      title: translate(locale, 'notFound.title'),
      description: translate(locale, 'notFound.message'),
      kind: 'website' as const,
      indexable: false,
    })),
  ];
  const categoryFiles = new Set([
    ...readdirSync(GENERATED_DIR).filter((file) => file.endsWith('.json')),
    'firearms.json',
  ]);
  for (const file of categoryFiles) {
    const categoryId = file.replace(/\.json$/, '');
    if (!file.endsWith('.json') || !COMPENDIUM_CATEGORIES.has(categoryId)) continue;
    const categoryKey = `compendium.categories.${categoryId}`;
    const translatedCategory = translate(locale, categoryKey);
    const categoryTitle =
      translatedCategory === categoryKey
        ? locale === 'pl'
          ? (POLISH_CATEGORY_TITLES[categoryId] ?? categoryId.replaceAll('-', ' '))
          : categoryId.replaceAll('-', ' ')
        : translatedCategory;
    const displayCategory =
      categoryTitle.charAt(0).toLocaleUpperCase(locale) + categoryTitle.slice(1);
    const categoryPath = `/compendium/${categoryId}`;
    const rawPath = join(GENERATED_DIR, file);
    const raw = existsSync(rawPath)
      ? (JSON.parse(readFileSync(rawPath, 'utf8')) as CompendiumFile)
      : { items: [] };
    const categorySeo = getCompendiumCategorySeo(categoryId, displayCategory, locale);
    pages.push({
      path: categoryPath,
      title: `${categorySeo.title} - Fumble`,
      description: categorySeo.description,
      heading: displayCategory,
      breadcrumbTitle: displayCategory,
      modified: raw.meta?.generatedAt,
      kind: 'website',
      parent: {
        path: '/compendium',
        title: locale === 'pl' ? 'Kompendium' : 'Compendium',
      },
    });
    const overlayPath = join(GENERATED_DIR, locale, file);
    const overlay =
      locale === DEFAULT_LOCALE || !existsSync(overlayPath)
        ? {}
        : (JSON.parse(readFileSync(overlayPath, 'utf8')) as Record<
            string,
            CompendiumItem
          >);
    const items = (raw.items ?? []).map((baseItem) => ({
      baseItem,
      item: { ...baseItem, ...(overlay[baseItem.id] ?? {}) },
    }));
    const localizedIdentityCounts = new Map<string, number>();
    for (const { item } of items) {
      const key = `${item.name}|${plainText(item.source)}`;
      localizedIdentityCounts.set(key, (localizedIdentityCounts.get(key) ?? 0) + 1);
    }
    for (const { baseItem, item } of items) {
      const context = compendiumContext(item);
      const source = plainText(item.source);
      const localizedIdentity = `${item.name}|${source}`;
      const translationQualifier =
        locale !== DEFAULT_LOCALE &&
        (localizedIdentityCounts.get(localizedIdentity) ?? 0) > 1
          ? ` (${baseItem.name})`
          : '';
      const displayName = `${item.name}${translationQualifier}`;
      const seo = getCompendiumEntrySeo({
        categoryId,
        categoryLabel: displayCategory,
        item: { ...item, source } as unknown as CompendiumEntryBase,
        locale,
        sourceLabel: sourceLabel(source, locale),
        displayName,
      });
      pages.push({
        path: `${categoryPath}/${item.id}`,
        title: `${seo.title} - Fumble`,
        description: seo.description,
        content: excerpt(
          [seo.description, context].filter(Boolean).join(' '),
          seo.description,
        ),
        heading: displayName,
        breadcrumbTitle: displayName,
        modified: raw.meta?.generatedAt,
        ...(typeof item.image === 'string' ? { image: item.image } : {}),
        kind: 'article',
        ...(item.hidden || (locale !== DEFAULT_LOCALE && !overlay[baseItem.id])
          ? { indexable: false }
          : {}),
        parent: { path: categoryPath, title: displayCategory },
      });
      if (categoryId === 'classes') {
        const baseSubclasses = subclassRecords(baseItem.subclasses).filter(
          isClassSubclass,
        );
        const localizedSubclasses = localizeSubclasses(
          baseSubclasses,
          subclassRecords(item.subclasses).filter(isClassSubclass),
        );
        for (const subclass of localizedSubclasses) {
          const subclassName =
            typeof subclass.name === 'string' ? subclass.name : 'Subclass';
          const subclassSource =
            typeof subclass.source === 'string'
              ? subclass.source
              : typeof item.source === 'string'
                ? item.source
                : 'XPHB';
          const routedSubclass = {
            ...subclass,
            name: subclassName,
            source: subclassSource,
          };
          const subclassKey = subclassRouteKey(routedSubclass);
          const subclassItem = {
            ...item,
            name: `${item.name}: ${subclassName}`,
            source: subclassSource,
            lore: subclass.lore,
            features: subclass.features,
          };
          const subclassSeo = getCompendiumEntrySeo({
            categoryId,
            categoryLabel: displayCategory,
            item: subclassItem as unknown as CompendiumEntryBase,
            locale,
            sourceLabel: sourceLabel(subclassSource, locale),
            displayName: `${item.name}: ${subclassName}`,
          });
          pages.push({
            path: `${categoryPath}/${item.id}/${subclassKey}`,
            title: `${subclassSeo.title} - Fumble`,
            description: subclassSeo.description,
            content: excerpt(
              [
                subclassSeo.description,
                plainText(subclass.lore),
                plainText(subclass.features),
              ]
                .filter(Boolean)
                .join(' '),
              subclassSeo.description,
            ),
            heading: `${item.name}: ${subclassName}`,
            breadcrumbTitle: `${item.name}: ${subclassName}`,
            modified: raw.meta?.generatedAt,
            ...(typeof subclass.image === 'string' ? { image: subclass.image } : {}),
            kind: 'article',
            ...(item.hidden || (locale !== DEFAULT_LOCALE && !overlay[baseItem.id])
              ? { indexable: false }
              : {}),
            parent: { path: `${categoryPath}/${item.id}`, title: item.name },
          });
        }
      }
    }
    for (const item of fumbleHomebrewItems(locale).filter(
      (entry) => entry.category === categoryId,
    )) {
      const context = compendiumContext(item);
      const source = plainText(item.source);
      const parentClassId =
        categoryId === 'classes' ? fumbleParentClassId(item) : undefined;
      const parentClass = parentClassId
        ? items.find(({ baseItem }) => baseItem.id === parentClassId)?.item
        : undefined;
      const seo = getCompendiumEntrySeo({
        categoryId,
        categoryLabel: displayCategory,
        item: item as unknown as CompendiumEntryBase,
        locale,
        sourceLabel: sourceLabel(source, locale),
        ...(item.isSubclass && item.subclassName
          ? { displayName: item.subclassName }
          : {}),
      });
      pages.push({
        path: parentClassId
          ? `${categoryPath}/${parentClassId}/${item.id}`
          : `${categoryPath}/${item.id}`,
        title: `${seo.title} - Fumble`,
        description: seo.description,
        content: excerpt(
          [seo.description, context].filter(Boolean).join(' '),
          seo.description,
        ),
        heading: item.subclassName ?? item.name,
        breadcrumbTitle: item.subclassName ?? item.name,
        kind: 'article',
        parent: parentClassId
          ? {
              path: `${categoryPath}/${parentClassId}`,
              title: parentClass?.name ?? displayCategory,
            }
          : { path: categoryPath, title: displayCategory },
      });
    }
  }

  const books = JSON.parse(
    readFileSync(join(GENERATED_DIR, 'books.json'), 'utf8'),
  ) as Book[];
  const bookOverlayPath = join(GENERATED_DIR, locale, 'books.json');
  const bookOverlay =
    locale === DEFAULT_LOCALE || !existsSync(bookOverlayPath)
      ? {}
      : (JSON.parse(readFileSync(bookOverlayPath, 'utf8')) as Record<
          string,
          Partial<Book>
        >);
  for (const baseBook of books) {
    const book = { ...baseBook, ...(bookOverlay[baseBook.id] ?? {}) };
    const bookPath = `/books/${book.id}`;
    const localizedChapters = loadBookChapters(book, locale);
    const indexableBook =
      locale === DEFAULT_LOCALE || existsSync(bookDataPath(book, locale));
    const bookContextSource =
      locale === DEFAULT_LOCALE ? book.contents : localizedChapters;
    const bookContext = bookContextSource
      .map((chapter) => bookChapterContext(chapter, locale !== DEFAULT_LOCALE))
      .filter(Boolean)
      .join('. ');
    pages.push({
      path: bookPath,
      title: `${book.name} - Fumble`,
      description: concise(
        [book.name, book.storyline, book.author].filter(Boolean).join('. '),
        translate(locale, 'seo.bookDescription', { name: book.name }),
      ),
      content: excerpt(
        [book.name, bookContext, book.storyline, book.author].filter(Boolean).join('. '),
        translate(locale, 'seo.bookDescription', { name: book.name }),
      ),
      ...(typeof book.cover === 'string' ? { image: book.cover } : {}),
      kind: 'book',
      ...(indexableBook ? {} : { indexable: false }),
      parent: { path: '/books', title: translate(locale, 'seo.pageTitles.books') },
    });
    book.contents.forEach((baseChapter, index) => {
      const chapter = localizedChapters[index] ?? baseChapter;
      const chapterName =
        chapter.name || translate(locale, 'books.chapterFallback', { n: index + 1 });
      const chapterContext = bookChapterContext(chapter, true);
      pages.push({
        path: `${bookPath}/${index}`,
        title: `${chapterName} - ${book.name} - Fumble`,
        description: translate(locale, 'seo.bookChapterDescription', {
          chapter: chapterName,
          book: book.name,
        }),
        content: excerpt(
          [chapterContext, book.name, book.author].filter(Boolean).join('. '),
          translate(locale, 'seo.bookChapterDescription', {
            chapter: chapterName,
            book: book.name,
          }),
        ),
        kind: 'book',
        ...(indexableBook && isBookChapterIndexableForLocale(baseChapter, chapter)
          ? {}
          : { indexable: false }),
        parent: { path: bookPath, title: book.name },
      });
    });
  }

  const wiki = JSON.parse(readFileSync(join(GENERATED_DIR, 'wiki.json'), 'utf8')) as {
    campaigns?: WikiCampaign[];
    pages?: WikiPage[];
  };
  for (const campaign of wiki.campaigns ?? []) {
    const localizedCampaignName = campaignName(campaign.id, campaign.title, locale);
    pages.push({
      path: `/wiki/${campaign.id}`,
      title: `${localizedCampaignName} - ${translate(locale, 'seo.pageTitles.wiki')} - Fumble`,
      description: `${translate(locale, 'seo.pageDescriptions.wiki')} ${localizedCampaignName}.`,
      kind: 'website',
      parent: { path: '/wiki', title: translate(locale, 'seo.pageTitles.wiki') },
    });
    for (const page of campaign.pages ?? []) {
      const image = firstImageSource(page.html ?? '');
      pages.push({
        path: `/wiki/${campaign.id}/${page.slug}`,
        title: `${page.title} - ${localizedCampaignName} - Fumble`,
        description: concise(
          plainText(page.html),
          `${page.title}${page.category ? ` in ${page.category}` : ''} - Fumble campaign wiki.`,
        ),
        content: excerpt(
          plainText(page.html),
          `${page.title}${page.category ? ` in ${page.category}` : ''}.`,
        ),
        ...(image ? { image } : {}),
        kind: 'article',
        parent: { path: `/wiki/${campaign.id}`, title: localizedCampaignName },
      });
    }
  }
  for (const map of CAMPAIGN_MAPS) {
    const localizedCampaignName = campaignName(map.campaignId, map.campaignTitle, locale);
    const mapTitle = translate(
      locale,
      map.id === 'chult' ? 'seo.pageTitles.map' : 'seo.pageTitles.campaignMap',
    );
    const mapDescription = translate(
      locale,
      map.id === 'chult'
        ? 'seo.pageDescriptions.map'
        : 'seo.pageDescriptions.campaignMap',
    );
    pages.push({
      path: `/wiki/${map.campaignId}`,
      title: `${localizedCampaignName} - ${translate(locale, 'seo.pageTitles.wiki')} - Fumble`,
      description: `${translate(locale, 'seo.pageDescriptions.wiki')} ${localizedCampaignName}.`,
      kind: 'website',
      parent: { path: '/wiki', title: translate(locale, 'seo.pageTitles.wiki') },
    });
    pages.push({
      path: `/wiki/${map.campaignId}/map`,
      title: `${mapTitle} - ${localizedCampaignName} - Fumble`,
      description: mapDescription,
      content: mapDescription,
      image: `/${map.imagePath}`,
      kind: 'article',
      parent: { path: `/wiki/${map.campaignId}`, title: localizedCampaignName },
    });
  }

  return [...new Map(pages.map((page) => [page.path, page])).values()];
}

function absolute(path: string, locale: string): string {
  return `${SITE_URL}${localizePath(path, locale)}`;
}

function imagePreloadUrl(path: string, width = PRIMARY_IMAGE_WIDTH): string {
  const normalized = path.replace(/^%BASE%\/?/, '/');
  if (normalized.startsWith('/')) return `${SITE_URL}${normalized}`;
  return optimizedImageUrl(normalized, process.env.VITE_IMAGE_TRANSFORM_ORIGIN, width);
}

function usesImageHost(path: string): boolean {
  const normalized = path.replace(/^%BASE%\/?/, '/');
  if (normalized.startsWith('/')) return false;
  return imageUrl(normalized).startsWith(IMAGE_HOST);
}

function findBuiltAsset(prefix: string, extension: string): string | undefined {
  return ASSET_FILES.find(
    (file) => file.startsWith(`${prefix}-`) && file.endsWith(`.${extension}`),
  );
}

function findGeneratedAsset(category: string): string | undefined {
  const source = join(GENERATED_DIR, `${category}.json`);
  if (!existsSync(source)) return undefined;
  const size = statSync(source).size;
  return ASSET_FILES.find(
    (file) =>
      file.startsWith(`${category}-`) &&
      file.endsWith('.json') &&
      statSync(join(ASSETS_DIR, file)).size === size,
  );
}

function compendiumPreloadHints(page: PageInfo): string[] {
  const category = /^\/compendium\/([^/]+)/.exec(page.path)?.[1];
  if (!category) return [];
  const routeAsset = findBuiltAsset('CompendiumPage', 'js');
  const dataAsset = findGeneratedAsset(category);
  return [
    routeAsset
      ? `<link rel="modulepreload" crossorigin href="/assets/${routeAsset}" />`
      : '',
    dataAsset
      ? `<link rel="preload" as="fetch" crossorigin fetchpriority="low" href="/assets/${dataAsset}" />`
      : '',
  ].filter(Boolean);
}

function indexablePathMap(
  pagesByLocale: Map<string, PageInfo[]>,
): Map<string, Set<string>> {
  return new Map(
    [...pagesByLocale.entries()].map(([locale, pages]) => [
      locale,
      new Set(pages.filter((page) => page.indexable !== false).map((page) => page.path)),
    ]),
  );
}

function buildSitemap(pages: PageInfo[], pagesByLocale: Map<string, PageInfo[]>): string {
  const entries = pages.flatMap((page) => {
    const localizedPages = SUPPORTED_LOCALES.map(({ code }) => ({
      code,
      page: pagesByLocale.get(code)?.find((candidate) => candidate.path === page.path),
    })).filter(
      (entry): entry is { code: Locale; page: PageInfo } =>
        entry.page !== undefined && entry.page.indexable !== false,
    );
    const alternates = localizedPages
      .map(
        ({ code }) =>
          `    <xhtml:link rel="alternate" hreflang="${escapeXml(code)}" href="${escapeXml(absolute(page.path, code))}"/>`,
      )
      .concat(
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(absolute(page.path, DEFAULT_LOCALE))}"/>`,
      )
      .join('\n');
    return localizedPages.map(
      ({ code }) =>
        `  <url>\n    <loc>${escapeXml(absolute(page.path, code))}</loc>\n${alternates}\n  </url>`,
    );
  });
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
    'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    `${entries.join('\n')}\n` +
    '</urlset>\n'
  );
}

function buildSitemapIndex(files: string[]): string {
  const entries = files
    .map((file) => `  <sitemap>\n    <loc>${SITE_URL}/${file}</loc>\n  </sitemap>`)
    .join('\n');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `${entries}\n` +
    '</sitemapindex>\n'
  );
}

function replaceMeta(html: string, pattern: RegExp, replacement: string): string {
  return pattern.test(html)
    ? html.replace(pattern, replacement)
    : html.replace('</head>', `    ${replacement}\n  </head>`);
}

function pageHeading(page: PageInfo): string {
  return page.heading ?? page.breadcrumbTitle ?? page.title.replace(/ - Fumble$/, '');
}

function breadcrumbJson(page: PageInfo, locale: string) {
  const items = [
    { name: 'Fumble', path: '/' },
    ...(page.parent ? [{ name: page.parent.title, path: page.parent.path }] : []),
    { name: pageHeading(page), path: page.path },
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absolute(item.path, locale),
    })),
  };
}

function structuredData(page: PageInfo, locale: string) {
  if (page.path === '/') {
    const website = {
      '@type': 'WebSite',
      name: 'Fumble',
      url: absolute('/', locale),
      inLanguage: locale,
    };
    const application = {
      '@type': 'SoftwareApplication',
      name: 'Fumble',
      url: absolute('/', locale),
      applicationCategory: 'GameApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      description: page.description,
      author: {
        '@type': 'Person',
        name: 'Krystian Pińczak',
        url: 'https://github.com/PKrystian',
      },
    };
    return {
      '@context': 'https://schema.org',
      '@graph': [website, application],
    };
  }
  if (page.kind === 'book') {
    const book = {
      '@type': 'Book',
      name: pageHeading(page),
      url: absolute(page.path, locale),
      description: page.description,
      inLanguage: locale,
      ...(page.modified ? { dateModified: page.modified } : {}),
    };
    return {
      '@context': 'https://schema.org',
      '@graph': [breadcrumbJson(page, locale), book],
    };
  }
  if (page.kind === 'article' && page.path.startsWith('/compendium/')) {
    const url = absolute(page.path, locale);
    const article = {
      '@type': 'TechArticle',
      headline: pageHeading(page),
      name: pageHeading(page),
      url,
      description: page.description,
      inLanguage: locale,
      articleSection: page.parent?.title,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      author: {
        '@type': 'Person',
        name: 'Krystian Pińczak',
        url: 'https://github.com/PKrystian',
      },
      publisher: {
        '@type': 'Organization',
        name: 'Fumble',
        url: SITE_URL,
      },
      ...(page.parent
        ? {
            isPartOf: {
              '@type': 'CollectionPage',
              name: page.parent.title,
              url: absolute(page.parent.path, locale),
            },
          }
        : {}),
      ...(page.modified ? { dateModified: page.modified } : {}),
    };
    return {
      '@context': 'https://schema.org',
      '@graph': [breadcrumbJson(page, locale), article],
    };
  }
  if (page.path.startsWith('/compendium/')) {
    const url = absolute(page.path, locale);
    const collection = {
      '@type': 'CollectionPage',
      name: pageHeading(page),
      url,
      description: page.description,
      inLanguage: locale,
      ...(page.parent
        ? {
            isPartOf: {
              '@type': 'CollectionPage',
              name: page.parent.title,
              url: absolute(page.parent.path, locale),
            },
          }
        : {}),
      ...(page.modified ? { dateModified: page.modified } : {}),
    };
    return {
      '@context': 'https://schema.org',
      '@graph': [breadcrumbJson(page, locale), collection],
    };
  }
  const url = absolute(page.path, locale);
  const webPage = {
    '@type': page.kind === 'article' ? 'Article' : 'WebPage',
    name: pageHeading(page),
    url,
    description: page.description,
    inLanguage: locale,
    ...(page.kind === 'article' ? { headline: pageHeading(page) } : {}),
    ...(page.parent
      ? {
          isPartOf: {
            '@type': 'WebPage',
            name: page.parent.title,
            url: absolute(page.parent.path, locale),
          },
        }
      : {}),
    ...(page.modified ? { dateModified: page.modified } : {}),
  };
  return {
    '@context': 'https://schema.org',
    '@graph': [breadcrumbJson(page, locale), webPage],
  };
}

function buildRedirectHtml(template: string, page: PageInfo, locale: string): string {
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const target = absolute(page.redirectTo!, locale);
  let html = template.replace(/<html lang="[^"]+"/, `<html lang="${locale}"`);
  html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
  html = replaceMeta(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>(?:\s*)?/s,
    `<meta name="description" content="${description}" />`,
  );
  html = replaceMeta(
    html,
    /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>(?:\s*)?/s,
    '<meta name="robots" content="noindex, nofollow" />',
  );
  html = html
    .replace(/\s*<link\s+rel="canonical"\s+href="[^"]+"\s*\/?>(?:\s*)?/g, '')
    .replace(/\s*<link\s+rel="alternate"[^>]*\/?>(?:\s*)?/g, '')
    .replace(/\s*<meta\s+property="og:url"[^>]*\/?>(?:\s*)?/g, '');
  const refresh = `<meta http-equiv="refresh" content="0; url=${escapeHtml(target)}" />`;
  const body = `<main id="prerendered-content" data-prerendered="true"><h1>${title}</h1><p><a href="${escapeHtml(target)}">${escapeHtml(target)}</a></p></main>`;
  html = html.replace('</head>', `    ${refresh}\n  </head>`);
  return html.replace(
    '<div id="root"><div id="app-root" data-app-ready="false"></div></div>',
    `<div id="root"><div id="app-root" data-app-ready="false"></div>${body}</div>`,
  );
}

function buildHtml(
  template: string,
  page: PageInfo,
  locale: string,
  indexablePaths: Map<string, Set<string>>,
): string {
  if (page.redirectTo) return buildRedirectHtml(template, page, locale);
  const url = absolute(page.path, locale);
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const robots = page.indexable === false ? 'noindex, nofollow' : 'index, follow';
  const content = escapeHtml(page.content ?? page.description);
  const heading = escapeHtml(pageHeading(page));
  const socialImage = page.image
    ? imagePreloadUrl(page.image, PRIMARY_IMAGE_WIDTH)
    : `${SITE_URL}/og.png`;
  const primaryImageWidth = page.path.startsWith('/compendium/bestiary/')
    ? 320
    : PRIMARY_IMAGE_WIDTH;
  const breadcrumbs = [
    `<a href="${absolute('/', locale)}">Fumble</a>`,
    ...(page.parent
      ? [
          `<a href="${absolute(page.parent.path, locale)}">${escapeHtml(page.parent.title)}</a>`,
        ]
      : []),
  ].join(' / ');
  const fallbackImage = page.image
    ? `<div class="relative mb-4 inline-block min-h-80 max-w-full"><img src="${escapeHtml(imagePreloadUrl(page.image, primaryImageWidth))}" alt="${heading}" width="${PRIMARY_IMAGE_WIDTH}" height="${PRIMARY_IMAGE_HEIGHT}" loading="eager" fetchpriority="high" decoding="async" class="h-auto max-h-80 max-w-full rounded-lg border border-ink-700 object-contain" /></div>`
    : '';
  const fallback = `<main id="prerendered-content" data-prerendered="true"><nav aria-label="Breadcrumb">${breadcrumbs}</nav>${fallbackImage}<h1>${heading}</h1><p>${content}</p></main>`;
  const imagePreload = page.image
    ? `<link rel="preload" as="image" href="${escapeHtml(imagePreloadUrl(page.image, primaryImageWidth))}" fetchpriority="high" />`
    : '';
  const imagePreconnect =
    page.image && !process.env.VITE_IMAGE_TRANSFORM_ORIGIN && usesImageHost(page.image)
      ? '<link rel="preconnect" href="https://5e.tools" crossorigin />'
      : '';
  let html = template.replace(/<html lang="[^"]+"/, `<html lang="${locale}"`);
  const headHints = [imagePreconnect, imagePreload, ...compendiumPreloadHints(page)]
    .filter(Boolean)
    .join('\n    ');
  if (headHints) html = html.replace('<head>', `<head>\n    ${headHints}`);
  html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
  html = replaceMeta(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/s,
    `<meta name="description" content="${description}" />`,
  );
  html = replaceMeta(
    html,
    /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/,
    `<meta name="robots" content="${robots}" />`,
  );
  html = replaceMeta(
    html,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${url}" />`,
  );
  html = replaceMeta(
    html,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${title}" />`,
  );
  html = replaceMeta(
    html,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/s,
    `<meta property="og:description" content="${description}" />`,
  );
  html = replaceMeta(
    html,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${url}" />`,
  );
  html = replaceMeta(
    html,
    /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:type" content="${page.kind === 'website' ? 'website' : 'article'}" />`,
  );
  html = replaceMeta(
    html,
    /<meta\s+property="og:locale"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:locale" content="${locale === 'pl' ? 'pl_PL' : 'en_US'}" />`,
  );
  html = replaceMeta(
    html,
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>(?:\s*)?/s,
    `<meta property="og:image" content="${escapeHtml(socialImage)}" />`,
  );
  html = replaceMeta(
    html,
    /<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/?>(?:\s*)?/s,
    `<meta property="og:image:alt" content="${heading}" />`,
  );
  html = replaceMeta(
    html,
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${title}" />`,
  );
  html = replaceMeta(
    html,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/s,
    `<meta name="twitter:description" content="${description}" />`,
  );
  html = replaceMeta(
    html,
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>(?:\s*)?/s,
    `<meta name="twitter:image" content="${escapeHtml(socialImage)}" />`,
  );
  html = replaceMeta(
    html,
    /<meta\s+name="twitter:image:alt"\s+content="[^"]*"\s*\/?>(?:\s*)?/s,
    `<meta name="twitter:image:alt" content="${heading}" />`,
  );
  html = html.replace(
    /\s*<link\s+rel="alternate"\s+hreflang="[^"]+"\s+href="[^"]+"\s*\/?>/g,
    '',
  );
  const alternates =
    page.indexable === false
      ? ''
      : [
          ...SUPPORTED_LOCALES.filter(({ code }) =>
            indexablePaths.get(code)?.has(page.path),
          ).map(
            ({ code }) =>
              `<link rel="alternate" hreflang="${code}" href="${absolute(page.path, code)}" />`,
          ),
          ...(indexablePaths.get(DEFAULT_LOCALE)?.has(page.path)
            ? [
                `<link rel="alternate" hreflang="x-default" href="${absolute(page.path, DEFAULT_LOCALE)}" />`,
              ]
            : []),
        ].join('\n    ');
  if (page.indexable === false) {
    html = html.replace(/\s*<link\s+rel="canonical"\s+href="[^"]+"\s*\/?>(?:\s*)?/g, '');
  }
  const additions = [
    alternates,
    `<script type="application/ld+json">${JSON.stringify(structuredData(page, locale)).replaceAll('<', '\\u003c')}</script>`,
    ...(GOOGLE_VERIFICATION
      ? [
          `<meta name="google-site-verification" content="${escapeHtml(GOOGLE_VERIFICATION)}" />`,
        ]
      : []),
    ...(BING_VERIFICATION
      ? [`<meta name="msvalidate.01" content="${escapeHtml(BING_VERIFICATION)}" />`]
      : []),
  ].join('\n    ');
  html = html.replace('</head>', `    ${additions}\n  </head>`);
  return html.replace(
    '<div id="root"><div id="app-root" data-app-ready="false"></div></div>',
    `<div id="root"><div id="app-root" data-app-ready="false"></div>${fallback}</div>`,
  );
}

function writeRoute(path: string, html: string): void {
  const relative = path.replace(/^\//, '');
  if (!relative) {
    writeFileSync(join(OUT_DIR, 'index.html'), html);
    return;
  }
  const directoryFile = join(OUT_DIR, relative, 'index.html');
  mkdirSync(dirname(directoryFile), { recursive: true });
  writeFileSync(directoryFile, html);
}

function buildLlmsFull(pages: PageInfo[]): string {
  const groups = new Map<string, PageInfo[]>();
  for (const page of pages) {
    const section = page.path.split('/')[1] || 'home';
    const list = groups.get(section) ?? [];
    list.push(page);
    groups.set(section, list);
  }
  return [
    '# Fumble',
    '',
    '> Free, client-side D&D 2024 toolkit and campaign wiki. No login or backend.',
    '',
    ...[...groups.entries()].flatMap(([section, items]) => [
      `## ${section}`,
      '',
      ...items.map(
        (page) =>
          `- [${page.title}](${absolute(page.path, DEFAULT_LOCALE)}): ${page.description}`,
      ),
      '',
    ]),
  ].join('\n');
}

const SEARCH_ITEM_FIELDS = [
  'id',
  'name',
  'englishName',
  'source',
  'srd',
  'hidden',
  'ua',
  'otherVersions',
  'size',
  'hitDie',
  'feat',
  'category',
  'featureType',
  'level',
  'school',
  'type',
  'rarity',
  'cr',
  'creatureType',
  'time',
  'kind',
  'ruleType',
  'pantheon',
  'hazardType',
  'boonType',
  'ability',
  'languageType',
  'collection',
  'facilityType',
  'objectType',
  'vehicleType',
  'optionType',
  'cardCount',
  '_fumble',
  'isSubclass',
  'parentClassId',
  'className',
  'subtitle',
] as const;

function searchItem(item: CompendiumItem): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of SEARCH_ITEM_FIELDS) {
    const value = item[field];
    if (
      value == null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      if (value != null) result[field] = value;
      continue;
    }
    if (field === 'otherVersions' && Array.isArray(value)) {
      result.otherVersions = value.filter(
        (entry) =>
          entry &&
          typeof entry === 'object' &&
          typeof (entry as { id?: unknown }).id === 'string' &&
          typeof (entry as { source?: unknown }).source === 'string',
      );
    }
  }
  return result;
}

function buildSearchIndex(locale: Locale): string {
  const categories: Array<{ id: string; items: Record<string, unknown>[] }> = [];
  for (const categoryId of COMPENDIUM_CATEGORIES) {
    const rawPath = join(GENERATED_DIR, `${categoryId}.json`);
    const raw = existsSync(rawPath)
      ? (JSON.parse(readFileSync(rawPath, 'utf8')) as CompendiumFile)
      : { items: [] };
    const overlayPath = join(GENERATED_DIR, locale, `${categoryId}.json`);
    const overlay =
      locale === DEFAULT_LOCALE || !existsSync(overlayPath)
        ? {}
        : (JSON.parse(readFileSync(overlayPath, 'utf8')) as Record<
            string,
            CompendiumItem
          >);
    categories.push({
      id: categoryId,
      items: [
        ...(raw.items ?? []).map((item) =>
          searchItem(
            withEnglishName({ ...item, ...(overlay[item.id] ?? {}) }, item.name),
          ),
        ),
        ...fumbleHomebrewItems(locale)
          .filter((item) => item.category === categoryId)
          .map((item) => searchItem(item)),
      ],
    });
  }
  const wiki = JSON.parse(readFileSync(join(GENERATED_DIR, 'wiki.json'), 'utf8')) as {
    campaigns?: WikiCampaign[];
    pages?: WikiPage[];
  };
  const wikiPages = wiki.campaigns
    ? wiki.campaigns.flatMap((campaign) =>
        (campaign.pages ?? []).map((page) => ({ ...page, campaignId: campaign.id })),
      )
    : (wiki.pages ?? []);
  return JSON.stringify({
    categories,
    wiki: wikiPages.map(({ campaignId, slug, title, category }) => ({
      campaignId,
      slug,
      title,
      category,
    })),
  });
}

const pagesByLocale = new Map(
  SUPPORTED_LOCALES.map(({ code }) => [code, collectPages(code)]),
);
const indexablePaths = indexablePathMap(pagesByLocale);
const pages = pagesByLocale.get(DEFAULT_LOCALE)!;
const template = readFileSync(join(OUT_DIR, 'index.html'), 'utf8');
for (const { code } of SUPPORTED_LOCALES) {
  for (const page of pagesByLocale.get(code) ?? []) {
    writeRoute(
      localizePath(page.path, code),
      buildHtml(template, page, code, indexablePaths),
    );
  }
}
const sitemapGroups = new Map<string, PageInfo[]>([
  ['sitemap-pages.xml', []],
  ['sitemap-compendium.xml', []],
  ['sitemap-books.xml', []],
  ['sitemap-wiki.xml', []],
]);
const indexablePages = pages.filter((page) => page.indexable !== false);
for (const page of indexablePages) {
  const file = page.path.startsWith('/compendium')
    ? 'sitemap-compendium.xml'
    : page.path.startsWith('/books')
      ? 'sitemap-books.xml'
      : page.path.startsWith('/wiki')
        ? 'sitemap-wiki.xml'
        : 'sitemap-pages.xml';
  sitemapGroups.get(file)!.push(page);
}
for (const [file, group] of sitemapGroups) {
  writeFileSync(join(OUT_DIR, file), buildSitemap(group, pagesByLocale));
}
writeFileSync(join(OUT_DIR, 'sitemap.xml'), buildSitemapIndex([...sitemapGroups.keys()]));
writeFileSync(join(OUT_DIR, 'llms-full.txt'), buildLlmsFull(indexablePages));
for (const { code } of SUPPORTED_LOCALES) {
  writeFileSync(join(OUT_DIR, `search-index-${code}.json`), buildSearchIndex(code));
}
console.log(
  `Wrote ${pages.length * SUPPORTED_LOCALES.length} static pages and ${indexablePages.length * SUPPORTED_LOCALES.length} indexable URLs.`,
);
