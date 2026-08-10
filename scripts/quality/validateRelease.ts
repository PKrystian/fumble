import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../src/i18n/locales';
import {
  IMAGE_HOST,
  imageUrl,
  optimizedImageUrl,
  PRIMARY_IMAGE_WIDTH,
} from '../../src/data/compendium/images';
import { cspHasSourceOrigin } from '../../src/seo/csp';
import { isBookChapterNameIndexable } from '../../src/features/books/chapterSeo';
import { isCompendiumEntryIndexable } from '../../src/data/compendium/indexability';

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

function expectedImageUrl(path: string, width = PRIMARY_IMAGE_WIDTH): string {
  const normalized = path.replace(/^%BASE%\/?/, '/');
  if (normalized.startsWith('/')) return `${SITE_URL}${normalized}`;
  return optimizedImageUrl(normalized, process.env.VITE_IMAGE_TRANSFORM_ORIGIN, width);
}

interface ReleaseCompendiumItem {
  id: string;
  name: string;
  source: string;
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
      for (const [index, chapter] of (book.contents ?? []).entries()) {
        const route = localizedRoute(`/books/${book.id}/${index}/`, locale);
        const html = read(`${route.slice(1)}index.html`);
        if (!isBookChapterNameIndexable(chapter.name)) {
          requireValue(
            html.includes('<meta name="robots" content="noindex, nofollow" />'),
            `Non-indexable book chapter must be noindex: ${route}`,
          );
        }
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
    const indexabilityItems = source.items.map((item) => ({
      id: item.id,
      name: item.name,
      source: item.source,
      ...(item.hidden !== undefined ? { hidden: item.hidden } : {}),
      ...(item.otherVersions ? { otherVersions: item.otherVersions } : {}),
    }));
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
      for (const item of source.items) {
        const route = localizedRoute(`/compendium/${category}/${item.id}/`, locale);
        const html = read(`${route.slice(1)}index.html`);
        if (!isCompendiumEntryIndexable(item, indexabilityItems)) {
          requireValue(
            html.includes('<meta name="robots" content="noindex, nofollow" />'),
            `Hidden compendium route must be noindex: ${route}`,
          );
        } else if (item.hidden) {
          requireValue(
            html.includes('<meta name="robots" content="index, follow" />'),
            `Alternate compendium printing must be indexable: ${route}`,
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
        const imageWidth = route.includes('/compendium/bestiary/') ? 320 : undefined;
        const href = escapeHtml(expectedImageUrl(localized.image, imageWidth));
        requireValue(
          html.includes(
            `<link rel="preload" as="image" href="${href}" fetchpriority="high" />`,
          ),
          `Compendium image preload is missing: ${route}`,
        );
        const shouldPreconnect =
          !process.env.VITE_IMAGE_TRANSFORM_ORIGIN && usesImageHost(localized.image);
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
requireValue(sitemapFiles.length === 4, 'Sitemap index must contain four sitemaps');
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
requireValue(
  !urls.some((url) => url.includes('/data/') || url.includes('/session-log/')),
  'Private local-data pages must not appear in the sitemap',
);

const home = read('index.html');
const sample = read(join('compendium', 'spells', 'fireball', 'index.html'));
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
requireValue(
  sample.includes('<div id="app-root" data-app-ready="false"></div>') &&
    sample.includes('<main id="prerendered-content" data-prerendered="true">'),
  'Static pages must preserve the app mount point and prerendered fallback',
);
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

process.stdout.write(
  `Validated ${urls.length} release URLs, ${checkedCompendiumRoutes} compendium routes, ${checkedBookRoutes} book routes, ${checkedImagePreloads} image preloads, and discovery files.\n`,
);
