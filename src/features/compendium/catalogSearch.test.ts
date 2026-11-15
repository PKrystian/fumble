import { describe, expect, it } from 'vitest';
import { catalogSearchText } from './catalogSearch';

describe('catalogSearchText', () => {
  it('normalizes nested descriptions and skips technical fields', () => {
    const entry = {
      id: 'excluded',
      name: 'Łowca',
      source: 'HIDDEN',
      srd: false,
      entries: [
        {
          type: 'entries',
          name: 'Efekt',
          entries: ['{@spell Fireball|XPHB|Kula ognia}', 3, null],
        },
      ],
      _filterData: { name: 'Old name' },
    };
    expect(catalogSearchText(entry)).toBe('lowca efekt fireball kula ognia');
    expect(catalogSearchText(entry)).not.toContain('excluded');
    expect(catalogSearchText(entry)).not.toContain('hidden');
    expect(catalogSearchText(entry)).toBe(catalogSearchText(entry));
  });
});
