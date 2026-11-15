import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encounterBackupText } from '@/features/dm/encounterFiles';
import { emptyEncounterData, encounterCreature } from '@/features/dm/encounterModel';
import { useEncounterStore } from '@/features/dm/encounterStore';
import { emptyLootData, type LootResult } from '@/features/dm/lootData';
import { lootBackup } from '@/features/dm/lootFiles';
import { useLootStore } from '@/features/dm/lootStore';
import { homebrewBackupText } from '@/features/homebrew/homebrewFiles';
import {
  HOMEBREW_KEY,
  useHomebrewStore,
  type HomebrewManualEntry,
} from '@/features/homebrew/store';
import { initiativeBackupText } from '@/features/initiative/files';
import { INITIATIVE_KEY } from '@/features/initiative/model';
import { useInitiativeStore } from '@/features/initiative/store';
import { SESSIONS_KEY } from '@/features/session-log/persistence';
import { sessionsBackupText } from '@/features/session-log/sessionFiles';
import { useSessionStore } from '@/features/session-log/store';
import { soundboardBackup } from '@/features/soundboard/files';
import { allowSoundboardReplacement } from '@/features/soundboard/persistence';
import { DEFAULT_CATEGORIES, useSoundboardStore } from '@/features/soundboard/store';
import { LOOT_KEY } from '@/features/dm/lootData';
import { ENCOUNTER_KEY } from '@/features/dm/encounterModel';
import { TOOL_BACKUPS, type ToolBackup } from './toolBackupAdapters';

const t = (key: string) => key;
const tool = (id: string): ToolBackup => TOOL_BACKUPS.find((item) => item.id === id)!;
const detail = (id: string, text: string) =>
  Object.fromEntries(
    tool(id)
      .parse(text, t)
      .details.map((row) => [row.label, row.value]),
  );
const downloads: string[] = [];
const reward: LootResult = {
  id: 'reward',
  name: 'Reward',
  createdAt: 1,
  context: {
    mode: 'tier',
    reward: 'hoard',
    tierId: 1,
    partySize: 0,
    partyLevel: 1,
    party: [],
    edition: 'all',
    includeUnknown: false,
  },
  gold: 10,
  gemCount: 0,
  gemValue: 0,
  items: [],
  splitCount: '1',
  splitEnabled: false,
};
const combatant = {
  name: 'Orc',
  initiative: 12,
  ac: null,
  hpCurrent: 0,
  hpMax: null,
  conditions: '',
  isPlayer: false,
};
const entry: HomebrewManualEntry = {
  kind: 'manual',
  id: 'cloak',
  name: 'Cloak',
  category: 'items',
  subtitle: '',
  body: '',
  createdAt: 1,
};
const track = { id: 'rain', name: 'Rain', videoId: 'jNQXAC9IVRw', category: 'custom' };

beforeEach(async () => {
  vi.restoreAllMocks();
  localStorage.clear();
  downloads.length = 0;
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    downloads.push((blob as Blob).type);
    return 'blob:tool';
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  await useSessionStore.persist.rehydrate();
  useSessionStore.setState({ sessions: [], contexts: [], selectedSessionId: null });
  allowSoundboardReplacement();
  useSoundboardStore.setState({ tracks: [], categories: [...DEFAULT_CATEGORIES] });
  useLootStore.getState().reload();
  useEncounterStore.getState().retryRead();
  useHomebrewStore.getState().loadStored();
  useInitiativeStore.getState().reloadStored();
});

describe('tool backup adapters', () => {
  it('lists every tool once with its navigation target', () => {
    expect(TOOL_BACKUPS.map((item) => item.id)).toEqual([
      'sessions',
      'soundboard',
      'initiative',
      'encounter',
      'loot',
      'homebrew',
    ]);
    for (const item of TOOL_BACKUPS) {
      expect(item.available()).toBe(true);
      expect(item.count()).toBe(0);
      item.download();
    }
    expect(downloads).toHaveLength(TOOL_BACKUPS.length);
  });

  it('restores the session journal and reports a blocked journal as unavailable', async () => {
    useSessionStore.getState().addSession('Kept');
    const text = sessionsBackupText();
    useSessionStore.getState().addSession('Extra');
    expect(tool('sessions').count()).toBe(2);
    const restore = tool('sessions').parse(text, t);
    expect(restore.empty).toBe(false);
    expect(detail('sessions', text)).toEqual({
      'data.counts.sessions': 1,
      'data.counts.contexts': 0,
    });
    expect(restore.apply()).toBe(true);
    expect(useSessionStore.getState().sessions.map((item) => item.title)).toEqual([
      'Kept',
    ]);

    useSessionStore.setState({ sessions: [], contexts: [] });
    expect(tool('sessions').parse(sessionsBackupText(), t).empty).toBe(true);
    useSessionStore.getState().addContext('World');
    expect(tool('sessions').parse(sessionsBackupText(), t).empty).toBe(false);

    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota');
    });
    expect(tool('sessions').parse(text, t).apply()).toBe(false);
    write.mockRestore();

    localStorage.setItem(SESSIONS_KEY, '{broken');
    expect(tool('sessions').parse(text, t).apply()).toBe(false);
    await useSessionStore.persist.rehydrate();
    expect(tool('sessions').available()).toBe(false);
    expect(tool('sessions').parse(text, t).apply()).toBe(false);
    localStorage.removeItem(SESSIONS_KEY);
    await useSessionStore.persist.rehydrate();
  });

  it('restores the soundboard with categories and favorites', () => {
    const text = JSON.stringify(
      soundboardBackup({
        tracks: [
          { ...track, favorite: true },
          { ...track, id: 'wind' },
        ],
        categories: [...DEFAULT_CATEGORIES],
      }),
    );
    expect(detail('soundboard', text)).toMatchObject({
      'data.counts.tracks': 2,
      'soundboard.favorites': 1,
    });
    expect(tool('soundboard').parse(text, t).apply()).toBe(true);
    expect(tool('soundboard').count()).toBe(2);
    const empty = JSON.stringify(
      soundboardBackup({ tracks: [], categories: [...DEFAULT_CATEGORIES] }),
    );
    expect(tool('soundboard').parse(empty, t).empty).toBe(true);

    localStorage.setItem('fumble-soundboard', '{broken');
    void useSoundboardStore.persist.rehydrate();
    expect(tool('soundboard').available()).toBe(false);
    allowSoundboardReplacement();
  });

  it('restores initiative with its round and active participant', () => {
    const store = useInitiativeStore.getState();
    store.addCombatant(combatant);
    store.addCombatant({ ...combatant, name: ' ', initiative: 3 });
    const idle = initiativeBackupText(useInitiativeStore.getState());
    expect(detail('initiative', idle)).toEqual({
      'data.counts.combatants': 2,
      'initiative.round': 'initiative.notStarted',
      'initiative.active': 'initiative.noActive',
    });
    useInitiativeStore.getState().next();
    const running = initiativeBackupText(useInitiativeStore.getState());
    expect(detail('initiative', running)).toMatchObject({
      'initiative.round': 1,
      'initiative.active': 'Orc',
    });
    useInitiativeStore.getState().next();
    expect(
      detail('initiative', initiativeBackupText(useInitiativeStore.getState())),
    ).toMatchObject({ 'initiative.active': 'initiative.unnamed' });

    const empty = initiativeBackupText({ combatants: [], round: 0, turnId: null });
    const restore = tool('initiative').parse(empty, t);
    expect(restore.empty).toBe(true);
    expect(restore.apply()).toBe(true);
    expect(tool('initiative').count()).toBe(0);

    localStorage.setItem(INITIATIVE_KEY, '{broken');
    useInitiativeStore.getState().checkStorage();
    expect(tool('initiative').available()).toBe(false);
    localStorage.removeItem(INITIATIVE_KEY);
    useInitiativeStore.getState().reloadStored();
  });

  it('restores encounters and reports whether the write was saved', () => {
    const creature = encounterCreature({
      id: 'goblin',
      name: 'Goblin',
      source: 'XMM',
      srd: false,
    });
    const data = emptyEncounterData();
    data.draft.monsters = [{ ...creature, count: 3, inLair: false }];
    const text = encounterBackupText(data);
    expect(detail('encounter', text)).toEqual({
      'data.counts.encounters': 0,
      'encounter.draftCreatures': 3,
    });
    const restore = tool('encounter').parse(text, t);
    expect(restore.empty).toBe(false);
    expect(restore.apply()).toBe(true);
    expect(useEncounterStore.getState().data.draft.monsters).toHaveLength(1);
    expect(
      tool('encounter').parse(encounterBackupText(emptyEncounterData()), t).empty,
    ).toBe(true);
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota');
    });
    expect(tool('encounter').parse(text, t).apply()).toBe(false);
    write.mockRestore();
    useEncounterStore.getState().retrySave();
    expect(localStorage.getItem(ENCOUNTER_KEY)).toContain('goblin');
  });

  it('restores loot history', () => {
    const data = { ...emptyLootData(), history: [reward], selectedId: reward.id };
    const text = JSON.stringify(lootBackup(data));
    expect(detail('loot', text)).toEqual({ 'data.counts.loot': 1 });
    expect(tool('loot').parse(text, t).apply()).toBe(true);
    expect(tool('loot').count()).toBe(1);
    expect(tool('loot').parse(JSON.stringify(lootBackup(emptyLootData())), t).empty).toBe(
      true,
    );
    localStorage.setItem(LOOT_KEY, '{broken');
    useLootStore.getState().reload();
    expect(tool('loot').available()).toBe(false);
    localStorage.removeItem(LOOT_KEY);
    useLootStore.getState().reload();
  });

  it('restores personal Homebrew and refuses a library changed elsewhere', async () => {
    const text = homebrewBackupText([entry]);
    expect(detail('homebrew', text)).toEqual({ 'data.counts.homebrew': 1 });
    const restore = tool('homebrew').parse(text, t);
    expect(restore.empty).toBe(false);
    expect(await restore.apply()).toBe(true);
    expect(tool('homebrew').count()).toBe(1);

    const stale = tool('homebrew').parse(homebrewBackupText([]), t);
    expect(stale.empty).toBe(true);
    localStorage.setItem(HOMEBREW_KEY, '{broken');
    expect(await stale.apply()).toBe(false);
    useHomebrewStore.getState().checkStorage();
    expect(tool('homebrew').available()).toBe(false);
    localStorage.removeItem(HOMEBREW_KEY);
    useHomebrewStore.getState().loadStored();
  });
});
