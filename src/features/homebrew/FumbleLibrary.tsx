import { useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { categories } from '@/features/compendium/categories';
import { normalizeSearchText } from '@/data/compendium/searchText';
import { useUrlSearchState } from '@/features/ui/useUrlSearchState';
import { Link } from '@/i18n/path';
import { useLocale } from '@/i18n/pathUtils';
import { useT } from '@/i18n/useT';
import { Button, SearchField, ToggleChip } from '@/features/ui/primitives';
import { OriginalName } from '@/features/ui/OriginalName';
import { FumbleBadge } from './FumbleBadge';
import { FumbleVisibilityModal } from './FumbleVisibilityModal';
import {
  FUMBLE_CAMPAIGNS,
  fumbleHomebrewItems,
  fumbleParentClassId,
  isFumbleHomebrew,
} from './fumbleHomebrew';
import { useFumbleHomebrewStore } from './fumbleHomebrewStore';

function fumbleItemTarget(
  item: ReturnType<typeof fumbleHomebrewItems>[number],
): string | { pathname: string; search: string } {
  const parentClassId = fumbleParentClassId(item);
  return parentClassId
    ? `/compendium/classes/${parentClassId}/${item.id}`
    : `/compendium/${item.category}/${item.id}`;
}

export function FumbleLibrary({ page = false }: { page?: boolean }) {
  const { t } = useT();
  const locale = useLocale();
  const { params, update } = useUrlSearchState();
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const showInCompendium = useFumbleHomebrewStore((s) => s.showInCompendium);
  const setShowInCompendium = useFumbleHomebrewStore((s) => s.setShowInCompendium);
  const items = useMemo(
    () => fumbleHomebrewItems(locale).filter(isFumbleHomebrew),
    [locale],
  );
  const query = params.get('q') ?? '';
  const requestedCategory = params.get('category');
  const category =
    requestedCategory && items.some((item) => item.category === requestedCategory)
      ? requestedCategory
      : 'all';
  const requestedCampaign = params.get('campaign');
  const campaign =
    FUMBLE_CAMPAIGNS.find((entry) => entry.id === requestedCampaign)?.id ?? 'all';
  const visible = useMemo(() => {
    const term = normalizeSearchText(query.trim());
    return items.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (campaign !== 'all' && !item.campaigns.includes(campaign)) return false;
      if (!term) return true;
      return (
        normalizeSearchText(item.name).includes(term) ||
        normalizeSearchText(item.englishName ?? '').includes(term)
      );
    });
  }, [campaign, category, items, query]);
  const Heading = page ? 'h1' : 'h2';

  return (
    <section className="mb-6 flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Heading className="page-title">{t('homebrew.fumbleTitle')}</Heading>
            <FumbleBadge compact />
          </div>
        </div>
        <div className="flex flex-wrap items-start justify-end gap-2">
          <label className="flex min-h-10 max-w-sm items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-3.5 py-2 text-sm font-medium text-ink-200 transition-colors hover:border-ink-600 hover:bg-ink-800 hover:text-ink-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-arcane-400 focus-within:ring-offset-2 focus-within:ring-offset-ink-950">
            <input
              type="checkbox"
              checked={showInCompendium}
              onChange={(event) => setShowInCompendium(event.target.checked)}
              className="accent-arcane-500"
            />
            <span className="block">{t('homebrew.showFumbleInCompendium')}</span>
          </label>
          <Button variant="secondary" size="md" onClick={() => setVisibilityOpen(true)}>
            <SlidersHorizontal size={16} aria-hidden="true" />
            {t('homebrew.editFumbleVisibility')}
          </Button>
        </div>
      </header>

      <div className="catalog-toolbar">
        <SearchField
          value={query}
          onChange={(event) => update({ q: event.target.value }, true)}
          placeholder={t('homebrew.searchFumble')}
          label={t('homebrew.searchFumble')}
          onClear={() => update({ q: null }, true)}
          clearLabel={t('common.clearSearch')}
        />
        <div className="flex flex-wrap gap-1">
          <ToggleChip
            active={category === 'all'}
            onClick={() => update({ category: null })}
          >
            {t('homebrew.allFumbleCategories')}
          </ToggleChip>
          {categories.map((entryCategory) => {
            const hasItems = items.some((item) => item.category === entryCategory.id);
            if (!hasItems) return null;
            return (
              <ToggleChip
                key={entryCategory.id}
                active={category === entryCategory.id}
                onClick={() => update({ category: entryCategory.id })}
              >
                {t(`compendium.categories.${entryCategory.id}`)}
              </ToggleChip>
            );
          })}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            {t('homebrew.fumbleCampaignFilter')}
          </span>
          <div className="flex flex-wrap gap-1">
            <ToggleChip
              active={campaign === 'all'}
              onClick={() => update({ campaign: null })}
            >
              {t('homebrew.allFumbleCampaigns')}
            </ToggleChip>
            {FUMBLE_CAMPAIGNS.map((entry) => (
              <ToggleChip
                key={entry.id}
                active={campaign === entry.id}
                onClick={() => update({ campaign: entry.id })}
              >
                {t(entry.labelKey)}
              </ToggleChip>
            ))}
          </div>
        </div>
        {(category !== 'all' || campaign !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => update({ category: null, campaign: null })}
          >
            {t('compendium.filters.resetFilters')}
          </Button>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-3 text-xs text-ink-400">
        <span>
          {t('homebrew.fumbleShowing', { count: visible.length, total: items.length })}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="empty-state">{t('homebrew.noFumbleMatches')}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {visible.map((item) => (
            <li key={item.id}>
              <Link to={fumbleItemTarget(item)} className="catalog-card">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink-50">{item.name}</span>
                  <OriginalName name={item.englishName} className="text-xs" />
                  <FumbleBadge compact />
                </span>
                <span className="mt-1 block text-xs text-ink-400">
                  {t(`compendium.categories.${item.category}`)} - {item.subtitle}
                </span>
                <span className="mt-1 block text-xs text-ink-500">
                  {item.campaigns
                    .map((id) => {
                      const campaignEntry = FUMBLE_CAMPAIGNS.find(
                        (entry) => entry.id === id,
                      );
                      return campaignEntry ? t(campaignEntry.labelKey) : id;
                    })
                    .join(', ')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {visibilityOpen && (
        <FumbleVisibilityModal items={items} onClose={() => setVisibilityOpen(false)} />
      )}
    </section>
  );
}
