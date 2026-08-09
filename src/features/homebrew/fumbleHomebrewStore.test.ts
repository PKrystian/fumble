import { beforeEach, describe, expect, it } from 'vitest';
import {
  fumbleItemMatchesVisibility,
  useFumbleHomebrewStore,
} from './fumbleHomebrewStore';
import type { FumbleHomebrewItem } from './fumbleHomebrew';

describe('Fumble homebrew visibility store', () => {
  beforeEach(() => {
    localStorage.clear();
    useFumbleHomebrewStore.setState({
      showInCompendium: false,
      compendiumCampaigns: null,
      compendiumCategories: null,
    });
  });

  it('is off by default and persists the explicit choice in state', () => {
    expect(useFumbleHomebrewStore.getState().showInCompendium).toBe(false);

    useFumbleHomebrewStore.getState().setShowInCompendium(true);

    expect(useFumbleHomebrewStore.getState().showInCompendium).toBe(true);
  });

  it('stores campaign and content type filters', () => {
    useFumbleHomebrewStore.getState().setCompendiumFilters({
      campaigns: ['siedmiu-zbiegow'],
      categories: ['classes'],
    });

    expect(useFumbleHomebrewStore.getState()).toMatchObject({
      compendiumCampaigns: ['siedmiu-zbiegow'],
      compendiumCategories: ['classes'],
    });
  });

  it('matches an item against both visibility filters', () => {
    const item: Pick<FumbleHomebrewItem, 'campaigns' | 'category'> = {
      campaigns: ['glod-smoka'],
      category: 'classes',
    };

    expect(
      fumbleItemMatchesVisibility(item, {
        campaigns: ['glod-smoka'],
        categories: ['classes'],
      }),
    ).toBe(true);
    expect(
      fumbleItemMatchesVisibility(item, {
        campaigns: ['grobowiec-zaglady'],
        categories: ['classes'],
      }),
    ).toBe(false);
    expect(
      fumbleItemMatchesVisibility(item, {
        campaigns: ['glod-smoka'],
        categories: ['items'],
      }),
    ).toBe(false);
  });
});
