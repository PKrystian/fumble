import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const CHANNEL_URL = 'https://www.youtube.com/@bardify/videos';
const OUTPUT = path.resolve('src/data/generated/bardify.json');

interface BardifyVideo {
  id: string;
  name: string;
  videoId: string;
  category: string;
}

function extractJson(source: string, marker: string): unknown {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`Missing ${marker}`);
  const start = source.indexOf('{', markerIndex + marker.length);
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index]!;
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === '{') depth += 1;
    else if (character === '}' && --depth === 0) {
      return JSON.parse(source.slice(start, index + 1));
    }
  }
  throw new Error(`Incomplete ${marker}`);
}

function text(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  if (typeof record.simpleText === 'string') return record.simpleText;
  if (typeof record.content === 'string') return record.content;
  if (Array.isArray(record.runs)) {
    return record.runs
      .map((run) =>
        run && typeof run === 'object' && typeof run.text === 'string' ? run.text : '',
      )
      .join('');
  }
  return '';
}

function categoryFor(title: string): string {
  const value = title.toLowerCase();
  const groups: Array<[string, RegExp]> = [
    ['combat', /\b(battle|combat|boss|fight|war|siege|attack|initiative|chase)\b/],
    ['tavern', /\b(tavern|inn|feast|banquet|festival)\b/],
    ['dungeons', /\b(dungeon|crypt|cave|tomb|catacomb|ruin|underground|lair)\b/],
    ['planes', /\b(astral|ethereal|fey|hell|abyss|celestial|plane|void)\b/],
    ['settlements', /\b(city|village|town|market|castle|port|harbor|shop)\b/],
    [
      'travel',
      /\b(travel|journey|road|voyage|sailing|exploration|forest|mountain|desert|swamp)\b/,
    ],
    ['situations', /\b(mystery|tension|heist|ritual|horror|escape|stealth|rest|camp)\b/],
  ];
  return groups.find(([, pattern]) => pattern.test(value))?.[0] ?? 'ambience';
}

function collect(
  value: unknown,
  videos: Map<string, BardifyVideo>,
  continuations: Set<string>,
): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item) => collect(item, videos, continuations));
    return;
  }
  const record = value as Record<string, unknown>;
  const videoRenderer = record.videoRenderer as Record<string, unknown> | undefined;
  if (videoRenderer && typeof videoRenderer.videoId === 'string') {
    const name = text(videoRenderer.title);
    if (name) {
      videos.set(videoRenderer.videoId, {
        id: `bardify-${videoRenderer.videoId}`,
        name,
        videoId: videoRenderer.videoId,
        category: categoryFor(name),
      });
    }
  }
  const lockup = record.lockupViewModel as Record<string, unknown> | undefined;
  if (
    lockup &&
    lockup.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO' &&
    typeof lockup.contentId === 'string'
  ) {
    const metadata = lockup.metadata as Record<string, unknown> | undefined;
    const lockupMetadata = metadata?.lockupMetadataViewModel as
      | Record<string, unknown>
      | undefined;
    const name = text(lockupMetadata?.title);
    if (name) {
      videos.set(lockup.contentId, {
        id: `bardify-${lockup.contentId}`,
        name,
        videoId: lockup.contentId,
        category: categoryFor(name),
      });
    }
  }
  const continuation = record.continuationCommand as Record<string, unknown> | undefined;
  if (typeof continuation?.token === 'string') continuations.add(continuation.token);
  Object.values(record).forEach((child) => collect(child, videos, continuations));
}

async function main(): Promise<void> {
  const response = await fetch(CHANNEL_URL, {
    headers: { 'user-agent': 'Mozilla/5.0' },
  });
  if (!response.ok) throw new Error(`YouTube returned ${response.status}`);
  const html = await response.text();
  const apiKey = /"INNERTUBE_API_KEY":"([^"]+)"/.exec(html)?.[1];
  const clientVersion = /"INNERTUBE_CLIENT_VERSION":"([^"]+)"/.exec(html)?.[1];
  if (!apiKey || !clientVersion) throw new Error('Missing YouTube client configuration');

  const videos = new Map<string, BardifyVideo>();
  let pending = new Set<string>();
  collect(extractJson(html, 'var ytInitialData = '), videos, pending);
  const visited = new Set<string>();

  while (pending.size > 0) {
    const token = pending.values().next().value;
    if (typeof token !== 'string') break;
    pending.delete(token);
    if (visited.has(token)) continue;
    visited.add(token);
    const page = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${apiKey}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        context: { client: { clientName: 'WEB', clientVersion } },
        continuation: token,
      }),
    });
    if (!page.ok) throw new Error(`YouTube browse returned ${page.status}`);
    const next = new Set<string>();
    collect(await page.json(), videos, next);
    pending = new Set([...pending, ...next]);
  }

  await writeFile(OUTPUT, `${JSON.stringify([...videos.values()], null, 2)}\n`);
  process.stdout.write(`Saved ${videos.size} Bardify videos to ${OUTPUT}\n`);
}

await main();
