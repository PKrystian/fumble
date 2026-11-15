import { useMemo, useRef, useState } from 'react';
import { Pencil, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { normalizeSearchText } from '@/data/compendium/searchText';
import { sourceName } from '@/data/compendium/sources';
import { categories } from '@/features/compendium/categories';
import { classFilterLabel } from '@/features/compendium/classNames';
import { confirmDialog } from '@/features/ui/confirmStore';
import { OriginalName } from '@/features/ui/OriginalName';
import { Button, IconButton, SearchField, Select } from '@/features/ui/primitives';
import { panelClass } from '@/features/ui/styles';
import { useUrlSearchState } from '@/features/ui/useUrlSearchState';
import { Link } from '@/i18n/path';
import type { Locale } from '@/i18n/locales';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { FUMBLE_LIBRARY_PAGE_SIZE, libraryPage } from './fumbleLibraryView';
import { HomebrewData } from './HomebrewData';
import { HomebrewEditor, type EditorTarget } from './HomebrewEditor';
import { isLocalHomebrewImage } from './artworkPolicy';
import {
  HOMEBREW_SOURCE,
  homebrewEntryName,
  homebrewSubclassParent,
  isHomebrewCategory,
  useHomebrewStore,
  withHomebrewWrite,
  type HomebrewEntry,
} from './store';

function translatedName(entry: HomebrewEntry, locale: Locale) {
  return entry.kind === 'subclass'
    ? entry.subclass.name
    : entry.translations?.[locale]?.name?.trim() || entry.name;
}

function matchingTranslations(entry: HomebrewEntry) {
  if (entry.kind === 'subclass') return [];
  return Object.entries(entry.translations ?? {})
    .filter(([locale, translation]) =>
      entry.kind === 'manual'
        ? Boolean(
            translation.name.trim() ||
            (typeof translation.subtitle === 'string' && translation.subtitle.trim()) ||
            (typeof translation.body === 'string' && translation.body.trim()),
          )
        : locale !== entry.baseLocale,
    )
    .map(([locale]) => locale.toUpperCase());
}

function listing(entry: HomebrewEntry, entries: HomebrewEntry[], locale: Locale) {
  const name = translatedName(entry, locale);
  const original = homebrewEntryName(entry);
  if (entry.kind === 'subclass') {
    const custom = entries.find(
      (candidate) =>
        candidate.kind === 'imported' &&
        candidate.category === 'classes' &&
        (candidate.id === entry.parentClassId ||
          (!entry.parentClassId &&
            [
              candidate.name,
              candidate.translations?.en?.name,
              candidate.translations?.pl?.name,
            ].some((value) => value?.toLowerCase() === entry.className.toLowerCase()))),
    );
    const parent = custom
      ? translatedName(custom, locale)
      : classFilterLabel(entry.className, locale);
    const parentId = homebrewSubclassParent(entry) ?? custom?.id;
    const source =
      entry.subclass.source === HOMEBREW_SOURCE ? '' : entry.subclass.source.trim();
    return {
      entry,
      name,
      original,
      parent,
      source,
      translations: [],
      subtitle: '',
      target: parentId
        ? `/compendium/classes/${encodeURIComponent(parentId)}/${encodeURIComponent(entry.id)}`
        : null,
      search: normalizeSearchText(
        [
          name,
          original,
          entry.className,
          parent,
          classFilterLabel(entry.className, 'en'),
          classFilterLabel(entry.className, 'pl'),
          source,
        ].join(' '),
      ),
    };
  }
  const subtitles =
    entry.kind === 'manual'
      ? [
          entry.translations?.[locale]?.subtitle,
          entry.subtitle,
          entry.translations?.en?.subtitle,
          entry.translations?.pl?.subtitle,
        ]
      : [entry.translations?.[locale]?.subtitle, entry.data.subtitle];
  const subtitle =
    subtitles
      .slice(0, 2)
      .find(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      )
      ?.trim() ?? '';
  const source =
    entry.kind === 'imported' && typeof entry.data.source === 'string'
      ? entry.data.source.trim()
      : '';
  return {
    entry,
    name,
    original,
    parent: '',
    subtitle,
    source,
    translations: matchingTranslations(entry),
    target: `/compendium/${entry.category}/${encodeURIComponent(entry.id)}`,
    search: normalizeSearchText(
      [
        original,
        name,
        entry.translations?.en?.name,
        entry.translations?.pl?.name,
        ...subtitles.filter((value) => typeof value === 'string'),
        source,
      ].join(' '),
    ),
  };
}

export function HomebrewPage() {
  const { t, locale } = useT();
  useSeo(t('seo.pageTitles.homebrew'), t('seo.pageDescriptions.homebrew'), false);
  const entries = useHomebrewStore((state) => state.entries);
  const status = useHomebrewStore((state) => state.status);
  const deleted = useHomebrewStore((state) => state.deleted);
  const blocked = status === 'conflict' || status === 'unreadable';
  const [editor, setEditor] = useState<EditorTarget>();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [notice, setNotice] = useState<{ message: string; error: boolean }>();
  const { params, update } = useUrlSearchState();
  const toolbar = useRef<HTMLDivElement>(null);
  const newButton = useRef<HTMLButtonElement>(null);
  const query = params.get('q') ?? '';
  const categoryParam = params.get('category');
  const category =
    categoryParam === 'subclass' || isHomebrewCategory(categoryParam)
      ? categoryParam
      : 'all';
  const translationParam = params.get('translation');
  const translation =
    translationParam === 'translated' || translationParam === 'untranslated'
      ? translationParam
      : 'all';
  const sort = params.get('sort') === 'date' ? 'date' : 'name';
  const activeFilters = Number(category !== 'all') + Number(translation !== 'all');
  const catalog = useMemo(
    () => entries.map((entry) => listing(entry, entries, locale)),
    [entries, locale],
  );
  const results = useMemo(() => {
    const term = normalizeSearchText(query.trim());
    return catalog
      .filter(
        ({ entry, search, translations }) =>
          (!term || search.includes(term)) &&
          (category === 'all' ||
            (entry.kind === 'subclass'
              ? category === 'subclass'
              : entry.category === category)) &&
          (translation === 'all' ||
            (translation === 'translated'
              ? translations.length > 0
              : translations.length === 0)),
      )
      .sort(
        (a, b) =>
          (sort === 'date' ? b.entry.createdAt - a.entry.createdAt : 0) ||
          a.name.localeCompare(b.name, locale) ||
          a.entry.id.localeCompare(b.entry.id),
      );
  }, [catalog, category, locale, query, sort, translation]);
  const page = libraryPage(params.get('page'), results.length);
  const totalPages = Math.max(1, Math.ceil(results.length / FUMBLE_LIBRARY_PAGE_SIZE));
  const first = (page - 1) * FUMBLE_LIBRARY_PAGE_SIZE;
  const rows = results.slice(first, first + FUMBLE_LIBRARY_PAGE_SIZE);
  const categoryLabel = (value: typeof category) =>
    t(
      value === 'subclass'
        ? 'homebrew.subclass'
        : value === 'all'
          ? 'homebrew.allCategories'
          : `compendium.categories.${value}`,
    );
  const translationLabel = (value: typeof translation) =>
    t(value === 'all' ? 'homebrew.allTranslations' : `homebrew.${value}`);
  const notify = (message: string, error = false) => setNotice({ message, error });
  const goPage = (next: number) => {
    update({ page: next === 1 ? null : String(next) });
    toolbar.current?.focus();
    toolbar.current?.scrollIntoView({ block: 'start' });
  };

  const remove = async (entry: HomebrewEntry, index: number) => {
    const name = homebrewEntryName(entry);
    const accepted = await confirmDialog(t('homebrew.deleteConfirm', { label: name }), {
      tone: 'danger',
      confirmLabel: t('common.delete'),
      initialFocus: 'cancel',
    });
    if (!accepted) return;
    if (
      await withHomebrewWrite(() => useHomebrewStore.getState().deleteEntry(entry.id))
    ) {
      notify(t('homebrew.deletedEntry', { name }));
      const neighbor = rows[index + 1]?.entry ?? rows[index - 1]?.entry;
      requestAnimationFrame(() => {
        const focus = neighbor && document.getElementById(`homebrew-edit-${neighbor.id}`);
        (focus || newButton.current || toolbar.current)?.focus();
      });
    }
  };

  const undo = async () => {
    if (await withHomebrewWrite(() => useHomebrewStore.getState().undoDelete())) {
      notify(t('homebrew.deleteUndone'));
      requestAnimationFrame(() =>
        (
          document.getElementById(`homebrew-edit-${deleted?.entry.id}`) ?? toolbar.current
        )?.focus(),
      );
    }
  };

  return (
    <div className="page-shell page-shell-wide space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="page-title">{t('nav.homebrew')}</h1>
            <p className="page-description">{t('homebrew.personalDescription')}</p>
          </div>
          <Button
            ref={newButton}
            variant="primary"
            disabled={blocked}
            onClick={() => setEditor({ kind: 'new' })}
          >
            <Plus size={16} aria-hidden="true" /> {t('homebrew.newEntry')}
          </Button>
        </div>
        <HomebrewData notify={notify} />
      </header>

      {(notice || deleted) && (
        <div
          className="notice flex flex-wrap items-center justify-between gap-2"
          data-tone={notice?.error ? 'error' : 'success'}
        >
          {notice && (
            <p
              role={notice.error ? 'alert' : 'status'}
              className="[overflow-wrap:anywhere]"
            >
              {notice.message}
            </p>
          )}
          {deleted && (
            <Button size="sm" disabled={blocked} onClick={() => void undo()}>
              {t('homebrew.undoDelete')}
            </Button>
          )}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="section-title">{t('homebrew.yourEntries')}</h2>
        <div
          ref={toolbar}
          tabIndex={-1}
          className="catalog-toolbar scroll-mt-4"
          role="region"
          aria-label={t('homebrew.yourEntries')}
        >
          <SearchField
            label={t('homebrew.searchEntries')}
            value={query}
            placeholder={t('homebrew.searchEntries')}
            clearLabel={t('common.clearSearch')}
            onChange={(event) =>
              update({ q: event.target.value || null, page: null }, true)
            }
            onClear={() => update({ q: null, page: null }, true)}
          />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p role="status" aria-atomic="true" className="text-sm text-ink-400">
              {t('homebrew.showingEntries', {
                visible: results.length,
                total: entries.length,
              })}
              {rows.length > 0 && (
                <span className="ml-2">
                  {t('homebrew.fumbleRange', {
                    start: first + 1,
                    end: first + rows.length,
                  })}
                </span>
              )}
            </p>
            <label className="field-label">
              {t('homebrew.fumbleSort')}
              <Select
                value={sort}
                onChange={(event) =>
                  update(
                    { sort: event.target.value === 'date' ? 'date' : null, page: null },
                    true,
                  )
                }
              >
                <option value="name">{t('homebrew.fumbleSortName')}</option>
                <option value="date">{t('homebrew.sortDate')}</option>
              </Select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="sm:hidden"
              size="sm"
              aria-expanded={filtersOpen}
              aria-controls="personal-homebrew-filters"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              {t('homebrew.fumbleFilters', { count: activeFilters })}
            </Button>
            {category !== 'all' && (
              <span className="badge">{categoryLabel(category)}</span>
            )}
            {translation !== 'all' && (
              <span className="badge">{translationLabel(translation)}</span>
            )}
            {activeFilters > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  update({ category: null, translation: null, page: null }, true)
                }
              >
                {t('compendium.filters.resetFilters')}
              </Button>
            )}
          </div>
          <div
            id="personal-homebrew-filters"
            className={`${filtersOpen ? 'grid' : 'hidden'} gap-2 sm:grid sm:grid-cols-2`}
          >
            <label className="field-label">
              {t('homebrew.filterCategory')}
              <Select
                value={category}
                onChange={(event) =>
                  update(
                    {
                      category: event.target.value === 'all' ? null : event.target.value,
                      page: null,
                    },
                    true,
                  )
                }
              >
                <option value="all">{categoryLabel('all')}</option>
                <option value="subclass">{categoryLabel('subclass')}</option>
                {categories.map(({ id }) => (
                  <option key={id} value={id}>
                    {categoryLabel(id)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="field-label">
              {t('homebrew.filterTranslation')}
              <Select
                value={translation}
                onChange={(event) =>
                  update(
                    {
                      translation:
                        event.target.value === 'all' ? null : event.target.value,
                      page: null,
                    },
                    true,
                  )
                }
              >
                {(['all', 'translated', 'untranslated'] as const).map((value) => (
                  <option key={value} value={value}>
                    {translationLabel(value)}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        </div>
        {rows.length === 0 ? (
          <div className="empty-state">
            {t(
              entries.length === 0
                ? 'homebrew.emptyLibrary'
                : 'homebrew.noMatchingEntries',
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map(
              (
                { entry, name, original, target, parent, subtitle, source, translations },
                index,
              ) => (
                <li
                  key={entry.id}
                  className={panelClass(
                    'flex flex-wrap items-start gap-3 p-3 sm:flex-nowrap',
                  )}
                >
                  {entry.kind === 'manual' &&
                    entry.image &&
                    isLocalHomebrewImage(entry.image) && (
                      <img
                        src={entry.image}
                        alt=""
                        width={32}
                        height={42}
                        loading="lazy"
                        className="h-10 w-8 shrink-0 rounded-sm object-cover"
                        onError={(event) => {
                          event.currentTarget.hidden = true;
                        }}
                      />
                    )}
                  <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      {target ? (
                        <Link
                          to={{
                            pathname: target,
                            search: new URLSearchParams({
                              homebrewLibrary: params.toString(),
                            }).toString(),
                          }}
                          className="font-semibold text-ink-50 hover:text-arcane-300"
                        >
                          {name}
                        </Link>
                      ) : (
                        <span className="font-semibold text-ink-50">{name}</span>
                      )}
                      {name !== original && (
                        <OriginalName name={original} className="text-xs" />
                      )}
                    </div>
                    <p className="text-sm text-ink-300">
                      {parent
                        ? t('homebrew.subclassOf', { className: parent })
                        : categoryLabel(
                            entry.kind === 'subclass' ? 'subclass' : entry.category,
                          )}
                      {subtitle && ` - ${subtitle}`}
                      {source && ` - ${sourceName(source, locale)}`}
                    </p>
                    {(entry.kind === 'imported' || translations.length > 0) && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {entry.kind === 'imported' && (
                          <span className="badge">
                            {t('homebrew.fromEtoolsBadge')} ·{' '}
                            {entry.baseLocale.toUpperCase()}
                          </span>
                        )}
                        {translations.length > 0 && (
                          <span className="badge">
                            {t('homebrew.translationsBadge', {
                              languages: translations.join(', '),
                            })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <IconButton
                      id={`homebrew-edit-${entry.id}`}
                      label={t('homebrew.editLabel', { name })}
                      variant="ghost"
                      size="sm"
                      disabled={blocked}
                      onClick={() => setEditor(entry)}
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label={t('character.list.deleteLabel', { name })}
                      variant="danger"
                      size="sm"
                      disabled={blocked}
                      onClick={() => void remove(entry, index)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </IconButton>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
        {totalPages > 1 && (
          <nav
            aria-label={t('homebrew.fumblePagination')}
            className="flex flex-wrap items-center justify-center gap-2"
          >
            <Button disabled={page === 1} onClick={() => goPage(page - 1)}>
              {t('homebrew.fumblePrevious')}
            </Button>
            <span className="text-sm text-ink-300">
              {t('homebrew.fumblePage', { page, total: totalPages })}
            </span>
            <Button disabled={page === totalPages} onClick={() => goPage(page + 1)}>
              {t('homebrew.fumbleNext')}
            </Button>
          </nav>
        )}
      </section>
      {editor && (
        <HomebrewEditor
          target={editor}
          onClose={() => setEditor(undefined)}
          onSaved={(_, created, subclass) => {
            if (useHomebrewStore.getState().status === 'saved')
              notify(
                t(
                  created
                    ? subclass
                      ? 'homebrew.subclassCreated'
                      : 'homebrew.entryCreated'
                    : 'homebrew.entryUpdated',
                ),
              );
            else setNotice(undefined);
            setEditor(undefined);
            if (editor.kind !== 'new') {
              requestAnimationFrame(() => {
                (
                  document.getElementById(`homebrew-edit-${editor.id}`) ?? toolbar.current
                )?.focus();
              });
            }
          }}
        />
      )}
    </div>
  );
}
