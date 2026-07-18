import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Entry, EntryNode } from '../../src/data/compendium/entry';
import { SUPPORTED_LOCALES } from '../../src/i18n/locales';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
const BATCH_SIZE = 8;

interface Args {
  category?: string;
  book?: string;
  locale: string;
  limit?: number;
}

function parseArgs(): Args {
  const args: Partial<Args> = { locale: 'pl' };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === '--category') args.category = next();
    else if (arg === '--book') args.book = next();
    else if (arg === '--locale') args.locale = next();
    else if (arg === '--limit') args.limit = Number(next());
  }
  if (!args.category && !args.book) {
    throw new Error('Pass --category <id> or --book <id>.');
  }
  if (!SUPPORTED_LOCALES.some((l) => l.code === args.locale)) {
    throw new Error(
      `Unknown locale "${args.locale}" - add it to src/i18n/locales.ts first.`,
    );
  }
  return args as Args;
}

async function callClaude(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Set ANTHROPIC_API_KEY in your environment.');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
  }
  const body = (await res.json()) as { content: Array<{ type: string; text?: string }> };
  const text = body.content.find((block) => block.type === 'text')?.text;
  if (!text) throw new Error('Anthropic response had no text content.');
  return text;
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1]! : text;
  return JSON.parse(raw);
}

const TRANSLATION_INSTRUCTIONS = (localeLabel: string) => `
You are translating Dungeons & Dragons 5e (2024) rules text into ${localeLabel} for a
fan-made toolkit. You will receive a JSON array of entries, each with an "id" and a
"name"/"entries" tree in 5etools' recursive markup format (strings and typed nodes
like {"type":"entries","name":"...","entries":[...]}).

Rules - follow exactly, this output feeds a running app and must not break it:
1. Translate every "name" field and every plain prose string into ${localeLabel}.
   Preserve the exact same JSON structure (same node types, same nesting, same
   array lengths) - only translate the human-readable text.
2. Inline tags like {@condition Incapacitated|XPHB}, {@variantrule Speed|XPHB},
   {@action Attack|XPHB}, {@skill Athletics|XPHB}, {@item Rope|XPHB}, {@dice 1d6},
   {@spell Fireball|XPHB} etc. are cross-references - the first segment (before
   the first "|") and the source code (second segment) are lookup keys and MUST
   stay in English exactly as given, character for character. To show translated
   text to the reader, ADD a third pipe segment with your ${localeLabel} translation,
   e.g. {@condition Incapacitated|XPHB} becomes {@condition Incapacitated|XPHB|<translated
   display text>}. If a tag already has a third segment, replace only that segment.
3. Tags with no display text at all ({@dice 1d6}, {@hit 5}, {@dc 15}, table dice
   headers, etc.) are numbers/mechanics, not prose - leave them completely untouched.
4. Do not translate the "id" field, "source" field, or any other non-prose keys.
5. Output ONLY a single JSON object (no prose, no markdown fences) shaped exactly
   like: { "<id>": { "name": "...", "entries": [...] }, ... } - one key per input
   entry, using its original "id".

Entries to translate:
`;

async function translateBatch(
  entries: Array<{ id: string; name: string; entries: Entry[] }>,
  localeLabel: string,
): Promise<Record<string, { name: string; entries: Entry[] }>> {
  const prompt =
    TRANSLATION_INSTRUCTIONS(localeLabel) +
    JSON.stringify(
      entries.map((e) => ({ id: e.id, name: e.name, entries: e.entries })),
      null,
      2,
    );
  const response = await callClaude(prompt);
  return extractJson(response) as Record<string, { name: string; entries: Entry[] }>;
}

async function translateCategory(categoryId: string, locale: string, limit?: number) {
  const localeInfo = SUPPORTED_LOCALES.find((l) => l.code === locale)!;
  const sourcePath = join(ROOT, `src/data/generated/${categoryId}.json`);
  const overlayDir = join(ROOT, `src/data/generated/${locale}`);
  const overlayPath = join(overlayDir, `${categoryId}.json`);

  const source = JSON.parse(readFileSync(sourcePath, 'utf8')) as {
    items: Array<{ id: string; name: string; entries: Entry[]; hidden?: boolean }>;
  };
  const overlay: Record<string, unknown> = existsSync(overlayPath)
    ? JSON.parse(readFileSync(overlayPath, 'utf8'))
    : {};

  const todo = source.items
    .filter((item) => !item.hidden && !(item.id in overlay))
    .slice(0, limit);
  console.log(
    `${categoryId}: ${todo.length} entries to translate (${Object.keys(overlay).length} already done).`,
  );

  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const batch = todo.slice(i, i + BATCH_SIZE);
    console.log(`  batch ${i / BATCH_SIZE + 1}: ${batch.map((b) => b.id).join(', ')}`);
    const translated = await translateBatch(batch, localeInfo.label);
    Object.assign(overlay, translated);
    mkdirSync(overlayDir, { recursive: true });
    writeFileSync(overlayPath, JSON.stringify(overlay, null, 2));
  }
  console.log(`Wrote ${overlayPath}`);
}

function collectBookNodes(
  chapters: Entry[],
): Array<{ key: string; id: string; name: string; entries: Entry[] }> {
  const out: Array<{ key: string; id: string; name: string; entries: Entry[] }> = [];
  const walk = (node: Entry, chapterIndex: number) => {
    if (typeof node !== 'object') return;
    const n = node as EntryNode;
    if (
      (n.type === 'section' || n.type === 'entries') &&
      typeof n.name === 'string' &&
      typeof n.id === 'string'
    ) {
      out.push({
        key: `${chapterIndex}:${n.id}`,
        id: n.id,
        name: n.name,
        entries: n.entries ?? [],
      });
    }
    (n.entries ?? []).forEach((child) => walk(child, chapterIndex));
  };
  chapters.forEach((chapter, index) => walk(chapter, index));
  return out;
}

async function translateBook(bookId: string, locale: string, limit?: number) {
  const localeInfo = SUPPORTED_LOCALES.find((l) => l.code === locale)!;
  const index = JSON.parse(
    readFileSync(join(ROOT, 'src/data/generated/books.json'), 'utf8'),
  ) as Array<{ id: string; type: 'book' | 'adventure' }>;
  const meta = index.find((b) => b.id === bookId);
  if (!meta) throw new Error(`Unknown book/adventure id "${bookId}".`);

  const sourcePath = join(ROOT, `public/data/${meta.type}/${bookId}.json`);
  const overlayDir = join(ROOT, `public/data/${locale}/${meta.type}`);
  const overlayPath = join(overlayDir, `${bookId}.json`);

  const source = JSON.parse(readFileSync(sourcePath, 'utf8')) as { data: Entry[] };
  const overlay: { data: Record<string, { name?: string; entries?: Entry[] }> } =
    existsSync(overlayPath)
      ? JSON.parse(readFileSync(overlayPath, 'utf8'))
      : { data: {} };

  const nodes = collectBookNodes(source.data);
  const todo = nodes.filter((n) => !(n.key in overlay.data)).slice(0, limit);
  console.log(
    `${bookId}: ${todo.length} sections to translate (${Object.keys(overlay.data).length} already done).`,
  );

  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const batch = todo.slice(i, i + BATCH_SIZE);
    console.log(`  batch ${i / BATCH_SIZE + 1}: ${batch.map((b) => b.name).join(', ')}`);
    const translated = await translateBatch(batch, localeInfo.label);
    for (const node of batch) {
      const result = translated[node.id];
      if (result) overlay.data[node.key] = result;
    }
    mkdirSync(overlayDir, { recursive: true });
    writeFileSync(overlayPath, JSON.stringify(overlay, null, 2));
  }
  console.log(`Wrote ${overlayPath}`);
}

const args = parseArgs();
if (args.category) {
  await translateCategory(args.category, args.locale, args.limit);
} else if (args.book) {
  await translateBook(args.book, args.locale, args.limit);
}
