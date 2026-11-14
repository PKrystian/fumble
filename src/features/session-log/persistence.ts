import { useSyncExternalStore } from 'react';
import { createJSONStorage } from 'zustand/middleware';
import { validateBackupEntry } from '@/features/data/backupValidation';
import { removeLocalStorage, writeLocalStorage } from '@/features/storage/safeStorage';

export const SESSIONS_KEY = 'fumble-sessions';
export const SESSION_SAVE_EVENT = 'fumble-session-save';

export type SessionSaveState = 'saved' | 'unsaved' | 'unreadable' | 'conflict';
export interface SessionSaveStatus {
  state: SessionSaveState;
  raw: string | null;
}

const initial: SessionSaveStatus = { state: 'saved', raw: null };
let status = initial;
let baseline: string | null = null;
const listeners = new Set<() => void>();

function publish(next: SessionSaveStatus) {
  status = next;
  listeners.forEach((listener) => listener());
  window.dispatchEvent(
    new CustomEvent(SESSION_SAVE_EVENT, { detail: next.state === 'saved' }),
  );
}

function readStored(): string | null | undefined {
  try {
    return window.localStorage.getItem(SESSIONS_KEY);
  } catch {
    return undefined;
  }
}

function readable(raw: string): boolean {
  try {
    validateBackupEntry(SESSIONS_KEY, JSON.parse(raw));
    return true;
  } catch {
    return false;
  }
}

export const getSessionSaveStatus = () => status;

export function sessionSaveSucceeded(): boolean {
  return status.state === 'saved';
}

export function useSessionSaveStatus(): SessionSaveStatus {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSessionSaveStatus,
    () => initial,
  );
}

export function storedSessionsChanged(): boolean {
  const current = readStored();
  return current !== undefined && current !== baseline;
}

export function markSessionConflict() {
  publish({ state: 'conflict', raw: readStored() ?? null });
}

export function allowSessionReplacement() {
  baseline = readStored() ?? null;
  publish({ state: 'unsaved', raw: null });
}

export const sessionStorage = createJSONStorage(() => ({
  getItem: () => {
    const raw = readStored() ?? null;
    baseline = raw;
    if (raw !== null && !readable(raw)) {
      publish({ state: 'unreadable', raw });
      return null;
    }
    publish(initial);
    return raw;
  },
  setItem: (_key: string, value: string) => {
    if (status.state === 'unreadable' || status.state === 'conflict') return;
    if (storedSessionsChanged()) {
      markSessionConflict();
      return;
    }
    const saved = writeLocalStorage(SESSIONS_KEY, value);
    if (saved) baseline = value;
    publish(saved ? initial : { state: 'unsaved', raw: null });
  },
  removeItem: () => {
    removeLocalStorage(SESSIONS_KEY);
    baseline = readStored() ?? null;
  },
}));
