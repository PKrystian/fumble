import { useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Entry } from '@/data/compendium/entry';
import { localizePlainText } from '@/features/compendium/markup';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import type { Locale } from '@/i18n/locales';
import { IconButton } from '@/features/ui/primitives';
import { buildOutline, readBookChapter, type BookData, type OutlineNode } from './data';
import { bookAnchorHash } from './readerAnchor';

function outlineEntry(entry: Entry | undefined) {
  return buildOutline(typeof entry === 'object' ? entry.entries : undefined);
}

function OutlineList({
  nodes,
  bookId,
  index,
  locale,
  catalogSearch,
  onNavigate,
}: {
  nodes: OutlineNode[];
  bookId: string;
  index: number;
  locale: Locale;
  catalogSearch: string;
  onNavigate: () => void;
}) {
  if (!nodes.length) return null;
  return (
    <ul className="ml-3 border-l border-ink-800 pl-2">
      {nodes.map((node, order) => (
        <li key={node.section ?? order}>
          <Link
            to={{
              pathname: `/books/${bookId}/${index}`,
              hash: node.section
                ? bookAnchorHash(undefined, undefined, node.section)
                : bookAnchorHash(undefined, node.name),
            }}
            state={{ catalogSearch }}
            onClick={onNavigate}
            className="back-link mb-0 block py-2 [overflow-wrap:anywhere]"
          >
            {localizePlainText(node.name, locale)}
          </Link>
          <OutlineList
            nodes={node.children}
            bookId={bookId}
            index={index}
            locale={locale}
            catalogSearch={catalogSearch}
            onNavigate={onNavigate}
          />
        </li>
      ))}
    </ul>
  );
}

function ChapterRow({
  title,
  index,
  bookId,
  data,
  current,
  expanded,
  onToggle,
  catalogSearch,
  onNavigate,
}: {
  title: string;
  index: number;
  bookId: string;
  data: BookData | undefined;
  current: boolean;
  expanded: boolean;
  onToggle: () => void;
  catalogSearch: string;
  onNavigate: () => void;
}) {
  const { t, locale } = useT();
  const original = data?.chapters[index];
  const hasOutline =
    typeof original === 'object' &&
    !!original.entries?.some(
      (entry) =>
        typeof entry === 'object' &&
        (entry.type === 'section' || entry.type === 'entries') &&
        !!entry.name,
    );
  const outline =
    useMemo(
      () => (expanded && data ? outlineEntry(readBookChapter(data, bookId, index)) : []),
      [expanded, data, bookId, index],
    ) ?? [];

  return (
    <li>
      <div className="flex items-start gap-1">
        {hasOutline || outline.length > 0 ? (
          <IconButton
            onClick={onToggle}
            label={t(expanded ? 'books.collapseChapter' : 'books.expandChapter', {
              title,
            })}
            aria-expanded={expanded}
            variant="ghost"
            size="sm"
          >
            {expanded ? (
              <ChevronDown size={15} aria-hidden="true" />
            ) : (
              <ChevronRight size={15} aria-hidden="true" />
            )}
          </IconButton>
        ) : (
          <span className="w-8 shrink-0" aria-hidden="true" />
        )}
        <Link
          to={`/books/${bookId}/${index}`}
          state={{ catalogSearch }}
          onClick={onNavigate}
          aria-current={current ? 'page' : undefined}
          className={`back-link mb-0 min-w-0 flex-1 border px-2 py-2 [overflow-wrap:anywhere] ${
            current
              ? 'border-arcane-700 bg-arcane-950 font-semibold'
              : 'border-transparent hover:bg-ink-800'
          }`}
        >
          {index + 1}. {title}
        </Link>
      </div>
      {expanded && (
        <OutlineList
          nodes={outline}
          bookId={bookId}
          index={index}
          locale={data?.language ?? locale}
          catalogSearch={catalogSearch}
          onNavigate={onNavigate}
        />
      )}
    </li>
  );
}

export function BookContents({
  bookId,
  titles,
  data,
  chapter,
  expanded,
  onToggle,
  catalogSearch,
  onNavigate,
}: {
  bookId: string;
  titles: string[];
  data: BookData | undefined;
  chapter: number;
  expanded: ReadonlySet<number>;
  onToggle: (index: number) => void;
  catalogSearch: string;
  onNavigate: () => void;
}) {
  const { t } = useT();
  return (
    <nav aria-label={t('books.chaptersNav')} className="min-h-0 overflow-y-auto p-2">
      <ol className="space-y-1">
        {titles.map((title, index) => (
          <ChapterRow
            key={index}
            title={title}
            index={index}
            bookId={bookId}
            data={data}
            current={chapter === index}
            expanded={expanded.has(index)}
            onToggle={() => onToggle(index)}
            catalogSearch={catalogSearch}
            onNavigate={onNavigate}
          />
        ))}
      </ol>
    </nav>
  );
}
