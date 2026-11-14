import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { writeLocalStorage } from '@/features/storage/safeStorage';
import {
  allowSessionReplacement,
  getSessionSaveStatus,
  markSessionConflict,
  SESSIONS_KEY,
  sessionStorage,
  storedSessionsChanged,
} from './persistence';

export { SESSION_SAVE_EVENT, sessionSaveSucceeded } from './persistence';

export interface TranscriptEntry {
  id?: string;
  time: number;
  text: string;
  offsetMs?: number;
}
export interface Session {
  id: string;
  title: string;
  createdAt: number;
  durationMs: number;
  notes: string;
  entries: TranscriptEntry[];
  updatedAt?: number;
  campaign?: string;
  sessionDate?: string;
  number?: string;
  summary?: string;
  contextIds?: string[];
}
export interface CampaignContext {
  id: string;
  name: string;
  text: string;
  createdAt: number;
  updatedAt: number;
}
export const SESSION_VERSION = 4;
type SessionPatch = Partial<Omit<Session, 'id' | 'createdAt' | 'entries'>>;
interface SessionState {
  setSessionContext: (id: string, contextId: string, included: boolean) => void;
  transcriptionMode: 'auto' | 'browser' | 'local';
  setTranscriptionMode: (mode: 'auto' | 'browser' | 'local') => void;
  sessions: Session[];
  contexts: CampaignContext[];
  selectedSessionId: string | null;
  revision: number;
  transcriptionLang: string;
  addSession: (title?: string) => string;
  selectSession: (id: string | null) => void;
  updateSession: (id: string, patch: SessionPatch) => void;
  addDuration: (id: string, durationMs: number) => void;
  appendNote: (id: string, text: string) => void;
  appendTranscript: (
    id: string,
    text: string,
    stamp?: { time: number; offsetMs: number },
  ) => void;
  updateTranscript: (sessionId: string, entryId: string, text: string) => void;
  deleteTranscript: (sessionId: string, entryId: string) => void;
  restoreTranscript: (sessionId: string, entry: TranscriptEntry, index: number) => void;
  deleteSession: (id: string) => void;
  restoreSession: (session: Session, index: number) => void;
  setTranscriptionLang: (lang: string) => void;
  addContext: (name: string) => string;
  updateContext: (
    id: string,
    patch: Partial<Pick<CampaignContext, 'name' | 'text'>>,
  ) => void;
  appendContext: (id: string, text: string) => void;
  deleteContext: (id: string) => void;
  restoreContext: (context: CampaignContext, sessions: string[]) => void;
}
export function sessionDateValue(time: number): string {
  const date = new Date(time);
  return new Date(time - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}
export function transcriptEntryId(entry: TranscriptEntry, index: number): string {
  return entry.id ?? `${entry.time}-${index}`;
}
function normalizeSession(session: Session): Session {
  return {
    ...session,
    notes: session.notes ?? '',
    summary: session.summary ?? '',
    campaign: session.campaign ?? '',
    sessionDate: session.sessionDate ?? sessionDateValue(session.createdAt),
    number: session.number ?? '',
    contextIds: session.contextIds ?? [],
    updatedAt: session.updatedAt ?? session.createdAt,
    entries: session.entries.map((entry) => ({
      ...entry,
      id: entry.id ?? crypto.randomUUID(),
    })),
  };
}
export const useSessionStore = create<SessionState>()(
  persist(
    (set) => {
      const edit = (id: string, change: (session: Session) => Session) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === id ? { ...change(session), updatedAt: Date.now() } : session,
          ),
        }));
      return {
        sessions: [],
        contexts: [],
        selectedSessionId: null,
        revision: 0,
        transcriptionLang: '',
        transcriptionMode: 'auto',
        setTranscriptionMode: (transcriptionMode) => set({ transcriptionMode }),
        addSession: (title = '') => {
          const id = crypto.randomUUID();
          const now = Date.now();
          const session = normalizeSession({
            id,
            title,
            createdAt: now,
            durationMs: 0,
            notes: '',
            entries: [],
          });
          set((state) => ({
            sessions: [session, ...state.sessions],
            selectedSessionId: id,
          }));
          return id;
        },
        selectSession: (selectedSessionId) => set({ selectedSessionId }),
        setSessionContext: (id, contextId, included) =>
          edit(id, (session) => ({
            ...session,
            contextIds: included
              ? [...new Set([...(session.contextIds ?? []), contextId])]
              : (session.contextIds ?? []).filter((value) => value !== contextId),
          })),
        updateSession: (id, patch) => edit(id, (session) => ({ ...session, ...patch })),
        addDuration: (id, durationMs) =>
          edit(id, (session) => ({
            ...session,
            durationMs: session.durationMs + Math.max(0, durationMs),
          })),
        appendNote: (id, text) =>
          edit(id, (session) => ({
            ...session,
            notes: [session.notes, text].filter(Boolean).join('\n'),
          })),
        appendTranscript: (id, text, stamp) => {
          if (!text.trim()) return;
          edit(id, (session) => ({
            ...session,
            entries: [
              ...session.entries,
              {
                id: crypto.randomUUID(),
                time: stamp?.time ?? Date.now(),
                text: text.trim(),
                ...(stamp ? { offsetMs: stamp.offsetMs } : {}),
              },
            ],
          }));
        },
        updateTranscript: (id, entryId, text) =>
          edit(id, (session) => ({
            ...session,
            entries: session.entries.map((entry, index) =>
              transcriptEntryId(entry, index) === entryId ? { ...entry, text } : entry,
            ),
          })),
        deleteTranscript: (id, entryId) =>
          edit(id, (session) => ({
            ...session,
            entries: session.entries.filter(
              (entry, index) => transcriptEntryId(entry, index) !== entryId,
            ),
          })),
        restoreTranscript: (id, entry, index) =>
          edit(id, (session) => {
            if (entry.id && session.entries.some((item) => item.id === entry.id))
              return session;
            const entries = [...session.entries];
            entries.splice(index, 0, entry);
            return { ...session, entries };
          }),
        deleteSession: (id) =>
          set((state) => ({
            sessions: state.sessions.filter((session) => session.id !== id),
            selectedSessionId:
              state.selectedSessionId === id ? null : state.selectedSessionId,
          })),
        restoreSession: (session, index) =>
          set((state) => {
            if (state.sessions.some((item) => item.id === session.id)) return state;
            const sessions = [...state.sessions];
            sessions.splice(index, 0, session);
            return { sessions, selectedSessionId: session.id };
          }),
        setTranscriptionLang: (transcriptionLang) => set({ transcriptionLang }),
        addContext: (name) => {
          const id = crypto.randomUUID();
          const now = Date.now();
          set((state) => ({
            contexts: [
              ...state.contexts,
              { id, name: name.trim(), text: '', createdAt: now, updatedAt: now },
            ],
          }));
          return id;
        },
        updateContext: (id, patch) =>
          set((state) => ({
            contexts: state.contexts.map((context) =>
              context.id === id
                ? { ...context, ...patch, updatedAt: Date.now() }
                : context,
            ),
          })),
        appendContext: (id, text) => {
          if (!text.trim()) return;
          set((state) => ({
            contexts: state.contexts.map((context) =>
              context.id === id
                ? {
                    ...context,
                    text: [context.text.trimEnd(), text.trim()]
                      .filter(Boolean)
                      .join('\n\n'),
                    updatedAt: Date.now(),
                  }
                : context,
            ),
          }));
        },
        deleteContext: (id) =>
          set((state) => ({
            contexts: state.contexts.filter((context) => context.id !== id),
            sessions: state.sessions.map((session) => ({
              ...session,
              contextIds: (session.contextIds ?? []).filter(
                (contextId) => contextId !== id,
              ),
            })),
          })),
        restoreContext: (context, sessions) =>
          set((state) => ({
            contexts: state.contexts.some((item) => item.id === context.id)
              ? state.contexts
              : [...state.contexts, context],
            sessions: state.sessions.map((session) =>
              sessions.includes(session.id)
                ? {
                    ...session,
                    contextIds: [...new Set([...(session.contextIds ?? []), context.id])],
                  }
                : session,
            ),
          })),
      };
    },
    {
      name: SESSIONS_KEY,
      version: SESSION_VERSION,
      storage: sessionStorage,
      partialize: ({
        sessions,
        contexts,
        selectedSessionId,
        transcriptionLang,
        transcriptionMode,
      }) => ({
        sessions,
        contexts,
        selectedSessionId,
        transcriptionLang,
        transcriptionMode,
      }),
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<SessionState>;
        return {
          sessions: (state.sessions ?? []).map(normalizeSession),
          contexts: state.contexts ?? [],
          selectedSessionId: state.selectedSessionId ?? null,
          transcriptionLang: state.transcriptionLang ?? '',
          transcriptionMode: state.transcriptionMode ?? 'auto',
        };
      },
    },
  ),
);
export function serializeSessions(): string {
  const { sessions, contexts, selectedSessionId, transcriptionLang, transcriptionMode } =
    useSessionStore.getState();
  return JSON.stringify({
    state: {
      sessions,
      contexts,
      selectedSessionId,
      transcriptionLang,
      transcriptionMode,
    },
    version: SESSION_VERSION,
  });
}

export function retrySessionSave() {
  useSessionStore.setState({});
}

export function reloadStoredSessions() {
  if (window.localStorage.getItem(SESSIONS_KEY) === null)
    useSessionStore.setState({ sessions: [], contexts: [], selectedSessionId: null });
  void useSessionStore.persist.rehydrate();
  useSessionStore.setState((state) => ({ revision: state.revision + 1 }));
}

export function restoreStoredSessions(raw: string): boolean {
  if (getSessionSaveStatus().state !== 'saved' || storedSessionsChanged()) return false;
  if (!writeLocalStorage(SESSIONS_KEY, raw)) return false;
  reloadStoredSessions();
  return true;
}

export function replaceStoredSessions() {
  allowSessionReplacement();
  retrySessionSave();
}

window.addEventListener('storage', (event) => {
  if (event.key !== null && event.key !== SESSIONS_KEY) return;
  if (!storedSessionsChanged()) return;
  if (getSessionSaveStatus().state === 'saved') reloadStoredSessions();
  else if (getSessionSaveStatus().state === 'unsaved') markSessionConflict();
});

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}
export function formatClockTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
