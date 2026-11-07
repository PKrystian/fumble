import { describe, expect, it } from 'vitest';
import { readMonsterSnapshot } from './monsterSnapshot';

describe('monster snapshot', () => {
  const entry = { path: '/pl/compendium/bestiary/hawk/', item: { id: 'hawk' } };

  it('matches the localized URL with or without a trailing slash', () => {
    expect(readMonsterSnapshot(JSON.stringify(entry), entry.path.slice(0, -1))).toEqual(
      entry,
    );
    expect(
      readMonsterSnapshot(JSON.stringify(entry), '/compendium/bestiary/hawk/'),
    ).toBeUndefined();
  });

  it('skips empty or malformed snapshots and snapshots without a record', () => {
    expect(readMonsterSnapshot(undefined, entry.path)).toBeUndefined();
    expect(readMonsterSnapshot('{', entry.path)).toBeUndefined();
    expect(
      readMonsterSnapshot(JSON.stringify({ path: entry.path }), entry.path),
    ).toBeUndefined();
  });
});
