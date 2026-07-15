import { describe, expect, it } from 'vitest';
import { allNavItems, navSections } from './navigation';

describe('navigation', () => {
  it('exposes a home route', () => {
    expect(allNavItems.some((item) => item.to === '/')).toBe(true);
  });

  it('has unique paths across all sections', () => {
    const paths = allNavItems.map((item) => item.to);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('flattens every section item into allNavItems', () => {
    const total = navSections.reduce((sum, section) => sum + section.items.length, 0);
    expect(allNavItems).toHaveLength(total);
  });
});
