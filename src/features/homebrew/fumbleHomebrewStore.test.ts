import { beforeEach, describe, expect, it } from 'vitest';
import { useFumbleHomebrewStore } from './fumbleHomebrewStore';

describe('Fumble homebrew visibility store', () => {
  beforeEach(() => {
    localStorage.clear();
    useFumbleHomebrewStore.setState({ showInCompendium: false });
  });

  it('is off by default and persists the explicit choice in state', () => {
    expect(useFumbleHomebrewStore.getState().showInCompendium).toBe(false);

    useFumbleHomebrewStore.getState().setShowInCompendium(true);

    expect(useFumbleHomebrewStore.getState().showInCompendium).toBe(true);
  });
});
