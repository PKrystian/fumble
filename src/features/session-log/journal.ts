import { normalizeSearchText } from '@/data/compendium/searchText';
import {
  formatClockTime,
  formatDuration,
  sessionDateValue,
  type CampaignContext,
  type Session,
} from './store';

export type JournalSort = 'updated' | 'date' | 'title';
export type ExportScope = 'all' | 'notes' | 'transcript' | 'summary';
export interface ExportLabels {
  untitled: string;
  campaign: string;
  date: string;
  number: string;
  notes: string;
  transcript: string;
  summary: string;
  context: string;
}

export function filterSessions(
  sessions: Session[],
  query: string,
  campaign: string,
  sort: JournalSort,
  direction: 'asc' | 'desc',
  locale: string,
): Session[] {
  const term = normalizeSearchText(query.trim());
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' });
  return sessions
    .filter(
      (session) =>
        (!campaign || session.campaign === campaign) &&
        (!term ||
          normalizeSearchText(
            [
              session.title,
              session.campaign ?? '',
              session.number ?? '',
              session.notes,
              session.summary ?? '',
              ...session.entries.map((entry) => entry.text),
            ].join('\n'),
          ).includes(term)),
    )
    .sort((a, b) => {
      const value = (session: Session) =>
        sort === 'updated'
          ? (session.updatedAt ?? session.createdAt)
          : sort === 'title'
            ? session.title.trim()
            : (session.sessionDate ?? sessionDateValue(session.createdAt));
      const left = value(a);
      const right = value(b);
      if (left === '' || right === '')
        return left === right ? a.id.localeCompare(b.id) : left === '' ? 1 : -1;
      const comparison =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : collator.compare(String(left), String(right));
      return (direction === 'asc' ? comparison : -comparison) || a.id.localeCompare(b.id);
    });
}

export function hasExportContent(session: Session, scope: ExportScope): boolean {
  return (
    ((scope === 'all' || scope === 'notes') && Boolean(session.notes.trim())) ||
    ((scope === 'all' || scope === 'summary') && Boolean(session.summary?.trim())) ||
    ((scope === 'all' || scope === 'transcript') &&
      session.entries.some((entry) => Boolean(entry.text.trim())))
  );
}

export function formatSessionExport(
  session: Session,
  contexts: CampaignContext[],
  options: {
    scope: ExportScope;
    includeContext: boolean;
    markdown: boolean;
    labels: ExportLabels;
  },
): string {
  const { scope, includeContext, markdown, labels } = options;
  const heading = (title: string, level: number) =>
    markdown ? `${'#'.repeat(level)} ${title}` : title;
  const lines = [heading(session.title.trim() || labels.untitled, 1)];
  for (const [label, value] of [
    [labels.campaign, session.campaign],
    [labels.date, session.sessionDate ?? sessionDateValue(session.createdAt)],
    [labels.number, session.number],
  ])
    if (value?.trim()) lines.push(`${label}: ${value.trim()}`);
  if (includeContext) {
    const selected = contexts.filter(
      (context) => session.contextIds?.includes(context.id) && context.text.trim(),
    );
    if (selected.length)
      lines.push(
        '',
        heading(labels.context, 2),
        ...selected.flatMap((context) => [
          '',
          heading(context.name.trim() || labels.untitled, 3),
          context.text.trim(),
        ]),
      );
  }
  for (const [key, label, text] of [
    ['notes', labels.notes, session.notes],
    ['summary', labels.summary, session.summary ?? ''],
    [
      'transcript',
      labels.transcript,
      session.entries
        .map(
          (entry) =>
            `[${entry.offsetMs === undefined ? formatClockTime(entry.time) : formatDuration(entry.offsetMs)}] ${entry.text}`,
        )
        .join('\n'),
    ],
  ])
    if ((scope === 'all' || scope === key) && text?.trim())
      lines.push('', heading(label!, 2), text.trim());
  return lines.join('\n').trim();
}

export function sessionExportFilename(session: Session, extension: 'txt' | 'md'): string {
  const name = session.title
    .trim()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}_. -]/gu, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80);
  return `fumble-session-${name || session.id}.${extension}`;
}

export function downloadJournalFile(text: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    try {
      anchor.click();
    } finally {
      anchor.remove();
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}
