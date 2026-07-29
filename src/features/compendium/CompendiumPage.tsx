import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
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
import { type SortDir, compareItems } from './filterSort';
import { imageUrl } from '@/data/compendium/images';
import { isUaSource, sourceName } from '@/data/compendium/sources';
import { isHomebrew } from '@/features/homebrew/store';
import { HomebrewDetail } from '@/features/homebrew/HomebrewDetail';
import { getBook } from '@/features/books/data';
import { useLightbox } from '@/features/ui/lightboxStore';
import { useContentModeStore } from '@/features/ui/contentModeStore';
import { OriginalName } from '@/features/ui/OriginalName';
import { Link, Navigate, useNavigate } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { useUrlSearchState } from '@/features/ui/useUrlSearchState';

function categoryLabel(category: CompendiumCategory, t: (key: string) => string): string {
  return t(`compendium.categories.${category.id}`);
}

const NO_FILTERS: CategoryFilter[] = [];

export function CompendiumPage() {
  const { category: categoryId, id } = useParams();

  if (!categoryId) {
    return <Navigate to={`/compendium/${categories[0]!.id}`} replace />;
  }

  const category = getCategory(categoryId);
  if (!category) {
    return <Navigate to={`/compendium/${categories[0]!.id}`} replace />;
  }

  return <CompendiumBrowser key={categoryId} categoryId={categoryId} selectedId={id} />;
}

function CompendiumBrowser({
  categoryId,
  selectedId,
}: {
  categoryId: string;
  selectedId: string | undefined;
}) {
  const category = getCategory(categoryId)!;
  const filters = category.filters ?? NO_FILTERS;
  const { params, update } = useUrlSearchState();
  const query = params.get('q') ?? '';
  const requestedSort = params.get('sort');
  const sortField =
    requestedSort === 'name' || filters.some((filter) => filter.id === requestedSort)
      ? (requestedSort ?? 'name')
      : 'name';
  const sortDir: SortDir = params.get('order') === 'desc' ? 'desc' : 'asc';
  const selectedFilters = Object.fromEntries(
    filters.map((filter) => [filter.id, params.getAll(filter.id).filter(Boolean)]),
  );
  const { status, items } = useCategoryItems(category);
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

  const contentMode = useContentModeStore((s) => s.mode);
  const visibleItems = useMemo(
    () => applyContentMode(items, contentMode),
    [items, contentMode],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return visibleItems.filter((item) => {
      if (
        term &&
        !item.name.toLowerCase().includes(term) &&
        !item.englishName?.toLowerCase().includes(term)
      )
        return false;
      return filters.every((filter) => {
        const chosen = selectedFilters[filter.id];
        if (!chosen || chosen.length === 0) return true;
        return filter.valuesFor(item).some((value) => chosen.includes(value));
      });
    });
  }, [visibleItems, query, filters, selectedFilters]);

  const sorted = useMemo(() => {
    if (sortField === 'name' && sortDir === 'asc') return filtered;
    return [...filtered].sort((a, b) =>
      compareItems(a, b, sortField, sortDir, filters, t, locale),
    );
  }, [filtered, sortField, sortDir, filters, t, locale]);

  const selected = selectedId ? items.find((item) => item.id === selectedId) : undefined;

  useSeo(selected ? selected.name : categoryLabel(category, t));

  const pickRandom = () => {
    if (filtered.length === 0) return;
    const pick = filtered[Math.floor(Math.random() * filtered.length)]!;
    navigate({
      pathname: `/compendium/${categoryId}/${pick.id}`,
      search: params.toString(),
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-ink-700 px-4 py-3">
        <h1 className="font-display text-2xl font-bold text-ink-50">
          {t('compendium.title')}
        </h1>
        <nav
          className="mt-3 flex flex-wrap gap-2"
          aria-label={t('compendium.categoriesNav')}
        >
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/compendium/${cat.id}`}
              className={[
                'rounded-full px-3 py-1 text-sm font-medium transition-colors',
                cat.id === categoryId
                  ? 'bg-arcane-700 text-ink-50'
                  : 'bg-ink-800 text-ink-200 hover:bg-ink-700',
              ].join(' ')}
            >
              {categoryLabel(cat, t)}
            </Link>
          ))}
          <Link
            to="/books"
            className="rounded-full border border-dashed border-ink-600 px-3 py-1 text-sm font-medium text-ink-300 transition-colors hover:bg-ink-800"
          >
            {t('nav.books')}
          </Link>
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
            <div className="flex items-center gap-2 rounded-lg bg-ink-800 px-3 py-2">
              <Search size={16} className="text-ink-400" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => update({ q: event.target.value }, true)}
                placeholder={t('compendium.searchPlaceholder', {
                  category: categoryLabel(category, t).toLowerCase(),
                })}
                aria-label={t('compendium.searchLabel', {
                  category: categoryLabel(category, t),
                })}
                className="w-full bg-transparent text-sm text-ink-50 placeholder:text-ink-400 focus:outline-none"
              />
            </div>
          </div>

          {filters.length > 0 && status === 'ready' && (
            <FilterBar
              filters={filters}
              items={visibleItems}
              selected={selectedFilters}
              onToggle={toggleFilter}
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

          <ul className="min-h-0 flex-1 overflow-y-auto">
            {status === 'loading' && (
              <li className="p-4 text-sm text-ink-400">{t('common.loading')}</li>
            )}
            {status === 'error' && (
              <li className="p-4 text-sm text-red-400">{t('compendium.failedToLoad')}</li>
            )}
            {status === 'ready' && sorted.length === 0 && (
              <li className="p-4 text-sm text-ink-400">{t('compendium.noMatches')}</li>
            )}
            {sorted.map((item) => (
              <li key={item.id}>
                <Link
                  to={{
                    pathname: `/compendium/${categoryId}/${item.id}`,
                    search: params.toString(),
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
                    {(isUaSource(item.source) || item.ua) && (
                      <span className="rounded-full border border-arcane-500/50 px-1.5 text-[0.65rem] uppercase tracking-wide text-arcane-300">
                        {t('compendium.uaBadge')}
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-ink-400">
                    {isHomebrew(item) && item._manual
                      ? item.subtitle
                      : category.subtitle(item, t)}
                  </span>
                </Link>
              </li>
            ))}
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
              search: params.toString(),
            }}
            className="mb-4 inline-flex items-center gap-1 text-sm text-ink-300 hover:text-ink-50 md:hidden"
          >
            <ArrowLeft size={16} aria-hidden="true" /> {t('compendium.back')}
          </Link>

          {selected ? (
            <>
              {selected.image && (
                <div className="relative mb-4 inline-block">
                  <img
                    src={imageUrl(selected.image)}
                    alt={selected.name}
                    loading="lazy"
                    onClick={() => openLightbox(imageUrl(selected.image!), selected.name)}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    className="max-h-80 cursor-zoom-in rounded-lg border border-ink-700 object-contain"
                  />
                  {selected.token && selected.token !== selected.image && (
                    <img
                      src={imageUrl(selected.token)}
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
              {isHomebrew(selected) && selected._manual ? (
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
                              src={imageUrl(img.path)}
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
                              className="cursor-zoom-in rounded-lg border border-ink-700 object-contain"
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
                        search: new URLSearchParams({
                          ...(selected.page ? { page: String(selected.page) } : {}),
                          name: selected.name,
                        }).toString(),
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
          ) : (
            <p className="text-ink-400">{t('compendium.selectPrompt')}</p>
          )}
        </section>
      </div>
    </div>
  );
}
