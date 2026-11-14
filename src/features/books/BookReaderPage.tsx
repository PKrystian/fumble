import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpenText, List, Maximize2 } from 'lucide-react';
import type { Entry } from '@/data/compendium/entry';
import { EntryRenderer } from '@/features/compendium/EntryRenderer';
import { EntryLanguage } from '@/features/compendium/entryLanguage';
import { localizePlainText } from '@/features/compendium/markup';
import { NotFoundPage } from '@/features/NotFoundPage';
import { localizedBookName } from '@/data/compendium/sources';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { hasPrerenderedPage, revealApp, showPrerenderedRetry } from '@/seo/prerendered';
import { Button } from '@/features/ui/primitives';
import { BookContents } from './BookContents';
import { BooksDialog } from './BooksDialog';
import { getBook, loadBookData, readBookChapter, type BookData } from './data';
import { bookChapterTitle } from './chapterTitle';
import { bookAnchorHash, readBookAnchor } from './readerAnchor';
import { chapterForAnchor, resolveReaderTarget } from './readerNavigation';
import { ReadingStatus } from './ReadingStatus';
import { useBookReading } from './readingStore';

const BATCH_SIZE = 3;
type JumpNotice = 'page' | 'chapter' | 'reference';

const ChapterText = memo(function ChapterText({
  entry,
  index,
}: {
  entry: Entry;
  index: number;
}) {
  return (
    <div data-book-chapter={index} className="space-y-3">
      <EntryRenderer entries={[entry]} />
    </div>
  );
});

function focusPassage(target: HTMLElement, toolbar: HTMLElement | null) {
  target.style.scrollMarginTop = `${(toolbar?.offsetHeight ?? 0) + 16}px`;
  if (target.tabIndex < 0) target.tabIndex = -1;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: 'start' });
}

export function BookReaderPage() {
  const { t, locale } = useT();
  const { id, chapter } = useParams();
  const location = useLocation();
  const book = id ? getBook(id) : undefined;
  const anchor = useMemo(
    () => readBookAnchor(location.hash, location.search),
    [location.hash, location.search],
  );
  const requestedChapter = chapter === undefined ? null : Number(chapter);
  const invalidChapter =
    chapter !== undefined &&
    (!/^\d+$/.test(chapter) || !Number.isSafeInteger(requestedChapter));
  const loadKey = `${locale}/${id}`;

  const [load, setLoad] = useState<{ key: string; data?: BookData } | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [contentsOpen, setContentsOpen] = useState(false);
  const [jumpNotice, setJumpNotice] = useState<JumpNotice | undefined>();
  const data = load?.key === loadKey ? load.data : undefined;
  const error = load?.key === loadKey && !data;
  const prerendered = hasPrerenderedPage(location.pathname);
  const content = useRef<HTMLElement>(null);
  const toolbar = useRef<HTMLDivElement>(null);
  const ignoreScrollUntil = useRef(0);
  const batchTarget = useRef<number | null>(null);

  useEffect(() => {
    if (!book || invalidChapter) return;
    let cancelled = false;
    void loadBookData(book, locale).then(
      (result) => {
        if (cancelled) return;
        setLoad({ key: loadKey, data: result });
        setRetrying(false);
      },
      () => {
        if (cancelled) return;
        setLoad({ key: loadKey });
        setRetrying(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [book, invalidChapter, locale, loadKey, retryKey]);

  const total = data?.chapters.length ?? 0;
  const chapterIndex = useMemo(
    () => requestedChapter ?? (data ? chapterForAnchor(data.chapters, anchor) : 0),
    [requestedChapter, data, anchor],
  );
  const originalChapter = data?.chapters[chapterIndex];
  const language = data?.language ?? locale;
  const title = book ? localizedBookName(book, locale) : '';
  const titles = useMemo(() => {
    if (!book) return [];
    return Array.from(
      { length: data?.chapters.length ?? book.contents.length },
      (_, index) => {
        const original = data?.chapters[index];
        const translated =
          typeof original === 'object' && typeof original.id === 'string'
            ? data?.overlay?.[`${index}:${original.id}`]?.name
            : undefined;
        const entry = translated
          ? { name: translated }
          : (original ?? book.contents[index]);
        const fallback = t('books.chapterFallback', { n: index + 1 });
        return localizePlainText(
          bookChapterTitle(book.id, entry, index, language, fallback),
          language,
        );
      },
    );
  }, [book, data, language, t]);

  const wholeBook = useBookReading((state) => state.data.wholeBook);
  const wide = useBookReading((state) => state.data.wide);
  const saved = useBookReading((state) => state.data.positions[id ?? '']);
  const setPreference = useBookReading((state) => state.setPreference);
  const readerKey = `${id}/${chapterIndex}`;
  const [expansion, setExpansion] = useState<{ key: string; chapters: Set<number> }>();
  const expanded =
    expansion?.key === readerKey ? expansion.chapters : new Set([chapterIndex]);
  const toggleChapter = (index: number) => {
    const chapters = new Set(expanded);
    if (chapters.has(index)) chapters.delete(index);
    else chapters.add(index);
    setExpansion({ key: readerKey, chapters });
  };

  const [range, setRange] = useState<{ key: string; first: number; last: number }>();
  const first = wholeBook && range?.key === readerKey ? range.first : chapterIndex;
  const last = !wholeBook
    ? chapterIndex
    : range?.key === readerKey
      ? range.last
      : Math.min(total - 1, chapterIndex + BATCH_SIZE - 1);
  const shown = useMemo(() => {
    if (!data || !book || first >= total) return [];
    return Array.from({ length: last - first + 1 }, (_, offset) =>
      readBookChapter(data, book.id, first + offset),
    );
  }, [data, book, first, last, total]);

  const routeNotFound =
    !book || invalidChapter || (total > 0 && originalChapter === undefined);
  const hasAnchor = anchor.page !== null || !!anchor.name || !!anchor.section;
  const bookId = book?.id;
  const jumpKey = location.key;
  useEffect(() => {
    if (!bookId || !total || routeNotFound) return;
    let focusFrame = 0;
    const frame = requestAnimationFrame(() => {
      const root = content.current?.querySelector<HTMLElement>(
        `[data-book-chapter="${chapterIndex}"]`,
      );
      if (!root) return;
      const passage = resolveReaderTarget(root, originalChapter, anchor);
      setJumpNotice(passage.notice);
      const reading = useBookReading.getState();
      if (chapter !== undefined || hasAnchor || !reading.data.positions[bookId])
        reading.record(bookId, chapterIndex, passage.section);
      if (passage.target && (chapter !== undefined || hasAnchor || wholeBook)) {
        const target = passage.target;
        focusFrame = requestAnimationFrame(() => {
          ignoreScrollUntil.current = performance.now() + 400;
          focusPassage(target, toolbar.current);
        });
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(focusFrame);
    };
  }, [
    bookId,
    total,
    routeNotFound,
    chapterIndex,
    originalChapter,
    anchor,
    hasAnchor,
    chapter,
    wholeBook,
    jumpKey,
    data,
  ]);

  useEffect(() => {
    if (batchTarget.current === null) return;
    const index = batchTarget.current;
    batchTarget.current = null;
    const target = content.current?.querySelector<HTMLElement>(
      `[data-book-chapter="${index}"] .entry-heading`,
    );
    if (target) focusPassage(target, toolbar.current);
  }, [first, last]);

  useEffect(() => {
    const scroller = document.getElementById('app-scroll');
    if (!scroller || !bookId || !total) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      if (performance.now() < ignoreScrollUntil.current) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const cutoff = (toolbar.current?.getBoundingClientRect().bottom ?? 0) + 48;
        const chapters =
          content.current?.querySelectorAll<HTMLElement>('[data-book-chapter]');
        const current = [...(chapters ?? [])].findLast(
          (item) => item.getBoundingClientRect().top <= cutoff,
        );
        if (!current || current.getBoundingClientRect().bottom < cutoff - 48) return;
        const section = [
          ...current.querySelectorAll<HTMLElement>('[data-entry-id] > .entry-heading'),
        ].findLast((item) => item.getBoundingClientRect().top <= cutoff)?.parentElement
          ?.dataset.entryId;
        useBookReading
          .getState()
          .record(bookId, Number(current.dataset.bookChapter), section);
      }, 240);
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      scroller.removeEventListener('scroll', onScroll);
    };
  }, [bookId, total, jumpKey]);

  useEffect(() => {
    if (prerendered && (error || (data && !total))) showPrerenderedRetry();
    else if (!prerendered || total > 0 || routeNotFound) revealApp();
  }, [data, error, prerendered, routeNotFound, total]);

  const chapterTitle = titles[chapterIndex];
  useSeo(
    routeNotFound
      ? t('notFound.title')
      : data && chapterTitle
        ? `${title} - ${chapterTitle}`
        : title,
    routeNotFound
      ? t('notFound.message')
      : data && chapterTitle
        ? t('seo.bookChapterDescription', { chapter: chapterTitle, book: title })
        : t('seo.bookDescription', { name: title }),
    false,
  );

  if (routeNotFound || !book) return <NotFoundPage />;

  const search: unknown = location.state?.catalogSearch;
  const catalogSearch =
    typeof search === 'string' && search.startsWith('?') ? search : '';
  const catalogPath = `/books${catalogSearch}`;
  const closeContents = () => setContentsOpen(false);
  const goTo = (index: number) => `/books/${book.id}/${index}`;
  const retry = () => {
    if (data && total) setRetrying(true);
    else setLoad(null);
    setRetryKey((value) => value + 1);
  };
  const loadEarlier = () => {
    const next = Math.max(0, first - BATCH_SIZE);
    batchTarget.current = next;
    setRange({ key: readerKey, first: next, last });
  };
  const loadLater = () => {
    batchTarget.current = last + 1;
    setRange({ key: readerKey, first, last: Math.min(total - 1, last + BATCH_SIZE) });
  };
  const renderContents = () => (
    <BookContents
      bookId={book.id}
      titles={titles}
      data={data}
      chapter={chapterIndex}
      expanded={expanded}
      onToggle={toggleChapter}
      catalogSearch={catalogSearch}
      onNavigate={closeContents}
    />
  );
  const resume =
    saved &&
    saved.chapter < total &&
    (saved.chapter !== chapterIndex || saved.section) &&
    chapter === undefined &&
    !hasAnchor;

  return (
    <div className="flex min-w-0">
      <aside className="sticky top-0 hidden max-h-dvh w-64 shrink-0 self-start border-r border-ink-700 md:flex md:flex-col xl:w-72">
        <div className="border-b border-ink-700 p-3">
          <Link to={catalogPath} className="back-link">
            <ArrowLeft size={16} aria-hidden="true" /> {t('common.allBooks')}
          </Link>
          <p className="section-title [overflow-wrap:anywhere]">{title}</p>
        </div>
        {renderContents()}
      </aside>

      <section ref={content} id="book-content" className="min-w-0 flex-1">
        {total > 0 && (
          <div
            ref={toolbar}
            className="sticky top-0 z-10 border-b border-ink-800 bg-ink-950 px-4 py-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                className="md:hidden"
                aria-expanded={contentsOpen}
                aria-haspopup="dialog"
                onClick={() => setContentsOpen(true)}
              >
                <List size={16} aria-hidden="true" /> {t('books.tableOfContents')}
              </Button>
              <Button
                size="sm"
                aria-pressed={wholeBook}
                variant={wholeBook ? 'primary' : 'secondary'}
                onClick={() => {
                  setRange(undefined);
                  setPreference('wholeBook', !wholeBook);
                }}
              >
                <BookOpenText size={16} aria-hidden="true" /> {t('books.wholeBook')}
              </Button>
              <Button
                size="sm"
                aria-pressed={wide}
                variant={wide ? 'primary' : 'secondary'}
                onClick={() => setPreference('wide', !wide)}
              >
                <Maximize2 size={16} aria-hidden="true" /> {t('books.fullWidth')}
              </Button>
            </div>
            {jumpNotice && (
              <p role="status" className="mt-2 text-sm text-ink-300">
                {jumpNotice === 'reference'
                  ? t('books.referenceLocation')
                  : jumpNotice === 'page'
                    ? t('books.approximatePage', { page: anchor.page ?? '' })
                    : t('books.approximateChapter')}
              </p>
            )}
          </div>
        )}

        <BooksDialog
          open={contentsOpen}
          onClose={closeContents}
          title={t('books.tableOfContents')}
        >
          {renderContents()}
        </BooksDialog>

        <div className={`page-shell ${wide ? 'max-w-none' : 'page-shell-reading'}`}>
          <Link to={catalogPath} className="back-link md:hidden">
            <ArrowLeft size={16} aria-hidden="true" /> {t('common.allBooks')}
          </Link>
          <h1 className="page-title mb-4 [overflow-wrap:anywhere]">{title}</h1>
          {book.author && <p className="mb-4 text-sm text-ink-400">{book.author}</p>}
          <ReadingStatus />
          {resume && (
            <Link
              to={
                goTo(saved.chapter) + bookAnchorHash(undefined, undefined, saved.section)
              }
              state={{ catalogSearch }}
              className="back-link"
            >
              <BookOpenText size={16} aria-hidden="true" /> {t('books.resume')}
            </Link>
          )}
          {error && (
            <div
              className="notice notice-error flex flex-wrap items-center gap-3"
              role="alert"
            >
              <span>{t('books.couldNotLoad')}</span>
              <Button onClick={retry} size="sm">
                {t('common.retry')}
              </Button>
            </div>
          )}
          {!error && !data && (
            <p className="notice" role="status">
              {t('common.loading')}
            </p>
          )}
          {data && !total && (
            <div className="empty-state">
              <p>{t('books.noContent')}</p>
              <Button onClick={retry} className="mt-3">
                {t('common.retry')}
              </Button>
            </div>
          )}
          {total > 0 && locale === 'pl' && language === 'en' && (
            <div className="notice notice-warning mb-4 space-y-2">
              <p role="status">{t('books.translationUnavailable')}</p>
              <Button onClick={retry} disabled={retrying} size="sm">
                {retrying ? t('common.loading') : t('books.retryTranslation')}
              </Button>
            </div>
          )}

          {wholeBook && total > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <p role="status" className="text-sm text-ink-300">
                {t('books.chapterRange', { first: first + 1, last: last + 1, total })}
              </p>
              {first > 0 && (
                <Button onClick={loadEarlier}>{t('books.loadEarlier')}</Button>
              )}
            </div>
          )}

          {shown.length > 0 && (
            <EntryLanguage.Provider value={language}>
              <article
                lang={language}
                className="reading-content flex flex-col gap-8 [overflow-wrap:anywhere]"
              >
                {shown.map(
                  (entry, offset) =>
                    entry !== undefined && (
                      <ChapterText
                        key={`${book.id}/${first + offset}`}
                        entry={entry}
                        index={first + offset}
                      />
                    ),
                )}
              </article>
            </EntryLanguage.Provider>
          )}

          {wholeBook && last < total - 1 && (
            <Button onClick={loadLater} className="mt-8">
              {t('books.loadLater')}
            </Button>
          )}

          {!wholeBook && total > 1 && (
            <nav
              aria-label={t('books.chapterNavigation')}
              className="mt-10 flex flex-wrap justify-between gap-3 border-t border-ink-800 pt-4"
            >
              {chapterIndex > 0 && (
                <Link
                  to={goTo(chapterIndex - 1)}
                  state={{ catalogSearch }}
                  className="back-link mb-0 min-w-0 [overflow-wrap:anywhere]"
                >
                  <ArrowLeft size={16} className="shrink-0" aria-hidden="true" />{' '}
                  {titles[chapterIndex - 1]}
                </Link>
              )}
              {chapterIndex < total - 1 && (
                <Link
                  to={goTo(chapterIndex + 1)}
                  state={{ catalogSearch }}
                  className="back-link mb-0 ml-auto min-w-0 [overflow-wrap:anywhere]"
                >
                  {titles[chapterIndex + 1]}{' '}
                  <ArrowRight size={16} className="shrink-0" aria-hidden="true" />
                </Link>
              )}
            </nav>
          )}
        </div>
      </section>
    </div>
  );
}
