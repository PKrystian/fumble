import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TranscriptEntry {
  time: number;
  text: string;
}

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  durationMs: number;
  entries: TranscriptEntry[];
}

interface SessionState {
  sessions: Session[];

  transcriptionLang: string;
  addSession: () => string;
  updateSession: (id: string, patch: Partial<Omit<Session, 'entries'>>) => void;
  appendTranscript: (id: string, text: string) => void;
  deleteSession: (id: string) => void;
  setTranscriptionLang: (lang: string) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      sessions: [],
      transcriptionLang: 'english',
      addSession: () => {
        const id = crypto.randomUUID();
        const session: Session = {
          id,
          title: `Session ${new Date().toLocaleDateString()}`,
          createdAt: Date.now(),
          durationMs: 0,
          entries: [],
        };
        set((state) => ({ sessions: [session, ...state.sessions] }));
        return id;
      },
      updateSession: (id, patch) =>
        set((state) => ({
          sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        })),
      appendTranscript: (id, text) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id
              ? { ...s, entries: [...s.entries, { time: Date.now(), text }] }
              : s,
          ),
        })),
      deleteSession: (id) =>
        set((state) => ({ sessions: state.sessions.filter((s) => s.id !== id) })),
      setTranscriptionLang: (transcriptionLang) => set({ transcriptionLang }),
    }),
    { name: 'fumble-sessions', version: 2 },
  ),
);

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
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

export function formatTranscriptForExport(session: Session): string {
  const header = `${session.title} - ${new Date(session.createdAt).toLocaleString()}`;
  const lines = session.entries.map((e) => `[${formatClockTime(e.time)}] ${e.text}`);
  return [header, '', ...lines].join('\n');
}

export const SUMMARY_PROMPT =
  'The following is an automatic speech-to-text transcript of a Dungeons & Dragons session. ' +
  'The transcription quality is poor: expect misheard words, garbled sentences, and broken ' +
  'grammar. Read through the errors and infer the actual in-story meaning before summarizing - ' +
  'do not summarize the literal broken text. ' +
  'Ignore anything that is not part of the story: jokes, banter, off-topic chat, rules talk, ' +
  'and other out-of-character/metagame discussion. ' +
  'Summarize only the actual story events as a numbered list of plot points, one per key event, ' +
  'decision, or story beat, in chronological order ' +
  '(e.g. "1. The players arrived at the king\'s court. 2. ..."). ' +
  'Reply in the same language as the transcript, with the numbered list only, no preamble.';

export function formatPromptWithTranscript(session: Session): string {
  return `${SUMMARY_PROMPT}\n\n${formatTranscriptForExport(session)}`;
}
