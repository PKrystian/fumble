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

  it('treats null filters and empty campaign lists as unrestricted only when valid', () => {
    const item: Pick<FumbleHomebrewItem, 'campaigns' | 'category'> = {
      campaigns: [],
      category: 'classes',
    };

    expect(fumbleItemMatchesVisibility(item, { campaigns: null, categories: null })).toBe(
      true,
    );
    expect(
      fumbleItemMatchesVisibility(item, { campaigns: null, categories: ['classes'] }),
    ).toBe(true);
    expect(
      fumbleItemMatchesVisibility(item, { campaigns: [], categories: ['classes'] }),
    ).toBe(false);
    expect(
      fumbleItemMatchesVisibility(item, { campaigns: null, categories: ['items'] }),
    ).toBe(false);
  });

  it('migrates missing and configured visibility filters', () => {
    const migrate = useFumbleHomebrewStore.persist.getOptions().migrate!;
    expect(migrate(undefined, 1)).toMatchObject({
      compendiumCampaigns: null,
      compendiumCategories: null,
    });
    expect(
      migrate(
        {
          compendiumCampaigns: ['glod-smoka'],
          compendiumCategories: ['spells'],
        },
        1,
      ),
    ).toMatchObject({
      compendiumCampaigns: ['glod-smoka'],
      compendiumCategories: ['spells'],
    });
  });
});
