import { describe, expect, it } from 'vitest';
import { Logo } from '@/features/ui/Logo';
import { allNavItems, compendiumNavItem, navAccentText, navSections } from './navigation';

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

  it('gives every section an accent and every link its own icon and description', () => {
    for (const section of navSections)
      expect(navAccentText[section.accent]).toMatch(/^text-/);
    const items = [compendiumNavItem, ...allNavItems];
    expect(new Set(items.map((item) => item.icon)).size).toBe(items.length);
    expect(new Set(items.map((item) => item.descriptionKey)).size).toBe(items.length);
    expect(allNavItems).not.toContain(compendiumNavItem);
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
