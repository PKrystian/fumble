import { useMemo } from 'react';
import { Search } from 'lucide-react';
import { categories } from '@/features/compendium/categories';
import { normalizeSearchText } from '@/data/compendium/searchText';
import { useUrlSearchState } from '@/features/ui/useUrlSearchState';
import { Link, useLocale } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { ToggleChip } from '@/features/ui/primitives';
import { FumbleBadge } from './FumbleBadge';
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
    <section className="mb-6 flex flex-col gap-4 rounded-xl border border-arcane-500/40 bg-ink-900 p-4 shadow-lg shadow-arcane-950/20">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Heading className="font-display text-3xl font-bold text-ink-50">
              {t('homebrew.fumbleTitle')}
            </Heading>
            <FumbleBadge compact />
          </div>
        </div>
        <label className="flex max-w-sm items-start gap-2 rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-200">
          <input
            type="checkbox"
            checked={showInCompendium}
            onChange={(event) => setShowInCompendium(event.target.checked)}
            className="mt-0.5 accent-arcane-500"
          />
          <span className="block font-medium text-ink-50">
            {t('homebrew.showFumbleInCompendium')}
          </span>
        </label>
      </header>

      <div className="flex flex-col gap-3">
        <label className="relative">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500"
          />
          <input
            type="text"
            value={query}
            onChange={(event) => update({ q: event.target.value }, true)}
            placeholder={t('homebrew.searchFumble')}
            aria-label={t('homebrew.searchFumble')}
            className="w-full rounded-md border border-ink-700 bg-ink-950 py-2 pl-8 pr-3 text-sm text-ink-50 placeholder:text-ink-500 focus:border-arcane-500 focus:outline-none"
          />
        </label>
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
      </div>

      <div className="flex items-baseline justify-between gap-3 text-xs text-ink-400">
        <span>
          {t('homebrew.fumbleShowing', { count: visible.length, total: items.length })}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-ink-700 px-4 py-8 text-center text-sm text-ink-400">
          {t('homebrew.noFumbleMatches')}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {visible.map((item) => (
            <li key={item.id}>
              <Link
                to={fumbleItemTarget(item)}
                className="block rounded-lg border border-ink-700 bg-ink-950/70 px-3 py-2 transition-colors hover:border-arcane-500 hover:bg-ink-800"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink-50">{item.name}</span>
                  {item.englishName && (
                    <span className="text-xs text-ink-500">{item.englishName}</span>
                  )}
                  <FumbleBadge compact />
                </span>
                <span className="mt-1 block text-xs text-ink-400">
                  {t(`compendium.categories.${item.category}`)} · {item.subtitle}
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
    </section>
  );
}
