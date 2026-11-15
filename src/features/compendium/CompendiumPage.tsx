import { DetailPresentation } from '@/features/ui/detailPresentationContext';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useParams } from 'react-router-dom';
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
import { DetailContents } from './DetailContents';
import { catalogSearchText } from './catalogSearch';
import { FilterBar } from './FilterBar';
import {
  type SortDir,
  compareItems,
  matchesFilters,
  normalizeFilterValue,
} from './filterSort';
import {
  imageUrl,
  PRIMARY_IMAGE_HEIGHT,
  PRIMARY_IMAGE_WIDTH,
} from '@/data/compendium/images';
import { isUaSource, sourceName } from '@/data/compendium/sources';
import {
  homebrewSubclassesFor,
  isHomebrew,
  useHomebrewStore,
} from '@/features/homebrew/store';
import { HomebrewArtwork } from '@/features/homebrew/HomebrewImage';
import { PrivateArtwork } from '@/features/homebrew/artworkPolicy';
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
import { Button, SearchField } from '@/features/ui/primitives';
import { toggleChipClass } from '@/features/ui/styles';
import { normalizeSearchText } from '@/data/compendium/searchText';
import { stripMarkup } from '@/data/transform/util';
import {
  compendiumPrintingSeo,
  isCompendiumSubclassIndexable,
} from '@/data/compendium/indexability';
import { getCompendiumCategorySeo, getCompendiumEntrySeo } from '@/data/compendium/seo';
import type { ClassEntry, MonsterEntry } from '@/data/compendium/types';
import { monsterCombatant } from '@/features/initiative/monsterCombatant';
import { BestiaryInitiativeAction } from '@/features/initiative/BestiaryInitiativeDialog';
import { readMonsterSnapshot } from '@/data/compendium/monsterSnapshot';
import { findSubclassByRouteKey, subclassRouteKey } from './subclassRoute';

const OWN_CONTENT_SEO: ReturnType<typeof compendiumPrintingSeo> = { indexable: true };
import { localizePlainText, parseMarkup } from './markup';
import { hasPrerenderedPage, revealApp, showPrerenderedRetry } from '@/seo/prerendered';
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
    <div className="page-shell">
      <header className="mb-8">
        <h1 className="text-ink-50 page-title">{t('compendium.title')}</h1>
        <p className="mt-2 max-w-3xl text-ink-300">
          {t('seo.pageDescriptions.compendium')}
        </p>
      </header>
      <nav aria-label={t('compendium.categoriesNav')}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.id}>
              <Link to={`/compendium/${category.id}`} className="catalog-card">
                <h2 className="text-ink-50 section-title">
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
  const categoryNavRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    categoryNavRef.current
      ?.querySelector<HTMLElement>('[aria-current="page"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [categoryId]);
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
      updateRef.current({ q: value || null, page: null }, true);
    }, 0);
  };

  const currentSearch = () => {
    const search = new URLSearchParams(params);
    const allowed = new Set([
      'q',
      'sort',
      'order',
      'includeAny',
      'view',
      'page',
      'searchIn',
      'library',
      'homebrewLibrary',
      ...filters.map((filter) => filter.id),
    ]);
    for (const key of new Set(search.keys())) {
      if (!allowed.has(key)) search.delete(key);
    }
    if (queryRef.current) {
      search.set('q', queryRef.current);
    } else {
      search.delete('q');
    }
    return search;
  };
  const requestedSort = params.get('sort');
  const requestedSubclassIds = selectedSubclassId
    ? [selectedSubclassId]
    : params.getAll('subclass');
  const requestedSubclassId = requestedSubclassIds[0];
  const sortOptions = category.sorts ?? filters;
  const sortFields = new Set(['name', ...sortOptions.map((filter) => filter.id)]);
  const sortField = sortFields.has(requestedSort ?? '') ? requestedSort! : 'name';
  const sortDir: SortDir = params.get('order') === 'desc' ? 'desc' : 'asc';
  const selectedFilters = useMemo(
    () =>
      Object.fromEntries(
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
      ),
    [filters, params],
  );
  const includeAny = useMemo(
    () =>
      Object.fromEntries(
        filters
          .filter((filter) => filter.includeAny)
          .map((filter) => [
            filter.id,
            params.get('includeAny') === '1' &&
              (selectedFilters[filter.id]?.length ?? 0) > 0,
          ]),
      ),
    [filters, params, selectedFilters],
  );
  const { pathname } = useLocation();
  const snapshot = useMemo(
    () =>
      readMonsterSnapshot(
        document.getElementById('fumble-monster-snapshot')?.textContent,
        pathname,
      ),
    [pathname],
  );
  const [browseBestiary, setBrowseBestiary] = useState(false);
  const result = useCategoryItems(
    snapshot && !browseBestiary ? undefined : category,
    true,
    selectedId,
    requestedSubclassIds,
    retryKey,
  );
  const entrySnapshot =
    !browseBestiary || result.status !== 'ready' ? snapshot : undefined;
  const items = useMemo(
    () => (entrySnapshot ? [entrySnapshot.item] : result.items),
    [entrySnapshot, result.items],
  );
  const status = entrySnapshot ? 'ready' : result.status;
  const { baseItems, overlay } = result;
  const selected = selectedId ? items.find((item) => item.id === selectedId) : undefined;
  const prerendered = hasPrerenderedPage(pathname);

  useEffect(() => {
    if (status === 'error' && prerendered) {
      showPrerenderedRetry();
    } else if (status !== 'loading') {
      revealApp();
    }
  }, [prerendered, status]);

  const openLightbox = useLightbox((s) => s.open);
  const navigate = useNavigate();
  const { t, locale } = useT();

  const toggleFilter = (filterId: string, value: string) => {
    const current = selectedFilters[filterId] ?? [];
    update({
      page: null,
      [filterId]: current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    });
  };

  const setFilter = (filterId: string, values: string[]) => {
    update({ [filterId]: values.length > 0 ? values : null, page: null });
  };

  const toggleIncludeAny = (filterId: string) => {
    if (
      !filters.find((filter) => filter.id === filterId)?.includeAny ||
      (selectedFilters[filterId]?.length ?? 0) === 0
    )
      return;
    update({ includeAny: includeAny[filterId] ? null : '1', page: null });
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
  const normalizedNames = useMemo(
    () =>
      new Map(
        visibleItems.map(
          (item) =>
            [
              item,
              [
                normalizeSearchText(item.name),
                item.englishName ? normalizeSearchText(item.englishName) : '',
              ],
            ] as const,
        ),
      ),
    [visibleItems],
  );

  const searchContent = params.get('searchIn') === 'content';
  const queryItems = useMemo(() => {
    const term = normalizeSearchText(query.trim());
    return visibleItems.filter((item) => {
      const [name, englishName] = normalizedNames.get(item)!;
      if (
        term &&
        !name.includes(term) &&
        !englishName.includes(term) &&
        !(searchContent && catalogSearchText(item).includes(term))
      )
        return false;
      return true;
    });
  }, [visibleItems, normalizedNames, query, searchContent]);
  const filtered = useMemo(
    () =>
      queryItems.filter((item) =>
        matchesFilters(item, filters, selectedFilters, includeAny),
      ),
    [queryItems, filters, selectedFilters, includeAny],
  );

  const sorted = useMemo(() => {
    if (sortField === 'name' && sortDir === 'asc') return filtered;
    return [...filtered].sort((a, b) =>
      compareItems(a, b, sortField, sortDir, sortOptions, t, locale),
    );
  }, [filtered, sortField, sortDir, sortOptions, t, locale]);

  const listResetKey = [
    query,
    sortField,
    sortDir,
    contentMode,
    showFumbleHomebrew,
    ...filters.flatMap((filter) => [filter.id, ...(selectedFilters[filter.id] ?? [])]),
    ...filters.flatMap((filter) =>
      filter.includeAny ? [filter.id, String(includeAny[filter.id] ?? false)] : [],
    ),
  ].join('|');
  const [visibleCount, setVisibleCount] = useState(LIST_PAGE_SIZE);
  useEffect(() => {
    setVisibleCount(LIST_PAGE_SIZE);
  }, [listResetKey]);
  const selectedIndex = selectedId
    ? sorted.findIndex((item) => item.id === selectedId)
    : -1;
  const browseAll = params.get('view') === 'all';
  const fullCatalog = browseAll && !selectedId;
  const requestedPage = Number(params.get('page') ?? '1');
  const pageCount = Math.max(1, Math.ceil(sorted.length / 50));
  const pageNumber =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, pageCount)
      : 1;
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [pageNumber]);
  const listItems = browseAll
    ? sorted.slice((pageNumber - 1) * 50, pageNumber * 50)
    : sorted.slice(0, Math.max(visibleCount, selectedIndex + 1));
  const remainingCount = sorted.length - listItems.length;

  const categoryTitle = categoryLabel(category, t);
  const homebrew = useHomebrewStore((state) => state.entries);
  const localSubclasses =
    categoryId === 'classes' && selected ? homebrewSubclassesFor(homebrew, selected) : [];
  const selectedSubclass =
    categoryId === 'classes' && selected && requestedSubclassId
      ? findSubclassByRouteKey(
          [...((selected as Partial<ClassEntry>).subclasses ?? []), ...localSubclasses],
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
  const baseItem = baseItems?.find((item) => item.id === selectedId);
  const printing =
    selected &&
    (isFumbleHomebrew(selected)
      ? OWN_CONTENT_SEO
      : compendiumPrintingSeo(baseItem ?? selected, baseItems ?? items, categoryId));
  const hasTranslation = locale !== 'pl' || !baseItem || Boolean(overlay?.[baseItem.id]);
  const privateEntry = selected && isHomebrew(selected) && !isFumbleHomebrew(selected);
  const artwork = (source: string, render: (url: string) => ReactNode) =>
    privateEntry ? (
      <HomebrewArtwork key={source} src={source}>
        {render}
      </HomebrewArtwork>
    ) : (
      render(imageUrl(source))
    );
  const privateSubclass = Boolean(
    selectedSubclass && localSubclasses.includes(selectedSubclass),
  );
  const indexable =
    status === 'ready'
      ? !routeNotFound &&
        hasTranslation &&
        (!selected ||
          (!privateEntry &&
            !privateSubclass &&
            Boolean(printing?.indexable) &&
            (!selectedSubclass ||
              isCompendiumSubclassIndexable(
                selected,
                Boolean(hasVisibleSubclassParent),
                subclassRouteKey(selectedSubclass),
              ))))
      : prerendered
        ? 'pending'
        : false;
  const canonicalId =
    !privateEntry && !selectedSubclass && hasTranslation
      ? printing?.canonicalId
      : undefined;

  useSeo(
    routeNotFound ? t('notFound.title') : seo.title,
    routeNotFound ? t('notFound.message') : seo.description,
    entrySnapshot?.indexable ?? indexable,
    entrySnapshot?.locales,
    entrySnapshot?.canonicalPath ??
      (canonicalId && (locale !== 'pl' || overlay?.[canonicalId])
        ? `/compendium/${categoryId}/${canonicalId}`
        : undefined),
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
          <p className="page-title">{categoryTitle}</p>
        ) : (
          <h1 className="page-title">{categoryTitle}</h1>
        )}
        <p className="mt-1 text-xs text-ink-400">
          {t('compendium.revision', { version: packageInfo.version })}
        </p>
        <nav
          ref={categoryNavRef}
          className="mt-3 flex gap-2 overflow-x-auto p-1 md:flex-wrap"
          aria-label={t('compendium.categoriesNav')}
        >
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/compendium/${cat.id}`}
              className={toggleChipClass(
                cat.id === categoryId,
                'shrink-0 whitespace-nowrap',
              )}
              aria-current={cat.id === categoryId ? 'page' : undefined}
            >
              {categoryLabel(cat, t)}
            </Link>
          ))}
        </nav>
        {!selectedId && (
          <Link
            to={{
              pathname: `/compendium/${categoryId}`,
              search: (() => {
                const next = currentSearch();
                next.delete('page');
                if (browseAll) next.delete('view');
                else next.set('view', 'all');
                return next.toString();
              })(),
            }}
            className="document-link text-sm"
          >
            {t(browseAll ? 'compendium.catalog.compactView' : 'compendium.browseAll')}
          </Link>
        )}
        {params.has('library') && (
          <Link
            to={{ pathname: '/fumble-homebrew', search: params.get('library') ?? '' }}
            className="mt-2 block text-sm text-arcane-300 underline"
          >
            {t('compendium.catalog.returnLibrary')}
          </Link>
        )}
        {params.has('homebrewLibrary') && (
          <Link
            to={{ pathname: '/homebrew', search: params.get('homebrewLibrary') ?? '' }}
            className="back-link mt-2"
          >
            {t('homebrew.returnPersonal')}
          </Link>
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        <section
          className={[
            fullCatalog
              ? 'flex min-h-0 w-full flex-col'
              : 'flex min-h-0 w-full flex-col border-r border-ink-700 md:w-80 lg:w-96',
            selectedId ? 'hidden md:flex' : 'flex',
          ].join(' ')}
        >
          <div className="border-b border-ink-700 p-3">
            <SearchField
              value={query}
              onFocus={() => {
                if (entrySnapshot) setBrowseBestiary(true);
              }}
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
            <label className="mt-2 flex min-h-10 items-center gap-2 text-xs text-ink-300">
              <input
                type="checkbox"
                className="accent-arcane-500"
                checked={searchContent}
                onChange={(event) =>
                  update({
                    searchIn: event.target.checked ? 'content' : null,
                    page: null,
                  })
                }
              />
              {t('compendium.catalog.searchContent')}
            </label>
          </div>

          {entrySnapshot && (
            <div className="space-y-2 p-3">
              {browseBestiary && result.status === 'loading' && (
                <p role="status">{t('common.loading')}</p>
              )}
              {result.status === 'error' && (
                <p role="alert">{t('compendium.failedToLoad')}</p>
              )}
              {(!browseBestiary || result.status === 'error') && (
                <button
                  type="button"
                  className="text-sm text-arcane-300 underline"
                  onClick={() => {
                    setBrowseBestiary(true);
                    setRetryKey((value) => value + 1);
                  }}
                >
                  {t(result.status === 'error' ? 'common.retry' : 'compendium.browseAll')}
                </button>
              )}
            </div>
          )}
          {filters.length > 0 && status === 'ready' && !entrySnapshot && (
            <FilterBar
              filters={filters}
              items={visibleItems}
              queryItems={queryItems}
              sortOptions={sortOptions}
              selected={selectedFilters}
              includeAny={includeAny}
              onToggle={toggleFilter}
              onSetFilter={setFilter}
              onToggleIncludeAny={toggleIncludeAny}
              onClear={() =>
                update({
                  ...Object.fromEntries(filters.map((filter) => [filter.id, null])),
                  includeAny: null,
                  page: null,
                })
              }
              onRandom={pickRandom}
              sortField={sortField}
              sortDir={sortDir}
              onSortField={(value) =>
                update({ sort: value === 'name' ? null : value, page: null })
              }
              onToggleSortDir={() =>
                update({ order: sortDir === 'asc' ? 'desc' : null, page: null })
              }
            />
          )}

          {status === 'ready' && (
            <p
              role="status"
              aria-atomic="true"
              className="px-3 py-2 text-xs text-ink-400"
            >
              {t('compendium.catalog.resultCount', { count: sorted.length })}
              {browseAll &&
                ` · ${t('compendium.catalog.page', { page: pageNumber, total: pageCount })}`}
            </p>
          )}
          <ul
            ref={listRef}
            className={
              fullCatalog
                ? 'grid min-h-0 grid-cols-1 gap-2 overflow-y-auto p-3 md:grid-cols-2 xl:grid-cols-3'
                : 'min-h-0 flex-1 overflow-y-auto'
            }
            data-category={categoryId}
          >
            {status === 'loading' && (
              <li className="p-4 text-sm text-ink-400">{t('common.loading')}</li>
            )}
            {status === 'error' && (
              <li className="flex items-center justify-between gap-3 p-4 text-sm text-red-400">
                <span>{t('compendium.failedToLoad')}</span>
                <Button
                  type="button"
                  onClick={() => setRetryKey((value) => value + 1)}
                  variant="danger"
                  size="sm"
                  className="shrink-0"
                >
                  {t('common.retry')}
                </Button>
              </li>
            )}
            {!entrySnapshot && status === 'ready' && sorted.length === 0 && (
              <li className="flex flex-col items-start gap-3 p-4 text-sm text-ink-400">
                <p>{t('compendium.noMatches')}</p>
                {categoryId === 'firearms' && !showFumbleHomebrew && (
                  <>
                    <p>{t('compendium.catalog.homebrewDisabled')}</p>
                    <Link to="/fumble-homebrew" className="text-arcane-300 underline">
                      {t('homebrew.editFumbleVisibility')}
                    </Link>
                  </>
                )}
              </li>
            )}
            {listItems.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/compendium/${categoryId}/${item.id}`}
                  onClick={(event) => {
                    if (
                      event.button !== 0 ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    )
                      return;
                    event.preventDefault();
                    clearQueryUpdate();
                    navigate({
                      pathname: `/compendium/${categoryId}/${item.id}`,
                      search: currentSearch().toString(),
                    });
                  }}
                  className={
                    fullCatalog
                      ? 'catalog-card h-full'
                      : 'selection-row rounded-none border-b border-ink-800'
                  }
                  aria-current={item.id === selectedId ? 'page' : undefined}
                >
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium text-ink-50">{item.name}</span>
                    <OriginalName name={item.englishName} className="text-xs" />
                    {isHomebrew(item) && (
                      <span className="badge border-ember-500/50 text-ember-400">
                        {t('compendium.homebrewBadge')}
                      </span>
                    )}
                    {isFumbleHomebrew(item) && <FumbleBadge compact />}
                    {(isUaSource(item.source) || item.ua) && (
                      <span className="badge border-arcane-500/50 text-arcane-300">
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
            {status === 'ready' && !browseAll && remainingCount > 0 && (
              <li className="p-3">
                <Button
                  type="button"
                  onClick={() => setVisibleCount((value) => value + LIST_PAGE_SIZE)}
                  variant="secondary"
                  className="w-full"
                >
                  {t('compendium.loadMore', {
                    count: Math.min(LIST_PAGE_SIZE, remainingCount),
                  })}
                </Button>
              </li>
            )}
          </ul>
          {browseAll && pageCount > 1 && (
            <nav
              aria-label={t('compendium.catalog.pagination')}
              className="flex flex-wrap items-center justify-center gap-2 border-t border-ink-700 p-3"
            >
              <Button
                disabled={pageNumber === 1}
                onClick={() =>
                  update({ page: pageNumber === 2 ? null : String(pageNumber - 1) })
                }
              >
                {t('compendium.browsePrevious')}
              </Button>
              <span className="text-sm text-ink-300">
                {t('compendium.catalog.page', { page: pageNumber, total: pageCount })}
              </span>
              <Button
                disabled={pageNumber === pageCount}
                onClick={() => update({ page: String(pageNumber + 1) })}
              >
                {t('compendium.browseNext')}
              </Button>
            </nav>
          )}
        </section>

        <section
          className={[
            'min-h-0 flex-1 overflow-y-auto p-5',
            fullCatalog ? 'hidden' : selectedId ? 'block' : 'hidden md:block',
          ].join(' ')}
        >
          <Link
            to={{
              pathname: `/compendium/${categoryId}`,
              search: currentSearch().toString(),
            }}
            className={browseAll ? 'back-link mb-4' : 'back-link md:hidden'}
          >
            <ArrowLeft size={16} aria-hidden="true" /> {t('compendium.back')}
          </Link>

          {selected ? (
            <PrivateArtwork.Provider value={Boolean(privateEntry)}>
              <DetailPresentation
                value={{
                  badge: (
                    <>
                      {isHomebrew(selected) && !selected._manual && (
                        <span className="badge border-ember-500/50 text-ember-400">
                          {t('compendium.homebrewLabel')}
                        </span>
                      )}
                      {(isUaSource(selected.source) || selected.ua) && (
                        <span className="badge border-arcane-500/50 text-arcane-300">
                          {t('compendium.uaLabel')}
                        </span>
                      )}
                    </>
                  ),
                  artwork: selected.image && (
                    <div className="relative mb-4 inline-block max-w-full">
                      {artwork(selected.image, (url) => (
                        <a
                          href={url}
                          className="artwork-trigger"
                          aria-label={selected.name}
                          onClick={(event) => {
                            event.preventDefault();
                            openLightbox(url, selected.name);
                          }}
                        >
                          <img
                            src={url}
                            referrerPolicy={privateEntry ? 'no-referrer' : undefined}
                            alt={selected.name}
                            width={PRIMARY_IMAGE_WIDTH}
                            height={PRIMARY_IMAGE_HEIGHT}
                            loading="eager"
                            fetchPriority="high"
                            decoding="async"

                            onError={(e) => {
                              e.currentTarget.parentElement!.parentElement!.style.display =
                                'none';
                            }}
                            className="h-auto w-auto max-h-80 max-w-full cursor-zoom-in rounded-lg border border-ink-700 object-contain"
                          />
                        </a>
                      ))}
                      {selected.token &&
                        selected.token !== selected.image &&
                        artwork(selected.token, (url) => (
                          <a
                            href={url}
                            className="artwork-trigger"
                            aria-label={`${selected.name} ${t('compendium.token')}`}
                            onClick={(event) => {
                              event.preventDefault();
                              openLightbox(url, `${selected.name} (token)`);
                            }}
                          >
                            <img
                              src={url}
                              referrerPolicy={privateEntry ? 'no-referrer' : undefined}
                              alt={`${selected.name} ${t('compendium.token')}`}
                              title={t('compendium.token')}
                              loading="lazy"

                              onError={(e) => {
                                e.currentTarget.parentElement!.style.display = 'none';
                              }}
                              className="absolute -bottom-3 -right-3 h-16 w-16 cursor-zoom-in rounded-full border-2 border-ink-900 bg-ink-950 object-cover shadow-lg"
                            />
                          </a>
                        ))}
                    </div>
                  ),
                }}
              >
                <DetailContents key={selected.id}>
                  {isFumbleHomebrew(selected) ? (
                    <FumbleDetail item={selected} />
                  ) : isHomebrew(selected) && selected._manual ? (
                    <HomebrewDetail item={selected} />
                  ) : (
                    category.renderDetail(selected)
                  )}
                </DetailContents>

                {categoryId === 'bestiary' && !isHomebrew(selected) && (
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-arcane-300">
                    <Link
                      to={{
                        pathname: '/dm/encounter',
                        search: new URLSearchParams({ monster: selected.id }).toString(),
                      }}
                      className="underline"
                    >
                      {t('encounter.openForMonster')}
                    </Link>
                    <BestiaryInitiativeAction
                      key={selected.id}
                      row={monsterCombatant(selected as MonsterEntry)}
                      onAdded={() => navigate('/dm/initiative')}
                    />
                  </div>
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
                  selected.gallery.filter((g) => g.path !== selected.image).length >
                    0 && (
                    <section className="mt-6 flex flex-col gap-3 border-t border-ink-800 pt-4">
                      <h3 className="font-display text-lg font-bold text-ember-400">
                        {t('compendium.gallery')}
                      </h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {selected.gallery
                          .filter((g) => g.path !== selected.image)
                          .map((img) => {
                            const title = img.title
                              ? localizePlainText(stripMarkup(img.title), locale)
                              : selected.name;
                            return (
                              <figure key={img.path} className="flex flex-col gap-1">
                                {artwork(img.path, (url) => (
                                  <a
                                    href={url}
                                    className="artwork-trigger"
                                    aria-label={title}
                                    onClick={(event) => {
                                      event.preventDefault();
                                      openLightbox(url, title);
                                    }}
                                  >
                                    <img
                                      src={url}
                                      referrerPolicy={
                                        privateEntry ? 'no-referrer' : undefined
                                      }
                                      alt={title}
                                      loading="lazy"

                                      onError={(e) => {
                                        e.currentTarget.closest('figure')!.style.display =
                                          'none';
                                      }}
                                      className="h-auto cursor-zoom-in rounded-lg border border-ink-700 object-contain"
                                    />
                                  </a>
                                ))}
                                {(img.title || img.credit) && (
                                  <figcaption className="text-xs text-ink-400">
                                    {img.title && parseMarkup(img.title, locale)}
                                    {img.credit && (
                                      <span className="italic"> - {img.credit}</span>
                                    )}
                                  </figcaption>
                                )}
                              </figure>
                            );
                          })}
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
                          hash: bookAnchorHash(
                            selected.page,
                            selected.englishName ?? selected.name,
                          ),
                        }}
                        className="text-arcane-300 hover:text-arcane-500"
                      >
                        {sourceName(selected.source, locale)}
                        {selected.page
                          ? `, ${t('seo.sourcePage', { page: selected.page })}`
                          : ''}
                      </Link>
                    ) : (
                      <span className="text-ink-200">
                        {sourceName(selected.source, locale)}
                        {selected.page
                          ? `, ${t('seo.sourcePage', { page: selected.page })}`
                          : ''}
                      </span>
                    )}
                    {!isHomebrew(selected) && (
                      <>
                        {' - '}
                        <Link to="/legal/licenses" className="text-arcane-300 underline">
                          {t('legal.licenses.title')}
                        </Link>
                      </>
                    )}
                  </p>
                  {selected.otherVersions && selected.otherVersions.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-ink-400">
                        {t('compendium.otherPrintings')}
                      </span>
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
              </DetailPresentation>
            </PrivateArtwork.Provider>
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
              <Button
                type="button"
                onClick={() => setRetryKey((value) => value + 1)}
                variant="danger"
                size="sm"
              >
                {t('common.retry')}
              </Button>
            </div>
          ) : (
            <p className="text-ink-400">{t('compendium.selectPrompt')}</p>
          )}
        </section>
      </div>
    </div>
  );
}
