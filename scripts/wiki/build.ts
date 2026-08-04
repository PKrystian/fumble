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
import type { WikiCampaign, WikiData, WikiPage } from '../../src/features/wiki/types';
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

const DEFAULT_IGNORED_DIRECTORIES = ['_dm'] as const;
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);
const OUTPUT_FILE = 'src/data/generated/wiki.json';
const ASSET_DIR = 'public/wiki-assets';
const CACHE_FILE = '.cache/wiki-cache.json';
const CACHE_SCHEMA_VERSION = 2;

interface CacheEntry {
  hash: string;
  page: WikiPage;
}

interface WikiCache {
  schemaVersion: number;
  slugSignature: string;
  pages: Record<string, CacheEntry>;
}

interface CampaignSource {
  id: string;
  title: string;
  root: string;
  files: string[];
}

interface RawPage {
  campaignId: string;
  campaignTitle: string;
  campaignRoot: string;
  path: string;
  name: string;
  title: string;
  category: string;
  slug: string;
  body: string;
  raw: string;
  data: Frontmatter;
}

interface CampaignBuild {
  source: CampaignSource;
  pages: RawPage[];
  allNoteNames: Set<string>;
  slugByName: Map<string, string>;
  assetPaths: Map<string, string>;
}

function loadCache(): WikiCache | null {
  if (!existsSync(CACHE_FILE)) return null;
  try {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf8')) as WikiCache;
  } catch {
    return null;
  }
}

function leafletLabel(target: string | null): string {
  if (!target) return '';
  const wiki = /^\[\[([^\]]+)\]\]$/.exec(target);
  if (wiki) {
    const [name, alias] = wiki[1]!.split('|').map((s) => s.trim());
    return alias ?? name ?? '';
  }
  return target;
}

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

function ignoredDirectoryNames(argv: string[]): Set<string> {
  const names: string[] = [...DEFAULT_IGNORED_DIRECTORIES];
  const environmentNames = process.env.WIKI_IGNORE_DIRECTORIES;
  if (environmentNames) names.push(...environmentNames.split(','));

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--ignore' && argv[index + 1]) {
      names.push(argv[index + 1]!);
      index += 1;
    }
  }

  return new Set(names.map((name) => name.trim().toLowerCase()).filter(Boolean));
}

function walk(dir: string, ignoredNames: Set<string>): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.isDirectory() &&
      (entry.name.startsWith('.') || ignoredNames.has(entry.name.toLowerCase()))
    ) {
      continue;
    }
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, ignoredNames));
    else out.push(full);
  }
  return out;
}

function relativeParts(inputDir: string, file: string): string[] {
  return relative(inputDir, file).split(sep).filter(Boolean);
}

function discoverCampaigns(inputDir: string, files: string[]): CampaignSource[] {
  const markdownFiles = files.filter((file) => extname(file).toLowerCase() === '.md');
  const hasRootPage = markdownFiles.some(
    (file) => relativeParts(inputDir, file).length === 1,
  );

  if (hasRootPage) {
    const title = basename(inputDir);
    return [{ id: slugify(title), title, root: inputDir, files }];
  }

  const groups = new Map<string, string[]>();
  for (const file of files) {
    const [folder] = relativeParts(inputDir, file);
    if (!folder) continue;
    const group = groups.get(folder) ?? [];
    group.push(file);
    groups.set(folder, group);
  }

  return [...groups.entries()]
    .filter(([, group]) => group.some((file) => extname(file).toLowerCase() === '.md'))
    .map(([title, group]) => ({
      id: slugify(title),
      title,
      root: join(inputDir, title),
      files: group,
    }));
}

function collectCampaignBuild(source: CampaignSource, warnings: string[]): CampaignBuild {
  const allNoteNames = new Set<string>();
  const pages: RawPage[] = [];
  const slugByName = new Map<string, string>();
  const assetPaths = new Map<string, string>();

  for (const file of source.files) {
    const ext = extname(file).toLowerCase();
    if (IMAGE_EXTENSIONS.has(ext)) {
      const name = basename(file);
      if (assetPaths.has(name)) {
        warnings.push(`Duplicate image name "${name}" in campaign "${source.title}"`);
      }
      assetPaths.set(name, file);
      continue;
    }
    if (ext !== '.md') continue;

    const raw = readFileSync(file, 'utf8');
    const { data, body } = parseFrontmatter(raw);
    const name = basename(file, '.md');
    const title = typeof data.title === 'string' && data.title ? data.title : name;
    allNoteNames.add(name.toLowerCase());
    allNoteNames.add(title.toLowerCase());

    if (!isPlayerVisible(data)) continue;

    const category =
      typeof data.category === 'string' && data.category
        ? data.category
        : (relativeParts(source.root, file)[0] ?? 'General');
    const slug = slugify(name);
    if (slugByName.has(name.toLowerCase())) {
      warnings.push(`Duplicate note name "${name}" in campaign "${source.title}"`);
    }
    slugByName.set(name.toLowerCase(), slug);
    slugByName.set(title.toLowerCase(), slug);
    pages.push({
      campaignId: source.id,
      campaignTitle: source.title,
      campaignRoot: source.root,
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

  return { source, pages, allNoteNames, slugByName, assetPaths };
}

function buildPage(page: RawPage, campaign: CampaignBuild, warnings: string[]): WikiPage {
  const pageSlug = (title: string) =>
    campaign.slugByName.get(title.trim().toLowerCase()) ?? null;
  const resolveSlug = (title: string) => {
    const slug = pageSlug(title);
    return slug ? `${campaign.source.id}/${slug}` : null;
  };
  const resolveAsset = (file: string) =>
    `${BASE_TOKEN}wiki-assets/${campaign.source.id}/${basename(file)}`;

  for (const key of validateFrontmatterKeys(page.data, KNOWN_FRONTMATTER_KEYS)) {
    warnings.push(`Unknown frontmatter key "${key}" on "${page.name}"`);
  }

  let body = processSecrets(page.body);

  const warnBrokenLinks = (source: string) => {
    for (const target of extractWikiLinkTargets(source)) {
      if (!pageSlug(target) && !campaign.allNoteNames.has(target.toLowerCase())) {
        warnings.push(`Broken link [[${target}]] on "${page.name}"`);
      }
    }
  };
  warnBrokenLinks(body);
  const facts = page.data.facts;
  if (facts && typeof facts === 'object' && !Array.isArray(facts)) {
    for (const value of Object.values(facts)) warnBrokenLinks(value);
  }
  for (const file of extractImageRefs(body)) {
    if (!campaign.assetPaths.has(basename(file))) {
      warnings.push(`Missing image "${file}" referenced on "${page.name}"`);
    }
  }
  if (typeof page.data.image === 'string' && page.data.image) {
    if (!campaign.assetPaths.has(basename(page.data.image))) {
      warnings.push(`Missing image "${page.data.image}" referenced on "${page.name}"`);
    }
  }

  const processLeaflet = (source: string): string =>
    source.replace(/```leaflet\r?\n([\s\S]*?)```/g, (_, content: string) => {
      const block = parseLeafletBlock(content);
      if (!block.image) return '';
      const file = basename(block.image);
      const imageSource = campaign.assetPaths.get(file);
      const { width, height } = imageSource
        ? imageSize(imageSource)
        : { width: 1000, height: 1000 };
      const pins = block.markers
        .filter((marker) => marker.type !== 'dm')
        .map((marker) => {
          const { x, y } = leafletToPercent(marker.lat, marker.lng, width, height);
          return pinHtml(x, y, leafletLabel(marker.target), marker.target, resolveSlug);
        });
      return wrapMap(resolveAsset(file), pins);
    });

  body = processMaps(body, resolveAsset, resolveSlug);
  body = processLeaflet(body);
  body = processBoxes(body, resolveAsset, resolveSlug);
  body = processImages(body, resolveAsset);
  body = processWikiLinks(body, resolveSlug);
  const html = marked.parse(body, { async: false });
  const infobox = renderInfobox(page.data, page.title, resolveAsset, resolveSlug);
  return {
    campaignId: page.campaignId,
    slug: page.slug,
    title: page.title,
    category: page.category,
    html: infobox + html,
  };
}

function copyCampaignAssets(campaign: CampaignBuild): void {
  const outputDir = join(ASSET_DIR, campaign.source.id);
  mkdirSync(outputDir, { recursive: true });
  for (const [name, source] of campaign.assetPaths) {
    copyFileSync(source, join(outputDir, name));
  }
}

function buildOnce(inputDir: string, ignoredNames: Set<string>): void {
  const files = walk(inputDir, ignoredNames);
  const warnings: string[] = [];
  const campaignsBuild = discoverCampaigns(inputDir, files).map((source) =>
    collectCampaignBuild(source, warnings),
  );
  const skipped = files.filter((file) => {
    if (extname(file).toLowerCase() !== '.md') return false;
    const raw = readFileSync(file, 'utf8');
    return !isPlayerVisible(parseFrontmatter(raw).data);
  }).length;

  const force = process.argv.includes('--force');
  const slugSignature = campaignsBuild
    .flatMap((campaign) =>
      campaign.pages.map((page) => `${campaign.source.id}:${page.slug}`),
    )
    .sort()
    .join(',');
  const cache = force ? null : loadCache();
  const cacheValid =
    cache?.schemaVersion === CACHE_SCHEMA_VERSION &&
    cache.slugSignature === slugSignature;
  const nextCache: WikiCache = {
    schemaVersion: CACHE_SCHEMA_VERSION,
    slugSignature,
    pages: {},
  };
  let reused = 0;
  let pageCount = 0;
  const campaigns: WikiCampaign[] = [];

  for (const campaign of campaignsBuild) {
    const pages = campaign.pages.map((page) => {
      const hash = createHash('sha1').update(page.raw).digest('hex');
      const cached = cacheValid ? cache!.pages[page.path] : undefined;
      const result =
        cached && cached.hash === hash
          ? cached.page
          : buildPage(page, campaign, warnings);
      if (cached && cached.hash === hash) reused += 1;
      nextCache.pages[page.path] = { hash, page: result };
      return result;
    });

    pages.sort(
      (a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title),
    );
    copyCampaignAssets(campaign);
    campaigns.push({ id: campaign.source.id, title: campaign.source.title, pages });
    pageCount += pages.length;
  }

  campaigns.sort((a, b) => a.title.localeCompare(b.title));
  const data: WikiData = {
    meta: {
      pageCount,
      generatedAt: new Date().toISOString(),
      source: inputDir,
    },
    campaigns,
  };
  mkdirSync('src/data/generated', { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(data));

  mkdirSync('.cache', { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(nextCache));

  printSummary(
    inputDir,
    campaigns.length,
    pageCount,
    reused,
    files.filter((file) => IMAGE_EXTENSIONS.has(extname(file).toLowerCase())).length,
    skipped,
    ignoredNames,
    warnings,
  );
}

function printSummary(
  inputDir: string,
  campaignCount: number,
  pageCount: number,
  reused: number,
  assetCount: number,
  skipped: number,
  ignoredNames: Set<string>,
  warnings: string[],
): void {
  console.log(
    `${color.bold('Wiki built')} from ${inputDir}: ${campaignCount} campaign${campaignCount === 1 ? '' : 's'}, ${pageCount} pages ` +
      `(${reused} reused), ${assetCount} assets` +
      (skipped ? `, ${skipped} DM-only/unpublished skipped` : '') +
      `. Ignored directories: ${[...ignoredNames].join(', ')}.`,
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
  const ignoredNames = ignoredDirectoryNames(argv);
  buildOnce(inputDir, ignoredNames);

  if (!argv.includes('--watch')) return;

  console.log(color.dim(`\nWatching ${inputDir} for changes... (Ctrl+C to stop)`));
  try {
    let pending: NodeJS.Timeout | null = null;
    const watcher = watch(inputDir, { recursive: true }, () => {
      if (pending) clearTimeout(pending);
      pending = setTimeout(() => {
        console.log(color.dim('\nChange detected, rebuilding...'));
        try {
          buildOnce(inputDir, ignoredNames);
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
