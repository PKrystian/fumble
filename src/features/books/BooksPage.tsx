import { type Dispatch, type SetStateAction, useMemo, useState } from 'react';
import { BookOpen, RotateCcw, Scroll, Search } from 'lucide-react';
import type { BookIndexEntry } from '@/data/compendium/types';
import { imageUrl } from '@/data/compendium/images';
import { localizedBookName } from '@/data/compendium/sources';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import type { Locale } from '@/i18n/locales';
import { useContentModeStore } from '@/features/ui/contentModeStore';
import { useSeo } from '@/seo/useSeo';
import { adventures, books } from './data';

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

const CORE_SOURCE_RANK: Record<string, number> = {
  XPHB: 0,
  PHB: 0,
  XDMG: 1,
  DMG: 1,
  XMM: 2,
  MM: 2,
};

const allDocs: BookIndexEntry[] = [...books, ...adventures];

function editionOf(doc: BookIndexEntry): Edition {
  return (doc.published ?? '') >= EDITION_CUTOFF ? '2024' : '2014';
}

function typeRank(group: string): number {
  const index = TYPE_ORDER.indexOf(group);
  return index < 0 ? TYPE_ORDER.length : index;
}

function typeLabel(group: string, t: TranslateFn): string {
  const key = `books.types.${group}`;
  const value = t(key);
  return value === key ? group : value;
}

function sortDocs(docs: BookIndexEntry[]): BookIndexEntry[] {
  return [...docs].sort((a, b) => {
    const ra = CORE_SOURCE_RANK[a.source] ?? 99;
    const rb = CORE_SOURCE_RANK[b.source] ?? 99;
    if (ra !== rb) return ra - rb;
    const dateDiff = (b.published ?? '').localeCompare(a.published ?? '');
    return dateDiff !== 0 ? dateDiff : a.name.localeCompare(b.name);
  });
}

function chipClass(active: boolean): string {
  return [
    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
    active ? 'bg-arcane-600 text-ink-50' : 'bg-ink-800 text-ink-200 hover:bg-ink-700',
  ].join(' ');
}

function FilterRow({
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
        <button
          key={option.value}
          type="button"
          onClick={() => onToggle(option.value)}
          aria-pressed={selected.includes(option.value)}
          className={chipClass(selected.includes(option.value))}
        >
          {option.label}
        </button>
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
          {doc.storyline ? `${doc.storyline} · ` : ''}
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
  const [query, setQuery] = useState('');
  const [types, setTypes] = useState<string[]>([]);
  const [formats, setFormats] = useState<string[]>([]);

  const toggle = (setter: Dispatch<SetStateAction<string[]>>) => (value: string) =>
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );

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

      <div className="mb-4 flex max-w-md items-center gap-2 rounded-lg bg-ink-800 px-3 py-2">
        <Search size={16} className="text-ink-400" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('books.searchPlaceholder')}
          aria-label={t('books.searchLabel')}
          className="w-full bg-transparent text-sm text-ink-50 placeholder:text-ink-400 focus:outline-none"
        />
      </div>

      <div className="mb-8 flex flex-col gap-2 rounded-lg border border-ink-800 bg-ink-900/50 p-3">
        <FilterRow
          label={t('books.filterFormat')}
          options={formatOptions}
          selected={formats}
          onToggle={toggle(setFormats)}
        />
        <FilterRow
          label={t('books.filterType')}
          options={typeOptions}
          selected={types}
          onToggle={toggle(setTypes)}
        />
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setTypes([]);
              setFormats([]);
            }}
            className="mt-1 inline-flex items-center gap-1 self-start text-xs text-ink-400 hover:text-ink-50"
          >
            <RotateCcw size={13} aria-hidden="true" /> {t('books.resetFilters')}
          </button>
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
