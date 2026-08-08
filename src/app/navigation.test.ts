import { describe, expect, it } from 'vitest';
import { Logo } from '@/features/ui/Logo';
import { allNavItems, navSections } from './navigation';

describe('navigation', () => {
  it('exposes direct compendium category routes', () => {
    expect(allNavItems.some((item) => item.to === '/compendium/spells')).toBe(true);
    expect(allNavItems.some((item) => item.to === '/compendium/bestiary')).toBe(true);
  });

  it('has unique paths across all sections', () => {
    const paths = allNavItems.map((item) => item.to);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('flattens every section item into allNavItems', () => {
    const total = navSections.reduce((sum, section) => sum + section.items.length, 0);
    expect(allNavItems).toHaveLength(total);
  });

  it('places the Fumble homebrew page after the campaign references', () => {
    const campaign = navSections.find(
      (section) => section.titleKey === 'nav.sectionCampaign',
    );
    const paths = campaign?.items.map((item) => item.to);

    expect(paths).toEqual(['/wiki', '/session-log', '/fumble-homebrew']);
    expect(campaign?.items.at(-1)?.icon).toBe(Logo);
  });
});
