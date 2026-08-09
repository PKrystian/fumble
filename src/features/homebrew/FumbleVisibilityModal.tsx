import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { CompendiumCategoryId } from '@/data/compendium/types';
import { Button, IconButton } from '@/features/ui/primitives';
import { useT } from '@/i18n/useT';
import {
  FUMBLE_CAMPAIGNS,
  type FumbleCampaignId,
  type FumbleHomebrewItem,
} from './fumbleHomebrew';
import {
  fumbleItemMatchesVisibility,
  useFumbleHomebrewStore,
} from './fumbleHomebrewStore';

interface FumbleVisibilityModalProps {
  items: FumbleHomebrewItem[];
  onClose: () => void;
}

export function FumbleVisibilityModal({ items, onClose }: FumbleVisibilityModalProps) {
  const { t } = useT();
  const compendiumCampaigns = useFumbleHomebrewStore((s) => s.compendiumCampaigns);
  const compendiumCategories = useFumbleHomebrewStore((s) => s.compendiumCategories);
  const setCompendiumFilters = useFumbleHomebrewStore((s) => s.setCompendiumFilters);
  const categoryOptions = useMemo(
    () =>
      [...new Set(items.map((item) => item.category))].sort((a, b) =>
        t(`compendium.categories.${a}`).localeCompare(t(`compendium.categories.${b}`)),
      ),
    [items, t],
  );
  const campaignOptions = FUMBLE_CAMPAIGNS.map((campaign) => campaign.id);
  const [draftCampaigns, setDraftCampaigns] = useState<FumbleCampaignId[]>(
    () => compendiumCampaigns ?? campaignOptions,
  );
  const [draftCategories, setDraftCategories] = useState<CompendiumCategoryId[]>(
    () => compendiumCategories ?? categoryOptions,
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const selectedCount = items.filter((item) =>
    fumbleItemMatchesVisibility(item, {
      campaigns: draftCampaigns,
      categories: draftCategories,
    }),
  ).length;

  const toggleCampaign = (campaign: FumbleCampaignId) => {
    setDraftCampaigns((selected) =>
      selected.includes(campaign)
        ? selected.filter((value) => value !== campaign)
        : [...selected, campaign],
    );
  };

  const toggleCategory = (category: CompendiumCategoryId) => {
    setDraftCategories((selected) =>
      selected.includes(category)
        ? selected.filter((value) => value !== category)
        : [...selected, category],
    );
  };

  const save = () => {
    setCompendiumFilters({
      campaigns: draftCampaigns.length === campaignOptions.length ? null : draftCampaigns,
      categories:
        draftCategories.length === categoryOptions.length ? null : draftCategories,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fumble-visibility-title"
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-12"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-ink-700 bg-ink-900 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-ink-700 p-3">
          <h2
            id="fumble-visibility-title"
            className="font-display text-lg font-bold text-ink-50"
          >
            {t('homebrew.fumbleVisibilityDialog')}
          </h2>
          <IconButton
            label={t('homebrew.fumbleVisibilityClose')}
            onClick={onClose}
            size="sm"
            variant="ghost"
          >
            <X size={16} />
          </IconButton>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto p-4">
          <p className="text-sm text-ink-300">
            {t('homebrew.fumbleVisibilityDescription')}
          </p>

          <fieldset className="flex flex-col gap-3">
            <legend className="font-display text-sm font-bold uppercase tracking-wide text-ember-400">
              {t('homebrew.fumbleVisibilityCampaigns')}
            </legend>
            <div className="flex justify-end gap-2 text-[0.65rem]">
              <Button
                variant="ghost"
                size="sm"
                className="min-h-0 px-1 py-0 text-[0.65rem]"
                onClick={() => setDraftCampaigns(campaignOptions)}
              >
                {t('homebrew.fumbleVisibilitySelectAllCampaigns')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-0 px-1 py-0 text-[0.65rem]"
                onClick={() => setDraftCampaigns([])}
              >
                {t('homebrew.fumbleVisibilityClearCampaigns')}
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {FUMBLE_CAMPAIGNS.map((campaign) => {
                const label = t(campaign.labelKey);
                return (
                  <label
                    key={campaign.id}
                    className="flex items-start gap-2 rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-200"
                  >
                    <input
                      type="checkbox"
                      checked={draftCampaigns.includes(campaign.id)}
                      onChange={() => toggleCampaign(campaign.id)}
                      className="mt-0.5 accent-arcane-500"
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="font-display text-sm font-bold uppercase tracking-wide text-ember-400">
              {t('homebrew.fumbleVisibilityCategories')}
            </legend>
            <div className="flex justify-end gap-2 text-[0.65rem]">
              <Button
                variant="ghost"
                size="sm"
                className="min-h-0 px-1 py-0 text-[0.65rem]"
                onClick={() => setDraftCategories(categoryOptions)}
              >
                {t('homebrew.fumbleVisibilitySelectAllCategories')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-0 px-1 py-0 text-[0.65rem]"
                onClick={() => setDraftCategories([])}
              >
                {t('homebrew.fumbleVisibilityClearCategories')}
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {categoryOptions.map((category) => {
                const label = t(`compendium.categories.${category}`);
                return (
                  <label
                    key={category}
                    className="flex items-start gap-2 rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-200"
                  >
                    <input
                      type="checkbox"
                      checked={draftCategories.includes(category)}
                      onChange={() => toggleCategory(category)}
                      className="mt-0.5 accent-arcane-500"
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {selectedCount === 0 && (
            <p className="rounded-lg border border-ember-500/50 bg-ember-950/30 px-3 py-2 text-sm text-ember-200">
              {t('homebrew.fumbleVisibilityNoSelection')}
            </p>
          )}
          <p className="text-xs text-ink-400">
            {t('homebrew.fumbleVisibilitySelected', { count: selectedCount })}
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-ink-700 p-3">
          <Button variant="ghost" onClick={onClose}>
            {t('homebrew.fumbleVisibilityCancel')}
          </Button>
          <Button variant="primary" onClick={save}>
            {t('homebrew.fumbleVisibilitySave')}
          </Button>
        </div>
      </div>
    </div>
  );
}
