import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CompendiumCategoryId } from '@/data/compendium/types';
import type { FumbleCampaignId, FumbleHomebrewItem } from './fumbleHomebrew';

export interface FumbleCompendiumFilters {
  campaigns: FumbleCampaignId[] | null;
  categories: CompendiumCategoryId[] | null;
}

interface FumbleHomebrewState {
  showInCompendium: boolean;
  compendiumCampaigns: FumbleCampaignId[] | null;
  compendiumCategories: CompendiumCategoryId[] | null;
  setShowInCompendium: (show: boolean) => void;
  setCompendiumFilters: (filters: FumbleCompendiumFilters) => void;
}

export function fumbleItemMatchesVisibility(
  item: Pick<FumbleHomebrewItem, 'campaigns' | 'category'>,
  filters: FumbleCompendiumFilters,
): boolean {
  const matchesCampaign =
    filters.campaigns === null ||
    filters.campaigns.some((campaign) => item.campaigns.includes(campaign));
  const matchesCategory =
    filters.categories === null || filters.categories.includes(item.category);
  return matchesCampaign && matchesCategory;
}

export const useFumbleHomebrewStore = create<FumbleHomebrewState>()(
  persist(
    (set) => ({
      showInCompendium: false,
      compendiumCampaigns: null,
      compendiumCategories: null,
      setShowInCompendium: (show) => set({ showInCompendium: show }),
      setCompendiumFilters: (filters) =>
        set({
          compendiumCampaigns: filters.campaigns,
          compendiumCategories: filters.categories,
        }),
    }),
    {
      name: 'fumble-homebrew-visibility',
      version: 2,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<FumbleHomebrewState>;
        return {
          ...state,
          compendiumCampaigns: state.compendiumCampaigns ?? null,
          compendiumCategories: state.compendiumCategories ?? null,
        } as FumbleHomebrewState;
      },
    },
  ),
);
