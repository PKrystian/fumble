import { useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { categories } from '@/features/compendium/categories';
import { classFilterLabel } from '@/features/compendium/classNames';
import { useUrlSearchState } from '@/features/ui/useUrlSearchState';
import { Link } from '@/i18n/path';
import { useLocale } from '@/i18n/pathUtils';
import { useT } from '@/i18n/useT';
import { Button, SearchField, Select, ToggleChip } from '@/features/ui/primitives';
import { OriginalName } from '@/features/ui/OriginalName';
import { FumbleBadge } from './FumbleBadge';
import { FumbleVisibilityModal } from './FumbleVisibilityModal';
import {
  FUMBLE_CAMPAIGNS,
  fumbleHomebrewItems,
  fumbleParentClassId,
  isFumbleHomebrew,
} from './fumbleHomebrew';
import {
  fumbleItemMatchesVisibility,
  useFumbleHomebrewStore,
} from './fumbleHomebrewStore';
import {
  FUMBLE_LIBRARY_PAGE_SIZE,
  libraryExcerpt,
  libraryPage,
  librarySearchRank,
} from './fumbleLibraryView';

function fumbleItemTarget(item: ReturnType<typeof fumbleHomebrewItems>[number]): string {
  const parentClassId = fumbleParentClassId(item);
  return parentClassId
    ? `/compendium/classes/${parentClassId}/${item.id}`
    : `/compendium/${item.category}/${item.id}`;
}

export function FumbleLibrary({ page = false }: { page?: boolean }) {
  const { t } = useT();
  const locale = useLocale();
  const { params, update } = useUrlSearchState();
  const id = useId();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const showInCompendium = useFumbleHomebrewStore((s) => s.showInCompendium);
  const setShowInCompendium = useFumbleHomebrewStore((s) => s.setShowInCompendium);
  const compendiumCampaigns = useFumbleHomebrewStore((s) => s.compendiumCampaigns);
  const compendiumCategories = useFumbleHomebrewStore((s) => s.compendiumCategories);
  const items = useMemo(
    () => fumbleHomebrewItems(locale).filter(isFumbleHomebrew),
    [locale],
  );
  const categoryOptions = useMemo(
    () =>
      categories
        .filter((entry) => items.some((item) => item.category === entry.id))
        .sort((a, b) =>
          t(`compendium.categories.${a.id}`).localeCompare(
            t(`compendium.categories.${b.id}`),
            locale,
          ),
        ),
    [items, locale, t],
  );
  const campaignOptions = useMemo(
    () =>
      [...FUMBLE_CAMPAIGNS].sort((a, b) =>
        t(a.labelKey).localeCompare(t(b.labelKey), locale),
      ),
    [locale, t],
  );
  const catalog = useMemo(
    () =>
      items.map((item) => {
        const categoryLabel = t(`compendium.categories.${item.category}`);
        const parentId = fumbleParentClassId(item);
        const parent = items.find(
          (entry) => entry.category === 'classes' && entry.id === parentId,
        );
        const parentName =
          parent?.name ??
          (typeof item.className === 'string'
            ? classFilterLabel(item.className, locale)
            : '');
        const kind = item.isSubclass
          ? t('homebrew.fumbleSubclass', { name: parentName })
          : item.category === 'classes'
            ? t('homebrew.fumbleClass')
            : categoryLabel;
        const campaigns = item.campaigns
          .map((campaignId) => {
            const campaign = FUMBLE_CAMPAIGNS.find((entry) => entry.id === campaignId)!;
            return t(campaign.labelKey);
          })
          .join(', ');
        const excerpt = libraryExcerpt(item, locale);
        const metadata = [
          categoryLabel,
          kind,
          item.subtitle,
          campaigns,
          excerpt,
          typeof item.prerequisite === 'string' ? item.prerequisite : '',
        ].join(' ');
        return { item, categoryLabel, kind, campaigns, excerpt, metadata };
      }),
    [items, locale, t],
  );
  const query = params.get('q') ?? '';
  const requestedCategory = params.get('category');
  const category = categoryOptions.some((entry) => entry.id === requestedCategory)
    ? requestedCategory!
    : 'all';
  const campaign =
    FUMBLE_CAMPAIGNS.find((entry) => entry.id === params.get('campaign'))?.id ?? 'all';
  const sort = params.get('sort') === 'category' ? 'category' : 'name';
  const activeCount = Number(category !== 'all') + Number(campaign !== 'all');
  const visible = useMemo(
    () =>
      catalog
        .map((entry) => ({
          ...entry,
          rank: librarySearchRank(entry.item, query, entry.metadata),
        }))
        .filter(
          ({ item, rank }) =>
            rank >= 0 &&
            (category === 'all' || item.category === category) &&
            (campaign === 'all' || item.campaigns.includes(campaign)),
        )
        .sort(
          (a, b) =>
            (sort === 'category'
              ? a.categoryLabel.localeCompare(b.categoryLabel, locale)
              : 0) ||
            a.rank - b.rank ||
            a.item.name.localeCompare(b.item.name, locale),
        ),
    [campaign, catalog, category, locale, query, sort],
  );
  const currentPage = libraryPage(params.get('page'), visible.length);
  const totalPages = Math.max(1, Math.ceil(visible.length / FUMBLE_LIBRARY_PAGE_SIZE));
  const start = (currentPage - 1) * FUMBLE_LIBRARY_PAGE_SIZE;
  const selectedCount = items.filter((item) =>
    fumbleItemMatchesVisibility(item, {
      campaigns: compendiumCampaigns,
      categories: compendiumCategories,
    }),
  ).length;
  const visibilityStatus = showInCompendium
    ? t('homebrew.fumbleVisibilityOn', { count: selectedCount })
    : t('homebrew.fumbleVisibilityOff');
  const Heading = page ? 'h1' : 'h2';
  const changePage = (next: number) => {
    update({ page: next === 1 ? null : String(next) });
    toolbarRef.current?.focus();
    toolbarRef.current?.scrollIntoView({ block: 'start' });
  };
  const resetFilters = () => update({ category: null, campaign: null, page: null });

  return (
    <section className="mb-6 flex flex-col gap-6">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <Heading className="page-title">{t('homebrew.fumbleTitle')}</Heading>
          <FumbleBadge compact />
        </div>
      </header>

      <div className="rounded-xl border border-ink-700 bg-ink-900 p-3">
        <Button
          variant="ghost"
          aria-expanded={settingsOpen}
          aria-label={visibilityStatus}
          aria-controls={`${id}-settings`}
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full whitespace-normal text-left"
        >
          <span role="status" className="flex-1">
            {visibilityStatus}
          </span>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={settingsOpen ? 'shrink-0 rotate-180' : 'shrink-0'}
          />
        </Button>
        <div id={`${id}-settings`} hidden={!settingsOpen}>
          <p className="mt-3 text-sm text-ink-300">
            {t('homebrew.fumbleVisibilityHint')}
          </p>
          <div className="mt-3 flex flex-wrap items-start gap-2">
            <label className="flex min-h-10 max-w-sm items-center gap-2 text-sm text-ink-200">
              <input
                type="checkbox"
                checked={showInCompendium}
                onChange={(event) => setShowInCompendium(event.target.checked)}
                className="accent-arcane-500"
              />
              <span>{t('homebrew.showFumbleInCompendium')}</span>
            </label>
            <Button
              variant="secondary"
              onClick={() => setVisibilityOpen(true)}
              className="max-w-full whitespace-normal"
            >
              <SlidersHorizontal size={16} aria-hidden="true" className="shrink-0" />
              {t('homebrew.editFumbleVisibility')}
            </Button>
          </div>
        </div>
      </div>

      <div
        className="catalog-toolbar scroll-mt-4"
        ref={toolbarRef}
        tabIndex={-1}
        role="region"
        aria-label={t('homebrew.fumbleBrowse')}
      >
        <SearchField
          value={query}
          onChange={(event) => update({ q: event.target.value, page: null }, true)}
          placeholder={t('homebrew.searchFumble')}
          label={t('homebrew.searchFumble')}
          onClear={() => update({ q: null, page: null }, true)}
          clearLabel={t('common.clearSearch')}
        />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p role="status" aria-atomic="true" className="text-xs text-ink-400">
            {t('homebrew.fumbleShowing', { count: visible.length, total: items.length })}
            {visible.length > 0 && (
              <span className="ml-2">
                {' '}
                {t('homebrew.fumbleRange', {
                  start: start + 1,
                  end: Math.min(start + FUMBLE_LIBRARY_PAGE_SIZE, visible.length),
                })}
              </span>
            )}
          </p>
          <label className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-ink-300">
            <span>{t('homebrew.fumbleSort')}</span>
            <Select
              value={sort}
              onChange={(event) =>
                update({
                  sort: event.target.value === 'name' ? null : event.target.value,
                  page: null,
                })
              }
              className="max-w-full"
            >
              <option value="name">{t('homebrew.fumbleSortName')}</option>
              <option value="category">{t('homebrew.fumbleSortCategory')}</option>
            </Select>
          </label>
        </div>
        <Button
          variant="secondary"
          className="self-start md:hidden"
          aria-expanded={filtersOpen}
          aria-controls={`${id}-filters`}
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          {t('homebrew.fumbleFilters', { count: activeCount })}
        </Button>
        {activeCount > 0 && (
          <p className="text-sm text-ink-300 md:hidden">
            {[
              category !== 'all' ? t(`compendium.categories.${category}`) : '',
              campaign !== 'all'
                ? t(FUMBLE_CAMPAIGNS.find((entry) => entry.id === campaign)!.labelKey)
                : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
        <div
          id={`${id}-filters`}
          className={`${filtersOpen ? 'flex' : 'hidden'} flex-col gap-3 md:flex`}
        >
          <div
            className="flex flex-wrap gap-1"
            role="group"
            aria-label={t('homebrew.fumbleVisibilityCategories')}
          >
            <ToggleChip
              active={category === 'all'}
              onClick={() => update({ category: null, page: null })}
            >
              {t('homebrew.allFumbleCategories')}
            </ToggleChip>
            {categoryOptions.map((entry) => (
              <ToggleChip
                key={entry.id}
                active={category === entry.id}
                onClick={() => update({ category: entry.id, page: null })}
              >
                {t(`compendium.categories.${entry.id}`)}
              </ToggleChip>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <span className="field-label">{t('homebrew.fumbleCampaignFilter')}</span>
            <div
              className="flex flex-wrap gap-1"
              role="group"
              aria-label={t('homebrew.fumbleCampaignFilter')}
            >
              <ToggleChip
                active={campaign === 'all'}
                onClick={() => update({ campaign: null, page: null })}
              >
                {t('homebrew.allFumbleCampaigns')}
              </ToggleChip>
              {campaignOptions.map((entry) => (
                <ToggleChip
                  key={entry.id}
                  active={campaign === entry.id}
                  onClick={() => update({ campaign: entry.id, page: null })}
                >
                  {t(entry.labelKey)}
                </ToggleChip>
              ))}
            </div>
          </div>
        </div>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" className="self-start" onClick={resetFilters}>
            {t('compendium.filters.resetFilters')}
          </Button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <p>{t('homebrew.noFumbleMatches')}</p>
          {query && (
            <Button
              variant="secondary"
              className="mt-3"
              onClick={() => update({ q: null, page: null }, true)}
            >
              {t('common.clearSearch')}
            </Button>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {visible
            .slice(start, start + FUMBLE_LIBRARY_PAGE_SIZE)
            .map(({ item, kind, campaigns, excerpt }) => (
              <li key={item.id}>
                <Link
                  to={
                    page
                      ? {
                          pathname: fumbleItemTarget(item),
                          search: new URLSearchParams({
                            library: params.toString(),
                          }).toString(),
                        }
                      : fumbleItemTarget(item)
                  }
                  className="catalog-card h-full"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink-50">{item.name}</span>
                    <OriginalName name={item.englishName} className="text-xs" />
                    <FumbleBadge compact />
                  </span>
                  <span className="mt-1 block text-xs text-ink-400">
                    {kind} - {item.subtitle}
                  </span>
                  {excerpt && (
                    <span className="mt-2 block text-sm text-ink-300">{excerpt}</span>
                  )}
                  <span className="mt-2 block text-xs text-ink-400">{campaigns}</span>
                </Link>
              </li>
            ))}
        </ul>
      )}
      {totalPages > 1 && (
        <nav
          aria-label={t('homebrew.fumblePagination')}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <Button
            variant="secondary"
            disabled={currentPage === 1}
            onClick={() => changePage(currentPage - 1)}
          >
            {t('homebrew.fumblePrevious')}
          </Button>
          <span className="text-sm text-ink-300">
            {t('homebrew.fumblePage', { page: currentPage, total: totalPages })}
          </span>
          <Button
            variant="secondary"
            disabled={currentPage === totalPages}
            onClick={() => changePage(currentPage + 1)}
          >
            {t('homebrew.fumbleNext')}
          </Button>
        </nav>
      )}
      {visibilityOpen && (
        <FumbleVisibilityModal items={items} onClose={() => setVisibilityOpen(false)} />
      )}
    </section>
  );
}
