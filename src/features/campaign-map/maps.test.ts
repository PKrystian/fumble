import { describe, expect, it } from 'vitest';
import {
  compressRevealedRanges,
  expandRevealedRanges,
  getCampaignMap,
  getHexGridPath,
  getMapEditorStorageKey,
  parseMapEditorCells,
} from './maps';

describe('campaign maps', () => {
  it('finds the configured Chult map', () => {
    const map = getCampaignMap('grobowiec-zaglady');
    expect(map).toMatchObject({
      id: 'chult',
      columns: 72,
      rows: 85,
    });
    expect(expandRevealedRanges(map?.revealedRanges ?? [], 72 * 85).size).toBeGreaterThan(
      0,
    );
    expect(getCampaignMap('missing')).toBeNull();
  });

  it('expands single cells and ranges within the map bounds', () => {
    expect(expandRevealedRanges(['1', '3-5'], 6)).toEqual(new Set([1, 3, 4, 5]));
    expect(expandRevealedRanges(['5-3'], 6)).toEqual(new Set([3, 4, 5]));
    expect(expandRevealedRanges(['0-2', '3-99'], 6)).toEqual(new Set([0, 1, 2, 3, 4, 5]));
  });

  it('ignores invalid ranges and empty maps', () => {
    expect(expandRevealedRanges(['abc', '1-2-3', ''], 4)).toEqual(new Set());
    expect(expandRevealedRanges(['99'], 4)).toEqual(new Set());
    expect(expandRevealedRanges(['0-4'], 0)).toEqual(new Set());
  });

  it('compresses editor cells into sorted inclusive ranges', () => {
    expect(compressRevealedRanges(new Set())).toEqual([]);
    expect(compressRevealedRanges(new Set([8, 3, 4, 6, 7, 10]))).toEqual([
      '3-4',
      '6-8',
      '10',
    ]);
  });

  it('builds a hex grid path for valid revealed cells', () => {
    const path = getHexGridPath(2, 2, new Set([0, 3]));
    expect(path).toMatch(/^M \d/);
    expect(path.match(/M /g)).toHaveLength(2);
    expect(path).toContain(' Z');
  });

  it('returns an empty hex grid path for empty or invalid cells', () => {
    expect(getHexGridPath(0, 2, new Set([0]))).toBe('');
    expect(getHexGridPath(2, 2, new Set())).toBe('');
    expect(getHexGridPath(2, 2, new Set([-1, 4, 4.5]))).toBe('');
  });

  it('parses saved editor cells and rejects invalid storage', () => {
    expect(parseMapEditorCells(null, 10)).toBeNull();
    expect(parseMapEditorCells('{"cells":[]}', 10)).toBeNull();
    expect(parseMapEditorCells('{', 10)).toBeNull();
    expect(parseMapEditorCells('[0, 2, 2, 9, 10, -1, "3"]', 10)).toEqual(
      new Set([0, 2, 9]),
    );
  });

  it('creates a campaign-scoped editor storage key', () => {
    expect(getMapEditorStorageKey('grobowiec-zaglady')).toBe(
      'fumble-campaign-map-editor:grobowiec-zaglady',
    );
  });
});
