import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBackup,
  parseBackup,
  serializeBackup,
  summarizeBackup,
} from '@/features/data/backup';
import { encounterBackupText, parseEncounterFile } from './encounterFiles';
import {
  emptyEncounterData,
  ENCOUNTER_KEY,
  encounterCreature,
  isEncounterBackup,
} from './encounterModel';

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

describe('encounter storage', () => {
  it('follows changes from another tab while nothing is unsaved', async () => {
    const { serializeEncounter, useEncounterStore } = await import('./encounterStore');
    const other = emptyEncounterData();
    other.draft.name = 'From another tab';
    localStorage.setItem(ENCOUNTER_KEY, serializeEncounter(other));
    window.dispatchEvent(new StorageEvent('storage', { key: ENCOUNTER_KEY }));
    expect(useEncounterStore.getState().data.draft.name).toBe('From another tab');

    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota');
    });
    useEncounterStore.getState().edit({ name: 'Unsaved here' });
    write.mockRestore();
    localStorage.setItem(ENCOUNTER_KEY, serializeEncounter(emptyEncounterData()));
    window.dispatchEvent(new StorageEvent('storage', { key: ENCOUNTER_KEY }));
    expect(useEncounterStore.getState().data.draft.name).toBe('Unsaved here');
  });

  it('round trips the draft, library and independent edits through both backup formats', async () => {
    const { useEncounterStore } = await import('./encounterStore');
    const creature = encounterCreature({
      id: 'goblin',
      name: 'Goblin',
      source: 'XMM',
      srd: false,
    });
    const state = useEncounterStore.getState();
    state.edit({
      name: '  Forest  ',
      monsters: [{ ...creature, count: 2, inLair: false }],
    });
    state.saveNamed();
    const id = useEncounterStore.getState().data.selectedId!;
    state.edit({ name: 'Next session' });
    state.duplicate(id, 'Forest copy');
    const data = useEncounterStore.getState().data;
    expect(data.library.map((item) => item.name)).toEqual(['Forest copy', 'Forest']);
    expect(data.draft.name).toBe('Next session');
    const full = serializeBackup(createBackup(localStorage));
    expect(summarizeBackup(parseBackup(full))).toMatchObject({
      encounterDraft: 1,
      encounters: 2,
    });
    expect(parseEncounterFile(full).data).toEqual(data);
    expect(parseEncounterFile(encounterBackupText(data)).data).toEqual(data);
    vi.resetModules();
    const reloaded = (await import('./encounterStore')).useEncounterStore.getState();
    expect(reloaded.data).toEqual(data);
    reloaded.open(id);
    expect(
      (await import('./encounterStore')).useEncounterStore.getState().data.draft.name,
    ).toBe('Forest');
    reloaded.remove(id);
    expect(
      (await import('./encounterStore')).useEncounterStore.getState().data.selectedId,
    ).toBeNull();
  });

  it('keeps failed writes in memory and retries without losing the previous copy', async () => {
    const { useEncounterStore } = await import('./encounterStore');
    const state = useEncounterStore.getState();
    state.edit({ name: 'Before' });
    const previous = localStorage.getItem(ENCOUNTER_KEY);
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    try {
      state.edit({ name: 'In memory' });
      const current = useEncounterStore.getState();
      expect(current.saved).toBe(false);
      expect(localStorage.getItem(ENCOUNTER_KEY)).toBe(previous);
      expect(parseEncounterFile(encounterBackupText(current.data)).data.draft.name).toBe(
        'In memory',
      );
    } finally {
      spy.mockRestore();
    }
    state.retrySave();
    expect(useEncounterStore.getState().saved).toBe(true);
    expect(JSON.parse(localStorage.getItem(ENCOUNTER_KEY)!).state.draft.name).toBe(
      'In memory',
    );
  });

  it('preserves unreadable or concurrent storage until explicitly replaced', async () => {
    localStorage.setItem(ENCOUNTER_KEY, '{broken');
    const { useEncounterStore, serializeEncounter } = await import('./encounterStore');
    const state = useEncounterStore.getState();
    expect(state).toMatchObject({ saved: false, blocked: true, raw: '{broken' });
    state.edit({ name: 'Recovered draft' });
    state.retryRead();
    expect(localStorage.getItem(ENCOUNTER_KEY)).toBe('{broken');
    state.replaceUnreadable();
    expect(useEncounterStore.getState()).toMatchObject({ saved: true, blocked: false });
    const external = emptyEncounterData();
    external.draft.name = 'Other tab';
    localStorage.setItem(ENCOUNTER_KEY, serializeEncounter(external));
    state.edit({ name: 'This tab' });
    expect(useEncounterStore.getState().blocked).toBe(true);
    expect(JSON.parse(localStorage.getItem(ENCOUNTER_KEY)!).state.draft.name).toBe(
      'Other tab',
    );
  });

  it('rejects bad versions, duplicate rows, dangling selections and invalid files', () => {
    const data = emptyEncounterData();
    expect(isEncounterBackup({ state: data, version: 1 })).toBe(true);
    expect(isEncounterBackup({ state: data, version: 2 })).toBe(false);
    expect(
      isEncounterBackup({ state: { ...data, selectedId: 'missing' }, version: 1 }),
    ).toBe(false);
    data.draft.party.push(data.draft.party[0]!);
    expect(isEncounterBackup({ state: data, version: 1 })).toBe(false);
    expect(() => parseEncounterFile('null')).toThrow('encounter-backup-invalid');
    expect(() => parseEncounterFile(encounterBackupText(data))).toThrow(
      'encounter-backup-invalid',
    );
    const full = createBackup(localStorage);
    full.data[ENCOUNTER_KEY] = JSON.stringify({ version: 1, state: data });
    expect(() => parseBackup(serializeBackup(full))).toThrow('backup-invalid-data');
  });

  it('keeps imported creatures with out-of-range stats restorable as partial entries', () => {
    const imported = {
      id: 'custom',
      name: 'Custom',
      source: 'Homebrew',
      srd: false,
      ac: '1001',
      hp: '1000001',
      initiative: '+2000',
      cr: '1',
      crDisplay: '1 (XP 9,999,999; PB +2)',
    };
    const snapshot = encounterCreature(imported);
    expect(snapshot).toMatchObject({ ac: null, hp: null, initiative: null, xp: null });
    const data = emptyEncounterData();
    data.draft.monsters = [{ ...snapshot, count: 1, inLair: false }];
    expect(parseEncounterFile(encounterBackupText(data)).data).toEqual(data);
  });
});
