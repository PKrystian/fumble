import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../src/i18n/locales';
import { IMAGE_HOST, imageUrl } from '../../src/data/compendium/images';
import { cspHasSourceOrigin } from '../../src/seo/csp';
import { compendiumPrintingSeo } from '../../src/data/compendium/indexability';
import { fumbleHomebrewItems } from '../../src/features/homebrew/fumbleHomebrew';
import { LEGAL_DATES, LEGAL_PAGES, legalPath } from '../../src/features/legal/links';
import { releaseAnchor } from '../../src/features/legal/changelog';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const DIST = join(ROOT, 'dist');
const SITE_URL = 'https://fumble.krystianpinczak.com';

function read(path: string): string {
  const target = join(DIST, path);
  if (!existsSync(target)) throw new Error(`Missing release file: ${path}`);
  return readFileSync(target, 'utf8');
}

function requireValue(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function localizedRoute(path: string, locale: string): string {
  if (locale === DEFAULT_LOCALE) return path;
  return `/${locale}${path}`;
}

function expectedImageUrl(path: string): string {
  const normalized = path.replace(/^%BASE%\/?/, '/');
  if (normalized.startsWith('/')) return `${SITE_URL}${normalized}`;
  return imageUrl(normalized);
}

interface ReleaseCompendiumItem {
  id: string;
  name: string;
  source: string;
  srd: boolean;
  hidden?: boolean;
  image?: unknown;
  otherVersions?: Array<{ id: string; source: string }>;
}

interface ReleaseBook {
  id: string;
  type: 'book' | 'adventure';
  contents?: Array<{ name?: string }>;
}

function validateBookRoutes(): number {
  const books = JSON.parse(
    readFileSync(join(ROOT, 'src/data/generated/books.json'), 'utf8'),
  ) as ReleaseBook[];
  let checked = 0;
  for (const localeInfo of SUPPORTED_LOCALES) {
    const locale = localeInfo.code;
    for (const book of books) {
      const bookRoute = localizedRoute(`/books/${book.id}/`, locale);
      requireValue(
        existsSync(join(DIST, `${bookRoute.slice(1)}index.html`)),
        `Missing book route: ${bookRoute}`,
      );
      for (const index of (book.contents ?? []).keys()) {
        const route = localizedRoute(`/books/${book.id}/${index}/`, locale);
        const html = read(`${route.slice(1)}index.html`);
        requireValue(
          html.includes('<meta name="robots" content="noindex, nofollow" />'),
          `Book chapter must be noindex: ${route}`,
        );
        checked += 1;
      }
    }
  }
  return checked;
}

function validateCompendiumRoutes(): number {
  let checked = 0;
  for (const file of readdirSync(join(ROOT, 'src/data/generated'))) {
    if (!file.endsWith('.json')) continue;
    const category = file.slice(0, -'.json'.length);
    const source = JSON.parse(
      readFileSync(join(ROOT, 'src/data/generated', file), 'utf8'),
    ) as { items?: ReleaseCompendiumItem[] };
    if (!Array.isArray(source.items)) continue;
    const ids = new Set(source.items.map((item) => item.id));
    for (const item of source.items) {
      for (const version of item.otherVersions ?? []) {
        requireValue(
          ids.has(version.id),
          `Compendium other printing is missing: /compendium/${category}/${version.id}/`,
        );
      }
    }
    for (const localeInfo of SUPPORTED_LOCALES) {
      const locale = localeInfo.code;
      const categoryRoute = localizedRoute(`/compendium/${category}/`, locale);
      if (!existsSync(join(DIST, `${categoryRoute.slice(1)}index.html`))) continue;
      const overlayPath = join(ROOT, 'src/data/generated', locale, file);
      const overlay =
        locale !== DEFAULT_LOCALE && existsSync(overlayPath)
          ? (JSON.parse(readFileSync(overlayPath, 'utf8')) as Record<string, unknown>)
          : {};
      const fumbleOwnedIds = new Set(
        fumbleHomebrewItems(locale)
          .filter((entry) => entry.category === category)
          .map((entry) => entry.id),
      );
      for (const item of source.items) {
        // Own Fumble entries replace official ones with the same id and are indexable.
        if (fumbleOwnedIds.has(item.id)) continue;
        const route = localizedRoute(`/compendium/${category}/${item.id}/`, locale);
        const html = read(`${route.slice(1)}index.html`);
        const { indexable, canonicalId } = compendiumPrintingSeo(
          item,
          source.items,
          category,
        );
        if (
          canonicalId &&
          (locale === DEFAULT_LOCALE || (overlay[item.id] && overlay[canonicalId]))
        ) {
          const target = localizedRoute(
            `/compendium/${category}/${canonicalId}/`,
            locale,
          );
          requireValue(
            html.includes(`<link rel="canonical" href="${SITE_URL}${target}" />`) &&
              !html.includes('<meta name="robots" content="noindex'),
            `Equivalent printing must consolidate to its canonical URL: ${route}`,
          );
        } else if (!indexable || (locale !== DEFAULT_LOCALE && !overlay[item.id])) {
          requireValue(
            html.includes('<meta name="robots" content="noindex, nofollow" />'),
            `Hidden compendium route must be noindex: ${route}`,
          );
        }
        checked += 1;
      }
    }
  }
  return checked;
}

function usesImageHost(path: string): boolean {
  const normalized = path.replace(/^%BASE%\/?/, '/');
  if (normalized.startsWith('/')) return false;
  return imageUrl(normalized).startsWith(IMAGE_HOST);
}

function validateCompendiumImagePreloads(): number {
  let checked = 0;
  for (const file of readdirSync(join(ROOT, 'src/data/generated'))) {
    if (!file.endsWith('.json')) continue;
    const category = file.slice(0, -'.json'.length);
    const source = JSON.parse(
      readFileSync(join(ROOT, 'src/data/generated', file), 'utf8'),
    ) as { items?: Array<{ id: string; hidden?: boolean; image?: unknown }> };
    if (!Array.isArray(source.items)) continue;
    for (const localeInfo of SUPPORTED_LOCALES) {
      const locale = localeInfo.code;
      const categoryRoute = localizedRoute(`/compendium/${category}/`, locale);
      if (!existsSync(join(DIST, `${categoryRoute.slice(1)}index.html`))) continue;
      const overlayPath = join(ROOT, 'src/data/generated', locale, file);
      const overlay =
        locale === DEFAULT_LOCALE || !existsSync(overlayPath)
          ? {}
          : (JSON.parse(readFileSync(overlayPath, 'utf8')) as Record<
              string,
              { hidden?: boolean; image?: unknown }
            >);
      for (const item of source.items) {
        const localized = { ...item, ...(overlay[item.id] ?? {}) };
        if (typeof localized.image !== 'string') continue;
        const route = localizedRoute(`/compendium/${category}/${item.id}/`, locale);
        const html = read(`${route.slice(1)}index.html`);
        const href = escapeHtml(expectedImageUrl(localized.image));
        requireValue(
          html.includes(
            `<link rel="preload" as="image" href="${href}" fetchpriority="high" />`,
          ),
          `Compendium image preload is missing: ${route}`,
        );
        const shouldPreconnect = usesImageHost(localized.image);
        requireValue(
          html.includes(
            '<link rel="preconnect" href="https://5e.tools" crossorigin />',
          ) === shouldPreconnect,
          shouldPreconnect
            ? `Direct image preconnect is missing: ${route}`
            : `Unexpected direct image preconnect: ${route}`,
        );
        checked += 1;
      }
    }
  }
  return checked;
}

function isProductionUrl(value: string): boolean {
  try {
    return new URL(value).origin === SITE_URL;
  } catch {
    return false;
  }
}

function routeFile(url: string): string {
  const pathname = decodeURIComponent(new URL(url).pathname);
  const relative = pathname.replace(/^\/+/, '');
  return join(DIST, relative, 'index.html');
}

const sitemap = read('sitemap.xml');
const sitemapFiles = [...sitemap.matchAll(/<loc>[^<]+\/([^/]+\.xml)<\/loc>/g)].map(
  (match) => match[1]!,
);
requireValue(
  sitemapFiles.length === 3 && !sitemapFiles.includes('sitemap-books.xml'),
  'Sitemap index must contain the pages, compendium, and wiki sitemaps only',
);
requireValue(
  !existsSync(join(DIST, 'sitemap-books.xml')),
  'Books must stay out of the sitemap',
);
const urls = sitemapFiles.flatMap((file) =>
  [...read(file).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]!),
);
requireValue(urls.length > 0, 'Sitemap has no URLs');
requireValue(new Set(urls).size === urls.length, 'Sitemap contains duplicate URLs');
requireValue(
  urls.every(isProductionUrl),
  'Sitemap contains a URL outside the production domain',
);
requireValue(
  urls.every((url) => url.endsWith('/')),
  'Sitemap contains a URL without a trailing slash',
);
requireValue(
  urls.every((url) => existsSync(routeFile(url))),
  'Sitemap contains a route without a generated HTML file',
);
const catalogLinks = new Set<string>();
for (const url of urls) {
  const html = readFileSync(routeFile(url), 'utf8');
  requireValue(
    html.includes(`<link rel="canonical" href="${url}" />`) &&
      html.includes('<meta name="robots" content="index, follow" />'),
    `Sitemap URL must be indexable and self-canonical: ${url}`,
  );
  if (/\/compendium\/[^/]+\/browse\/\d+\/$/.test(url)) {
    for (const [, href] of html.matchAll(/<a href="([^"]+)"/g)) catalogLinks.add(href!);
  }
}
for (const url of urls.filter((value) => /\/compendium\/[^/]+\/[^/]+\/$/.test(value))) {
  requireValue(catalogLinks.has(url), `Missing static catalog link to ${url}`);
}
requireValue(
  !urls.some((url) => url.includes('/data/') || url.includes('/session-log/')),
  'Private local-data pages must not appear in the sitemap',
);

const home = read('index.html');
const sample = read(join('compendium', 'spells', 'fireball', 'index.html'));
const monsterSample = read(join('pl', 'compendium', 'bestiary', 'hawk', 'index.html'));
const fumbleMonsterSample = read(
  join('compendium', 'bestiary', 'allied-hunter', 'index.html'),
);
const fullChapter = read(join('books', 'xge', '2', 'index.html'));
const bookSample = read(join('books', 'aatm', 'index.html'));
const privateSample = read(join('character', 'index.html'));
const notFound = read('404.html');
requireValue(
  !cspHasSourceOrigin(home, 'connect-src', 'https://cloudflareinsights.com') &&
    !cspHasSourceOrigin(home, 'script-src', 'https://static.cloudflareinsights.com'),
  'Cloudflare Web Analytics must stay disabled',
);
requireValue(
  sample.includes(
    '<link rel="modulepreload" crossorigin href="/assets/CompendiumPage-',
  ) &&
    sample.includes(
      '<link rel="preload" as="fetch" crossorigin fetchpriority="low" href="/assets/spells-',
    ),
  'Compendium pages must preload their route and category data',
);
for (const html of [monsterSample, fumbleMonsterSample]) {
  requireValue(
    html.includes('id="fumble-monster-snapshot"') &&
      !/as="fetch"[^>]*href="\/assets\/bestiary-/.test(html),
    'Direct bestiary pages must provide one stat block and skip the full data preload',
  );
}
requireValue(
  (fullChapter.match(/<table\b/g) ?? []).length >= 46,
  'The Xanathar chapter must retain every static table',
);
for (const { code } of SUPPORTED_LOCALES) read(`bestiary-references-${code}.json`);
requireValue(
  sample.includes('<div id="app-root" data-app-ready="false"></div>') &&
    sample.includes(
      '<main id="prerendered-content" data-prerendered="true" data-path="/compendium/spells/fireball/">',
    ),
  'Static pages must preserve the app mount point and prerendered fallback',
);
for (const locale of SUPPORTED_LOCALES) {
  const category = localizedRoute('/compendium/spells/', locale.code);
  const catalog = read(`${category.slice(1)}browse/1/index.html`);
  requireValue(
    read(`${category.slice(1)}index.html`).includes(
      `href="${SITE_URL}${category}browse/1/"`,
    ) &&
      catalog.includes(`href="${SITE_URL}${category}browse/2/"`) &&
      !/<script[^>]*type="module"/.test(catalog),
    `Compendium catalog must be reachable without JavaScript: ${category}`,
  );
}
requireValue(
  bookSample.includes('Using This Supplement') &&
    bookSample.includes('Mortuary Creatures'),
  'Book pages must preserve their indexed chapter outline',
);
requireValue(
  privateSample.includes('noindex, nofollow') &&
    !(privateSample.match(/rel="canonical"/g) ?? []).length,
  'Private local-data pages must be noindex and canonical-free',
);
requireValue(
  notFound.includes('<meta name="robots" content="noindex, nofollow" />') &&
    !(notFound.match(/rel="canonical"/g) ?? []).length &&
    !/<script\b/i.test(notFound) &&
    notFound.includes('<main id="prerendered-content" data-prerendered="true">'),
  '404.html must be a standalone noindex document without scripts',
);
const checkedImagePreloads = validateCompendiumImagePreloads();
const checkedCompendiumRoutes = validateCompendiumRoutes();
const checkedBookRoutes = validateBookRoutes();
for (const html of [home, sample]) {
  requireValue(!html.includes('pkrystian.github.io/fumble'), 'Old domain found in HTML');
  requireValue(
    (html.match(/rel="canonical"/g) ?? []).length === 1,
    'HTML must contain one canonical link',
  );
  requireValue(
    (html.match(/property="og:image"/g) ?? []).length === 1,
    'HTML must contain one Open Graph image',
  );
  const canonical = html.match(/rel="canonical" href="([^"]+)"/)?.[1];
  requireValue(!!canonical?.endsWith('/'), 'Canonical URL must have a trailing slash');
}

const manifest = JSON.parse(read('manifest.webmanifest')) as {
  name?: string;
  scope?: string;
  icons?: Array<{ src?: string }>;
};
requireValue(manifest.name === 'Fumble', 'Manifest name is invalid');
requireValue(manifest.scope === '/', 'Manifest scope is invalid');
requireValue((manifest.icons?.length ?? 0) >= 3, 'Manifest icons are incomplete');
for (const icon of manifest.icons ?? []) {
  requireValue(!!icon.src, 'Manifest icon has no source');
  read(icon.src!.replace(/^\//, ''));
}

const security = read(join('.well-known', 'security.txt'));
requireValue(
  security.includes('Contact: https://github.com/PKrystian'),
  'Missing contact',
);
requireValue(security.includes('Expires:'), 'Missing security.txt expiry');
requireValue(
  security.includes(`Canonical: ${SITE_URL}/.well-known/security.txt`),
  'Invalid security.txt canonical',
);

requireValue(read('CNAME').trim() === 'fumble.krystianpinczak.com', 'Invalid CNAME');
requireValue(
  read('robots.txt').includes(`${SITE_URL}/sitemap.xml`),
  'Invalid robots.txt',
);
read('llms.txt');
read('llms-full.txt');
read(join('legal', 'accessibility', 'index.html'));
read(join('legal', 'contact', 'index.html'));
for (const path of ['data/index.html', 'session-log/index.html']) {
  requireValue(
    read(path).includes('noindex, nofollow'),
    `Private page is missing noindex: ${path}`,
  );
}

const releaseVersion = (
  JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { version: string }
).version;
for (const { code } of SUPPORTED_LOCALES) {
  for (const page of LEGAL_PAGES) {
    const route = localizedRoute(`${legalPath(page)}/`, code);
    const html = read(`${route.slice(1)}index.html`);
    const main =
      /<main\b[^>]*id="static-main"[^>]*>([\s\S]*?)<\/main>/.exec(html)?.[1] ?? '';
    requireValue(
      main.length > 1000 &&
        main.includes('<h1') &&
        main.toLowerCase().includes(`datetime="${LEGAL_DATES[page]}"`),
      `Incomplete static legal document: ${route}`,
    );
    requireValue(
      !main.includes('[[') && !main.includes('<footer') && html.includes('<footer'),
      `Invalid legal references or footer: ${route}`,
    );
  }
  const map = read(`${localizedRoute('/site-map/', code).slice(1)}index.html`);
  requireValue(
    (map.match(/\/browse\/1\//g) ?? []).length === 34,
    `Site map must link every static catalog: ${code}`,
  );
  const changelog = read(`${localizedRoute('/changelog/', code).slice(1)}index.html`);
  requireValue(
    changelog.includes(`id="${releaseAnchor(releaseVersion)}"`),
    `Current release is missing from static history: ${code}`,
  );
}

process.stdout.write(
  `Validated ${urls.length} release URLs, ${checkedCompendiumRoutes} compendium routes, ${checkedBookRoutes} book routes, ${checkedImagePreloads} image preloads, and discovery files.\n`,
);
