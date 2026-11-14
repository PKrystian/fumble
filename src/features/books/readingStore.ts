import { create } from 'zustand';
import { readLocalStorage, writeLocalStorage } from '@/features/storage/safeStorage';
import {
  BOOK_READING_KEY,
  MAX_READING_POSITIONS,
  emptyBookReading,
  parseBookReading,
  serializeBookReading,
  type BookReadingData,
} from './readingData';

type SaveStatus = 'ready' | 'unsaved' | 'unreadable' | 'conflict';

interface ReadingState {
  data: BookReadingData;
  raw: string | null;
  status: SaveStatus;
  record: (book: string, chapter: number, section?: string) => void;
  setPreference: (key: 'wide' | 'wholeBook', value: boolean) => void;
  clear: () => void;
  retry: () => void;
  replace: (expectedRaw: string | null) => void;
  restoreStored: (expectedRaw: string) => void;
  acceptStored: (raw: string | null) => void;
}

function storedReading(raw: string | null) {
  const data = raw === null ? emptyBookReading : parseBookReading(raw);
  return {
    raw,
    data: data ?? emptyBookReading,
    status: data ? ('ready' as const) : ('unreadable' as const),
  };
}

export const useBookReading = create<ReadingState>((set, get) => {
  const commit = (data: BookReadingData, expectedRaw: string | null) => {
    const current = readLocalStorage(BOOK_READING_KEY);
    if (current !== expectedRaw) {
      set({ data, raw: current, status: 'conflict' });
      return;
    }
    const raw = serializeBookReading(data);
    if (writeLocalStorage(BOOK_READING_KEY, raw)) set({ data, raw, status: 'ready' });
    else set({ data, raw: current, status: 'unsaved' });
  };
  const update = (data: BookReadingData) => {
    const { raw, status } = get();
    if (status === 'conflict' || status === 'unreadable') set({ data });
    else commit(data, raw);
  };
  return {
    ...storedReading(readLocalStorage(BOOK_READING_KEY)),
    record: (book, chapter, section) => {
      const { data } = get();
      const previous = data.positions[book];
      if (previous?.chapter === chapter && previous.section === section) return;
      const positions = {
        ...data.positions,
        [book]: { chapter, ...(section ? { section } : {}), updatedAt: Date.now() },
      };
      if (Object.keys(positions).length > MAX_READING_POSITIONS) {
        const oldest = Object.keys(positions).sort(
          (a, b) => positions[a]!.updatedAt - positions[b]!.updatedAt,
        )[0]!;
        delete positions[oldest];
      }
      update({ ...data, positions });
    },
    setPreference: (key, value) => update({ ...get().data, [key]: value }),
    clear: () => update({ ...get().data, positions: {} }),
    retry: () => {
      const { data, raw, status } = get();
      if (status === 'unsaved') commit(data, raw);
    },
    replace: (expectedRaw) => commit(get().data, expectedRaw),
    restoreStored: (expectedRaw) => {
      const raw = readLocalStorage(BOOK_READING_KEY);
      if (raw === expectedRaw) set(storedReading(raw));
      else set({ raw, status: 'conflict' });
    },
    acceptStored: (raw) => {
      const { status, data } = get();
      if (status === 'ready' || (status === 'unreadable' && data === emptyBookReading))
        set(storedReading(raw));
      else set({ raw, status: 'conflict' });
    },
  };
});

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === BOOK_READING_KEY || event.key === null)
      useBookReading.getState().acceptStored(readLocalStorage(BOOK_READING_KEY));
  });
}
