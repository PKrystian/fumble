import { useMemo } from 'react';
import { BookOpen, RotateCcw, Scroll } from 'lucide-react';
import type { BookIndexEntry } from '@/data/compendium/types';
import { imageUrl } from '@/data/compendium/images';
import { localizedBookName } from '@/data/compendium/sources';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import type { Locale } from '@/i18n/locales';
import { useContentModeStore } from '@/features/ui/contentModeStore';
import { useSeo } from '@/seo/useSeo';
import { adventures, books, localizedBookStoryline } from './data';
import { sortDocs, typeLabel } from './filters';
import { useUrlSearchState } from '@/features/ui/useUrlSearchState';
import { Button, SearchField, ToggleChip } from '@/features/ui/primitives';
import { panelClass } from '@/features/ui/styles';

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
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-400">
        {label}
      </span>
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
  );
}

function BookTile({
  doc,
  locale,
  t,
}: {
  doc: BookIndexEntry;
  locale: Locale;
  t: TranslateFn;
}) {
  const storyline = localizedBookStoryline(doc.storyline, locale);

  return (
    <li>
      <Link
        to={`/books/${doc.id}`}
        className="group flex h-full flex-col gap-2 rounded-lg border border-ink-700 bg-ink-900 p-3 transition-all hover:-translate-y-0.5 hover:border-arcane-500 hover:bg-ink-800"
      >
        {doc.cover ? (
          <img
            src={imageUrl(doc.cover)}
            alt=""
            loading="lazy"
            className="aspect-[2/3] w-full rounded object-cover"
          />
        ) : (
          <span className="flex aspect-[2/3] w-full items-center justify-center rounded bg-ink-800 text-ink-600">
            {doc.type === 'adventure' ? <Scroll size={28} /> : <BookOpen size={28} />}
          </span>
        )}
        <span className="font-medium text-ink-50 group-hover:text-arcane-300">
          {localizedBookName(doc, locale)}
        </span>
        <span className="text-xs text-ink-400">
          {storyline ? `${storyline} · ` : ''}
          {t(doc.contents.length === 1 ? 'books.chapterOne' : 'books.chapterOther', {
            count: doc.contents.length,
          })}
        </span>
      </Link>
    </li>
  );
}

export function BooksPage() {
  const { t, locale } = useT();
  useSeo(t('books.title'), t('books.subtitle'));

  const contentMode = useContentModeStore((s) => s.mode);
  const { params, update } = useUrlSearchState();
  const query = params.get('q') ?? '';
  const types = params.getAll('type');
  const formats = params.getAll('format');

  const toggle = (key: 'type' | 'format', selected: string[]) => (value: string) =>
    update({
      [key]: selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    });

  const typeOptions = useMemo(
    () =>
      [...new Set(allDocs.map((d) => d.group))]
        .sort((a, b) => typeRank(a) - typeRank(b))
        .map((g) => ({ value: g, label: typeLabel(g, t) })),
    [t],
  );

  const formatOptions = useMemo(
    () => [
      { value: 'book', label: t('books.rulebooks') },
      { value: 'adventure', label: t('books.adventures') },
    ],
    [t],
  );

  const term = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      allDocs.filter((doc) => {
        if (
          term &&
          !doc.name.toLowerCase().includes(term) &&
          !localizedBookName(doc, locale).toLowerCase().includes(term)
        )
          return false;
        if (contentMode !== 'all' && editionOf(doc) !== contentMode) return false;
        if (types.length && !types.includes(doc.group)) return false;
        if (formats.length && !formats.includes(doc.type)) return false;
        return true;
      }),
    [term, locale, contentMode, types, formats],
  );

  const grouped = useMemo(
    () =>
      EDITIONS.map((edition) => {
        const inEdition = filtered.filter((d) => editionOf(d) === edition);
        const sections = [...new Set(inEdition.map((d) => d.group))]
          .sort((a, b) => typeRank(a) - typeRank(b))
          .map((group) => ({
            group,
            docs: sortDocs(inEdition.filter((d) => d.group === group)),
          }));
        return { edition, sections };
      }).filter((e) => e.sections.length > 0),
    [filtered],
  );

  const hasFilters = types.length > 0 || formats.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink-50">
          {t('books.title')}
        </h1>
        <p className="mt-1 text-sm text-ink-300">{t('books.subtitle')}</p>
      </header>

      <SearchField
        value={query}
        onChange={(e) => update({ q: e.target.value }, true)}
        onClear={() => update({ q: null }, true)}
        placeholder={t('books.searchPlaceholder')}
        label={t('books.searchLabel')}
        clearLabel={t('common.clearSearch')}
        className="mb-4 max-w-md"
      />

      <div className={panelClass('mb-8 flex flex-col gap-2 p-3')}>
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
        {hasFilters && (
          <Button
            onClick={() => {
              update({ type: null, format: null });
            }}
            variant="ghost"
            size="sm"
            className="mt-1 self-start"
          >
            <RotateCcw size={13} aria-hidden="true" /> {t('books.resetFilters')}
          </Button>
        )}
      </div>

      {grouped.length === 0 ? (
        <p className="text-sm text-ink-400">
          {term ? t('books.noMatches', { query }) : t('books.noMatchesFiltered')}
        </p>
      ) : (
        grouped.map(({ edition, sections }) => (
          <section key={edition} className="mb-10">
            <h2 className="mb-4 border-b border-ink-800 pb-2 font-display text-2xl font-bold text-ink-50">
              {t(`books.edition${edition}`)}
            </h2>
            <div className="flex flex-col gap-8">
              {sections.map(({ group, docs }) => (
                <div key={group}>
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                    {typeLabel(group, t)} ({docs.length})
                  </h3>
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {docs.map((doc) => (
                      <BookTile
                        key={`${doc.type}-${doc.id}`}
                        doc={doc}
                        locale={locale}
                        t={t}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
