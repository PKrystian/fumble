import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const home = read('index.html');
const sample = read(join('compendium', 'spells', 'fireball', 'index.html'));
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

process.stdout.write(`Validated ${urls.length} release URLs and discovery files.\n`);
