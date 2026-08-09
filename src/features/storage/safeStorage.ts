import { createJSONStorage, type StateStorage } from 'zustand/middleware';

export const STORAGE_ERROR_EVENT = 'fumble-storage-error';

function notifyStorageError(key: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(STORAGE_ERROR_EVENT, { detail: { key } }));
}

function getStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return getStorage()?.getItem(name) ?? null;
    } catch {
      notifyStorageError(name);
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      getStorage()?.setItem(name, value);
    } catch {
      notifyStorageError(name);
    }
  },
  removeItem: (name) => {
    try {
      getStorage()?.removeItem(name);
    } catch {
      notifyStorageError(name);
    }
  },
};

export const fumbleStorage = createJSONStorage(() => safeStorage);

export function readLocalStorage(key: string): string | null {
  try {
    return getStorage()?.getItem(key) ?? null;
  } catch {
    notifyStorageError(key);
    return null;
  }
}

export function writeLocalStorage(key: string, value: string): boolean {
  try {
    const storage = getStorage();
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    notifyStorageError(key);
    return false;
  }
}

export function removeLocalStorage(key: string): boolean {
  try {
    getStorage()?.removeItem(key);
    return true;
  } catch {
    notifyStorageError(key);
    return false;
  }
}
