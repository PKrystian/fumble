import { describe, expect, it } from 'vitest';
import { reorder } from './store';

describe('reorder', () => {
  it('moves an item forward', () => {
    expect(reorder(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves an item backward', () => {
    expect(reorder(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('returns the list unchanged for no-op or out-of-range moves', () => {
    const list = ['a', 'b', 'c'];
    expect(reorder(list, 1, 1)).toBe(list);
    expect(reorder(list, 0, 9)).toBe(list);
    expect(reorder(list, -1, 0)).toBe(list);
  });
});
