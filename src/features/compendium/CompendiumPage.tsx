import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  type CategoryFilter,
  type CompendiumCategory,
  categories,
  getCategory,
} from './categories';
import { useCategoryItems } from './useCategoryItems';
import { applyContentMode } from './contentFilter';
import { EntryRenderer } from './EntryRenderer';
import { FilterBar } from './FilterBar';
import {
  type SortDir,
  compareItems,
  matchesFilters,
  normalizeFilterValue,
} from './filterSort';
import {
  imageUrl,
  optimizedImageSrcSet,
  optimizedImageUrl,
  PRIMARY_IMAGE_HEIGHT,
  PRIMARY_IMAGE_WIDTH,
} from '@/data/compendium/images';
import { isUaSource, sourceName } from '@/data/compendium/sources';
import { isHomebrew } from '@/features/homebrew/store';
import { HomebrewDetail } from '@/features/homebrew/HomebrewDetail';
import { FumbleBadge } from '@/features/homebrew/FumbleBadge';
import { FumbleDetail } from '@/features/homebrew/FumbleDetail';
import {
  fumbleParentClassId,
  isFumbleHomebrew,
} from '@/features/homebrew/fumbleHomebrew';
import { useFumbleHomebrewStore } from '@/features/homebrew/fumbleHomebrewStore';
import { getBook } from '@/features/books/data';
import { bookAnchorHash } from '@/features/books/readerAnchor';
import { NotFoundPage } from '@/features/NotFoundPage';
import { useLightbox } from '@/features/ui/lightboxStore';
import { useContentModeStore } from '@/features/ui/contentModeStore';
import { OriginalName } from '@/features/ui/OriginalName';
import { Link, Navigate } from '@/i18n/path';
import { useNavigate } from '@/i18n/pathUtils';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { useUrlSearchState } from '@/features/ui/useUrlSearchState';
import { SearchField } from '@/features/ui/primitives';
import { toggleChipClass } from '@/features/ui/styles';
import { normalizeSearchText } from '@/data/compendium/searchText';
import {
  isCompendiumEntryIndexable,
  isCompendiumSubclassIndexable,
} from '@/data/compendium/indexability';
import { getCompendiumCategorySeo, getCompendiumEntrySeo } from '@/data/compendium/seo';
import type { ClassEntry } from '@/data/compendium/types';
import { findSubclassByRouteKey, subclassRouteKey } from './subclassRoute';
import { revealApp } from '@/seo/prerendered';
import packageInfo from '../../../package.json';

function categoryLabel(category: CompendiumCategory, t: (key: string) => string): string {
  return t(`compendium.categories.${category.id}`);
}

const NO_FILTERS: CategoryFilter[] = [];
const LIST_PAGE_SIZE = 200;

const LEGACY_ENTRY_ALIASES: Record<string, string> = {
  'items/danoth-s-visor': 'items/danoth-s-visor-dormant',
  'bestiary/mwaxanar': 'bestiary/mwaxanare',
};

function CompendiumLandingPage() {
  const { t } = useT();
  useEffect(() => {
    revealApp();
  }, []);
  useSeo(t('seo.pageTitles.compendium'), t('seo.pageDescriptions.compendium'));

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold text-ink-50">
          {t('compendium.title')}
        </h1>
        <p className="mt-2 max-w-3xl text-ink-300">
          {t('seo.pageDescriptions.compendium')}
        </p>
      </header>
      <nav aria-label={t('compendium.categoriesNav')}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                to={`/compendium/${category.id}`}
                className="block h-full rounded-lg border border-ink-700 bg-ink-900 p-4 transition-colors hover:border-arcane-500 hover:bg-ink-800"
              >
                <h2 className="font-display text-lg font-bold text-ink-50">
                  {categoryLabel(category, t)}
                </h2>
                <p className="mt-2 text-sm text-ink-300">
                  {t(`compendium.seo.categoryDescriptions.${category.id}`)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function CompendiumPage() {
  const { category: categoryId, id, subclass: subclassId } = useParams();

  if (!categoryId) return <CompendiumLandingPage />;

  const category = getCategory(categoryId);
  if (!category) return <NotFoundPage />;

  const legacyTarget =
    id && !subclassId ? LEGACY_ENTRY_ALIASES[`${categoryId}/${id}`] : undefined;
  if (legacyTarget) {
    return <Navigate to={`/compendium/${legacyTarget}`} replace />;
  }

  return (
    <CompendiumBrowser
      key={categoryId}
      categoryId={categoryId}
      selectedId={id}
      selectedSubclassId={subclassId}
    />
  );
}

function CompendiumBrowser({
  categoryId,
  selectedId,
  selectedSubclassId,
}: {
  categoryId: string;
  selectedId: string | undefined;
  selectedSubclassId: string | undefined;
}) {
  const category = getCategory(categoryId)!;
  const filters = category.filters ?? NO_FILTERS;
  const { params, update } = useUrlSearchState();
  const urlQuery = params.get('q') ?? '';
  const [query, setQuery] = useState(urlQuery);
  const queryRef = useRef(urlQuery);
  const queryUpdateTimerRef = useRef<number | null>(null);
  const updateRef = useRef(update);
  const [retryKey, setRetryKey] = useState(0);
  updateRef.current = update;

  useEffect(() => {
    return () => {
      if (queryUpdateTimerRef.current !== null) {
        window.clearTimeout(queryUpdateTimerRef.current);
      }
    };
  }, []);

  const clearQueryUpdate = () => {
    if (queryUpdateTimerRef.current === null) return;
    window.clearTimeout(queryUpdateTimerRef.current);
    queryUpdateTimerRef.current = null;
  };

  const scheduleQueryUpdate = (value: string) => {
    clearQueryUpdate();
    queryUpdateTimerRef.current = window.setTimeout(() => {
      queryUpdateTimerRef.current = null;
      updateRef.current({ q: value || null }, true);
    }, 0);
  };

  const currentSearch = (keepSubclass = false) => {
    const search = new URLSearchParams(params);
    if (queryRef.current) {
      search.set('q', queryRef.current);
    } else {
      search.delete('q');
    }
    if (!keepSubclass) search.delete('subclass');
    return search;
  };
  const requestedSort = params.get('sort');
  const requestedSubclassIds = selectedSubclassId
    ? [selectedSubclassId]
    : params.getAll('subclass');
  const requestedSubclassId = requestedSubclassIds[0];
  const sortFields = new Set(['name', ...filters.map((filter) => filter.id)]);
  const sortField = sortFields.has(requestedSort ?? '') ? requestedSort! : 'name';
  const sortDir: SortDir = params.get('order') === 'desc' ? 'desc' : 'asc';
  const selectedFilters = Object.fromEntries(
    filters.map((filter) => [
      filter.id,
      [
        ...new Set(
          params
            .getAll(filter.id)
            .filter(Boolean)
            .map((value) => normalizeFilterValue(filter, value)),
        ),
      ],
    ]),
  );
  const { status, items } = useCategoryItems(
    category,
    true,
    selectedId,
    requestedSubclassIds,
    retryKey,
  );
  const selected = selectedId ? items.find((item) => item.id === selectedId) : undefined;

  useEffect(() => {
    if (status === 'error' || (status === 'ready' && !selected?.image)) {
      revealApp();
    }
  }, [selected?.image, status]);

  const openLightbox = useLightbox((s) => s.open);
  const navigate = useNavigate();
  const { t, locale } = useT();

  const toggleFilter = (filterId: string, value: string) => {
    const current = selectedFilters[filterId] ?? [];
    update({
      [filterId]: current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    });
  };

  const setFilter = (filterId: string, values: string[]) => {
    update({ [filterId]: values.length > 0 ? values : null });
  };

  const contentMode = useContentModeStore((s) => s.mode);
  const showFumbleHomebrew = useFumbleHomebrewStore((s) => s.showInCompendium);
  const visibleItems = useMemo(
    () =>
      applyContentMode(
        items,
        contentMode,
        showFumbleHomebrew || Boolean(selected && isFumbleHomebrew(selected)),
      ),
    [items, contentMode, selected, showFumbleHomebrew],
  );

  const filtered = useMemo(() => {
    const term = normalizeSearchText(query.trim());
    return visibleItems.filter((item) => {
      if (
        term &&
        !normalizeSearchText(item.name).includes(term) &&
        !(item.englishName && normalizeSearchText(item.englishName).includes(term))
      )
        return false;
      return matchesFilters(item, filters, selectedFilters);
    });
  }, [visibleItems, query, filters, selectedFilters]);

  const sorted = useMemo(() => {
    if (sortField === 'name' && sortDir === 'asc') return filtered;
    return [...filtered].sort((a, b) =>
      compareItems(a, b, sortField, sortDir, filters, t, locale),
    );
  }, [filtered, sortField, sortDir, filters, t, locale]);

  const listResetKey = [
    query,
    sortField,
    sortDir,
    contentMode,
    showFumbleHomebrew,
    ...filters.flatMap((filter) => [filter.id, ...(selectedFilters[filter.id] ?? [])]),
  ].join('|');
  const [visibleCount, setVisibleCount] = useState(LIST_PAGE_SIZE);
  useEffect(() => {
    setVisibleCount(LIST_PAGE_SIZE);
  }, [listResetKey]);
  const selectedIndex = selectedId
    ? sorted.findIndex((item) => item.id === selectedId)
    : -1;
  const listItems = sorted.slice(0, Math.max(visibleCount, selectedIndex + 1));
  const remainingCount = sorted.length - listItems.length;

  const categoryTitle = categoryLabel(category, t);
  const selectedSubclass =
    categoryId === 'classes' && selected && requestedSubclassId
      ? findSubclassByRouteKey(
          (selected as Partial<ClassEntry>).subclasses ?? [],
          requestedSubclassId,
        )
      : undefined;
  const hasVisibleSubclassParent =
    selected?.hidden && selectedSubclass
      ? items.some((candidate) => {
          if (candidate.hidden || candidate.id === selected.id) return false;
          const subclasses = (candidate as Partial<ClassEntry>).subclasses ?? [];
          return subclasses.some(
            (candidateSubclass) =>
              subclassRouteKey(candidateSubclass) === subclassRouteKey(selectedSubclass),
          );
        })
      : false;
  const seo = selected
    ? getCompendiumEntrySeo({
        categoryId,
        categoryLabel: categoryTitle,
        item: selected,
        locale,
        sourceLabel: sourceName(selected.source, locale),
        ...(selectedSubclass
          ? { displayName: `${selected.name}: ${selectedSubclass.name}` }
          : {}),
      })
    : getCompendiumCategorySeo(categoryId, categoryTitle, locale);

  const routeNotFound =
    status === 'ready' &&
    Boolean(selectedId) &&
    (!selected || Boolean(selectedSubclassId && !selectedSubclass));
  const indexable =
    status === 'ready' &&
    !routeNotFound &&
    (!selected ||
      (isCompendiumEntryIndexable(selected, items) &&
        isCompendiumSubclassIndexable(selected, Boolean(hasVisibleSubclassParent))));

  useSeo(
    routeNotFound ? t('notFound.title') : seo.title,
    routeNotFound ? t('notFound.message') : seo.description,
    indexable,
  );

  if (routeNotFound) return <NotFoundPage />;

  const legacyFumbleSubclass =
    selected && isFumbleHomebrew(selected) && selected.isSubclass ? selected : undefined;
  const legacyParentClassId = legacyFumbleSubclass
    ? fumbleParentClassId(legacyFumbleSubclass)
    : undefined;

  if (legacyFumbleSubclass && legacyParentClassId) {
    return (
      <Navigate
        to={{
          pathname: `/compendium/classes/${legacyParentClassId}/${legacyFumbleSubclass.id}`,
        }}
        replace
      />
    );
  }

  const primaryImageSrcSet =
    categoryId === 'bestiary' && selected?.image
      ? optimizedImageSrcSet(selected.image, import.meta.env.VITE_IMAGE_TRANSFORM_ORIGIN)
      : undefined;

  const pickRandom = () => {
    if (filtered.length === 0) return;
    clearQueryUpdate();
    const pick = filtered[Math.floor(Math.random() * filtered.length)]!;
    navigate({
      pathname: `/compendium/${categoryId}/${pick.id}`,
      search: currentSearch().toString(),
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-ink-700 px-4 py-3">
        {selected ? (
          <p className="font-display text-sm font-semibold uppercase tracking-wide text-ink-400">
            {t('compendium.title')}
          </p>
        ) : (
          <h1 className="font-display text-2xl font-bold text-ink-50">
            {t('compendium.title')}
          </h1>
        )}
        <p className="mt-1 text-xs text-ink-400">
          {t('compendium.revision', { version: packageInfo.version })}
        </p>
        <nav
          className="mt-3 flex flex-wrap gap-2"
          aria-label={t('compendium.categoriesNav')}
        >
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/compendium/${cat.id}`}
              className={toggleChipClass(cat.id === categoryId, 'text-sm')}
            >
              {categoryLabel(cat, t)}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex min-h-0 flex-1">
        <section
          className={[
            'flex min-h-0 w-full flex-col border-r border-ink-700 md:w-80 lg:w-96',
            selectedId ? 'hidden md:flex' : 'flex',
          ].join(' ')}
        >
          <div className="border-b border-ink-700 p-3">
            <SearchField
              value={query}
              onChange={(event) => {
                const value = event.target.value;
                queryRef.current = value;
                setQuery(value);
                scheduleQueryUpdate(value);
              }}
              onClear={() => {
                queryRef.current = '';
                setQuery('');
                scheduleQueryUpdate('');
              }}
              placeholder={t('compendium.searchPlaceholder', {
                category: categoryLabel(category, t).toLowerCase(),
              })}
              label={t('compendium.searchLabel', {
                category: categoryLabel(category, t),
              })}
              clearLabel={t('common.clearSearch')}
            />
          </div>

          {filters.length > 0 && status === 'ready' && (
            <FilterBar
              filters={filters}
              items={visibleItems}
              selected={selectedFilters}
              onToggle={toggleFilter}
              onSetFilter={setFilter}
              onClear={() =>
                update(Object.fromEntries(filters.map((filter) => [filter.id, null])))
              }
              onRandom={pickRandom}
              sortField={sortField}
              sortDir={sortDir}
              onSortField={(value) => update({ sort: value === 'name' ? null : value })}
              onToggleSortDir={() => update({ order: sortDir === 'asc' ? 'desc' : null })}
            />
          )}

          <ul className="min-h-0 flex-1 overflow-y-auto" data-category={categoryId}>
            {status === 'loading' && (
              <li className="p-4 text-sm text-ink-400">{t('common.loading')}</li>
            )}
            {status === 'error' && (
              <li className="flex items-center justify-between gap-3 p-4 text-sm text-red-400">
                <span>{t('compendium.failedToLoad')}</span>
                <button
                  type="button"
                  onClick={() => setRetryKey((value) => value + 1)}
                  className="shrink-0 rounded-md border border-red-400/50 px-3 py-1.5 text-red-200 hover:bg-red-400/10"
                >
                  {t('common.retry')}
                </button>
              </li>
            )}
            {status === 'ready' && sorted.length === 0 && (
              <li className="p-4 text-sm text-ink-400">{t('compendium.noMatches')}</li>
            )}
            {listItems.map((item) => (
              <li key={item.id}>
                <Link
                  to={{
                    pathname: `/compendium/${categoryId}/${item.id}`,
                    search: currentSearch().toString(),
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    clearQueryUpdate();
                    navigate({
                      pathname: `/compendium/${categoryId}/${item.id}`,
                      search: currentSearch().toString(),
                    });
                  }}
                  className={[
                    'block border-b border-ink-800 px-4 py-2 transition-colors hover:bg-ink-800',
                    item.id === selectedId
                      ? 'border-l-2 border-l-arcane-300 bg-arcane-700/70'
                      : '',
                  ].join(' ')}
                >
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium text-ink-50">{item.name}</span>
                    <OriginalName name={item.englishName} className="text-xs" />
                    {isHomebrew(item) && (
                      <span className="rounded-full border border-ember-500/50 px-1.5 text-[0.65rem] uppercase tracking-wide text-ember-400">
                        {t('compendium.homebrewBadge')}
                      </span>
                    )}
                    {isFumbleHomebrew(item) && <FumbleBadge compact />}
                    {(isUaSource(item.source) || item.ua) && (
                      <span className="rounded-full border border-arcane-500/50 px-1.5 text-[0.65rem] uppercase tracking-wide text-arcane-300">
                        {t('compendium.uaBadge')}
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-ink-400">
                    {isHomebrew(item) && item._manual
                      ? item.subtitle
                      : isFumbleHomebrew(item)
                        ? item.subtitle
                        : category.subtitle(item, t, locale)}
                  </span>
                </Link>
              </li>
            ))}
            {status === 'ready' && remainingCount > 0 && (
              <li className="p-3">
                <button
                  type="button"
                  onClick={() => setVisibleCount((value) => value + LIST_PAGE_SIZE)}
                  className="w-full rounded-md border border-ink-700 px-3 py-2 text-sm text-ink-200 transition-colors hover:border-arcane-500 hover:bg-ink-800"
                >
                  {t('compendium.loadMore', {
                    count: Math.min(LIST_PAGE_SIZE, remainingCount),
                  })}
                </button>
              </li>
            )}
          </ul>
        </section>

        <section
          className={[
            'min-h-0 flex-1 overflow-y-auto p-5',
            selectedId ? 'block' : 'hidden md:block',
          ].join(' ')}
        >
          <Link
            to={{
              pathname: `/compendium/${categoryId}`,
              search: currentSearch().toString(),
            }}
            className="mb-4 inline-flex items-center gap-1 text-sm text-ink-300 hover:text-ink-50 md:hidden"
          >
            <ArrowLeft size={16} aria-hidden="true" /> {t('compendium.back')}
          </Link>

          {selected ? (
            <>
              {selected.image && (
                <div className="relative mb-4 inline-block min-h-80 max-w-full">
                  <img
                    src={optimizedImageUrl(
                      selected.image,
                      import.meta.env.VITE_IMAGE_TRANSFORM_ORIGIN,
                    )}
                    srcSet={primaryImageSrcSet}
                    sizes={primaryImageSrcSet ? '320px' : undefined}
                    alt={selected.name}
                    width={PRIMARY_IMAGE_WIDTH}
                    height={PRIMARY_IMAGE_HEIGHT}
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    onLoad={revealApp}
                    onClick={() => openLightbox(imageUrl(selected.image!), selected.name)}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      revealApp();
                    }}
                    className="h-auto max-h-80 max-w-full cursor-zoom-in rounded-lg border border-ink-700 object-contain"
                  />
                  {selected.token && selected.token !== selected.image && (
                    <img
                      src={optimizedImageUrl(
                        selected.token,
                        import.meta.env.VITE_IMAGE_TRANSFORM_ORIGIN,
                        128,
                      )}
                      alt={`${selected.name} ${t('compendium.token')}`}
                      title={t('compendium.token')}
                      loading="lazy"
                      onClick={() =>
                        openLightbox(
                          imageUrl(selected.token!),
                          `${selected.name} (token)`,
                        )
                      }
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                      className="absolute -bottom-3 -right-3 h-16 w-16 cursor-zoom-in rounded-full border-2 border-ink-900 bg-ink-950 object-cover shadow-lg"
                    />
                  )}
                </div>
              )}
              {isHomebrew(selected) && !selected._manual && (
                <span className="mb-3 inline-block rounded-full border border-ember-500/50 px-2 py-0.5 text-xs uppercase tracking-wide text-ember-400">
                  {t('compendium.homebrewLabel')}
                </span>
              )}
              {(isUaSource(selected.source) || selected.ua) && (
                <span className="mb-3 inline-block rounded-full border border-arcane-500/50 px-2 py-0.5 text-xs uppercase tracking-wide text-arcane-300">
                  {t('compendium.uaLabel')}
                </span>
              )}
              {isFumbleHomebrew(selected) ? (
                <FumbleDetail item={selected} />
              ) : isHomebrew(selected) && selected._manual ? (
                <HomebrewDetail item={selected} />
              ) : (
                category.renderDetail(selected)
              )}

              {selected.lore && selected.lore.length > 0 && (
                <section className="mt-6 flex flex-col gap-3 border-t border-ink-800 pt-4">
                  <h3 className="font-display text-lg font-bold text-ember-400">
                    {t('compendium.lore')}
                  </h3>
                  <div className="flex flex-col gap-3">
                    <EntryRenderer entries={selected.lore} />
                  </div>
                </section>
              )}

              {selected.gallery &&
                selected.gallery.filter((g) => g.path !== selected.image).length > 0 && (
                  <section className="mt-6 flex flex-col gap-3 border-t border-ink-800 pt-4">
                    <h3 className="font-display text-lg font-bold text-ember-400">
                      {t('compendium.gallery')}
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {selected.gallery
                        .filter((g) => g.path !== selected.image)
                        .map((img) => (
                          <figure key={img.path} className="flex flex-col gap-1">
                            <img
                              src={optimizedImageUrl(
                                img.path,
                                import.meta.env.VITE_IMAGE_TRANSFORM_ORIGIN,
                              )}
                              alt={img.title ?? selected.name}
                              loading="lazy"
                              onClick={() =>
                                openLightbox(
                                  imageUrl(img.path),
                                  img.title ?? selected.name,
                                )
                              }
                              onError={(e) => {
                                e.currentTarget.closest('figure')!.style.display = 'none';
                              }}
                              className="h-auto cursor-zoom-in rounded-lg border border-ink-700 object-contain"
                            />
                            {(img.title || img.credit) && (
                              <figcaption className="text-xs text-ink-400">
                                {img.title}
                                {img.credit && (
                                  <span className="italic"> - {img.credit}</span>
                                )}
                              </figcaption>
                            )}
                          </figure>
                        ))}
                    </div>
                  </section>
                )}

              <div className="mt-6 border-t border-ink-800 pt-3 text-sm">
                <p className="text-ink-400">
                  {t('compendium.source')}{' '}
                  {getBook(selected.source.toLowerCase()) ? (
                    <Link
                      to={{
                        pathname: `/books/${selected.source.toLowerCase()}`,
                        hash: bookAnchorHash(selected.page, selected.name),
                      }}
                      className="text-arcane-300 hover:text-arcane-500"
                    >
                      {sourceName(selected.source, locale)}
                      {selected.page ? `, p. ${selected.page}` : ''}
                    </Link>
                  ) : (
                    <span className="text-ink-200">
                      {sourceName(selected.source, locale)}
                      {selected.page ? `, p. ${selected.page}` : ''}
                    </span>
                  )}
                </p>
                {selected.otherVersions && selected.otherVersions.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-ink-400">{t('compendium.otherPrintings')}</span>
                    {selected.otherVersions.map((version) => (
                      <Link
                        key={version.id}
                        to={`/compendium/${categoryId}/${version.id}`}
                        className="rounded-full bg-ink-800 px-2.5 py-0.5 text-xs text-arcane-300 hover:bg-ink-700"
                      >
                        {sourceName(version.source, locale)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : selectedId && status === 'loading' ? (
            <div
              className="min-h-80 animate-pulse rounded-lg border border-ink-800 bg-ink-900/50 p-5"
              aria-busy="true"
            >
              <p className="text-ink-400">{t('common.loading')}</p>
            </div>
          ) : selectedId && status === 'error' ? (
            <div className="flex flex-wrap items-center gap-3 text-red-400" role="alert">
              <span>{t('compendium.failedToLoad')}</span>
              <button
                type="button"
                onClick={() => setRetryKey((value) => value + 1)}
                className="rounded-md border border-red-400/50 px-3 py-1.5 text-red-200 hover:bg-red-400/10"
              >
                {t('common.retry')}
              </button>
            </div>
          ) : (
            <p className="text-ink-400">{t('compendium.selectPrompt')}</p>
          )}
        </section>
      </div>
    </div>
  );
}
