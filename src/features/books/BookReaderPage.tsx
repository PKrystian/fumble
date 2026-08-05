import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpenText,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import type { Entry, EntryNode } from '@/data/compendium/entry';
import { EntryRenderer } from '@/features/compendium/EntryRenderer';
import { localizedBookName } from '@/data/compendium/sources';
import { Link, Navigate } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { type OutlineNode, buildOutline, getBook, loadBookData } from './data';

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function scrollToHeading(name: string): boolean {
  const anchor = document.querySelector(
    `#book-content [data-entry-name="${slug(name)}"]`,
  );
  if (anchor) {
    anchor.scrollIntoView({ block: 'start' });
    return true;
  }
  const target = name.trim().toLowerCase();
  for (const h of document.querySelectorAll(
    '#book-content h2, #book-content h3, #book-content h4',
  )) {
    if ((h.textContent ?? '').trim().toLowerCase() === target) {
      h.scrollIntoView({ block: 'start' });
      return true;
    }
  }
  return false;
}

function scrollToPage(page: number): void {
  let target = document.getElementById(`page-${page}`) as Element | null;
  if (!target) {
    let best = -1;
    for (const el of document.querySelectorAll('#book-content [data-page]')) {
      const p = Number(el.getAttribute('data-page'));
      if (p <= page && p > best) {
        best = p;
        target = el;
      }
    }
  }
  target?.scrollIntoView({ block: 'start' });
}

function pageOf(chapter: Entry): number | undefined {
  return chapter && typeof chapter === 'object' && typeof chapter.page === 'number'
    ? chapter.page
    : undefined;
}

function chapterTitle(chapter: Entry, fallback: string): string {
  if (chapter && typeof chapter === 'object' && typeof chapter.name === 'string') {
    return chapter.name;
  }
  return fallback;
}

function OutlineList({
  nodes,
  bookId,
  chapterIndex,
  depth,
}: {
  nodes: OutlineNode[];
  bookId: string;
  chapterIndex: number;
  depth: number;
}) {
  if (nodes.length === 0) return null;
  return (
    <ul className="flex flex-col">
      {nodes.map((node) => (
        <li key={node.name}>
          <Link
            to={`/books/${bookId}/${chapterIndex}?name=${encodeURIComponent(node.name)}`}
            className={[
              'flex items-center gap-1 truncate rounded-md py-1.5 pr-3 text-xs text-ink-400 transition-colors hover:bg-ink-800/60 hover:text-ink-100',
              depth === 0 ? 'pl-6' : 'pl-9',
            ].join(' ')}
          >
            {depth > 0 && <span aria-hidden="true">-</span>}
            <span className="truncate">{node.name}</span>
          </Link>
          <OutlineList
            nodes={node.children}
            bookId={bookId}
            chapterIndex={chapterIndex}
            depth={depth + 1}
          />
        </li>
      ))}
    </ul>
  );
}

export function BookReaderPage() {
  const { t, locale } = useT();
  const { id, chapter } = useParams();
  const [searchParams] = useSearchParams();
  const book = id ? getBook(id) : undefined;
  const targetPage = searchParams.has('page') ? Number(searchParams.get('page')) : null;
  const targetName = searchParams.get('name');

  const [chapters, setChapters] = useState<Entry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!book) return;
    let cancelled = false;
    setChapters(null);
    setError(false);
    loadBookData(book, locale)
      .then((data) => {
        if (!cancelled) setChapters(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [book, locale]);

  const chapterFromPage = useMemo(() => {
    if (chapters == null || targetPage == null) return null;
    let best = 0;
    let bestPage = -1;
    chapters.forEach((c, i) => {
      const p = pageOf(c);
      if (p != null && p <= targetPage && p > bestPage) {
        bestPage = p;
        best = i;
      }
    });
    return best;
  }, [chapters, targetPage]);

  const chapterIndex =
    chapter != null ? Math.max(0, Number(chapter) || 0) : (chapterFromPage ?? 0);

  const [fullBook, setFullBook] = useState(false);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    if (chapters == null) return;
    const timer = setTimeout(() => {
      if (targetName && scrollToHeading(targetName)) return;
      if (targetPage != null) {
        scrollToPage(targetPage);
        return;
      }
      if (
        fullBook &&
        scrollToHeading(
          chapterTitle(
            chapters[chapterIndex]!,
            t('books.chapterFallback', { n: chapterIndex + 1 }),
          ),
        )
      ) {
        return;
      }
      document.getElementById('book-content')?.scrollTo({ top: 0 });
    }, 60);
    return () => clearTimeout(timer);
  }, [chapters, chapterIndex, targetPage, targetName, fullBook, t]);

  const chapterOutlines = useMemo(
    () => (chapters ?? []).map((c) => buildOutline((c as EntryNode).entries)),
    [chapters],
  );
  const fallbackChapters = useMemo(
    () =>
      (book?.contents ?? []).map(
        (_, index) =>
          ({
            type: 'section',
            name: t('books.chapterFallback', { n: index + 1 }),
            entries: [],
          }) as Entry,
      ),
    [book, t],
  );

  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(
    () => new Set([chapterIndex]),
  );
  useEffect(() => {
    setExpandedChapters((prev) =>
      prev.has(chapterIndex) ? prev : new Set(prev).add(chapterIndex),
    );
  }, [chapterIndex]);
  const toggleChapter = (index: number) =>
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const active = useMemo(
    () => (chapters ? chapters[chapterIndex] : undefined),
    [chapters, chapterIndex],
  );

  useSeo(
    book
      ? active
        ? `${localizedBookName(book, locale)} - ${chapterTitle(active, t('books.chapterFallback', { n: chapterIndex + 1 }))}`
        : localizedBookName(book, locale)
      : '',
    book
      ? active
        ? t('seo.bookChapterDescription', {
            chapter: chapterTitle(
              active,
              t('books.chapterFallback', { n: chapterIndex + 1 }),
            ),
            book: localizedBookName(book, locale),
          })
        : t('seo.bookDescription', { name: localizedBookName(book, locale) })
      : undefined,
  );

  if (!book) return <Navigate to="/books" replace />;

  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-ink-700 md:flex">
        <div className="border-b border-ink-700 p-3">
          <Link
            to="/books"
            className="mb-2 inline-flex items-center gap-1 text-sm text-ink-300 hover:text-ink-50"
          >
            <ArrowLeft size={16} aria-hidden="true" /> {t('common.allBooks')}
          </Link>
          <h1 className="font-display text-lg font-bold text-ink-50">
            {localizedBookName(book, locale)}
          </h1>
          {book.author && <p className="text-xs text-ink-400">{book.author}</p>}
        </div>
        <nav
          className="min-h-0 flex-1 overflow-y-auto p-2"
          aria-label={t('books.chaptersNav')}
        >
          {(chapters ?? fallbackChapters).map((entry, index) => {
            const title = chapterTitle(
              entry as Entry,
              t('books.chapterFallback', { n: index + 1 }),
            );
            const outline = chapters != null ? (chapterOutlines[index] ?? []) : [];
            const isExpanded = expandedChapters.has(index);
            return (
              <div key={index}>
                <div className="flex items-center gap-0.5">
                  {outline.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => toggleChapter(index)}
                      aria-label={
                        isExpanded
                          ? t('books.collapseChapter', { title })
                          : t('books.expandChapter', { title })
                      }
                      aria-expanded={isExpanded}
                      className="shrink-0 rounded p-1 text-ink-500 hover:bg-ink-800 hover:text-ink-200"
                    >
                      {isExpanded ? (
                        <ChevronDown size={14} aria-hidden="true" />
                      ) : (
                        <ChevronRight size={14} aria-hidden="true" />
                      )}
                    </button>
                  ) : (
                    <span className="w-6 shrink-0" aria-hidden="true" />
                  )}
                  <Link
                    to={`/books/${book.id}/${index}`}
                    className={[
                      'block flex-1 truncate rounded-md px-2 py-2 text-sm transition-colors',
                      index === chapterIndex
                        ? 'bg-arcane-700 font-semibold text-white'
                        : 'text-ink-200 hover:bg-ink-800/60 hover:text-ink-50',
                    ].join(' ')}
                  >
                    {index + 1}. {title}
                  </Link>
                </div>
                {isExpanded && (
                  <OutlineList
                    nodes={outline}
                    bookId={book.id}
                    chapterIndex={index}
                    depth={0}
                  />
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <section id="book-content" className="min-w-0 flex-1 overflow-y-auto">
        {chapters != null && (
          <div className="sticky top-0 z-10 flex justify-end gap-2 border-b border-ink-800 bg-ink-950/95 px-4 py-2 backdrop-blur">
            <button
              type="button"
              onClick={() => setFullBook((v) => !v)}
              aria-pressed={fullBook}
              className={[
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                fullBook
                  ? 'border-arcane-300 bg-arcane-700 text-white'
                  : 'border-ink-700 text-ink-300 hover:bg-ink-800 hover:text-ink-50',
              ].join(' ')}
            >
              <BookOpenText size={14} aria-hidden="true" />
              {fullBook ? t('books.wholeBook') : t('books.thisChapter')}
            </button>
            <button
              type="button"
              onClick={() => setWide((v) => !v)}
              aria-pressed={wide}
              className={[
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                wide
                  ? 'border-arcane-300 bg-arcane-700 text-white'
                  : 'border-ink-700 text-ink-300 hover:bg-ink-800 hover:text-ink-50',
              ].join(' ')}
            >
              {wide ? (
                <Minimize2 size={14} aria-hidden="true" />
              ) : (
                <Maximize2 size={14} aria-hidden="true" />
              )}
              {wide ? t('books.comfortableWidth') : t('books.fullWidth')}
            </button>
          </div>
        )}

        <div
          className={['mx-auto px-6 py-8', wide ? 'max-w-none' : 'max-w-3xl'].join(' ')}
        >
          <Link
            to="/books"
            className="mb-4 inline-flex items-center gap-1 text-sm text-ink-300 hover:text-ink-50 md:hidden"
          >
            <ArrowLeft size={16} aria-hidden="true" /> {t('common.allBooks')}
          </Link>

          {error && <p className="text-red-400">{t('books.couldNotLoad')}</p>}
          {!error && chapters == null && (
            <p className="text-ink-400">{t('common.loading')}</p>
          )}

          {chapters != null && fullBook && (
            <article className="flex flex-col gap-3 leading-relaxed">
              {chapters.map((c, index) => (
                <div
                  key={index}
                  className={index > 0 ? 'mt-8 border-t border-ink-800 pt-8' : ''}
                >
                  <EntryRenderer entries={[c]} />
                </div>
              ))}
            </article>
          )}

          {!fullBook && active != null && (
            <article className="flex flex-col gap-3 leading-relaxed">
              <EntryRenderer entries={[active]} />
            </article>
          )}

          {chapters != null && !fullBook && (
            <nav className="mt-10 flex items-center justify-between border-t border-ink-800 pt-4 text-sm">
              {chapterIndex > 0 ? (
                <Link
                  to={`/books/${book.id}/${chapterIndex - 1}`}
                  className="text-arcane-300 hover:text-arcane-500"
                >
                  ←{' '}
                  {chapterTitle(
                    chapters[chapterIndex - 1]!,
                    t('books.chapterFallback', { n: chapterIndex }),
                  )}
                </Link>
              ) : (
                <span />
              )}
              {chapterIndex < chapters.length - 1 && (
                <Link
                  to={`/books/${book.id}/${chapterIndex + 1}`}
                  className="text-arcane-300 hover:text-arcane-500"
                >
                  {chapterTitle(
                    chapters[chapterIndex + 1]!,
                    t('books.chapterFallback', { n: chapterIndex + 2 }),
                  )}{' '}
                  →
                </Link>
              )}
            </nav>
          )}
        </div>
      </section>
    </div>
  );
}
