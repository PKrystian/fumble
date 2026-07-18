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
  '/homebrew',
  '/books',
  '/dice',
  '/session-log',
  '/dm/initiative',
  '/dm/loot',
  '/dm/encounter',
  '/dm/soundboard',
];

function localizePath(path: string, locale: string): string {
  if (locale === DEFAULT_LOCALE) return path;
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

function collectCategoryUrls(): string[] {
  const urls: string[] = [];
  for (const file of readdirSync(GENERATED_DIR)) {
    if (!file.endsWith('.json') || file === 'books.json' || file === 'sources.json') {
      continue;
    }
    const categoryId = file.replace(/\.json$/, '');
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
  const urlEntries = paths.map((path) => {
    const alternates = [
      ...SUPPORTED_LOCALES.map(
        (l) =>
          `    <xhtml:link rel="alternate" hreflang="${l.code}" href="${SITE_URL}${localizePath(path, l.code)}"/>`,
      ),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${localizePath(path, DEFAULT_LOCALE)}"/>`,
    ].join('\n');
    return `  <url>\n    <loc>${SITE_URL}${localizePath(path, DEFAULT_LOCALE)}</loc>\n${alternates}\n  </url>`;
  });
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
    'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    `${urlEntries.join('\n')}\n` +
    '</urlset>\n'
  );
}

const paths = [...STATIC_PATHS, ...collectCategoryUrls(), ...collectBookUrls()];
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'sitemap.xml'), buildSitemap(paths));
console.log(
  `Wrote dist/sitemap.xml with ${paths.length} URLs (× ${SUPPORTED_LOCALES.length} locales).`,
);
