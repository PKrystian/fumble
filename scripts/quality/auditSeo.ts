import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const OUT_DIR = join(process.cwd(), 'dist');

interface Issue {
  kind: string;
  file: string;
}

function collectHtml(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = join(dir, entry.name);
    return entry.isDirectory()
      ? collectHtml(file)
      : entry.name.endsWith('.html')
        ? [file]
        : [];
  });
}

function between(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  if (startIndex < 0) return '';
  const endIndex = source.indexOf(end, startIndex + start.length);
  return endIndex < 0 ? '' : source.slice(startIndex + start.length, endIndex);
}

function firstTag(source: string, start: string): string {
  const startIndex = source.indexOf(start);
  if (startIndex < 0) return '';
  const endIndex = source.indexOf('>', startIndex);
  return endIndex < 0 ? '' : source.slice(startIndex, endIndex + 1);
}

function attribute(tag: string, name: string): string {
  const marker = `${name}="`;
  const startIndex = tag.indexOf(marker);
  if (startIndex < 0) return '';
  const valueStart = startIndex + marker.length;
  const endIndex = tag.indexOf('"', valueStart);
  return endIndex < 0 ? '' : tag.slice(valueStart, endIndex);
}

function decodeHtml(value: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&lt;': '<',
    '&gt;': '>',
  };

  return value.replace(
    /&(amp|quot|#39|apos|lt|gt);/g,
    (entity) => entities[entity] ?? entity,
  );
}

function addIssue(issues: Issue[], kind: string, file: string): void {
  issues.push({ kind, file });
}

const files = collectHtml(OUT_DIR);
const issues: Issue[] = [];
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const relativeFile = relative(OUT_DIR, file).replaceAll('\\', '/');
  const isPolish = relativeFile === 'pl/404.html' || relativeFile.startsWith('pl/');
  const expectedLanguage = isPolish ? 'pl' : 'en';
  const language = between(source, '<html lang="', '"');
  const robots = attribute(firstTag(source, '<meta name="robots"'), 'content');
  const indexable = !robots.startsWith('noindex');
  const title = between(source, '<title>', '</title>');
  const description = attribute(firstTag(source, '<meta name="description"'), 'content');
  const canonical = attribute(firstTag(source, '<link rel="canonical"'), 'href');
  const alternateCount = (source.match(/rel="alternate" hreflang=/g) ?? []).length;
  const hasJsonLd = source.includes('<script type="application/ld+json"');
  const hasPrerenderedHeading = source.includes(
    '<main id="prerendered-content" data-prerendered="true">',
  );

  if (language !== expectedLanguage) addIssue(issues, 'wrong language', relativeFile);
  if (!title.trim()) addIssue(issues, 'empty title', relativeFile);
  if (!description.trim()) addIssue(issues, 'empty description', relativeFile);
  if (indexable && !canonical)
    addIssue(issues, 'indexable without canonical', relativeFile);
  if (!indexable && canonical) addIssue(issues, 'noindex with canonical', relativeFile);
  if (indexable && alternateCount !== 1 && alternateCount !== 3)
    addIssue(issues, 'wrong hreflang count', relativeFile);
  if (indexable && !hasJsonLd)
    addIssue(issues, 'indexable without JSON-LD', relativeFile);
  if (!indexable && hasJsonLd) addIssue(issues, 'noindex with JSON-LD', relativeFile);
  if (indexable && !hasPrerenderedHeading) {
    addIssue(issues, 'indexable without prerendered h1', relativeFile);
  }
  if (indexable && decodeHtml(description).length > 160) {
    addIssue(issues, 'description over 160 characters', relativeFile);
  }
  if (indexable && !canonical.endsWith('/')) {
    addIssue(issues, 'canonical without trailing slash', relativeFile);
  }
  if (indexable && /<p>\s*(Nothing here|Brak treści)\s*<\/p>/i.test(source)) {
    addIssue(issues, 'empty wiki page is indexable', relativeFile);
  }
}

const byKind = Object.fromEntries(
  [...new Set(issues.map((issue) => issue.kind))].map((kind) => [
    kind,
    issues.filter((issue) => issue.kind === kind).length,
  ]),
);
console.log(
  JSON.stringify(
    {
      htmlFiles: files.length,
      issues: issues.length,
      byKind,
      examples: issues.slice(0, 20),
    },
    null,
    2,
  ),
);
if (issues.length > 0) process.exitCode = 1;
