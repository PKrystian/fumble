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
import type { CompendiumEntryBase } from '../../src/data/compendium/types';
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
  name: string;
  author?: string;
  storyline?: string;
  cover?: string;
  contents: Array<{ name?: string }>;
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
  },
  '/compendium': {
    title: 'seo.pageTitles.compendium',
    description: 'seo.pageDescriptions.compendium',
  },
  '/homebrew': {
    title: 'seo.pageTitles.homebrew',
    description: 'seo.pageDescriptions.homebrew',
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
    return [record.name, record.entry, record.entries]
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
  ]
    .map(plainText)
    .filter(Boolean)
    .join(' ');
}

function collectPages(locale: Locale): PageInfo[] {
  const pages = STATIC_PAGES.map((page) => {
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
  });
  for (const file of readdirSync(GENERATED_DIR)) {
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
    const raw = JSON.parse(
      readFileSync(join(GENERATED_DIR, file), 'utf8'),
    ) as CompendiumFile;
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
    const items = (raw.items ?? [])
      .map((baseItem) => ({
        baseItem,
        item: { ...baseItem, ...(overlay[baseItem.id] ?? {}) },
      }))
      .filter(({ item }) => !item.hidden);
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
        parent: { path: categoryPath, title: displayCategory },
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
    pages.push({
      path: bookPath,
      title: `${book.name} - Fumble`,
      description: concise(
        [book.name, book.storyline, book.author].filter(Boolean).join('. '),
        translate(locale, 'seo.bookDescription', { name: book.name }),
      ),
      ...(typeof book.cover === 'string' ? { image: book.cover } : {}),
      kind: 'book',
      parent: { path: '/books', title: translate(locale, 'seo.pageTitles.books') },
    });
    book.contents.forEach((chapter, index) => {
      const chapterName =
        chapter.name || translate(locale, 'books.chapterFallback', { n: index + 1 });
      pages.push({
        path: `${bookPath}/${index}`,
        title: `${chapterName} - ${book.name} - Fumble`,
        description: translate(locale, 'seo.bookChapterDescription', {
          chapter: chapterName,
          book: book.name,
        }),
        kind: 'book',
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

function imagePreloadUrl(path: string): string {
  const normalized = path.replace(/^%BASE%\/?/, '/');
  if (normalized.startsWith('/')) return `${SITE_URL}${normalized}`;
  return optimizedImageUrl(normalized, process.env.VITE_IMAGE_TRANSFORM_ORIGIN);
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

function buildSitemap(pages: PageInfo[]): string {
  const entries = pages.flatMap((page) => {
    const alternates = [
      ...SUPPORTED_LOCALES.map(({ code }) => ({
        hreflang: code,
        href: absolute(page.path, code),
      })),
      { hreflang: 'x-default', href: absolute(page.path, DEFAULT_LOCALE) },
    ]
      .map(
        ({ hreflang, href }) =>
          `    <xhtml:link rel="alternate" hreflang="${escapeXml(hreflang)}" href="${escapeXml(href)}"/>`,
      )
      .join('\n');
    return SUPPORTED_LOCALES.map(
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

function buildHtml(template: string, page: PageInfo, locale: string): string {
  const url = absolute(page.path, locale);
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const robots = page.indexable === false ? 'noindex, nofollow' : 'index, follow';
  const content = escapeHtml(page.content ?? page.description);
  const heading = escapeHtml(pageHeading(page));
  const breadcrumbs = [
    `<a href="${absolute('/', locale)}">Fumble</a>`,
    ...(page.parent
      ? [
          `<a href="${absolute(page.parent.path, locale)}">${escapeHtml(page.parent.title)}</a>`,
        ]
      : []),
  ].join(' / ');
  const fallbackImage = page.image
    ? `<div class="relative mb-4 inline-block min-h-80 max-w-full"><img src="${escapeHtml(imagePreloadUrl(page.image))}" alt="${heading}" width="${PRIMARY_IMAGE_WIDTH}" height="${PRIMARY_IMAGE_HEIGHT}" loading="eager" fetchpriority="high" decoding="async" class="h-auto max-h-80 max-w-full rounded-lg border border-ink-700 object-contain" /></div>`
    : '';
  const fallback = `<main id="prerendered-content" data-prerendered="true"><nav aria-label="Breadcrumb">${breadcrumbs}</nav>${fallbackImage}<h1>${heading}</h1><p>${content}</p></main>`;
  const imagePreload = page.image
    ? `<link rel="preload" as="image" href="${escapeHtml(imagePreloadUrl(page.image))}" fetchpriority="high" />`
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
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${title}" />`,
  );
  html = replaceMeta(
    html,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/s,
    `<meta name="twitter:description" content="${description}" />`,
  );
  html = html.replace(
    /\s*<link\s+rel="alternate"\s+hreflang="[^"]+"\s+href="[^"]+"\s*\/?>/g,
    '',
  );
  const alternates = [
    ...SUPPORTED_LOCALES.map(
      ({ code }) =>
        `<link rel="alternate" hreflang="${code}" href="${absolute(page.path, code)}" />`,
    ),
    `<link rel="alternate" hreflang="x-default" href="${absolute(page.path, DEFAULT_LOCALE)}" />`,
  ].join('\n    ');
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

function searchItem(item: CompendiumItem): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(item).filter(([, value]) => {
      if (
        value == null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      )
        return true;
      if (!Array.isArray(value)) return false;
      return value.every(
        (entry) =>
          typeof entry === 'string' ||
          (entry && typeof entry === 'object' && 'id' in entry && 'source' in entry),
      );
    }),
  );
}

function buildSearchIndex(locale: string): string {
  const categories: Array<{ id: string; items: Record<string, unknown>[] }> = [];
  for (const categoryId of COMPENDIUM_CATEGORIES) {
    const raw = JSON.parse(
      readFileSync(join(GENERATED_DIR, `${categoryId}.json`), 'utf8'),
    ) as CompendiumFile;
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
      items: (raw.items ?? []).map((item) =>
        searchItem(withEnglishName({ ...item, ...(overlay[item.id] ?? {}) }, item.name)),
      ),
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
const pages = pagesByLocale.get(DEFAULT_LOCALE)!;
const template = readFileSync(join(OUT_DIR, 'index.html'), 'utf8');
for (const { code } of SUPPORTED_LOCALES) {
  for (const page of pagesByLocale.get(code) ?? []) {
    writeRoute(localizePath(page.path, code), buildHtml(template, page, code));
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
  writeFileSync(join(OUT_DIR, file), buildSitemap(group));
}
writeFileSync(join(OUT_DIR, 'sitemap.xml'), buildSitemapIndex([...sitemapGroups.keys()]));
writeFileSync(join(OUT_DIR, 'llms-full.txt'), buildLlmsFull(indexablePages));
for (const { code } of SUPPORTED_LOCALES) {
  writeFileSync(join(OUT_DIR, `search-index-${code}.json`), buildSearchIndex(code));
}
console.log(
  `Wrote ${pages.length * SUPPORTED_LOCALES.length} static pages and ${indexablePages.length * SUPPORTED_LOCALES.length} indexable URLs.`,
);
