import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../src/i18n/locales';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SITE_URL = 'https://pkrystian.github.io/fumble';
const GENERATED_DIR = join(ROOT, 'src/data/generated');
const OUT_DIR = join(ROOT, 'dist');

const STATIC_PATHS = [
  '/',
  '/character',
  '/compendium',
  '/homebrew',
  '/books',
  '/dice',
  '/session-log',
  '/dm/initiative',
  '/dm/loot',
  '/dm/encounter',
  '/dm/soundboard',
  '/wiki',
  '/legal',
  '/legal/privacy',
  '/legal/connections',
  '/legal/terms',
  '/legal/licenses',
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
]);

function localizePath(path: string, locale: string): string {
  if (locale === DEFAULT_LOCALE) return path;
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function collectCategoryUrls(): string[] {
  const urls: string[] = [];
  for (const file of readdirSync(GENERATED_DIR)) {
    const categoryId = file.replace(/\.json$/, '');
    if (!file.endsWith('.json') || !COMPENDIUM_CATEGORIES.has(categoryId)) continue;
    const raw = JSON.parse(readFileSync(join(GENERATED_DIR, file), 'utf8')) as {
      items?: Array<{ id: string; hidden?: boolean }>;
    };
    urls.push(`/compendium/${categoryId}`);
    for (const item of raw.items ?? []) {
      if (item.hidden) continue;
      urls.push(`/compendium/${categoryId}/${item.id}`);
    }
  }
  return urls;
}

function collectWikiUrls(): string[] {
  const raw = JSON.parse(readFileSync(join(GENERATED_DIR, 'wiki.json'), 'utf8')) as {
    pages?: Array<{ slug: string }>;
  };
  return (raw.pages ?? []).map((page) => `/wiki/${page.slug}`);
}

function collectBookUrls(): string[] {
  const raw = JSON.parse(
    readFileSync(join(GENERATED_DIR, 'books.json'), 'utf8'),
  ) as Array<{
    id: string;
    contents: unknown[];
  }>;
  const urls: string[] = [];
  for (const book of raw) {
    urls.push(`/books/${book.id}`);
    book.contents.forEach((_, index) => urls.push(`/books/${book.id}/${index}`));
  }
  return urls;
}

function buildSitemap(paths: string[]): string {
  const urlEntries = paths.flatMap((path) => {
    const alternates = [
      ...SUPPORTED_LOCALES.map(({ code }) => ({
        hreflang: code,
        href: `${SITE_URL}${localizePath(path, code)}`,
      })),
      {
        hreflang: 'x-default',
        href: `${SITE_URL}${localizePath(path, DEFAULT_LOCALE)}`,
      },
    ]
      .map(
        ({ hreflang, href }) =>
          `    <xhtml:link rel="alternate" hreflang="${escapeXml(hreflang)}" href="${escapeXml(href)}"/>`,
      )
      .join('\n');

    return SUPPORTED_LOCALES.map(({ code }) => {
      const url = `${SITE_URL}${localizePath(path, code)}`;
      return `  <url>\n    <loc>${escapeXml(url)}</loc>\n${alternates}\n  </url>`;
    });
  });
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
    'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    `${urlEntries.join('\n')}\n` +
    '</urlset>\n'
  );
}

const paths = [
  ...new Set([
    ...STATIC_PATHS,
    ...collectCategoryUrls(),
    ...collectBookUrls(),
    ...collectWikiUrls(),
  ]),
];
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'sitemap.xml'), buildSitemap(paths));
console.log(
  `Wrote dist/sitemap.xml with ${paths.length * SUPPORTED_LOCALES.length} URLs across ${SUPPORTED_LOCALES.length} locales.`,
);
