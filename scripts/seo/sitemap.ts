import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../src/i18n/locales';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SITE_URL = 'https://fumble.krystianpinczak.com';
const GENERATED_DIR = join(ROOT, 'src/data/generated');
const OUT_DIR = join(ROOT, 'dist');
const GOOGLE_VERIFICATION = process.env.GOOGLE_SITE_VERIFICATION;
const BING_VERIFICATION = process.env.BING_SITE_VERIFICATION;

interface PageInfo {
  path: string;
  title: string;
  description: string;
  kind: 'website' | 'article' | 'book';
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
  items?: CompendiumItem[];
}

interface Book {
  id: string;
  name: string;
  author?: string;
  storyline?: string;
  contents: Array<{ name?: string }>;
}

interface WikiPage {
  slug: string;
  title: string;
  category?: string;
  html?: string;
}

const STATIC_PAGES: PageInfo[] = [
  {
    path: '/',
    title: 'Fumble - D&D 2024 Toolkit & Campaign Wiki',
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

function escapeHtml(value: string): string {
  return escapeXml(cleanText(value));
}

function cleanText(value: string): string {
  return value.replaceAll('—', '-').replaceAll('–', '-');
}

function plainText(value: unknown): string {
  if (typeof value === 'string') {
    return cleanText(value)
      .replace(/\{@\w+\s+([^}|]+)(?:\|[^}]*)?}/g, '$1')
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
  return text.length <= 220 ? text : `${text.slice(0, 217).trimEnd()}...`;
}

function collectPages(): PageInfo[] {
  const pages = [...STATIC_PAGES];
  for (const file of readdirSync(GENERATED_DIR)) {
    const categoryId = file.replace(/\.json$/, '');
    if (!file.endsWith('.json') || !COMPENDIUM_CATEGORIES.has(categoryId)) continue;
    const categoryTitle = categoryId.replaceAll('-', ' ');
    const categoryPath = `/compendium/${categoryId}`;
    pages.push({
      path: categoryPath,
      title: `${categoryTitle} - D&D Compendium - Fumble`,
      description: `Browse ${categoryTitle} in the Fumble D&D compendium.`,
      kind: 'website',
      parent: { path: '/compendium', title: 'Compendium' },
    });
    const raw = JSON.parse(
      readFileSync(join(GENERATED_DIR, file), 'utf8'),
    ) as CompendiumFile;
    for (const item of raw.items ?? []) {
      if (item.hidden) continue;
      const context = [item.subtitle, item.entries, item.body].map(plainText).join(' ');
      pages.push({
        path: `${categoryPath}/${item.id}`,
        title: `${item.name} - Fumble`,
        description: concise(
          context,
          `${item.name} in the Fumble D&D compendium. Source: ${plainText(item.source) || 'D&D'}.`,
        ),
        kind: 'article',
        parent: { path: categoryPath, title: categoryTitle },
      });
    }
  }

  const books = JSON.parse(
    readFileSync(join(GENERATED_DIR, 'books.json'), 'utf8'),
  ) as Book[];
  for (const book of books) {
    const bookPath = `/books/${book.id}`;
    pages.push({
      path: bookPath,
      title: `${book.name} - Fumble`,
      description: concise(
        [book.storyline, book.author].filter(Boolean).join('. '),
        `Read ${book.name} in Fumble.`,
      ),
      kind: 'book',
      parent: { path: '/books', title: 'Books' },
    });
    book.contents.forEach((chapter, index) => {
      const chapterName = chapter.name || `Chapter ${index + 1}`;
      pages.push({
        path: `${bookPath}/${index}`,
        title: `${chapterName} - ${book.name} - Fumble`,
        description: `Read ${chapterName} from ${book.name} in Fumble.`,
        kind: 'book',
        parent: { path: bookPath, title: book.name },
      });
    });
  }

  const wiki = JSON.parse(readFileSync(join(GENERATED_DIR, 'wiki.json'), 'utf8')) as {
    pages?: WikiPage[];
  };
  for (const page of wiki.pages ?? []) {
    pages.push({
      path: `/wiki/${page.slug}`,
      title: `${page.title} - Fumble`,
      description: concise(
        plainText(page.html),
        `${page.title}${page.category ? ` in ${page.category}` : ''} - Fumble campaign wiki.`,
      ),
      kind: 'article',
      parent: { path: '/wiki', title: 'Wiki' },
    });
  }

  return [...new Map(pages.map((page) => [page.path, page])).values()];
}

function absolute(path: string, locale: string): string {
  return `${SITE_URL}${localizePath(path, locale)}`;
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

function replaceMeta(html: string, pattern: RegExp, replacement: string): string {
  return pattern.test(html)
    ? html.replace(pattern, replacement)
    : html.replace('</head>', `    ${replacement}\n  </head>`);
}

function breadcrumbJson(page: PageInfo, locale: string) {
  const items = [
    { name: 'Fumble', path: '/' },
    ...(page.parent ? [{ name: page.parent.title, path: page.parent.path }] : []),
    { name: page.title.replace(/ - Fumble$/, ''), path: page.path },
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
    return {
      '@context': 'https://schema.org',
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
  }
  if (page.kind === 'book') {
    return {
      '@context': 'https://schema.org',
      '@type': 'Book',
      name: page.title.replace(/ - Fumble$/, ''),
      url: absolute(page.path, locale),
      description: page.description,
    };
  }
  return breadcrumbJson(page, locale);
}

function buildHtml(template: string, page: PageInfo, locale: string): string {
  const url = absolute(page.path, locale);
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const breadcrumbs = [
    `<a href="${absolute('/', locale)}">Fumble</a>`,
    ...(page.parent
      ? [
          `<a href="${absolute(page.parent.path, locale)}">${escapeHtml(page.parent.title)}</a>`,
        ]
      : []),
  ].join(' / ');
  const fallback = `<main data-prerendered="true"><nav aria-label="Breadcrumb">${breadcrumbs}</nav><h1>${title}</h1><p>${description}</p></main>`;
  let html = template.replace(/<html lang="[^"]+"/, `<html lang="${locale}"`);
  html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
  html = replaceMeta(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/s,
    `<meta name="description" content="${description}" />`,
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
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${title}" />`,
  );
  html = replaceMeta(
    html,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/s,
    `<meta name="twitter:description" content="${description}" />`,
  );
  const alternates = [
    ...SUPPORTED_LOCALES.map(
      ({ code }) =>
        `<link rel="alternate" hreflang="${code}" href="${absolute(page.path, code)}" />`,
    ),
    `<link rel="alternate" hreflang="x-default" href="${absolute(page.path, DEFAULT_LOCALE)}" />`,
  ].join('\n    ');
  const additions = [
    `<meta property="og:locale" content="${locale === 'pl' ? 'pl_PL' : 'en_US'}" />`,
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
  return html.replace('<div id="root"></div>', `<div id="root">${fallback}</div>`);
}

function writeRoute(path: string, html: string): void {
  const relative = path.replace(/^\//, '');
  if (!relative) {
    writeFileSync(join(OUT_DIR, 'index.html'), html);
    return;
  }
  const directoryFile = join(OUT_DIR, relative, 'index.html');
  const extensionFile = join(OUT_DIR, `${relative}.html`);
  mkdirSync(dirname(directoryFile), { recursive: true });
  mkdirSync(dirname(extensionFile), { recursive: true });
  writeFileSync(directoryFile, html);
  writeFileSync(extensionFile, html);
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
        searchItem({ ...item, ...(overlay[item.id] ?? {}) }),
      ),
    });
  }
  const wiki = JSON.parse(readFileSync(join(GENERATED_DIR, 'wiki.json'), 'utf8')) as {
    pages?: WikiPage[];
  };
  return JSON.stringify({
    categories,
    wiki: (wiki.pages ?? []).map(({ slug, title, category }) => ({
      slug,
      title,
      category,
    })),
  });
}

const pages = collectPages();
const template = readFileSync(join(OUT_DIR, 'index.html'), 'utf8');
for (const page of pages) {
  for (const { code } of SUPPORTED_LOCALES) {
    writeRoute(localizePath(page.path, code), buildHtml(template, page, code));
  }
}
writeFileSync(join(OUT_DIR, 'sitemap.xml'), buildSitemap(pages));
writeFileSync(join(OUT_DIR, 'llms-full.txt'), buildLlmsFull(pages));
for (const { code } of SUPPORTED_LOCALES) {
  writeFileSync(join(OUT_DIR, `search-index-${code}.json`), buildSearchIndex(code));
}
console.log(
  `Wrote ${pages.length * SUPPORTED_LOCALES.length} static pages, sitemap URLs, and llms-full entries.`,
);
