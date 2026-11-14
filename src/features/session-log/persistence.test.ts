import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getSessionSaveStatus,
  SESSIONS_KEY,
  sessionSaveSucceeded,
  useSessionSaveStatus,
} from './persistence';
import {
  reloadStoredSessions,
  replaceStoredSessions,
  retrySessionSave,
  serializeSessions,
  useSessionStore,
} from './store';

const stored = (title: string) =>
  JSON.stringify({
    state: {
      sessions: [
        { id: title, title, createdAt: 1, durationMs: 0, notes: '', entries: [] },
      ],
      contexts: [],
      selectedSessionId: null,
      transcriptionLang: '',
      transcriptionMode: 'auto',
    },
    version: 4,
  });
const titles = () => useSessionStore.getState().sessions.map((session) => session.title);
const storageEvent = (key: string | null) =>
  window.dispatchEvent(new StorageEvent('storage', { key }));

beforeEach(async () => {
  vi.restoreAllMocks();
  localStorage.clear();
  await useSessionStore.persist.rehydrate();
  useSessionStore.setState({ sessions: [], contexts: [], selectedSessionId: null });
});

describe('session journal persistence', () => {
  it('keeps unreadable stored data until the user replaces it', async () => {
    for (const raw of ['{broken', JSON.stringify({ state: {}, version: 99 })]) {
      localStorage.setItem(SESSIONS_KEY, raw);
      await useSessionStore.persist.rehydrate();
      expect(getSessionSaveStatus()).toEqual({ state: 'unreadable', raw });
      expect(sessionSaveSucceeded()).toBe(false);
      useSessionStore.getState().addSession('Kept in memory');
      expect(localStorage.getItem(SESSIONS_KEY)).toBe(raw);
    }
    replaceStoredSessions();
    expect(getSessionSaveStatus().state).toBe('saved');
    expect(localStorage.getItem(SESSIONS_KEY)).toBe(serializeSessions());
    expect(localStorage.getItem(SESSIONS_KEY)).toContain('Kept in memory');
  });

  it('stops saving when another tab changed the journal and can load that version', () => {
    useSessionStore.getState().addSession('Mine');
    localStorage.setItem(SESSIONS_KEY, stored('Theirs'));
    useSessionStore.getState().addSession('Mine again');
    expect(getSessionSaveStatus()).toEqual({ state: 'conflict', raw: stored('Theirs') });
    useSessionStore.getState().addSession('Still not saved');
    expect(localStorage.getItem(SESSIONS_KEY)).toBe(stored('Theirs'));

    reloadStoredSessions();
    expect(titles()).toEqual(['Theirs']);
    expect(getSessionSaveStatus().state).toBe('saved');
  });

  it('follows changes from another tab while this tab has nothing unsaved', () => {
    useSessionStore.getState().addSession('Mine');
    storageEvent('fumble-locale');
    storageEvent(SESSIONS_KEY);
    expect(titles()).toEqual(['Mine']);

    localStorage.setItem(SESSIONS_KEY, stored('Theirs'));
    storageEvent(SESSIONS_KEY);
    expect(titles()).toEqual(['Theirs']);

    localStorage.removeItem(SESSIONS_KEY);
    storageEvent(null);
    expect(titles()).toEqual([]);
    expect(getSessionSaveStatus().state).toBe('saved');
  });

  it('reports a conflict when another tab writes during a failed save', () => {
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota');
    });
    useSessionStore.getState().addSession('Unsaved');
    expect(getSessionSaveStatus().state).toBe('unsaved');
    write.mockRestore();

    localStorage.setItem(SESSIONS_KEY, stored('Theirs'));
    storageEvent(SESSIONS_KEY);
    expect(getSessionSaveStatus()).toEqual({ state: 'conflict', raw: stored('Theirs') });
    storageEvent(SESSIONS_KEY);
    expect(getSessionSaveStatus().state).toBe('conflict');

    replaceStoredSessions();
    expect(localStorage.getItem(SESSIONS_KEY)).toContain('Unsaved');
    retrySessionSave();
    expect(getSessionSaveStatus().state).toBe('saved');
  });

  it('treats an unavailable storage read as empty and publishes status changes', () => {
    const { result } = renderHook(() => useSessionSaveStatus());
    expect(result.current.state).toBe('saved');
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Denied');
    });
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota');
    });
    act(() => {
      useSessionStore.getState().addSession('Unsaved');
    });
    expect(result.current.state).toBe('unsaved');
    read.mockRestore();
    write.mockRestore();
    act(() => retrySessionSave());
    expect(result.current.state).toBe('saved');
  });
});
