import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../src/i18n/locales';
import { optimizedImageUrl } from '../../src/data/compendium/images';
import { cspHasSourceOrigin } from '../../src/seo/csp';

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
  return optimizedImageUrl(normalized, process.env.VITE_IMAGE_TRANSFORM_ORIGIN);
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
        if (localized.hidden || typeof localized.image !== 'string') continue;
        const route = localizedRoute(`/compendium/${category}/${item.id}/`, locale);
        const html = read(`${route.slice(1)}index.html`);
        const href = escapeHtml(expectedImageUrl(localized.image));
        requireValue(
          html.includes(
            `<link rel="preload" as="image" href="${href}" fetchpriority="high" />`,
          ),
          `Compendium image preload is missing: ${route}`,
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
  !urls.some((url) => url.includes('/data/') || url.includes('/session-log/')),
  'Private local-data pages must not appear in the sitemap',
);

const home = read('index.html');
const sample = read(join('compendium', 'spells', 'fireball', 'index.html'));
requireValue(
  cspHasSourceOrigin(home, 'connect-src', 'https://cloudflareinsights.com') &&
    cspHasSourceOrigin(home, 'script-src', 'https://static.cloudflareinsights.com'),
  'Cloudflare Web Analytics is missing from the CSP',
);
requireValue(
  process.env.VITE_IMAGE_TRANSFORM_ORIGIN
    ? !sample.includes('<link rel="preconnect" href="https://5e.tools" crossorigin />')
    : sample.includes('<link rel="preconnect" href="https://5e.tools" crossorigin />'),
  process.env.VITE_IMAGE_TRANSFORM_ORIGIN
    ? 'Transformed image pages must not preconnect to the origin fetched by Cloudflare'
    : 'Direct image pages must preconnect to the image host',
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
const checkedImagePreloads = validateCompendiumImagePreloads();
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
  `Validated ${urls.length} release URLs, ${checkedImagePreloads} image preloads, and discovery files.\n`,
);
