export const BASE_TOKEN = '%BASE%';

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]!);
}

export type FrontmatterValue = string | boolean | string[] | Record<string, string>;

export interface Frontmatter {
  [key: string]: FrontmatterValue;
}

function stripQuotes(value: string): string {
  return value.replace(/^["']|["']$/g, '');
}

function parseScalar(value: string): string | boolean {
  const trimmed = stripQuotes(value.trim());
  if (trimmed === 'true' || trimmed === 'false') return trimmed === 'true';
  return trimmed;
}

export function parseFrontmatter(raw: string): { data: Frontmatter; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!match) return { data: {}, body: raw };

  const data: Frontmatter = {};
  let mapKey: string | null = null;

  for (const rawLine of match[1]!.split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    const isIndented = /^\s/.test(rawLine);
    const line = rawLine.trim();

    if (isIndented && mapKey) {
      const sub = /^([^:]+):\s*(.*)$/.exec(line);
      if (sub) {
        const map = data[mapKey];
        const target =
          map && typeof map === 'object' && !Array.isArray(map)
            ? (map as Record<string, string>)
            : {};
        target[sub[1]!.trim()] = stripQuotes(sub[2]!.trim());
        data[mapKey] = target;
        continue;
      }
    }

    const pair = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!pair) {
      mapKey = null;
      continue;
    }
    const key = pair[1]!;
    const rest = pair[2]!.trim();

    if (rest === '') {
      mapKey = key;
      data[key] = {};
      continue;
    }
    mapKey = null;

    if (rest.startsWith('[') && rest.endsWith(']')) {
      data[key] = rest
        .slice(1, -1)
        .split(',')
        .map((item) => stripQuotes(item.trim()))
        .filter(Boolean);
      continue;
    }
    data[key] = parseScalar(rest);
  }
  return { data, body: raw.slice(match[0].length) };
}

export function isPlayerVisible(data: Frontmatter): boolean {
  if (data.visibility === 'dm') return false;
  if (data.publish === false) return false;
  return true;
}

export function processSecrets(body: string): string {
  return body
    .replace(/:::secret\b[\s\S]*?:::/g, '')
    .replace(
      /:::locked\b[\s\S]*?:::/g,
      '\n<div class="wiki-locked">Not yet unlocked</div>\n',
    );
}

export type AssetResolver = (file: string) => string;

export function processImages(body: string, resolveAsset: AssetResolver): string {
  return body.replace(/!\[\[([^\]]+)\]\]/g, (_, inner: string) => {
    const [file, alt] = inner.split('|').map((part) => part.trim());
    return `![${alt ?? ''}](${resolveAsset(file ?? '')})`;
  });
}

interface FactsCardOptions {
  className: 'wiki-infobox' | 'wiki-box';
  title: string;
  image: string;
  summary: string;
  facts: Record<string, string>;
  resolveSlug: SlugResolver;
}

function linkifyFactValue(value: string, resolveSlug: SlugResolver): string {
  let out = '';
  let lastIndex = 0;
  for (const match of value.matchAll(/\[\[([^\]]+)\]\]/g)) {
    out += escapeHtml(value.slice(lastIndex, match.index));
    const [target, alias] = match[1]!.split('|').map((part) => part.trim());
    const label = escapeHtml(alias ?? target ?? '');
    const slug = target ? resolveSlug(target) : null;
    out += slug
      ? `<a data-wiki-link="${slug}" href="${BASE_TOKEN}wiki/${slug}">${label}</a>`
      : label;
    lastIndex = match.index! + match[0].length;
  }
  return out + escapeHtml(value.slice(lastIndex));
}

function renderFactsCard(opts: FactsCardOptions): string {
  const rows = Object.entries(opts.facts)
    .map(
      ([key, value]) =>
        `<tr><th>${escapeHtml(key)}</th><td>${linkifyFactValue(value, opts.resolveSlug)}</td></tr>`,
    )
    .join('');
  const parts = [
    opts.image ? `<img src="${opts.image}" alt="${escapeHtml(opts.title ?? '')}" />` : '',
    opts.title ? `<h3>${escapeHtml(opts.title)}</h3>` : '',
    opts.summary ? `<p class="wiki-infobox-summary">${escapeHtml(opts.summary)}</p>` : '',
    rows ? `<table>${rows}</table>` : '',
  ];
  return `<aside class="${opts.className}">${parts.join('')}</aside>`;
}

function factsMap(value: FrontmatterValue | undefined): Record<string, string> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, string>)
    : {};
}

export function renderInfobox(
  data: Frontmatter,
  title: string,
  resolveAsset: AssetResolver,
  resolveSlug: SlugResolver,
): string {
  const image =
    typeof data.image === 'string' && data.image ? resolveAsset(data.image) : '';
  const summary = typeof data.summary === 'string' ? data.summary : '';
  const facts = factsMap(data.facts);
  if (!image && !summary && Object.keys(facts).length === 0) return '';
  return renderFactsCard({
    className: 'wiki-infobox',
    title,
    image,
    summary,
    facts,
    resolveSlug,
  });
}

export function processBoxes(
  body: string,
  resolveAsset: AssetResolver,
  resolveSlug: SlugResolver,
): string {
  return body.replace(/```fumble-box\r?\n([\s\S]*?)```/g, (_, content: string) => {
    let title = '';
    let image = '';
    const facts: Record<string, string> = {};
    for (const line of content.split(/\r?\n/)) {
      const pair = /^([^:]+):\s*(.*)$/.exec(line.trim());
      if (!pair) continue;
      const key = pair[1]!.trim();
      const value = pair[2]!.trim();
      if (key.toLowerCase() === 'title') title = value;
      else if (key.toLowerCase() === 'image') image = resolveAsset(value);
      else facts[key] = value;
    }
    return renderFactsCard({
      className: 'wiki-box',
      title,
      image,
      summary: '',
      facts,
      resolveSlug,
    });
  });
}

export function processWikiLinks(
  body: string,
  resolveSlug: (title: string) => string | null,
): string {
  return body.replace(/\[\[([^\]]+)\]\]/g, (_, inner: string) => {
    const [target, alias] = inner.split('|').map((part) => part.trim());
    const label = alias ?? target ?? '';
    const slug = resolveSlug(target ?? '');
    if (!slug) return label;
    return `<a data-wiki-link="${slug}" href="${BASE_TOKEN}wiki/${slug}">${label}</a>`;
  });
}

interface MapMarker {
  x: number;
  y: number;
  label: string;
  target: string | null;
  dm: boolean;
}

function parseMarker(line: string): MapMarker | null {
  const fields = line.split('|').map((f) => f.trim());
  const coords = /^(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)$/.exec(fields[0] ?? '');
  if (!coords) return null;
  const dm = fields.includes('dm');
  const rest = fields.slice(1).filter((f) => f !== 'dm');
  return {
    x: Number(coords[1]),
    y: Number(coords[2]),
    label: rest[0] ?? '',
    target: rest[1] ?? null,
    dm,
  };
}

function pinAnchor(
  target: string,
  style: string,
  label: string,
  resolveSlug: (title: string) => string | null,
): string {
  const wiki = /^\[\[([^\]]+)\]\]$/.exec(target);
  if (wiki) {
    const slug = resolveSlug(wiki[1]!.split('|')[0]!.trim());
    if (slug) {
      return `<a class="wiki-pin" style="${style}" title="${label}" data-wiki-link="${slug}" href="${BASE_TOKEN}wiki/${slug}">${label}</a>`;
    }
  } else if (/^https?:\/\//.test(target)) {
    return `<a class="wiki-pin" style="${style}" title="${label}" href="${target}" target="_blank" rel="noreferrer">${label}</a>`;
  }
  return `<span class="wiki-pin" style="${style}" title="${label}">${label}</span>`;
}

type SlugResolver = (title: string) => string | null;

export function pinHtml(
  xPercent: number,
  yPercent: number,
  label: string,
  target: string | null,
  resolveSlug: SlugResolver,
): string {
  const style = `left:${xPercent}%;top:${yPercent}%`;
  return target
    ? pinAnchor(target, style, label, resolveSlug)
    : `<span class="wiki-pin" style="${style}" title="${label}">${label}</span>`;
}

export function wrapMap(imageSrc: string, pins: string[]): string {
  if (!imageSrc) return '';
  return `<figure class="wiki-map"><img src="${imageSrc}" alt="map" />${pins.join('')}</figure>`;
}

export function renderMap(
  content: string,
  resolveAsset: AssetResolver,
  resolveSlug: SlugResolver,
): string {
  let image = '';
  const pins: string[] = [];
  for (const line of content.split(/\r?\n/)) {
    const imageMatch = /^image:\s*(.+)$/.exec(line.trim());
    if (imageMatch) {
      image = resolveAsset(imageMatch[1]!.trim());
      continue;
    }
    const markerMatch = /^marker:\s*(.+)$/.exec(line.trim());
    if (!markerMatch) continue;
    const marker = parseMarker(markerMatch[1]!);
    if (!marker || marker.dm) continue;
    pins.push(pinHtml(marker.x, marker.y, marker.label, marker.target, resolveSlug));
  }
  return wrapMap(image, pins);
}

export interface LeafletMarker {
  type: string;
  lat: number;
  lng: number;
  target: string | null;
}

export interface LeafletBlock {
  image: string | null;
  markers: LeafletMarker[];
}

export function parseLeafletBlock(content: string): LeafletBlock {
  let image: string | null = null;
  const markers: LeafletMarker[] = [];
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    const imageMatch = /^image:\s*(.+)$/.exec(line);
    if (imageMatch) {
      image = imageMatch[1]!.replace(/^\[\[|\]\]$/g, '').trim();
      continue;
    }
    const markerMatch = /^marker:\s*(.+)$/.exec(line);
    if (!markerMatch) continue;
    const parts = markerMatch[1]!.split(',').map((p) => p.trim());
    const lat = Number(parts[1]);
    const lng = Number(parts[2]);
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
    markers.push({
      type: parts[0] ?? 'default',
      lat,
      lng,
      target: parts[3] ? parts[3] : null,
    });
  }
  return { image, markers };
}

export function leafletToPercent(
  lat: number,
  lng: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const norm = (n: number) => Math.round(Math.max(0, Math.min(100, n)) * 100) / 100;
  return {
    x: norm((lng / width) * 100),
    y: norm(((height - lat) / height) * 100),
  };
}

export function processMaps(
  body: string,
  resolveAsset: AssetResolver,
  resolveSlug: (title: string) => string | null,
): string {
  return body.replace(/```fumble-map\r?\n([\s\S]*?)```/g, (_, content: string) =>
    renderMap(content, resolveAsset, resolveSlug),
  );
}

export function extractWikiLinkTargets(body: string): string[] {
  const targets: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    if (/^\s*image:/i.test(line)) continue;
    for (const match of line.matchAll(/(?<!!)\[\[([^\]]+)\]\]/g)) {
      const target = match[1]!.split('|')[0]!.trim();
      if (target) targets.push(target);
    }
  }
  return targets;
}

export function extractImageRefs(body: string): string[] {
  const files: string[] = [];
  for (const match of body.matchAll(/!\[\[([^\]]+)\]\]/g)) {
    const file = match[1]!.split('|')[0]!.trim();
    if (file) files.push(file);
  }
  return files;
}

export function validateFrontmatterKeys(
  data: Frontmatter,
  knownKeys: readonly string[],
): string[] {
  return Object.keys(data).filter((key) => !knownKeys.includes(key));
}
