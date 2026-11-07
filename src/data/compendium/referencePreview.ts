import type { Entry } from './entry';
import type { CompendiumEntryBase } from './types';

interface WithEntries {
  entries?: Entry[];
  traits?: Array<{ entries?: Entry[] }>;
  actions?: Array<{ entries?: Entry[] }>;
}

function firstText(entries: Entry[]): string {
  for (const entry of entries) {
    if (typeof entry === 'string') {
      const text = entry
        .replace(
          /\{[@#](?:itemEntry|item|[^\s}]+)\s*([^|}]*)[^}]*\}/g,
          (_, value: string) => value.trim(),
        )
        .replace(/\s+/g, ' ')
        .trim();
      if (text) return text;
    } else if (entry && typeof entry === 'object') {
      const nested = firstText(entry.entries ?? (entry.entry ? [entry.entry] : []));
      if (nested) return nested;
    }
  }
  return '';
}

export function referencePreview(item: CompendiumEntryBase & WithEntries): string {
  const entries = item.entries?.length
    ? item.entries
    : [...(item.traits ?? []), ...(item.actions ?? [])].flatMap(
        (section) => section.entries ?? [],
      );
  const text = firstText(entries);
  return text.length <= 180 ? text : `${text.slice(0, 177).replace(/\s+\S*$/, '')}...`;
}
