import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CHARACTERS_KEY } from '@/features/character/characterData';
import { ENCOUNTER_KEY } from '@/features/dm/encounterModel';
import { HOMEBREW_KEY } from '@/features/homebrew/store';
import {
  ACTIVITY_CHARACTERS_KEY,
  ACTIVITY_ENCOUNTER_KEY,
  ACTIVITY_HOMEBREW_KEY,
  ACTIVITY_SESSIONS_KEY,
  readLocalActivity,
  recentBookPath,
} from './recentActivity';

const stored = (state: unknown, version = 1) => JSON.stringify({ version, state });
const reader = (data: Record<string, string>) => (key: string) => data[key] ?? null;

const character = (id: string, updatedAt: unknown, extra: object = {}) => ({
  id,
  name: ` ${id} `,
  level: 3,
  updatedAt,
  ...extra,
});

const combatant = (id: string) => ({
  id,
  name: id,
  initiative: 10,
  ac: null,
  hpCurrent: null,
  hpMax: null,
  conditions: '',
  isPlayer: false,
});

describe('recent local activity', () => {
  beforeEach(() => localStorage.clear());

  it('uses the storage keys owned by the features', () => {
    expect(ACTIVITY_CHARACTERS_KEY).toBe(CHARACTERS_KEY);
    expect(ACTIVITY_ENCOUNTER_KEY).toBe(ENCOUNTER_KEY);
    expect(ACTIVITY_HOMEBREW_KEY).toBe(HOMEBREW_KEY);
    expect(ACTIVITY_SESSIONS_KEY).toBe('fumble-sessions');
  });

  it('reports no activity for empty storage', () => {
    expect(readLocalActivity()).toEqual({
      items: [],
      hasData: false,
      dataSince: null,
    });
  });

  it('reads every kind from browser storage without writing', () => {
    localStorage.setItem(
      ACTIVITY_CHARACTERS_KEY,
      stored({
        characters: {
          a: character('a', 10, { createdAt: 900 }),
          b: character('b', 40, { level: 'x', name: 5, createdAt: 'x' }),
          c: character('c', 30),
          d: character('d', 20),
          bad: { name: 'No id' },
          empty: { id: '' },
          text: 'invalid',
        },
      }),
    );
    localStorage.setItem(
      'fumble-book-reading',
      stored(
        {
          positions: {
            old: { chapter: 1, updatedAt: 5 },
            phb: { chapter: 2, section: 'part-1', updatedAt: 9 },
          },
          wholeBook: false,
          wide: false,
        },
        1,
      ),
    );
    localStorage.setItem(
      ACTIVITY_SESSIONS_KEY,
      stored({
        sessions: [
          { id: 'one', title: 'First', createdAt: 700, updatedAt: 50 },
          { id: 'two', title: ' Chosen ', createdAt: 800 },
          'invalid',
        ],
        selectedSessionId: 'two',
      }),
    );
    localStorage.setItem(
      'fumble-initiative',
      stored({ combatants: [combatant('x'), combatant('y')], round: 2, turnId: 'x' }, 2),
    );
    localStorage.setItem(
      ACTIVITY_ENCOUNTER_KEY,
      stored({
        draft: { name: ' Ambush ', monsters: [{ count: 3 }, { count: 0 }, 'bad'] },
      }),
    );
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    expect(readLocalActivity()).toEqual({
      hasData: true,
      dataSince: 700,
      items: [
        { kind: 'character', id: 'b', name: '', level: 1 },
        { kind: 'character', id: 'c', name: 'c', level: 3 },
        { kind: 'book', id: 'phb', chapter: 2, section: 'part-1' },
        { kind: 'session', title: 'Chosen' },
        { kind: 'initiative', round: 2, count: 2 },
        { kind: 'encounter', name: 'Ambush', count: 5 },
      ],
    });
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it('falls back to the latest session and keeps three characters without other items', () => {
    const activity = readLocalActivity(
      reader({
        [ACTIVITY_CHARACTERS_KEY]: stored({
          characters: {
            a: character('a', 1),
            b: character('b', 'never'),
            c: character('c', 3),
            d: character('d', 4),
          },
        }),
      }),
    );
    expect(activity.items.map((item) => item.kind === 'character' && item.id)).toEqual([
      'd',
      'c',
      'a',
    ]);

    expect(
      readLocalActivity(
        reader({
          [ACTIVITY_SESSIONS_KEY]: stored({
            sessions: [
              { id: 'one', title: 'Older', createdAt: 10 },
              { id: 'two', createdAt: 5, updatedAt: 20 },
              { id: 'three' },
            ],
            selectedSessionId: 'missing',
          }),
        }),
      ).items,
    ).toEqual([{ kind: 'session', title: '' }]);
  });

  it('omits empty, idle and unreadable data', () => {
    expect(
      readLocalActivity(
        reader({
          [ACTIVITY_CHARACTERS_KEY]: '{broken',
          [ACTIVITY_SESSIONS_KEY]: stored({ sessions: 'none' }),
          'fumble-book-reading': '{broken',
          'fumble-initiative': stored({ combatants: [], round: 0, turnId: null }, 2),
          [ACTIVITY_ENCOUNTER_KEY]: stored({ draft: { name: '', monsters: [] } }),
          [ACTIVITY_HOMEBREW_KEY]: stored({ entries: [] }),
        }),
      ),
    ).toEqual({ items: [], hasData: false, dataSince: null });
    expect(
      readLocalActivity(
        reader({
          [ACTIVITY_CHARACTERS_KEY]: stored({ characters: [] }),
          [ACTIVITY_SESSIONS_KEY]: 'null',
          'fumble-book-reading': stored(
            { positions: {}, wholeBook: false, wide: false },
            1,
          ),
          'fumble-initiative': '{broken',
          [ACTIVITY_ENCOUNTER_KEY]: stored({ draft: null }),
          [ACTIVITY_HOMEBREW_KEY]: '[]',
        }),
      ),
    ).toEqual({ items: [], hasData: false, dataSince: null });
    expect(
      readLocalActivity(
        reader({ [ACTIVITY_ENCOUNTER_KEY]: stored({ draft: { monsters: 'x' } }) }),
      ).items,
    ).toEqual([]);
  });

  it('counts Homebrew as local data and survives blocked storage', () => {
    expect(
      readLocalActivity(reader({ [ACTIVITY_HOMEBREW_KEY]: stored({ entries: [{}] }) })),
    ).toEqual({ items: [], hasData: true, dataSince: null });
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readLocalActivity()).toEqual({
      items: [],
      hasData: false,
      dataSince: null,
    });
    getItem.mockRestore();
  });

  it('builds reader links with and without a section', () => {
    expect(recentBookPath({ kind: 'book', id: 'phb', chapter: 2 })).toBe('/books/phb/2');
    expect(
      recentBookPath({ kind: 'book', id: 'phb', chapter: 0, section: 'intro_1' }),
    ).toBe('/books/phb/0#section=intro_1');
  });
});
