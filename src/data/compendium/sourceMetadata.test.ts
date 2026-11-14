import { describe, expect, it } from 'vitest';
import { repairSourceMetadata } from './sourceMetadata';

describe('repairSourceMetadata', () => {
  const base = {
    id: 'end-concentration',
    name: 'End Concentration',
    source: 'XPHB',
    srd: false,
    time: 'undefined undefineds',
  };
  it('repairs known action times and preserves unrelated records', () => {
    expect(repairSourceMetadata(base).time).toBe('Free');
    expect(
      repairSourceMetadata({ ...base, id: 'cast-a-spell', source: 'PHB' }).time,
    ).toBe('Varies');
    for (const entry of [
      { ...base, source: 'CUSTOM' },
      { ...base, time: '1 action' },
      { ...base, id: 'unknown' },
      { id: 'empty', name: 'Empty', source: 'PHB', srd: false },
    ])
      expect(repairSourceMetadata(entry)).toBe(entry);
  });
});
