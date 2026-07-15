import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  watch,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, extname, join, relative, sep } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { marked } from 'marked';
import {
  BASE_TOKEN,
  extractImageRefs,
  extractWikiLinkTargets,
  isPlayerVisible,
  leafletToPercent,
  parseFrontmatter,
  parseLeafletBlock,
  pinHtml,
  processBoxes,
  processImages,
  processMaps,
  processSecrets,
  processWikiLinks,
  renderInfobox,
  slugify,
  validateFrontmatterKeys,
  wrapMap,
  type Frontmatter,
} from '../../src/features/wiki/transform';
import type { WikiData, WikiPage } from '../../src/features/wiki/types';
import { imageSize } from './imageSize';

const color = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
};

const KNOWN_FRONTMATTER_KEYS = [
  'title',
  'category',
  'visibility',
  'publish',
  'type',
  'image',
  'summary',
  'tags',
  'facts',
] as const;

function leafletLabel(target: string | null): string {
  if (!target) return '';
  const wiki = /^\[\[([^\]]+)\]\]$/.exec(target);
  if (wiki) {
    const [name, alias] = wiki[1]!.split('|').map((s) => s.trim());
    return alias ?? name ?? '';
  }
  return target;
}

const OUTPUT_FILE = 'src/data/generated/wiki.json';
const ASSET_DIR = 'public/wiki-assets';
const CACHE_FILE = '.cache/wiki-cache.json';

interface CacheEntry {
  hash: string;
  page: WikiPage;
}
interface WikiCache {
  slugSignature: string;
  pages: Record<string, CacheEntry>;
}

function loadCache(): WikiCache | null {
  if (!existsSync(CACHE_FILE)) return null;
  try {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf8')) as WikiCache;
  } catch {
    return null;
  }
}
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);

async function resolveInput(argv: string[]): Promise<string> {
  const flag = argv.indexOf('--input');
  if (flag !== -1 && argv[flag + 1]) return argv[flag + 1]!;
  if (process.env.WIKI_VAULT) return process.env.WIKI_VAULT;

  if (process.stdin.isTTY && process.stdout.isTTY) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(
      color.dim(
        'Path to your Obsidian vault (Enter for the bundled demo wiki-example/): ',
      ),
    );
    rl.close();
    return answer.trim() || 'wiki-example';
  }

  console.log(
    color.dim('No --input given; building the bundled wiki-example/ demo vault.'),
  );
  return 'wiki-example';
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

interface RawPage {
  path: string;
  name: string;
  title: string;
  category: string;
  slug: string;
  body: string;
  raw: string;
  data: Frontmatter;
}

function buildOnce(inputDir: string): void {
  const files = walk(inputDir);
  const assetPaths = new Map<string, string>();
  const warnings: string[] = [];

  const allNoteNames = new Set<string>();
  const pagesRaw: RawPage[] = [];
  const slugByName = new Map<string, string>();
  let skipped = 0;

  for (const file of files) {
    const ext = extname(file).toLowerCase();
    if (IMAGE_EXTENSIONS.has(ext)) {
      assetPaths.set(basename(file), file);
      continue;
    }
    if (ext !== '.md') continue;

    const raw = readFileSync(file, 'utf8');
    const { data, body } = parseFrontmatter(raw);
    const name = basename(file, '.md');
    const title = typeof data.title === 'string' && data.title ? data.title : name;
    allNoteNames.add(name.toLowerCase());
    allNoteNames.add(title.toLowerCase());

    if (!isPlayerVisible(data)) {
      skipped += 1;
      continue;
    }

    const category =
      typeof data.category === 'string' && data.category
        ? data.category
        : (relative(inputDir, file).split(sep)[0] ?? 'General');
    const slug = slugify(name);

    slugByName.set(name.toLowerCase(), slug);
    slugByName.set(title.toLowerCase(), slug);
    pagesRaw.push({
      path: file,
      name,
      title,
      category: category.endsWith('.md') ? 'General' : category,
      slug,
      body,
      raw,
      data,
    });
  }

  const resolveSlug = (title: string) =>
    slugByName.get(title.trim().toLowerCase()) ?? null;
  const resolveAsset = (file: string) => `${BASE_TOKEN}wiki-assets/${basename(file)}`;

  const processLeaflet = (body: string): string =>
    body.replace(/```leaflet\r?\n([\s\S]*?)```/g, (_, content: string) => {
      const block = parseLeafletBlock(content);
      if (!block.image) return '';
      const file = basename(block.image);
      const source = assetPaths.get(file);
      const { width, height } = source
        ? imageSize(source)
        : { width: 1000, height: 1000 };
      const pins = block.markers
        .filter((marker) => marker.type !== 'dm')
        .map((marker) => {
          const { x, y } = leafletToPercent(marker.lat, marker.lng, width, height);
          return pinHtml(x, y, leafletLabel(marker.target), marker.target, resolveSlug);
        });
      return wrapMap(resolveAsset(file), pins);
    });

  const warnMissingImage = (file: string, pageName: string) => {
    if (!assetPaths.has(basename(file))) {
      warnings.push(`Missing image "${file}" referenced on "${pageName}"`);
    }
  };

  const force = process.argv.includes('--force');
  const slugSignature = [...pagesRaw.map((p) => p.slug)].sort().join(',');
  const cache = force ? null : loadCache();
  const cacheValid = cache?.slugSignature === slugSignature;
  const nextCache: WikiCache = { slugSignature, pages: {} };
  let reused = 0;

  const transform = (page: RawPage): WikiPage => {
    for (const key of validateFrontmatterKeys(page.data, KNOWN_FRONTMATTER_KEYS)) {
      warnings.push(`Unknown frontmatter key "${key}" on "${page.name}"`);
    }

    let body = processSecrets(page.body);

    const warnBrokenLinks = (source: string) => {
      for (const target of extractWikiLinkTargets(source)) {
        if (!resolveSlug(target) && !allNoteNames.has(target.toLowerCase())) {
          warnings.push(`Broken link [[${target}]] on "${page.name}"`);
        }
      }
    };
    warnBrokenLinks(body);
    const facts = page.data.facts;
    if (facts && typeof facts === 'object' && !Array.isArray(facts)) {
      for (const value of Object.values(facts)) warnBrokenLinks(value);
    }
    for (const file of extractImageRefs(body)) warnMissingImage(file, page.name);
    if (typeof page.data.image === 'string' && page.data.image) {
      warnMissingImage(page.data.image, page.name);
    }

    body = processMaps(body, resolveAsset, resolveSlug);
    body = processLeaflet(body);
    body = processBoxes(body, resolveAsset, resolveSlug);
    body = processImages(body, resolveAsset);
    body = processWikiLinks(body, resolveSlug);
    const html = marked.parse(body, { async: false });
    const infobox = renderInfobox(page.data, page.title, resolveAsset, resolveSlug);
    return {
      slug: page.slug,
      title: page.title,
      category: page.category,
      html: infobox + html,
    };
  };

  const pages: WikiPage[] = pagesRaw.map((page) => {
    const hash = createHash('sha1').update(page.raw).digest('hex');
    const cached = cacheValid ? cache!.pages[page.path] : undefined;
    const result = cached && cached.hash === hash ? cached.page : transform(page);
    if (cached && cached.hash === hash) reused += 1;
    nextCache.pages[page.path] = { hash, page: result };
    return result;
  });

  pages.sort(
    (a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title),
  );

  mkdirSync(ASSET_DIR, { recursive: true });
  for (const [name, source] of assetPaths) {
    copyFileSync(source, join(ASSET_DIR, name));
  }

  const data: WikiData = {
    meta: {
      pageCount: pages.length,
      generatedAt: new Date().toISOString(),
      source: inputDir,
    },
    pages,
  };
  mkdirSync('src/data/generated', { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(data));

  mkdirSync('.cache', { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(nextCache));

  printSummary(inputDir, pages.length, reused, assetPaths.size, skipped, warnings);
}

function printSummary(
  inputDir: string,
  pageCount: number,
  reused: number,
  assetCount: number,
  skipped: number,
  warnings: string[],
): void {
  console.log(
    `${color.bold('Wiki built')} from ${inputDir}: ${pageCount} pages ` +
      `(${reused} reused, ${pageCount - reused} rebuilt), ${assetCount} assets` +
      (skipped ? `, ${skipped} DM-only/unpublished skipped` : '') +
      '.',
  );
  if (warnings.length === 0) {
    console.log(color.green('No issues found.'));
    return;
  }
  console.log(
    color.yellow(`${warnings.length} warning${warnings.length === 1 ? '' : 's'}:`),
  );
  for (const warning of warnings) console.log(color.yellow(`  - ${warning}`));
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const inputDir = await resolveInput(argv);
  buildOnce(inputDir);

  if (!argv.includes('--watch')) return;

  console.log(color.dim(`\nWatching ${inputDir} for changes... (Ctrl+C to stop)`));
  try {
    let pending: NodeJS.Timeout | null = null;
    const watcher = watch(inputDir, { recursive: true }, () => {
      if (pending) clearTimeout(pending);
      pending = setTimeout(() => {
        console.log(color.dim('\nChange detected, rebuilding...'));
        try {
          buildOnce(inputDir);
        } catch (err) {
          console.error(color.red(String(err)));
        }
      }, 150);
    });
    process.on('SIGINT', () => {
      watcher.close();
      process.exit(0);
    });
  } catch (err) {
    console.log(
      color.yellow(
        `Watch mode isn't supported on this platform (${(err as Error).message}). ` +
          'Re-run the command after making changes instead.',
      ),
    );
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
