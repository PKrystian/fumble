import { useId, useMemo, useState } from 'react';
import { BookOpen, RotateCcw, Scroll, SlidersHorizontal } from 'lucide-react';
import type { BookIndexEntry } from '@/data/compendium/types';
import { imageUrl } from '@/data/compendium/images';
import { normalizeSearchText } from '@/data/compendium/searchText';
import { localizedBookName } from '@/data/compendium/sources';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import type { Locale } from '@/i18n/locales';
import { useContentModeStore } from '@/features/ui/contentModeStore';
import { OriginalName } from '@/features/ui/OriginalName';
import { useSeo } from '@/seo/useSeo';
import { adventures, books, localizedBookStoryline } from './data';
import { BOOK_SORTS, sortCatalog, sortDocs, type BookSort, typeLabel } from './filters';
import { useUrlSearchState } from '@/features/ui/useUrlSearchState';
import { Button, SearchField, Select, ToggleChip } from '@/features/ui/primitives';
import { BooksDialog } from './BooksDialog';
import { ReadingStatus } from './ReadingStatus';
import { useBookReading } from './readingStore';
import { bookAnchorHash } from './readerAnchor';

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

const EDITION_CUTOFF = '2024-09-17';
const EDITIONS = ['2024', '2014'] as const;
type Edition = (typeof EDITIONS)[number];

const TYPE_ORDER = [
  'core',
  'supplement',
  'supplement-alt',
  'setting',
  'setting-alt',
  'screen',
  'recipe',
  'homecraft',
  'organized-play',
  'other',
];

const allDocs: BookIndexEntry[] = [...books, ...adventures];
const sortLabels: Record<BookSort, string> = {
  grouped: 'books.sortGrouped',
  title: 'books.sortTitle',
  newest: 'books.sortNewest',
  oldest: 'books.sortOldest',
};

function editionOf(doc: BookIndexEntry): Edition {
  return (doc.published ?? '') >= EDITION_CUTOFF ? '2024' : '2014';
}

function typeRank(group: string): number {
  const index = TYPE_ORDER.indexOf(group);
  return index < 0 ? TYPE_ORDER.length : index;
}

export function FilterRow({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length < 2) return null;
  return (
    <fieldset className="min-w-0">
      <legend className="field-label mb-2">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <ToggleChip
            key={option.value}
            onClick={() => onToggle(option.value)}
            active={selected.includes(option.value)}
          >
            {option.label}
          </ToggleChip>
        ))}
      </div>
    </fieldset>
  );
}

function BookTile({
  doc,
  locale,
  t,
  catalogSearch,
}: {
  doc: BookIndexEntry;
  locale: Locale;
  t: TranslateFn;
  catalogSearch: string;
}) {
  const [coverFailed, setCoverFailed] = useState(false);
  const storyline = localizedBookStoryline(doc.storyline, locale);
  const name = localizedBookName(doc, locale);
  const count = doc.contents.length;
  const plural = new Intl.PluralRules(locale).select(count);
  const chapterCount = t(
    plural === 'one'
      ? 'books.chapterOne'
      : plural === 'few'
        ? 'books.chapterFew'
        : 'books.chapterOther',
    { count },
  );
  const metadata = [doc.published?.slice(0, 4), doc.source].filter(Boolean).join(' · ');

  return (
    <li className="min-w-0">
      <Link
        to={`/books/${doc.id}`}
        state={{ catalogSearch }}
        className="catalog-card group flex h-full flex-col gap-2 [overflow-wrap:anywhere]"
      >
        {doc.cover && !coverFailed ? (
          <img
            src={imageUrl(doc.cover)}
            alt=""
            loading="lazy"
            className="aspect-[2/3] w-full rounded object-cover"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex aspect-[2/3] w-full items-center justify-center rounded bg-ink-800 text-ink-400"
          >
            {doc.type === 'adventure' ? <Scroll size={28} /> : <BookOpen size={28} />}
          </span>
        )}
        <span className="font-medium text-ink-50 group-hover:text-arcane-300">
          {name}
        </span>
        {name !== doc.name && <OriginalName name={doc.name} className="text-xs" />}
        {storyline && <span className="text-xs text-ink-400">{storyline}</span>}
        {metadata && <span className="text-xs text-ink-400">{metadata}</span>}
        <span className="text-xs text-ink-400">{chapterCount}</span>
      </Link>
    </li>
  );
}

export function BooksPage() {
  const { t, locale } = useT();
  useSeo(t('seo.pageTitles.books'), t('seo.pageDescriptions.books'), false);

  const contentMode = useContentModeStore((s) => s.mode);
  const positions = useBookReading((s) => s.data.positions);
  const { params, update } = useUrlSearchState();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sortId = useId();
  const editionId = useId();
  const query = params.get('q') ?? '';
  const editionParam = params.get('edition');
  const edition =
    editionParam === 'all' || editionParam === '2014' || editionParam === '2024'
      ? editionParam
      : null;
  const mode = edition ?? contentMode;
  const sort = BOOK_SORTS.find((value) => value === params.get('sort')) ?? 'grouped';

  const typeOptions = useMemo(
    () =>
      [...new Set(allDocs.map((d) => d.group))]
        .sort((a, b) => typeRank(a) - typeRank(b))
        .map((g) => ({ value: g, label: typeLabel(g, t) })),
    [t],
  );
  const formatOptions = [
    { value: 'book', label: t('books.rulebooks') },
    { value: 'adventure', label: t('books.adventures') },
  ];
  const types = typeOptions
    .filter(({ value }) => params.getAll('type').includes(value))
    .map(({ value }) => value);
  const formats = formatOptions
    .filter(({ value }) => params.getAll('format').includes(value))
    .map(({ value }) => value);
  const toggle = (key: 'type' | 'format', selected: string[]) => (value: string) =>
    update({
      [key]: selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    });
  const filterCount = types.length + formats.length + Number(edition !== null);
  const activeLabels = [
    ...formatOptions.filter(({ value }) => formats.includes(value)),
    ...typeOptions.filter(({ value }) => types.includes(value)),
  ];
  const term = normalizeSearchText(query.trim());
  const filtered = allDocs.filter(
    (doc) =>
      (!term ||
        [doc.name, localizedBookName(doc, locale), doc.source].some(
          (value) => value && normalizeSearchText(value).includes(term),
        )) &&
      (mode === 'all' || editionOf(doc) === mode) &&
      (!types.length || types.includes(doc.group)) &&
      (!formats.length || formats.includes(doc.type)),
  );
  const reset = () => update({ type: null, format: null, edition: null });
  const editionLabel = (value: string) =>
    t(value === 'all' ? 'books.editionAll' : `books.edition${value}`);
  const catalogSearch = params.size ? `?${params}` : '';
  const renderTiles = (docs: BookIndexEntry[]) => (
    <ul className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {docs.map((doc) => (
        <BookTile
          key={doc.id}
          doc={doc}
          locale={locale}
          t={t}
          catalogSearch={catalogSearch}
        />
      ))}
    </ul>
  );
  const latest = Object.entries(positions)
    .filter(([id, position]) =>
      allDocs.some((doc) => doc.id === id && position.chapter < doc.contents.length),
    )
    .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)[0];
  const resumeBook = latest && allDocs.find((doc) => doc.id === latest[0]);

  return (
    <div className="page-shell">
      <header className="mb-6">
        <h1 className="page-title">{t('books.title')}</h1>
        <p className="page-description">{t('books.subtitle')}</p>
      </header>

      <ReadingStatus allowClear />
      {latest && resumeBook && (
        <p className="mb-4">
          <Link
            className="back-link"
            to={`/books/${resumeBook.id}/${latest[1].chapter}${bookAnchorHash(undefined, undefined, latest[1].section)}`}
            state={{ catalogSearch }}
          >
            <BookOpen size={16} aria-hidden="true" /> {t('books.resume')} -{' '}
            {localizedBookName(resumeBook, locale)}
          </Link>
        </p>
      )}

      <div className="catalog-toolbar">
        <SearchField
          value={query}
          onChange={(event) => update({ q: event.target.value }, true)}
          onClear={() => update({ q: null }, true)}
          placeholder={t('books.searchPlaceholder')}
          label={t('books.searchLabel')}
          clearLabel={t('common.clearSearch')}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={editionId} className="field-label">
              {t('books.filterEdition')}
            </label>
            <Select
              id={editionId}
              value={edition ?? ''}
              onChange={(event) => update({ edition: event.target.value || null })}
            >
              <option value="">
                {t('books.editionDefault', { edition: editionLabel(contentMode) })}
              </option>
              {['all', ...EDITIONS].map((value) => (
                <option key={value} value={value}>
                  {editionLabel(value)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor={sortId} className="field-label">
              {t('books.sort')}
            </label>
            <Select
              id={sortId}
              value={sort}
              onChange={(event) =>
                update({
                  sort: event.target.value === 'grouped' ? null : event.target.value,
                })
              }
            >
              {BOOK_SORTS.map((value) => (
                <option key={value} value={value}>
                  {t(sortLabels[value])}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => setFiltersOpen(true)}
            aria-expanded={filtersOpen}
            aria-haspopup="dialog"
          >
            <SlidersHorizontal size={16} aria-hidden="true" />{' '}
            {t('books.filters', { count: filterCount })}
          </Button>
          <p role={filtersOpen ? undefined : 'status'} className="text-sm text-ink-300">
            {t('books.results', { count: filtered.length })}
          </p>
          {filterCount > 0 && (
            <Button onClick={reset} variant="ghost">
              <RotateCcw size={15} aria-hidden="true" /> {t('books.resetFilters')}
            </Button>
          )}
        </div>
        {activeLabels.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {activeLabels.map(({ value, label }) => (
              <li key={value} className="badge">
                {label}
              </li>
            ))}
          </ul>
        )}
      </div>

      <BooksDialog
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={t('books.filters', { count: filterCount })}
      >
        <div className="space-y-5">
          <FilterRow
            label={t('books.filterFormat')}
            options={formatOptions}
            selected={formats}
            onToggle={toggle('format', formats)}
          />
          <FilterRow
            label={t('books.filterType')}
            options={typeOptions}
            selected={types}
            onToggle={toggle('type', types)}
          />
          <p className="text-sm text-ink-300">{t('books.editionHelp')}</p>
          <p role="status" className="text-sm text-ink-300">
            {t('books.results', { count: filtered.length })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => setFiltersOpen(false)}>
              {t('books.showResults')}
            </Button>
            {filterCount > 0 && (
              <Button onClick={reset} variant="ghost">
                {t('books.resetFilters')}
              </Button>
            )}
          </div>
        </div>
      </BooksDialog>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>
            {term
              ? t('books.noMatches', { query: query.trim() })
              : t('books.noMatchesFiltered')}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {filterCount > 0 && (
              <Button onClick={reset}>{t('books.resetFilters')}</Button>
            )}
            {mode !== 'all' && (
              <Button onClick={() => update({ edition: 'all' })}>
                {t('books.showBothEditions')}
              </Button>
            )}
            {term && (
              <Button onClick={() => update({ q: null }, true)}>
                {t('common.clearSearch')}
              </Button>
            )}
          </div>
        </div>
      ) : sort !== 'grouped' ? (
        renderTiles(sortCatalog(filtered, sort, locale))
      ) : (
        EDITIONS.map((value) => {
          const docs = filtered.filter((doc) => editionOf(doc) === value);
          if (!docs.length) return null;
          const groups = [...new Set(docs.map((doc) => doc.group))].sort(
            (a, b) => typeRank(a) - typeRank(b),
          );
          return (
            <section key={value} className="mb-10">
              <h2 className="section-title mb-4 border-b border-ink-800 pb-2">
                {editionLabel(value)}
              </h2>
              <div className="space-y-8">
                {groups.map((group) => {
                  const items = sortDocs(docs.filter((doc) => doc.group === group));
                  return (
                    <div key={group}>
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">
                        {typeLabel(group, t)} ({items.length})
                      </h3>
                      {renderTiles(items)}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
