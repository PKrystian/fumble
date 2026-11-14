import { useSyncExternalStore } from 'react';
import { createJSONStorage } from 'zustand/middleware';
import { writeLocalStorage } from '@/features/storage/safeStorage';
import {
  isSoundboardBackup,
  SOUNDBOARD_VERSION,
  type SoundboardData,
} from './validation';

export const SOUNDBOARD_KEY = 'fumble-soundboard';
type SaveStatus = { saved: boolean; blocked: boolean; raw: string | null };
const initial: SaveStatus = { saved: true, blocked: false, raw: null };
let status = initial;
const listeners = new Set<() => void>();
function publish(next: SaveStatus) {
  status = next;
  listeners.forEach((listener) => listener());
}
export const getSoundboardSaveStatus = () => status;
export function useSoundboardSaveStatus() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSoundboardSaveStatus,
    () => initial,
  );
}

export function serializeSoundboard(data: SoundboardData): string {
  return JSON.stringify({
    state: { tracks: data.tracks, categories: data.categories },
    version: SOUNDBOARD_VERSION,
  });
}

export function saveSoundboard(data: SoundboardData): boolean {
  if (status.blocked) return false;
  const saved = writeLocalStorage(SOUNDBOARD_KEY, serializeSoundboard(data));
  publish({ ...status, saved });
  return saved;
}

export function allowSoundboardReplacement() {
  publish(initial);
}

export const soundboardStorage = createJSONStorage(() => ({
  getItem: (key: string) => {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
      if (raw !== null && !isSoundboardBackup(JSON.parse(raw)))
        throw new Error('invalid-soundboard');
      publish(initial);
      return raw;
    } catch {
      publish({ saved: false, blocked: true, raw });
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    if (!status.blocked) publish({ ...status, saved: writeLocalStorage(key, value) });
  },
  removeItem: () => publish({ ...status, saved: false }),
}));
